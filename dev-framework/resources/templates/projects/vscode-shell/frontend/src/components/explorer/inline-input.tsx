'use client'

import { useEffect, useRef, useState } from 'react'
import { File, Folder } from 'lucide-react'

interface InlineInputProps {
  depth: number
  type: 'file' | 'directory'
  onSubmit: (name: string) => void
  onCancel: () => void
}

export function InlineInput({ depth, type, onSubmit, onCancel }: InlineInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const paddingLeft = depth * 12 + 8

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onSubmit(trimmed)
    } else {
      onCancel()
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 h-[26px] select-none text-[13px] text-[#cccccc] pr-3"
      style={{ paddingLeft }}
    >
      <span className="w-3 flex-shrink-0" />
      {type === 'directory' ? (
        <Folder className="w-4 h-4 flex-shrink-0 text-[#dcb67a]" />
      ) : (
        <File className="w-4 h-4 flex-shrink-0 text-[#519aba]" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
          e.stopPropagation()
        }}
        onBlur={handleSubmit}
        className="flex-1 min-w-0 bg-[#3c3c3c] border border-[#007fd4] text-[#cccccc] text-[13px] px-1 py-0 h-[20px] outline-none rounded-sm"
      />
    </div>
  )
}
