const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CHUNK_SIZE = 1024 * 1024 * 5; // 5 Mo par chunk

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

export async function createFolder(name: string, parentId?: string) {
  const res = await authFetch(`${API_URL}/storage/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parent_id: parentId }),
  });
  if (!res.ok) throw new Error("Failed to create folder");
  return res.json();
}

export async function listFolders(parentId?: string) {
  const url = parentId
    ? `${API_URL}/storage/folders?parent_id=${parentId}`
    : `${API_URL}/storage/folders`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to list folders");
  return res.json();
}

export async function deleteFolder(folderId: string) {
  const res = await authFetch(`${API_URL}/storage/folders/${folderId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete folder");
  return res.json();
}

export async function listFiles(folderId: string | null) {
  const target = folderId || "root";
  const res = await authFetch(`${API_URL}/storage/files/${target}`);
  if (!res.ok) throw new Error("Failed to list files");
  return res.json();
}

export async function uploadFile(
  folderId: string | null,
  file: File,
  onProgress?: (percent: number) => void
) {
  console.log("📤 uploadFile called:", { folderId, filename: file.name, size: file.size });

  const initRes = await authFetch(`${API_URL}/storage/files/upload/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder_id: folderId,
      filename: file.name,
      total_size: file.size,
    }),
  });

  console.log("📤 Init response status:", initRes.status);
  if (!initRes.ok) {
    const errorText = await initRes.text();
    console.error("❌ Init failed:", errorText);
    throw new Error("Failed to init upload");
  }
  const { upload_id } = await initRes.json();
  console.log("📤 Upload ID received:", upload_id);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const arrayBuffer = await chunk.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    await authFetch(`${API_URL}/storage/files/upload/chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_id,
        chunk_index: i,
        data: base64,
      }),
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  const finalRes = await authFetch(
    `${API_URL}/storage/files/upload/finalize?upload_id=${upload_id}&folder_id=${folderId ?? ""}&filename=${encodeURIComponent(
      file.name
    )}&total_size=${file.size}`,
    { method: "POST" }
  );

  if (!finalRes.ok) throw new Error("Failed to finalize upload");
  return finalRes.json();
}

export async function downloadFile(fileId: string, filename: string) {
  const res = await authFetch(`${API_URL}/storage/files/download/${fileId}`);
  if (!res.ok) throw new Error("Failed to download file");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteFile(fileId: string) {
  const res = await authFetch(`${API_URL}/storage/files/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete file");
  return res.json();
}

export async function duplicateFile(fileId: string) {
  const res = await authFetch(`${API_URL}/storage/files/${fileId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate file");
  return res.json();
}

export async function duplicateFolder(folderId: string) {
  const res = await authFetch(`${API_URL}/storage/folders/${folderId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate folder");
  return res.json();
}

export async function toggleFileFavorite(fileId: string, isFavorite: boolean) {
  const res = await authFetch(`${API_URL}/storage/files/${fileId}/favorite?is_favorite=${isFavorite}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to toggle file favorite");
  return res.json();
}

export async function toggleFolderFavorite(folderId: string, isFavorite: boolean) {
  const res = await authFetch(`${API_URL}/storage/folders/${folderId}/favorite?is_favorite=${isFavorite}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to toggle folder favorite");
  return res.json();
}

export async function getFavorites() {
  const res = await authFetch(`${API_URL}/storage/favorites`);
  if (!res.ok) throw new Error("Failed to get favorites");
  return res.json();
}

export async function getFilePreviewUrl(fileId: string): Promise<string> {
  const res = await authFetch(`${API_URL}/storage/files/download/${fileId}?preview=true`);
  if (!res.ok) throw new Error("Failed to fetch file");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function renameFile(fileId: string, newName: string) {
  const res = await authFetch(`${API_URL}/storage/files/${fileId}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!res.ok) throw new Error("Failed to rename file");
  return res.json();
}

export async function renameFolder(folderId: string, newName: string) {
  const res = await authFetch(`${API_URL}/storage/folders/${folderId}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!res.ok) throw new Error("Failed to rename folder");
  return res.json();
}

export async function createShareLink(fileId: string): Promise<{ share_url: string }> {
  const res = await authFetch(`${API_URL}/storage/files/${fileId}/share`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to create share link");
  return res.json();
}

export async function getStorageStats(): Promise<{
  used: number;
  limit: number;
  available: number | null;
  usage_percent: number;
}> {
  const res = await authFetch(`${API_URL}/storage/stats`);
  if (!res.ok) throw new Error("Failed to get storage stats");
  return res.json();
}
