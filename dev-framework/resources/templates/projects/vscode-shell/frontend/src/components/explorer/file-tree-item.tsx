'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileEntry } from '@/services/files/files.types'
import { apiClient } from '@/lib/api-client'

interface ContextMenuState {
  x: number
  y: number
}

interface FileTreeItemProps {
  entry: FileEntry
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isRenaming: boolean
  onToggle: (path: string) => void
  onSelect: (entry: FileEntry) => void
  onRename: (oldPath: string, newName: string) => void
  onDelete: (path: string, name: string) => void
  onDuplicate: (path: string) => void
  onNewFile: (parentPath: string) => void
  onNewFolder: (parentPath: string) => void
  onUpload: (directoryPath: string) => void
  onStartRename: (path: string) => void
  onCancelRename: () => void
  onDrop: (srcPath: string, destDirPath: string) => void
}

export function FileTreeItem({
  entry,
  depth,
  isExpanded,
  isSelected,
  isRenaming,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onNewFile,
  onNewFolder,
  onUpload,
  onStartRename,
  onCancelRename,
  onDrop,
}: FileTreeItemProps) {
  const isDir = entry.type === 'directory'
  const paddingLeft = depth * 12 + 8

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameValue, setRenameValue] = useState(entry.name)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(entry.name)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const dotIndex = entry.name.lastIndexOf('.')
          inputRef.current.setSelectionRange(0, dotIndex > 0 ? dotIndex : entry.name.length)
        }
      }, 0)
    }
  }, [isRenaming, entry.name])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
    }
  }, [contextMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== entry.name) {
      onRename(entry.path, trimmed)
    } else {
      onCancelRename()
    }
  }, [renameValue, entry.name, entry.path, onRename, onCancelRename])

  const parentPath = entry.path.substring(0, entry.path.lastIndexOf('/'))

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', entry.path)
      e.dataTransfer.effectAllowed = 'move'
    },
    [entry.path]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDir) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    },
    [isDir]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      if (!isDir) return
      e.preventDefault()
      setIsDragOver(false)
      const srcPath = e.dataTransfer.getData('text/plain')
      if (srcPath && srcPath !== entry.path && !entry.path.startsWith(srcPath + '/')) {
        onDrop(srcPath, entry.path)
      }
    },
    [isDir, entry.path, onDrop]
  )

  const contextMenuItems = [
    { label: 'New File', icon: FilePlus, action: () => onNewFile(isDir ? entry.path : parentPath) },
    { label: 'New Folder', icon: FolderPlus, action: () => onNewFolder(isDir ? entry.path : parentPath) },
    { type: 'separator' as const },
    { label: 'Rename', icon: Pencil, action: () => onStartRename(entry.path) },
    { label: 'Duplicate', icon: Copy, action: () => onDuplicate(entry.path) },
    { label: 'Delete', icon: Trash2, action: () => onDelete(entry.path, entry.name), danger: true },
    { type: 'separator' as const },
    {
      label: 'Download as .tar.gz',
      icon: Download,
      action: async () => {
        try {
          const response = await apiClient.get('/files/download-zip', {
            params: { path: entry.path },
            responseType: 'blob',
          })
          const url = URL.createObjectURL(response.data as Blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${entry.name}.tar.gz`
          a.click()
          URL.revokeObjectURL(url)
        } catch {
          // silently fail
        }
      },
    },
    ...(isDir
      ? [
          { label: 'Upload File', icon: Upload, action: () => onUpload(entry.path) },
        ]
      : []),
  ]

  return (
    <>
      <div
        ref={itemRef}
        role="treeitem"
        aria-expanded={isDir ? isExpanded : undefined}
        aria-selected={isSelected}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
        className={cn(
          'flex items-center gap-1.5 h-[26px] cursor-pointer select-none text-[13px] text-[#cccccc] hover:bg-[#2a2d2e] rounded-sm pr-3',
          isSelected && 'bg-[#094771] hover:bg-[#094771]',
          isDragOver && 'bg-[#383b3d] outline outline-1 outline-[#007fd4]'
        )}
        style={{ paddingLeft }}
        onClick={() => {
          if (isRenaming) return
          if (isDir) {
            onToggle(entry.path)
          } else {
            onSelect(entry)
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {isDir ? (
          <>
            <span className="text-[#cccccc] flex-shrink-0 w-3 h-3 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 flex-shrink-0 text-[#dcb67a]" />
            ) : (
              <Folder className="w-4 h-4 flex-shrink-0 text-[#dcb67a]" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <File className="w-4 h-4 flex-shrink-0 text-[#519aba]" />
          </>
        )}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') onCancelRename()
              e.stopPropagation()
            }}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-[#3c3c3c] border border-[#007fd4] text-[#cccccc] text-[13px] px-1 py-0 h-[20px] outline-none rounded-sm"
          />
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] bg-[#252526] border border-[#3e3e3e] rounded-md py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuItems.map((item, i) =>
            'type' in item && item.type === 'separator' ? (
              <div key={i} className="h-px bg-[#3e3e3e] my-1" />
            ) : (
              <button
                key={i}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left hover:bg-[#094771] transition-colors',
                  'danger' in item && item.danger ? 'text-[#f48771]' : 'text-[#cccccc]'
                )}
                onClick={() => {
                  setContextMenu(null)
                  if ('action' in item) item.action()
                }}
              >
                {'icon' in item && <item.icon className="w-3.5 h-3.5" />}
                {'label' in item && item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  )
}
