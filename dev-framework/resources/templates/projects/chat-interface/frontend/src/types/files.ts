import type { BrowseResponse } from '@/types/workspaces'

export interface FileContainerService {
  id: string
  cacheKey: readonly string[]
  browse(path: string): Promise<BrowseResponse>
  readFile(path: string): Promise<{ path: string; content: string; type: string }>
  saveFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  duplicateFile(path: string): Promise<{ duplicate: string }>
  fileDownloadUrl(path: string): string
  downloadUrl(): string
  // Optional: cross-container ops (workspaces only)
  copyFileTo?: (path: string, dstId: string, dstPath: string) => Promise<{ new_path: string }>
  moveFileTo?: (path: string, dstId: string, dstPath: string) => Promise<{ new_path: string }>
}
