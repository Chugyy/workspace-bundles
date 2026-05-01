export type Item = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  path: string;
  folderId?: string;
  deletedAt?: string;
};

export const mockFavorites: Item[] = [
  {
    id: 'fav-1',
    name: 'Important Document.pdf',
    type: 'file',
    size: 2457600,
    path: '/Documents/Work',
    folderId: '5',
  },
  {
    id: 'fav-2',
    name: 'Vacation Photos',
    type: 'folder',
    path: '/Photos',
    folderId: '8',
  },
  {
    id: 'fav-3',
    name: 'Project Proposal.docx',
    type: 'file',
    size: 524288,
    path: '/Documents/Projects',
    folderId: '12',
  },
  {
    id: 'fav-4',
    name: 'Budget 2024.xlsx',
    type: 'file',
    size: 87040,
    path: '/Finance',
    folderId: '3',
  },
];

export const mockTrash: Item[] = [
  {
    id: 'trash-1',
    name: 'Old Report.pdf',
    type: 'file',
    size: 1048576,
    path: '/Documents',
    folderId: '2',
    deletedAt: '2025-01-15',
  },
  {
    id: 'trash-2',
    name: 'Backup Folder',
    type: 'folder',
    path: '/Archives',
    folderId: '15',
    deletedAt: '2025-01-10',
  },
  {
    id: 'trash-3',
    name: 'temp_file.txt',
    type: 'file',
    size: 2048,
    path: '/Temp',
    folderId: '20',
    deletedAt: '2025-01-18',
  },
  {
    id: 'trash-4',
    name: 'Notes.md',
    type: 'file',
    size: 4096,
    path: '/Documents/Notes',
    folderId: '7',
    deletedAt: '2025-01-12',
  },
];
