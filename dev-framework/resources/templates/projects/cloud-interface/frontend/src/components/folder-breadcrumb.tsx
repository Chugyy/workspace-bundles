"use client";

import { useEffect, useState } from "react";
import { listFolders } from "@/lib/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

type FolderType = {
  id: string;
  name: string;
  parent_id: string | null;
};

type FolderBreadcrumbProps = {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
};

export function FolderBreadcrumb({
  currentFolderId,
  onNavigate,
}: FolderBreadcrumbProps) {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [path, setPath] = useState<FolderType[]>([]);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const res = await listFolders();
        setFolders(res.folders || []);
      } catch {}
    };
    loadFolders();
  }, []);

  useEffect(() => {
    if (!currentFolderId || folders.length === 0) {
      setPath([]);
      return;
    }

    const buildPath = (folderId: string): FolderType[] => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return [];
      if (folder.parent_id === null) return [folder];
      return [...buildPath(folder.parent_id), folder];
    };

    setPath(buildPath(currentFolderId));
  }, [currentFolderId, folders]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {currentFolderId === null ? (
            <BreadcrumbPage className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Home
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink
              onClick={() => onNavigate(null)}
              className="flex items-center gap-1 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              Home
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {path.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === path.length - 1 ? (
                <BreadcrumbPage>{folder.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => onNavigate(folder.id)}
                  className="cursor-pointer"
                >
                  {folder.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
