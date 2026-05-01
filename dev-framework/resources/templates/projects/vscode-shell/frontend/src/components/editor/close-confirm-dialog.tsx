'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CloseConfirmDialogProps {
  open: boolean
  fileName: string
  onCancel: () => void
  onDiscard: () => void
  onSave: () => void
}

export function CloseConfirmDialog({
  open,
  fileName,
  onCancel,
  onDiscard,
  onSave,
}: CloseConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-[#252526] border-[#3e3e3e] text-[#cccccc] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#cccccc]">Unsaved changes</DialogTitle>
          <DialogDescription className="text-[#8b8b8b]">
            <span className="font-medium text-[#cccccc]">{fileName}</span> has unsaved changes. What do you want to do?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="ghost"
            className="text-[#cccccc] hover:bg-[#3e3e3e]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="ghost"
            className="text-red-400 hover:bg-[#3e3e3e] hover:text-red-300"
            onClick={onDiscard}
          >
            Close without saving
          </Button>
          <Button
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
            onClick={onSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
