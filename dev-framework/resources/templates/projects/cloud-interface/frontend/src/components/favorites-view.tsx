"use client";

import { useFavorites, useToggleFavorite } from "@/hooks/use-storage";
import { getFileIcon, FolderIcon } from "@/lib/file-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink } from "lucide-react";

type FavoritesViewProps = {
  onNavigateToItem: (folderId: string) => void;
};

export function FavoritesView({ onNavigateToItem }: FavoritesViewProps) {
  const { data: favoritesData, isLoading } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const allFavorites = [
    ...(favoritesData?.files || []).map((f: any) => ({ ...f, type: "file" })),
    ...(favoritesData?.folders || []).map((f: any) => ({ ...f, type: "folder" })),
  ];

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleRemoveFavorite = (id: string, type: "file" | "folder") => {
    toggleFavorite.mutate({ id, type, isFavorite: false });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                Loading favorites...
              </TableCell>
            </TableRow>
          ) : allFavorites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                No favorites yet
              </TableCell>
            </TableRow>
          ) : (
            allFavorites.map((item: any) => {
              const Icon = item.type === 'folder' ? FolderIcon : getFileIcon(item.name);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.type === 'folder' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      <span>{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.type === 'folder' ? (item.parent_id ? 'In subfolder' : 'Root') : (item.folder_id ? 'In folder' : 'Root')}
                  </TableCell>
                  <TableCell>{formatSize(item.size)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => (item.type === 'folder' ? onNavigateToItem(item.id) : item.folder_id && onNavigateToItem(item.folder_id))}
                        title="Go to location"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFavorite(item.id, item.type)}
                        title="Remove from favorites"
                      >
                        <Star className="h-4 w-4 fill-current" />
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
  );
}
