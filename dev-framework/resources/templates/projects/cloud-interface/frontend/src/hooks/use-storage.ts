import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { toast } from "sonner";

export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: ["folders", parentId],
    queryFn: () => api.listFolders(parentId),
  });
}

export function useFiles(folderId: string | null) {
  return useQuery({
    queryKey: ["files", folderId || "root"],
    queryFn: () => api.listFiles(folderId),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      api.createFolder(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => api.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      file,
      onProgress,
    }: {
      folderId: string | null;
      file: File;
      onProgress?: (percent: number) => void;
    }) => api.uploadFile(folderId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: ({ fileId, filename }: { fileId: string; filename: string }) =>
      api.downloadFile(fileId, filename),
  });
}

export function useDuplicateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => api.duplicateFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File duplicated successfully");
    },
    onError: () => {
      toast.error("Failed to duplicate file");
    },
  });
}

export function useDuplicateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => api.duplicateFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder duplicated successfully");
    },
    onError: () => {
      toast.error("Failed to duplicate folder");
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      type,
      isFavorite,
    }: {
      id: string;
      type: "file" | "folder";
      isFavorite: boolean;
    }) => {
      if (type === "file") {
        return api.toggleFileFavorite(id, isFavorite);
      }
      return api.toggleFolderFavorite(id, isFavorite);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(
        variables.isFavorite ? "Added to favorites" : "Removed from favorites"
      );
    },
    onError: () => {
      toast.error("Failed to update favorite status");
    },
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: api.getFavorites,
  });
}

export function useCreateShareLink() {
  return useMutation({
    mutationFn: (fileId: string) => api.createShareLink(fileId),
  });
}
