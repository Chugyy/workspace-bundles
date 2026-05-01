export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

export interface WriteFilePayload {
  path: string
  content: string
}

export interface RenamePayload {
  oldPath: string
  newPath: string
}

export interface CopyPayload {
  srcPath: string
  destPath: string
}

export interface MovePayload {
  srcPath: string
  destPath: string
}
