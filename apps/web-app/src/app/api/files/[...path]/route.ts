import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  try {
    const { buffer, mimeType } = await storage.readFile(path.join("/"))
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": mimeType ?? "application/octet-stream" },
    })
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
}
