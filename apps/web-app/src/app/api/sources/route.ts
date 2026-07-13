import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { createLinkSchema, ALLOWED_MIME, MAX_FILE_BYTES } from "@/schemas/source.schema"
import { storage } from "@/lib/storage"
import { createFileSource, createLinkSource, listSourcesByCompany } from "@/services/source.service"

// GCS SDK cần Node runtime (không chạy trên Edge)
export const runtime = "nodejs"

export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("companyId")
  if (!companyId) return NextResponse.json({ error: "companyId_required" }, { status: 400 })
  return NextResponse.json(await listSourcesByCompany(companyId))
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? ""

    // (A) Link — gửi dạng JSON
    if (contentType.includes("application/json")) {
      const { companyId, linkUrl } = createLinkSchema.parse(await req.json())
      const src = await createLinkSource({ companyId, linkUrl })
      return NextResponse.json(src, { status: 201 })
    }

    // (B) File — gửi dạng multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const companyId = String(form.get("companyId") ?? "")
      const file = form.get("file")

      if (!companyId) return NextResponse.json({ error: "companyId_required" }, { status: 400 })
      if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 })
      
      const fileType = file.type || "application/octet-stream"
      if (!ALLOWED_MIME.includes(fileType as any))
        return NextResponse.json({ error: "unsupported_type", type: fileType }, { status: 415 })
      if (file.size > MAX_FILE_BYTES)
        return NextResponse.json({ error: "file_too_large" }, { status: 413 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const { objectPath } = await storage.uploadFile({
        companyId, buffer, mimeType: fileType, originalName: file.name,
      })
      const src = await createFileSource({ companyId, objectPath, mimeType: fileType })
      return NextResponse.json(src, { status: 201 })
    }

    return NextResponse.json({ error: "unsupported_content_type" }, { status: 415 })
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: "validation", issues: err.flatten() }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
