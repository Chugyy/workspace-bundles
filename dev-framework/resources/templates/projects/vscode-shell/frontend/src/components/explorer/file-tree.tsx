'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useFileTree, useCreateFile, useCreateDirectory, useRenameFile, useDeleteFile, useCopyFile, useMoveFile, useUploadFile } from '@/services/files/files.hooks'
import { useFileTreeState } from '@/hooks/use-file-tree'
import { useWorkspace } from '@/contexts/workspace-context'
import { Skeleton } from '@/components/ui/skeleton'
import { FileTreeItem } from './file-tree-item'
import { InlineInput } from './inline-input'
import type { FileEntry } from '@/services/files/files.types'

interface CreatingState {
  parentPath: string
  type: 'file' | 'directory'
}

interface FileTreeNodeProps {
  path: string
  depth: number
  isExpanded: (path: string) => boolean
  onToggle: (path: string) => void
  selectedPath: string | null
  onSelect: (entry: FileEntry) => void
  renamingPath: string | null
  onRename: (oldPath: string, newName: string) => void
  onDelete: (path: string, name: string) => void
  onDuplicate: (path: string) => void
  onNewFile: (parentPath: string) => void
  onNewFolder: (parentPath: string) => void
  onUpload: (directoryPath: string) => void
  onStartRename: (path: string) => void
  onCancelRename: () => void
  onDrop: (srcPath: string, destDirPath: string) => void
  creating: CreatingState | null
  onCreateSubmit: (name: string) => void
  onCreateCancel: () => void
}

function FileTreeNode({
  path,
  depth,
  isExpanded,
  onToggle,
  selectedPath,
  onSelect,
  renamingPath,
  onRename,
  onDelete,
  onDuplicate,
  onNewFile,
  onNewFolder,
  onUpload,
  onStartRename,
  onCancelRename,
  onDrop,
  creating,
  onCreateSubmit,
  onCreateCancel,
}: FileTreeNodeProps) {
  const { data: entries, isLoading } = useFileTree(path)

  if (isLoading) {
    return (
      <div style={{ paddingLeft: depth * 12 + 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[22px] w-3/4 mb-1" />
        ))}
      </div>
    )
  }

  return (
    <>
      {creating && creating.parentPath === path && (
        <InlineInput
          depth={depth}
          type={creating.type}
          onSubmit={onCreateSubmit}
          onCancel={onCreateCancel}
        />
      )}
      {entries?.map((entry) => (
        <div key={entry.path}>
          <FileTreeItem
            entry={entry}
            depth={depth}
            isExpanded={isExpanded(entry.path)}
            isSelected={selectedPath === entry.path}
            isRenaming={renamingPath === entry.path}
            onToggle={onToggle}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onNewFile={onNewFile}
            onNewFolder={onNewFolder}
            onUpload={onUpload}
            onStartRename={onStartRename}
            onCancelRename={onCancelRename}
            onDrop={onDrop}
          />
          {entry.type === 'directory' && isExpanded(entry.path) && (
            <FileTreeNode
              path={entry.path}
              depth={depth + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
              renamingPath={renamingPath}
              onRename={onRename}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onNewFile={onNewFile}
              onNewFolder={onNewFolder}
              onUpload={onUpload}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              onDrop={onDrop}
              creating={creating}
              onCreateSubmit={onCreateSubmit}
              onCreateCancel={onCreateCancel}
            />
          )}
        </div>
      ))}
    </>
  )
}

interface FileTreeProps {
  selectedPath: string | null
  collapseAllRef?: React.MutableRefObject<(() => void) | null>
  newFileRef?: React.MutableRefObject<(() => void) | null>
  newFolderRef?: React.MutableRefObject<(() => void) | null>
  onFileSelect?: () => void
}

export function FileTree({ selectedPath, collapseAllRef, newFileRef, newFolderRef, onFileSelect }: FileTreeProps) {
  const { fileTreeRootPath, activeSession, addTab } = useWorkspace()
  const { toggle, isExpanded, collapseAll, expand } = useFileTreeState()

  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [creating, setCreating] = useState<CreatingState | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const uploadDirRef = useRef<string>('')

  const createFileMutation = useCreateFile()
  const createDirMutation = useCreateDirectory()
  const renameMutation = useRenameFile()
  const deleteMutation = useDeleteFile()
  const copyMutation = useCopyFile()
  const moveMutation = useMoveFile()
  const uploadMutation = useUploadFile()

  useEffect(() => {
    if (collapseAllRef) {
      collapseAllRef.current = collapseAll
    }
  }, [collapseAllRef, collapseAll])

  const handleSelect = useCallback(
    (entry: FileEntry) => {
      if (!activeSession) return
      addTab(activeSession.id, entry.path, entry.name)
      onFileSelect?.()
    },
    [activeSession, addTab, onFileSelect]
  )

  const handleRename = useCallback(
    (oldPath: string, newName: string) => {
      const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const newPath = `${parentDir}/${newName}`
      renameMutation.mutate(
        { oldPath, newPath },
        {
          onSuccess: () => {
            toast.success(`Renamed to ${newName}`)
            setRenamingPath(null)
          },
          onError: () => toast.error('Failed to rename'),
        }
      )
    },
    [renameMutation]
  )

  const handleDelete = useCallback(
    (path: string, name: string) => {
      if (!window.confirm(`Delete "${name}"?`)) return
      deleteMutation.mutate(path, {
        onSuccess: () => toast.success(`Deleted ${name}`),
        onError: () => toast.error('Failed to delete'),
      })
    },
    [deleteMutation]
  )

  const handleDuplicate = useCallback(
    (path: string) => {
      const lastDot = path.lastIndexOf('.')
      const lastSlash = path.lastIndexOf('/')
      const hasExtension = lastDot > lastSlash
      const destPath = hasExtension
        ? `${path.substring(0, lastDot)} (copy)${path.substring(lastDot)}`
        : `${path} (copy)`
      copyMutation.mutate(
        { srcPath: path, destPath },
        {
          onSuccess: () => toast.success('Duplicated'),
          onError: () => toast.error('Failed to duplicate'),
        }
      )
    },
    [copyMutation]
  )

  const handleNewFile = useCallback(
    (parentPath: string) => {
      expand(parentPath)
      setCreating({ parentPath, type: 'file' })
    },
    [expand]
  )

  const handleNewFolder = useCallback(
    (parentPath: string) => {
      expand(parentPath)
      setCreating({ parentPath, type: 'directory' })
    },
    [expand]
  )

  useEffect(() => {
    if (newFileRef) {
      newFileRef.current = () => handleNewFile(fileTreeRootPath)
    }
  }, [newFileRef, fileTreeRootPath, handleNewFile])

  useEffect(() => {
    if (newFolderRef) {
      newFolderRef.current = () => handleNewFolder(fileTreeRootPath)
    }
  }, [newFolderRef, fileTreeRootPath, handleNewFolder])

  const handleCreateSubmit = useCallback(
    (name: string) => {
      if (!creating) return
      const fullPath = `${creating.parentPath}/${name}`
      const mutation = creating.type === 'file' ? createFileMutation : createDirMutation
      mutation.mutate(fullPath, {
        onSuccess: () => {
          toast.success(`Created ${name}`)
          setCreating(null)
        },
        onError: () => toast.error(`Failed to create ${name}`),
      })
    },
    [creating, createFileMutation, createDirMutation]
  )

  const handleUpload = useCallback((directoryPath: string) => {
    uploadDirRef.current = directoryPath
    uploadInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      uploadMutation.mutate(
        { directoryPath: uploadDirRef.current, file },
        {
          onSuccess: () => toast.success(`Uploaded ${file.name}`),
          onError: () => toast.error('Failed to upload'),
        }
      )
      e.target.value = ''
    },
    [uploadMutation]
  )

  const handleDrop = useCallback(
    (srcPath: string, destDirPath: string) => {
      const fileName = srcPath.substring(srcPath.lastIndexOf('/') + 1)
      const destPath = `${destDirPath}/${fileName}`
      moveMutation.mutate(
        { srcPath, destPath },
        {
          onSuccess: () => toast.success(`Moved ${fileName}`),
          onError: () => toast.error('Failed to move'),
        }
      )
    },
    [moveMutation]
  )

  return (
    <div role="tree" className="py-1 overflow-auto h-full">
      <FileTreeNode
        path={fileTreeRootPath}
        depth={0}
        isExpanded={isExpanded}
        onToggle={toggle}
        selectedPath={selectedPath}
        onSelect={handleSelect}
        renamingPath={renamingPath}
        onRename={handleRename}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onUpload={handleUpload}
        onStartRename={setRenamingPath}
        onCancelRename={() => setRenamingPath(null)}
        onDrop={handleDrop}
        creating={creating}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={() => setCreating(null)}
      />
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  )
}
