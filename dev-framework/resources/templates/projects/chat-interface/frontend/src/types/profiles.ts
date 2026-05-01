export interface Profile {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface ProfileItem {
  path: string
  type: 'file' | 'dir'
  isNew: boolean
}
