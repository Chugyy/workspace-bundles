'use client'

import { X, Terminal, FileText, File, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tab } from '@/types/workspace.types'

interface TabItemProps {
  tab: Tab
  index: number
  isActive: boolean
  isDragOver: boolean
  onSelect: () => void
  onClose: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function TabIcon({ tab }: { tab: Tab }) {
  if (tab.type === 'terminal') {
    return <Terminal className="w-3.5 h-3.5 flex-shrink-0 text-[#4ec9b0]" />
  }
  const ext = tab.name.split('.').pop()?.toLowerCase()
  if (ext === 'md') {
    return <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[#519aba]" />
  }
  return <File className="w-3.5 h-3.5 flex-shrink-0 text-[#8b8b8b]" />
}

export function TabItem({
  tab,
  index,
  isActive,
  isDragOver,
  onSelect,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TabItemProps) {
  return (
    <div
      role="tab"
      aria-selected={isActive}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
        onDragStart()
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-center gap-1.5 h-[35px] px-3 border-r border-[#3e3e3e] cursor-pointer select-none text-[13px] min-w-0 max-w-[200px] flex-shrink-0 transition-[border-color] duration-150',
        isActive
          ? 'bg-[#1e1e1e] text-[#ffffff] border-t-2 border-t-[#0078d4]'
          : 'bg-[#2d2d2d] text-[#8b8b8b] hover:bg-[#1e1e1e] hover:text-[#cccccc]',
        isDragOver && 'border-l-2 border-l-[#0078d4]'
      )}
      onClick={onSelect}
    >
      <TabIcon tab={tab} />
      <span className="truncate">{tab.name}</span>
      {/* Fixed-size action zone: always 18px wide, contains either dirty dot or close button */}
      <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
        {tab.isDirty ? (
          <>
            {/* Dirty dot: visible by default, hidden on hover to show close */}
            <Circle className="w-2.5 h-2.5 fill-[#cccccc] text-[#cccccc] group-hover:hidden" />
            <button
              className="hidden group-hover:flex items-center justify-center rounded-sm hover:bg-[#3e3e3e] w-[18px] h-[18px]"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            className="flex items-center justify-center rounded-sm hover:bg-[#3e3e3e] w-[18px] h-[18px]"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
