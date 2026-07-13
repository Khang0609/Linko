export interface UploadOpts {
  companyId: string
  buffer: Buffer
  mimeType: string
  originalName: string
}
export interface StorageProvider {
  uploadFile(opts: UploadOpts): Promise<{ objectPath: string }>
  readFile(objectPath: string): Promise<{ buffer: Buffer; mimeType?: string }>
  getReadUrl(objectPath: string): Promise<string>
}
