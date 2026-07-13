import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"
import { extractProfile, type GeminiPart } from "@/lib/gemini"
import type { Prisma, StatDataType, SourceDocument } from "@prisma/client"

// Chuyển SourceDocument sang các phần (parts) truyền vào Gemini
async function sourceToParts(source: SourceDocument): Promise<GeminiPart[]> {
  if (source.type === "LINK") {
    const res = await fetch(source.linkUrl!)
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, 20000)
    return [{ text: `Nội dung từ link ${source.linkUrl}:\n${text}` }]
  }

  const { buffer, mimeType } = await storage.readFile(source.fileUrl!)
  const mt = (mimeType ?? source.mimeType ?? "application/octet-stream").trim()

  if (mt === "text/plain") return [{ text: buffer.toString("utf8").slice(0, 20000) }]
  if (mt === "application/pdf" || mt.startsWith("image/"))
    return [{ inlineData: { data: buffer.toString("base64"), mimeType: mt } }]
  if (mt.includes("wordprocessingml")) {
    const mammoth = await import("mammoth")
    const { value } = await mammoth.extractRawText({ buffer })
    return [{ text: value.slice(0, 20000) }]
  }
  throw new Error(`Định dạng chưa hỗ trợ bóc tách: ${mt}`)
}

// Ép giá trị do AI sinh (string) về đúng cột typed theo dataType trong DB
function coerceValue(dataType: StatDataType, raw: string | number | boolean) {
  switch (dataType) {
    case "NUMBER": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^\d.\-]/g, ""))
      return Number.isFinite(n) ? { valueNumber: n } : null
    }
    case "BOOLEAN":
      return { valueBool: typeof raw === "boolean" ? raw : /^(true|1|có|yes)$/i.test(String(raw)) }
    case "DATE": {
      const d = new Date(String(raw))
      return isNaN(d.getTime()) ? null : { valueDate: d }
    }
    default:
      return { valueText: String(raw) }
  }
}

export async function runExtraction(sourceDocumentId: string) {
  const source = await prisma.sourceDocument.findUnique({ where: { id: sourceDocumentId } })
  if (!source) throw new Error("source_not_found")

  const job = await prisma.extractionJob.create({
    data: { sourceDocumentId, status: "PROCESSING", startedAt: new Date() },
  })

  try {
    const defs = await prisma.statDefinition.findMany() // đọc catalog cấu hình động từ DB
    const defByKey = new Map(defs.map((d) => [d.key, d]))

    const parts = await sourceToParts(source)
    const ai = await extractProfile({
      parts,
      statCatalog: defs.map((d) => ({ key: d.key, label: d.label, dataType: d.dataType, axis: d.axis })),
    })

    const confidences: number[] = []

    await prisma.$transaction(async (tx) => {
      for (const s of ai.stats) {
        const def = defByKey.get(s.key)
        if (!def) continue // Bỏ qua nếu AI tự sinh key lạ ngoài catalog
        const coerced = coerceValue(def.dataType, s.value)
        if (!coerced) continue // Bỏ qua nếu giá trị không ép được về đúng kiểu dữ liệu
        
        if (typeof s.confidence === "number") confidences.push(s.confidence)
        
        // Giải pháp an toàn hơn upsert trên chỉ mục có chứa trường null (snapshotId: null)
        const existing = await tx.companyStatValue.findFirst({
          where: {
            companyId: source.companyId,
            definitionId: def.id,
            snapshotId: null,
          },
        })

        if (existing) {
          await tx.companyStatValue.update({
            where: { id: existing.id },
            data: { ...coerced, source: "AI", verified: false, confidence: s.confidence ?? null },
          })
        } else {
          await tx.companyStatValue.create({
            data: {
              companyId: source.companyId,
              definitionId: def.id,
              snapshotId: null,
              ...coerced,
              source: "AI",
              verified: false,
              confidence: s.confidence ?? null,
              visibility: def.defaultVisibility,
            },
          })
        }
      }

      for (const a of ai.attributes) {
        if (typeof a.confidence === "number") confidences.push(a.confidence)
        await tx.companyAttribute.create({
          data: {
            companyId: source.companyId,
            type: a.type,
            axis: a.axis,
            title: a.title,
            description: a.description ?? null,
            source: "AI",
            verified: false,
            confidence: a.confidence ?? null,
          },
        })
      }

      await tx.sourceDocument.update({ where: { id: source.id }, data: { status: "DONE" } })
    })

    const avg = confidences.length ? confidences.reduce((x, y) => x + y, 0) / confidences.length : null
    
    return prisma.extractionJob.update({
      where: { id: job.id },
      data: { 
        status: "DONE", 
        finishedAt: new Date(), 
        rawResult: ai as unknown as Prisma.InputJsonValue, 
        confidence: avg 
      },
    })
  } catch (err: any) {
    await prisma.sourceDocument.update({ where: { id: source.id }, data: { status: "FAILED" } }).catch(() => {})
    
    return prisma.extractionJob.update({
      where: { id: job.id },
      data: { 
        status: "FAILED", 
        finishedAt: new Date(), 
        error: String(err?.message ?? err) 
      },
    })
  }
}
