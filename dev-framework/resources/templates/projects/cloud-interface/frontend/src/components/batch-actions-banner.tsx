"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Copy, X, RotateCcw } from "lucide-react";

type BatchActionsBannerProps = {
  selectedCount: number;
  mode?: 'default' | 'trash';
  onDelete: () => void;
  onDuplicate?: () => void;
  onRestore?: () => void;
  onClear: () => void;
  hide?: boolean;
};

export function BatchActionsBanner({
  selectedCount,
  mode = 'default',
  onDelete,
  onDuplicate,
  onRestore,
  onClear,
  hide = false,
}: BatchActionsBannerProps) {
  if (selectedCount === 0 || hide) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-card border shadow-lg rounded-lg px-6 py-4 flex items-center gap-4">
        <span className="font-medium">
          {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-2">
          {mode === 'trash' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onRestore}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onDuplicate}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
