"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, Home } from "lucide-react";
import { listFolders } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FolderType = {
  id: string;
  name: string;
  parent_id: string | null;
};

type FileTreeProps = {
  onFolderClick: (folderId: string | null) => void;
  currentFolderId: string | null;
};

export function FileTree({ onFolderClick, currentFolderId }: FileTreeProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllFolders();
  }, []);

  const loadAllFolders = async () => {
    try {
      const res = await listFolders();
      setFolders(res.folders || []);
    } catch {
      toast.error("Failed to load folders");
    }
  };

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpanded(newExpanded);
  };

  const renderFolder = (folder: FolderType, depth = 0) => {
    const children = folders.filter((f) => f.parent_id === folder.id);
    const isExpanded = expanded.has(folder.id);
    const isActive = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <button
          onClick={() => onFolderClick(folder.id)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent",
            isActive && "bg-accent font-medium"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {children.length === 0 && <div className="w-5" />}
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate">{folder.name}</span>
        </button>
        {isExpanded &&
          children.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => f.parent_id === null);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onFolderClick(null)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent",
          currentFolderId === null && "bg-accent font-medium"
        )}
      >
        <Home className="h-4 w-4" />
        <span>Home</span>
      </button>
      {rootFolders.map((folder) => renderFolder(folder))}
    </div>
  );
}
