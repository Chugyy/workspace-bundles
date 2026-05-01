"use client";

import { useState } from "react";
import { getFileIcon, FolderIcon } from "@/lib/file-icons";
import { useDownloadFile } from "@/hooks/use-storage";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, ChevronRight, Copy, Star, Pencil, Check, X, Share2 } from "lucide-react";
import { toast } from "sonner";
import { FilePreview } from "@/components/file-preview";
import { ShareDialog } from "@/components/share-dialog";
import { renameFile, renameFolder } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type FolderType = {
  id: string;
  name: string;
  parent_id: string | null;
};

type FileType = {
  id: string;
  name: string;
  size: number;
  created_at: string;
};

type FileTableProps = {
  folders: FolderType[];
  files: FileType[];
  selectedItems: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onFolderClick: (folderId: string) => void;
  onRequestDeleteFolder?: (folderId: string, folderName: string) => void;
  onRequestDeleteFile?: (fileId: string, fileName: string) => void;
  onDuplicateFile: (fileId: string) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string, type: 'file' | 'folder') => void;
};

export function FileTable({
  folders,
  files,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onFolderClick,
  onRequestDeleteFolder,
  onRequestDeleteFile,
  onDuplicateFile,
  favorites = new Set(),
  onToggleFavorite,
}: FileTableProps) {
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string } | null>(null);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const downloadFile = useDownloadFile();
  const queryClient = useQueryClient();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const allFileIds = files.map((f) => `file-${f.id}`);
  const allSelected = files.length > 0 && selectedItems.size === allFileIds.length;

  const startEdit = (id: string, type: 'file' | 'folder', name: string) => {
    setEditingItem({ id, type, name });
    // Pour les fichiers, ne montrer que le nom sans extension
    if (type === 'file') {
      const lastDot = name.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? name.substring(0, lastDot) : name;
      setEditValue(nameWithoutExt);
    } else {
      setEditValue(name);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingItem || !editValue.trim()) return;

    try {
      if (editingItem.type === 'file') {
        // Récupérer l'extension du nom original
        const lastDot = editingItem.name.lastIndexOf('.');
        const extension = lastDot > 0 ? editingItem.name.substring(lastDot) : '';
        const newName = editValue.trim() + extension;

        await renameFile(editingItem.id, newName);
        queryClient.invalidateQueries({ queryKey: ["files"] });
        toast.success("File renamed");
      } else {
        await renameFolder(editingItem.id, editValue.trim());
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        toast.success("Folder renamed");
      }
      setEditingItem(null);
      setEditValue("");
    } catch {
      toast.error("Failed to rename");
    }
  };

  return (
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
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {folders.map((folder) => {
          const itemId = `folder-${folder.id}`;
          return (
            <TableRow
              key={itemId}
              className="cursor-pointer"
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox disabled className="invisible" />
              </TableCell>
              <TableCell
                onClick={() => editingItem?.id !== folder.id && onFolderClick(folder.id)}
              >
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-blue-500" />
                  {editingItem?.id === folder.id && editingItem.type === 'folder' ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onBlur={saveEdit}
                        autoFocus
                        className="h-7"
                      />
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleFavorite?.(folder.id, 'folder') ?? toast.info("Favorite coming soon")}
                  >
                    <Star className={`h-4 w-4 ${favorites.has(folder.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(folder.id, 'folder', folder.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRequestDeleteFolder?.(folder.id, folder.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {files.map((file) => {
          const itemId = `file-${file.id}`;
          const Icon = getFileIcon(file.name);
          return (
            <TableRow
              key={itemId}
              data-state={selectedItems.has(itemId) ? "selected" : undefined}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedItems.has(itemId)}
                  onCheckedChange={() => onToggleSelect(itemId)}
                />
              </TableCell>
              <TableCell
                className={editingItem?.id !== file.id ? "cursor-pointer hover:underline" : ""}
                onClick={() => editingItem?.id !== file.id && setPreviewFile({ id: file.id, name: file.name })}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {editingItem?.id === file.id && editingItem.type === 'file' ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onBlur={saveEdit}
                        autoFocus
                        className="h-7"
                      />
                    </div>
                  ) : (
                    <span>{file.name}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{formatSize(file.size)}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleFavorite?.(file.id, 'file') ?? toast.info("Favorite coming soon")}
                  >
                    <Star className={`h-4 w-4 ${favorites.has(file.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShareFileId(file.id)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      downloadFile.mutate(
                        { fileId: file.id, filename: file.name },
                        {
                          onSuccess: () => toast.success("Downloading..."),
                          onError: () => toast.error("Failed to download"),
                        }
                      );
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicateFile(file.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(file.id, 'file', file.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRequestDeleteFile?.(file.id, file.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      </Table>

      <FilePreview
        fileId={previewFile?.id || null}
        filename={previewFile?.name || ""}
        onClose={() => setPreviewFile(null)}
      />

      <ShareDialog
        fileId={shareFileId}
        onClose={() => setShareFileId(null)}
      />
    </div>
  );
}
