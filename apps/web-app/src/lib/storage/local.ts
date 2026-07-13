import { promises as fs } from "fs"
import path from "path"
import type { StorageProvider } from "./types"

const ROOT = path.join(process.cwd(), ".uploads")

export const localStorage: StorageProvider = {
  async uploadFile({ companyId, buffer, mimeType, originalName }) {
    const safeName = originalName.replace(/[^\w.\-]/g, "_")
    const objectPath = `sources/${companyId}/${Date.now()}-${safeName}`
    const full = path.join(ROOT, objectPath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, buffer)
    await fs.writeFile(full + ".meta", mimeType, "utf8") // lưu mime để đọc lại
    return { objectPath }
  },
  async readFile(objectPath) {
    const full = path.join(ROOT, objectPath)
    const buffer = await fs.readFile(full)
    let mimeType: string | undefined
    try { mimeType = await fs.readFile(full + ".meta", "utf8") } catch {}
    return { buffer, mimeType }
  },
  async getReadUrl(objectPath) {
    return `/api/files/${objectPath}` // được phục vụ qua route API
  },
}
