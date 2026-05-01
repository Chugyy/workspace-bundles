export interface Workspace {
  id: string
  name: string
  color: string
  claudeProfileId: string | null
  includedItems: string[]
  appliedAt: string | null
  createdAt: string
}

export interface BrowseEntry {
  name: string
  type: 'file' | 'dir'
  size: number | null
}

export interface BrowseResponse {
  path: string
  entries: BrowseEntry[]
}
