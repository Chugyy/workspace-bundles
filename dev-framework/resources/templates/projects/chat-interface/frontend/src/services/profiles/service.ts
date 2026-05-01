import { apiClient } from '@/lib/api-client'
import type { Profile, ProfileItem } from '@/types/profiles'
import type { BrowseResponse } from '@/types/workspaces'
import type { FileContainerService } from '@/types/files'

const BASE = '/claude-profiles'

export const profilesService = {
  async list(): Promise<Profile[]> {
    const { data } = await apiClient.get(BASE)
    return data
  },

  async create(name: string): Promise<Profile> {
    const { data } = await apiClient.post(BASE, { name })
    return data
  },

  async updateColor(profileId: string, color: string): Promise<Profile> {
    const { data } = await apiClient.patch(`${BASE}/${profileId}`, { color })
    return data
  },

  async getItems(profileId: string, workspaceId?: string): Promise<ProfileItem[]> {
    const { data } = await apiClient.get(`${BASE}/${profileId}/items`, {
      params: workspaceId ? { workspace_id: workspaceId } : undefined,
    })
    return data
  },

  async delete(profileId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${profileId}`)
  },

  // File operations
  async browse(profileId: string, path = ''): Promise<BrowseResponse> {
    const { data } = await apiClient.get(`${BASE}/${profileId}/browse`, {
      params: path ? { path } : undefined,
    })
    return data
  },

  async readFile(profileId: string, path: string): Promise<{ path: string; content: string; type: string }> {
    const { data } = await apiClient.get(`${BASE}/${profileId}/file`, { params: { path } })
    return data
  },

  async saveFile(profileId: string, path: string, content: string): Promise<void> {
    await apiClient.put(`${BASE}/${profileId}/file`, { path, content })
  },

  async deleteFile(profileId: string, path: string): Promise<void> {
    await apiClient.delete(`${BASE}/${profileId}/file`, { params: { path } })
  },

  async duplicateFile(profileId: string, path: string): Promise<{ duplicate: string }> {
    const { data } = await apiClient.post(`${BASE}/${profileId}/file/duplicate`, { path })
    return data
  },

  fileDownloadUrl(profileId: string, path: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${base}${BASE}/${profileId}/file/download?path=${encodeURIComponent(path)}`
  },

  downloadUrl(profileId: string): string {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${base}${BASE}/${profileId}/download`
  },
}

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  items: (id: string) => [...profileKeys.all, 'items', id] as const,
  browse: (id: string, path: string) => [...profileKeys.all, 'browse', id, path] as const,
}

export function createProfileService(profileId: string): FileContainerService {
  return {
    id: profileId,
    cacheKey: profileKeys.all,
    browse: (path) => profilesService.browse(profileId, path),
    readFile: (path) => profilesService.readFile(profileId, path),
    saveFile: (path, content) => profilesService.saveFile(profileId, path, content),
    deleteFile: (path) => profilesService.deleteFile(profileId, path),
    duplicateFile: (path) => profilesService.duplicateFile(profileId, path),
    fileDownloadUrl: (path) => profilesService.fileDownloadUrl(profileId, path),
    downloadUrl: () => profilesService.downloadUrl(profileId),
  }
}
