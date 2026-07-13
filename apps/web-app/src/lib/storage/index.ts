import { localStorage } from "./local"
import { gcsStorage } from "./gcs"
import type { StorageProvider } from "./types"

export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === "gcs" ? gcsStorage : localStorage
