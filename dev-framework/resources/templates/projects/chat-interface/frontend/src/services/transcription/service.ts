import { apiClient } from '@/lib/api-client'

export const transcriptionService = {
  async transcribe(blob: Blob): Promise<string> {
    const formData = new FormData()
    formData.append('audio', blob, 'audio.webm')
    const { data } = await apiClient.post<{ text: string }>('/transcribe', formData)
    return data.text
  },
}
