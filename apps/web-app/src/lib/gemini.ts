import { GoogleGenAI } from "@google/genai"
import { extractionResultSchema, type ExtractionResult } from "@/schemas/extraction.schema"

const ai = new GoogleGenAI({})
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash"

const responseSchema = {
  type: "object",
  properties: {
    stats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },   // luôn nhận string ở phía AI rồi ép kiểu sau
          confidence: { type: "number" },
        },
        required: ["key", "value"],
      },
    },
    attributes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["STRENGTH", "WEAKNESS", "NEED", "CAPABILITY"] },
          axis: { type: "string", enum: ["GENERAL", "FINANCE", "WORKFORCE", "PRODUCT", "OPERATIONS"] },
          title: { type: "string" },
          description: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["type", "title"],
      },
    },
  },
  required: ["stats", "attributes"],
}

export type GeminiPart = { text: string } | { inlineData: { data: string; mimeType: string } }

export async function extractProfile(opts: {
  parts: GeminiPart[]
  statCatalog: { key: string; label: string; dataType: string; axis: string }[]
}): Promise<ExtractionResult> {
  const catalog = opts.statCatalog
    .map((s) => `- ${s.key} (${s.label}) [${s.dataType}, trục ${s.axis}]`)
    .join("\n")

  const instruction =
    `Bạn là trợ lý bóc tách hồ sơ doanh nghiệp. Chỉ trích thông tin CÓ THẬT trong tài liệu, không suy diễn.\n` +
    `"stats": CHỈ dùng đúng các key dưới đây, KHÔNG bịa key mới:\n${catalog}\n` +
    `Giá trị số ghi số thuần (bỏ đơn vị, bỏ dấu phẩy ngăn cách). Không chắc thì bỏ qua.\n` +
    `"attributes": rút điểm mạnh/yếu/nhu cầu/năng lực nổi bật của DN.`

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      instruction,
      ...opts.parts,
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  })

  if (!res.text) {
    throw new Error("Không nhận được phản hồi văn bản từ Gemini.")
  }

  const json = JSON.parse(res.text)
  return extractionResultSchema.parse(json)   // cổng kiểm duyệt Zod
}
