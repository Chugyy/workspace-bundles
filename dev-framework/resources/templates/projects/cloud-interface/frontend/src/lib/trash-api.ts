const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export type TrashItem = {
  id: string;
  name: string;
  size?: number;
  folder_id?: string;
  parent_id?: string | null;
  created_at: string;
  deleted_at: string;
};

export type TrashResponse = {
  folders: TrashItem[];
  files: TrashItem[];
};

export async function listTrash(): Promise<TrashResponse> {
  const res = await authFetch(`${API_URL}/storage/trash`);
  if (!res.ok) throw new Error("Failed to list trash");
  return res.json();
}

export async function listTrashFiles() {
  const res = await authFetch(`${API_URL}/storage/trash/files`);
  if (!res.ok) throw new Error("Failed to list trash files");
  return res.json();
}

export async function listTrashFolders() {
  const res = await authFetch(`${API_URL}/storage/trash/folders`);
  if (!res.ok) throw new Error("Failed to list trash folders");
  return res.json();
}

export async function restoreFile(fileId: string) {
  const res = await authFetch(
    `${API_URL}/storage/trash/restore/file/${fileId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to restore file");
  return res.json();
}

export async function restoreFolder(folderId: string) {
  const res = await authFetch(
    `${API_URL}/storage/trash/restore/folder/${folderId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to restore folder");
  return res.json();
}

export async function deleteFilePermanently(fileId: string) {
  const res = await authFetch(`${API_URL}/storage/trash/file/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete file permanently");
  return res.json();
}

export async function deleteFolderPermanently(folderId: string) {
  const res = await authFetch(`${API_URL}/storage/trash/folder/${folderId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete folder permanently");
  return res.json();
}

export async function emptyTrash() {
  const res = await authFetch(`${API_URL}/storage/trash/empty`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to empty trash");
  return res.json();
}
