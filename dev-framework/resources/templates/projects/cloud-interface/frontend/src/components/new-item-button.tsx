"use client";

import { useState, useRef } from "react";
import { useCreateFolder, useUploadFile } from "@/hooks/use-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type NewItemButtonProps = {
  currentFolderId: string | null;
};

export function NewItemButton({ currentFolderId }: NewItemButtonProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFolder = useCreateFolder();
  const uploadFile = useUploadFile();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate(
      { name: newFolderName, parentId: currentFolderId ?? undefined },
      {
        onSuccess: () => {
          toast.success("Folder created");
          setNewFolderName("");
          setDialogOpen(false);
        },
        onError: () => {
          toast.error("Failed to create folder");
        },
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      uploadFile.mutate(
        {
          folderId: currentFolderId,
          file,
        },
        {
          onSuccess: () => {
            toast.success(`${file.name} uploaded`);
          },
          onError: () => {
            toast.error(`Failed to upload ${file.name}`);
          },
        }
      );
    });

    e.target.value = "";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            New Folder
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            Upload Files
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
