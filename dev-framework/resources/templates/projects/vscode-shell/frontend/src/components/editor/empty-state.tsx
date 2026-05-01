import { FileCode2 } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
      <FileCode2 className="w-16 h-16 text-[#3e3e3e]" />
      <div className="text-center">
        <p className="text-[#6b6b6b] text-sm">No file open</p>
        <p className="text-[#454545] text-xs mt-1">
          Select a file from the explorer to start editing
        </p>
      </div>
    </div>
  )
}
