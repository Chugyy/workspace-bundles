import { apiClient } from '@/lib/api-client'
import type { FileEntry, WriteFilePayload, RenamePayload, CopyPayload, MovePayload } from './files.types'

export const filesService = {
  list: async (path: string): Promise<FileEntry[]> => {
    const { data } = await apiClient.get<FileEntry[]>('/files/list', {
      params: { path },
    })
    return data
  },

  read: async (path: string): Promise<string> => {
    const { data } = await apiClient.get<{ content: string }>('/files/read', {
      params: { path },
    })
    return data.content
  },

  write: async (payload: WriteFilePayload): Promise<void> => {
    await apiClient.put('/files/write', payload)
  },

  createFile: async (path: string): Promise<void> => {
    await apiClient.post('/files/create-file', { path })
  },

  createDirectory: async (path: string): Promise<void> => {
    await apiClient.post('/files/create-directory', { path })
  },

  rename: async (payload: RenamePayload): Promise<void> => {
    await apiClient.post('/files/rename', payload)
  },

  deleteFile: async (path: string): Promise<void> => {
    await apiClient.delete('/files/delete', { data: { path } })
  },

  copy: async (payload: CopyPayload): Promise<void> => {
    await apiClient.post('/files/copy', payload)
  },

  move: async (payload: MovePayload): Promise<void> => {
    await apiClient.post('/files/move', payload)
  },

  upload: async (directoryPath: string, file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('path', directoryPath)
    formData.append('file', file)
    await apiClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const fileKeys = {
  all: ['files'] as const,
  list: (path: string) => [...fileKeys.all, 'list', path] as const,
  content: (path: string) => [...fileKeys.all, 'content', path] as const,
}
