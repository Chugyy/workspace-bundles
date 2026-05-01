import { apiClient } from '@/lib/api-client'
import type { BrowseResponse, Workspace } from '@/types/workspaces'

export const workspacesService = {
  async list(): Promise<Workspace[]> {
    const { data } = await apiClient.get('/workspaces')
    return data
  },

  async create(name: string): Promise<Workspace> {
    const { data } = await apiClient.post('/workspaces', { name })
    return data
  },

  async browse(workspaceId: string, path = ''): Promise<BrowseResponse> {
    const { data } = await apiClient.get(`/workspaces/${workspaceId}/browse`, {
      params: path ? { path } : undefined,
    })
    return data
  },

  downloadUrl(workspaceId: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${base}/workspaces/${workspaceId}/download`
  },

  async readFile(workspaceId: string, path: string): Promise<{ path: string; content: string; type: string }> {
    const { data } = await apiClient.get(`/workspaces/${workspaceId}/file`, { params: { path } })
    return data
  },

  async saveFile(workspaceId: string, path: string, content: string): Promise<void> {
    await apiClient.put(`/workspaces/${workspaceId}/file`, { path, content })
  },

  async applyProfile(workspaceId: string, profileId: string, items: string[]): Promise<Workspace> {
    const { data } = await apiClient.post(`/workspaces/${workspaceId}/apply-profile`, { profile_id: profileId, items })
    return data
  },

  async deleteFile(workspaceId: string, path: string): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/file`, { params: { path } })
  },

  async duplicateFile(workspaceId: string, path: string): Promise<{ duplicate: string }> {
    const { data } = await apiClient.post(`/workspaces/${workspaceId}/file/duplicate`, { path })
    return data
  },

  fileDownloadUrl(workspaceId: string, path: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${base}/workspaces/${workspaceId}/file/download?path=${encodeURIComponent(path)}`
  },

  async copyFile(workspaceId: string, path: string, dstWorkspaceId: string, dstPath: string): Promise<{ new_path: string }> {
    const { data } = await apiClient.post(`/workspaces/${workspaceId}/file/copy`, {
      path, dst_workspace_id: dstWorkspaceId, dst_path: dstPath,
    })
    return data
  },

  async moveFile(workspaceId: string, path: string, dstWorkspaceId: string, dstPath: string): Promise<{ new_path: string }> {
    const { data } = await apiClient.post(`/workspaces/${workspaceId}/file/move`, {
      path, dst_workspace_id: dstWorkspaceId, dst_path: dstPath,
    })
    return data
  },

  async updateColor(workspaceId: string, color: string): Promise<Workspace> {
    const { data } = await apiClient.patch(`/workspaces/${workspaceId}`, { color })
    return data
  },

  async rename(workspaceId: string, name: string): Promise<Workspace> {
    const { data } = await apiClient.patch(`/workspaces/${workspaceId}`, { name })
    return data
  },

  async delete(workspaceId: string): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}`)
  },

  async getSessionCount(workspaceId: string): Promise<number> {
    const { data } = await apiClient.get('/sessions', { params: { workspace_id: workspaceId, limit: 1 } })
    return data.total ?? 0
  },
}

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  browse: (id: string, path: string) => [...workspaceKeys.all, 'browse', id, path] as const,
}

export function createWorkspaceService(workspaceId: string): import('@/types/files').FileContainerService {
  return {
    id: workspaceId,
    cacheKey: workspaceKeys.all,
    browse: (path) => workspacesService.browse(workspaceId, path),
    readFile: (path) => workspacesService.readFile(workspaceId, path),
    saveFile: (path, content) => workspacesService.saveFile(workspaceId, path, content),
    deleteFile: (path) => workspacesService.deleteFile(workspaceId, path),
    duplicateFile: (path) => workspacesService.duplicateFile(workspaceId, path),
    fileDownloadUrl: (path) => workspacesService.fileDownloadUrl(workspaceId, path),
    downloadUrl: () => workspacesService.downloadUrl(workspaceId),
    copyFileTo: (path, dstId, dstPath) => workspacesService.copyFile(workspaceId, path, dstId, dstPath),
    moveFileTo: (path, dstId, dstPath) => workspacesService.moveFile(workspaceId, path, dstId, dstPath),
  }
}
