export type LayoutWorkspaceNode = {
  type: 'workspace'
  id: string
}

export type LayoutFolderNode = {
  type: 'folder'
  id: string
  name: string
  children: LayoutNode[]
}

export type LayoutNode = LayoutWorkspaceNode | LayoutFolderNode

export interface LayoutResponse {
  tree: LayoutNode[]
  unsortedWorkspaceIds: string[]
}
