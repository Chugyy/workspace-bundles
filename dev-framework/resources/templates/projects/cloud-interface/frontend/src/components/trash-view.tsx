"use client";

import { getFileIcon, FolderIcon } from "@/lib/file-icons";
import { useTrash } from "@/hooks/use-trash";
import type { TrashItem } from "@/lib/trash-api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Trash2 } from "lucide-react";

type CombinedItem = TrashItem & { type: 'file' | 'folder' };

type TrashViewProps = {
  selectedItems: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRequestRestore: (item: CombinedItem) => void;
  onRequestDelete: (item: CombinedItem) => void;
  onRequestRestoreAll: () => void;
  onRequestDeleteAll: () => void;
};

export function TrashView({
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onRequestRestore,
  onRequestDelete,
  onRequestRestoreAll,
  onRequestDeleteAll,
}: TrashViewProps) {

  const { data: trashData, isLoading } = useTrash();

  const trashedItems: CombinedItem[] = trashData
    ? [
        ...trashData.folders.map(f => ({ ...f, type: 'folder' as const })),
        ...trashData.files.map(f => ({ ...f, type: 'file' as const })),
      ].sort((a, b) =>
        new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      )
    : [];

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const allSelected = trashedItems.length > 0 && selectedItems.size === trashedItems.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading trash...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trashedItems.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onRequestRestoreAll}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore All
          </Button>
          <Button
            variant="destructive"
            onClick={onRequestDeleteAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        </div>
      )}

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trashedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Trash is empty
                  </TableCell>
                </TableRow>
              ) : (
                trashedItems.map((item) => {
                  const Icon = item.type === 'folder' ? FolderIcon : getFileIcon(item.name);
                  return (
                    <TableRow key={item.id} data-state={selectedItems.has(item.id) ? "selected" : undefined}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => onToggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${item.type === 'folder' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          <span>{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {item.type}
                      </TableCell>
                      <TableCell>{formatSize(item.size)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.deleted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRequestRestore(item)}
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRequestDelete(item)}
                            title="Delete permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
