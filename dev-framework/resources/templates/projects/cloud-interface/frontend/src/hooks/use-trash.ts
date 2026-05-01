import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as trashApi from "@/lib/trash-api";
import { toast } from "sonner";

export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: trashApi.listTrash,
  });
}

export function useTrashFiles() {
  return useQuery({
    queryKey: ["trash", "files"],
    queryFn: trashApi.listTrashFiles,
  });
}

export function useTrashFolders() {
  return useQuery({
    queryKey: ["trash", "folders"],
    queryFn: trashApi.listTrashFolders,
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => trashApi.restoreFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => trashApi.restoreFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useDeleteFilePermanently() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => trashApi.deleteFilePermanently(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useDeleteFolderPermanently() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => trashApi.deleteFolderPermanently(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trashApi.emptyTrash,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
