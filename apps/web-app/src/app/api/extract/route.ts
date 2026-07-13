import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { runExtraction } from "@/services/extraction.service"

export const runtime = "nodejs"
export const maxDuration = 60 // Cấu hình thời gian tối đa chờ phản hồi của API

const bodySchema = z.object({ sourceDocumentId: z.string() })

export async function POST(req: Request) {
  try {
    const { sourceDocumentId } = bodySchema.parse(await req.json())
    const job = await runExtraction(sourceDocumentId)
    return NextResponse.json(job, { status: job.status === "FAILED" ? 500 : 200 })
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: "validation", issues: err.flatten() }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
