export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modified: number
}

export interface ResizeMessage {
  type: 'resize'
  cols: number
  rows: number
}

export interface ApiError {
  error: string
  statusCode?: number
}

export interface LoginBody {
  password: string
}

export interface WriteBody {
  path: string
  content: string
}

export interface PathBody {
  path: string
}

export interface RenameBody {
  oldPath: string
  newPath: string
}

export interface CopyMoveBody {
  srcPath: string
  destPath: string
}
