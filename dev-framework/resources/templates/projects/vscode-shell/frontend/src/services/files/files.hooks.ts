'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fileKeys, filesService } from './files.service'
import type { RenamePayload, CopyPayload, MovePayload } from './files.types'

export function useFileTree(path: string) {
  return useQuery({
    queryKey: fileKeys.list(path),
    queryFn: () => filesService.list(path),
    enabled: !!path,
  })
}

export function useFileContent(path: string) {
  return useQuery({
    queryKey: fileKeys.content(path),
    queryFn: () => filesService.read(path),
    enabled: !!path,
  })
}

export function useSaveFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: filesService.write,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: fileKeys.content(variables.path),
      })
    },
  })
}

export function useCreateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: filesService.createFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useCreateDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: filesService.createDirectory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useRenameFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RenamePayload) => filesService.rename(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: filesService.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useCopyFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CopyPayload) => filesService.copy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useMoveFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MovePayload) => filesService.move(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ directoryPath, file }: { directoryPath: string; file: File }) =>
      filesService.upload(directoryPath, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all })
    },
  })
}
