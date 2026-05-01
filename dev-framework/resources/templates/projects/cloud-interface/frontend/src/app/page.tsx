"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  useFolders,
  useFiles,
  useDeleteFolder,
  useDeleteFile,
  useDuplicateFile,
  useDuplicateFolder,
  useToggleFavorite,
  useFavorites,
} from "@/hooks/use-storage";
import {
  useRestoreFile,
  useRestoreFolder,
  useDeleteFilePermanently,
  useDeleteFolderPermanently,
  useEmptyTrash,
} from "@/hooks/use-trash";
import { CloudSidebar } from "@/components/cloud-sidebar";
import { FileTable } from "@/components/file-table";
import { FavoritesView } from "@/components/favorites-view";
import { TrashView } from "@/components/trash-view";
import { BatchActionsBanner } from "@/components/batch-actions-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { FolderBreadcrumb } from "@/components/folder-breadcrumb";
import { LogoutButton } from "@/components/logout-button";
import { NewItemButton } from "@/components/new-item-button";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

export default function CloudPage() {
  const router = useRouter();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'home' | 'favorites' | 'trash'>('home');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'default' | 'destructive';
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [hideBanner, setHideBanner] = useState(false);

  const { data: foldersData } = useFolders(currentFolderId ?? undefined);
  const { data: filesData } = useFiles(currentFolderId);
  const deleteFolder = useDeleteFolder();
  const deleteFile = useDeleteFile();
  const duplicateFile = useDuplicateFile();
  const duplicateFolder = useDuplicateFolder();
  const toggleFavorite = useToggleFavorite();
  const { data: favoritesData } = useFavorites();
  const restoreFile = useRestoreFile();
  const restoreFolder = useRestoreFolder();
  const deleteFilePermanently = useDeleteFilePermanently();
  const deleteFolderPermanently = useDeleteFolderPermanently();
  const emptyTrash = useEmptyTrash();

  const folders = foldersData?.folders || [];
  const files = filesData?.files || [];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (files.length > 0 || folders.length > 0) {
      const favSet = new Set<string>();
      files.forEach((f: any) => {
        if (f.is_favorite) favSet.add(f.id);
      });
      folders.forEach((folder: any) => {
        if (folder.is_favorite) favSet.add(folder.id);
      });
      setFavorites(favSet);
    }
  }, [files, folders]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleSelectAll = () => {
    const allFileIds = files.map((f: FileType) => `file-${f.id}`);
    if (selectedItems.size === allFileIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allFileIds));
    }
  };

  const extractIds = (items: Set<string>) => {
    const folderIds = Array.from(items)
      .filter((id) => id.startsWith("folder-"))
      .map((id) => id.replace("folder-", ""));
    const fileIds = Array.from(items)
      .filter((id) => id.startsWith("file-"))
      .map((id) => id.replace("file-", ""));
    return { folderIds, fileIds };
  };

  const handleRequestDeleteFolder = (folderId: string, folderName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Folder',
      description: `Are you sure you want to delete "${folderName}"?`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteFolder.mutateAsync(folderId);
          toast.success("Folder moved to trash");
          setConfirmDialog(null);
        } catch {
          toast.error("Failed to delete folder");
        }
      },
    });
  };

  const handleRequestDeleteFile = (fileId: string, fileName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete File',
      description: `Are you sure you want to delete "${fileName}"?`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteFile.mutateAsync(fileId);
          toast.success("File moved to trash");
          setConfirmDialog(null);
        } catch {
          toast.error("Failed to delete file");
        }
      },
    });
  };

  const handleBatchDelete = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Items',
      description: `Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}?`,
      variant: 'destructive',
      onConfirm: async () => {
        const { folderIds, fileIds } = extractIds(selectedItems);
        try {
          await Promise.all([
            ...folderIds.map(id => deleteFolder.mutateAsync(id)),
            ...fileIds.map(id => deleteFile.mutateAsync(id)),
          ]);
          toast.success(`${selectedItems.size} items moved to trash`);
          setSelectedItems(new Set());
          setConfirmDialog(null);
        } catch {
          toast.error("Failed to delete items");
        }
      },
    });
  };

  const handleBatchDuplicate = () => {
    setConfirmDialog({
      open: true,
      title: 'Duplicate Items',
      description: `Are you sure you want to duplicate ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}?`,
      variant: 'default',
      onConfirm: async () => {
        const { folderIds, fileIds } = extractIds(selectedItems);
        try {
          await Promise.all([
            ...folderIds.map(id => duplicateFolder.mutateAsync(id)),
            ...fileIds.map(id => duplicateFile.mutateAsync(id)),
          ]);
          toast.success(`${selectedItems.size} items duplicated`);
          setSelectedItems(new Set());
          setConfirmDialog(null);
        } catch {
          toast.error("Failed to duplicate items");
        }
      },
    });
  };

  const handleDuplicateFile = (fileId: string) => {
    duplicateFile.mutate(fileId);
  };

  const handleRequestRestoreItem = (item: {id: string; name: string; type: 'file' | 'folder'}) => {
    setConfirmDialog({
      open: true,
      title: 'Restore Item',
      description: `Are you sure you want to restore "${item.name}"?`,
      variant: 'default',
      onConfirm: async () => {
        try {
          if (item.type === 'file') {
            await restoreFile.mutateAsync(item.id);
          } else {
            await restoreFolder.mutateAsync(item.id);
          }
          toast.success(`${item.name} restored`);
          setSelectedItems(new Set());
        } catch (error) {
          toast.error("Failed to restore item");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleRequestDeleteItemPermanently = (item: {id: string; name: string; type: 'file' | 'folder'}) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Permanently',
      description: `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          if (item.type === 'file') {
            await deleteFilePermanently.mutateAsync(item.id);
          } else {
            await deleteFolderPermanently.mutateAsync(item.id);
          }
          toast.success(`${item.name} permanently deleted`);
          setSelectedItems(new Set());
        } catch (error) {
          toast.error("Failed to delete item");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const executeBatchRestore = () => {
    const ids = Array.from(selectedItems);

    Promise.all(
      ids.map((id) =>
        restoreFile.mutateAsync(id).catch(() => restoreFolder.mutateAsync(id))
      )
    ).then(() => {
      toast.success(`${selectedItems.size} items restored`);
      setSelectedItems(new Set());
    }).catch(() => {
      toast.error("Failed to restore items");
    }).finally(() => {
      setConfirmDialog(null);
    });
  };

  const handleBatchRestore = () => {
    setConfirmDialog({
      open: true,
      title: 'Restore Items',
      description: `Are you sure you want to restore ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}?`,
      variant: 'default',
      onConfirm: executeBatchRestore,
    });
  };

  const executeBatchDeleteTrash = () => {
    const ids = Array.from(selectedItems);

    Promise.all(
      ids.map((id) =>
        deleteFilePermanently.mutateAsync(id).catch(() => deleteFolderPermanently.mutateAsync(id))
      )
    ).then(() => {
      toast.success(`${selectedItems.size} items permanently deleted`);
      setSelectedItems(new Set());
    }).catch(() => {
      toast.error("Failed to delete items");
    }).finally(() => {
      setConfirmDialog(null);
    });
  };

  const handleBatchDeleteTrash = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Permanently',
      description: `Are you sure you want to permanently delete ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`,
      variant: 'destructive',
      onConfirm: executeBatchDeleteTrash,
    });
  };

  const handleRequestRestoreAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Restore All Items',
      description: 'Are you sure you want to restore all items from trash?',
      variant: 'default',
      onConfirm: async () => {
        try {
          await emptyTrash.mutateAsync(undefined);
          toast.success("All items restored");
          setSelectedItems(new Set());
        } catch (error) {
          toast.error("Failed to restore all");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleRequestDeleteAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete All Permanently',
      description: 'Are you sure you want to permanently delete all items? This action cannot be undone.',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await emptyTrash.mutateAsync(undefined);
          toast.success("All items permanently deleted");
          setSelectedItems(new Set());
        } catch (error) {
          toast.error("Failed to delete all");
        } finally {
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleToggleFavorite = (id: string, type: 'file' | 'folder') => {
    const currentFavorites = new Set(favorites);
    const isFavorite = !currentFavorites.has(id);

    toggleFavorite.mutate({ id, type, isFavorite }, {
      onSuccess: () => {
        if (isFavorite) {
          currentFavorites.add(id);
        } else {
          currentFavorites.delete(id);
        }
        setFavorites(currentFavorites);
      }
    });
  };

  const renderContent = () => {
    if (view === 'favorites') {
      return <FavoritesView onNavigateToItem={(folderId) => {
        setView('home');
        setCurrentFolderId(folderId);
      }} />;
    }

    if (view === 'trash') {
      return (
        <TrashView
          selectedItems={selectedItems}
          onToggleSelect={(id) => {
            const newSelected = new Set(selectedItems);
            if (newSelected.has(id)) {
              newSelected.delete(id);
            } else {
              newSelected.add(id);
            }
            setSelectedItems(newSelected);
          }}
          onToggleSelectAll={() => {
            // This will be handled by TrashView internally based on all trash items
            setSelectedItems(new Set());
          }}
          onRequestRestore={handleRequestRestoreItem}
          onRequestDelete={handleRequestDeleteItemPermanently}
          onRequestRestoreAll={handleRequestRestoreAll}
          onRequestDeleteAll={handleRequestDeleteAll}
        />
      );
    }

    if (folders.length === 0 && files.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-12">
          No folders or files yet
        </p>
      );
    }

    return (
      <FileTable
        folders={folders}
        files={files}
        selectedItems={selectedItems}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onFolderClick={setCurrentFolderId}
        onRequestDeleteFolder={handleRequestDeleteFolder}
        onRequestDeleteFile={handleRequestDeleteFile}
        onDuplicateFile={handleDuplicateFile}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  };

  return (
    <SidebarProvider>
      <CloudSidebar
        currentFolderId={currentFolderId}
        view={view}
        onRefresh={() => {}}
        onNavigateHome={() => {
          setView('home');
          setCurrentFolderId(null);
        }}
        onNavigateFavorites={() => setView('favorites')}
        onNavigateTrash={() => setView('trash')}
      />
      <SidebarInset>
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            {view === 'home' ? (
              <FolderBreadcrumb
                currentFolderId={currentFolderId}
                onNavigate={setCurrentFolderId}
              />
            ) : (
              <h1 className="text-2xl font-bold capitalize">{view}</h1>
            )}
            <div className="flex gap-2">
              {view === 'home' && <NewItemButton currentFolderId={currentFolderId} />}
              <LogoutButton />
              <ThemeToggle />
            </div>
          </div>

          <Card className="p-4">
            {renderContent()}
          </Card>
        </div>
      </SidebarInset>

      {view === 'home' && (
        <BatchActionsBanner
          selectedCount={selectedItems.size}
          onDelete={handleBatchDelete}
          onDuplicate={handleBatchDuplicate}
          onClear={() => setSelectedItems(new Set())}
        />
      )}

      {view === 'trash' && (
        <BatchActionsBanner
          selectedCount={selectedItems.size}
          mode="trash"
          onRestore={handleBatchRestore}
          onDelete={handleBatchDeleteTrash}
          onClear={() => setSelectedItems(new Set())}
          hide={hideBanner}
        />
      )}

      <Dialog open={confirmDialog?.open ?? false} onOpenChange={(open) => {
        if (!open) setConfirmDialog(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogDescription>{confirmDialog?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.variant ?? 'default'}
              onClick={() => confirmDialog?.onConfirm()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
