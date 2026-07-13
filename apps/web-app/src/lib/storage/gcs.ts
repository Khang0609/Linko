import type { StorageProvider } from "./types"

async function getBucket() {
  const { Storage } = await import("@google-cloud/storage")
  return new Storage().bucket(process.env.GCS_BUCKET!)
}

export const gcsStorage: StorageProvider = {
  async uploadFile({ companyId, buffer, mimeType, originalName }) {
    const bucket = await getBucket()
    const safeName = originalName.replace(/[^\w.\-]/g, "_")
    const objectPath = `sources/${companyId}/${Date.now()}-${safeName}`
    await bucket.file(objectPath).save(buffer, { contentType: mimeType, resumable: false })
    return { objectPath }
  },
  async readFile(objectPath) {
    const bucket = await getBucket()
    const [buffer] = await bucket.file(objectPath).download()
    return { buffer }
  },
  async getReadUrl(objectPath) {
    const bucket = await getBucket()
    const [url] = await bucket.file(objectPath).getSignedUrl({
      version: "v4", action: "read", expires: Date.now() + 15 * 60 * 1000,
    })
    return url
  },
}
