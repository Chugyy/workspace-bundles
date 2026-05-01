import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileSpreadsheetIcon,
  FolderIcon,
} from "lucide-react";

const ICON_MAP: Record<string, typeof FileIcon> = {
  // Images
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
  gif: ImageIcon,
  svg: ImageIcon,
  webp: ImageIcon,
  ico: ImageIcon,

  // Videos
  mp4: FileVideoIcon,
  avi: FileVideoIcon,
  mov: FileVideoIcon,
  mkv: FileVideoIcon,
  webm: FileVideoIcon,

  // Audio
  mp3: FileAudioIcon,
  wav: FileAudioIcon,
  ogg: FileAudioIcon,
  flac: FileAudioIcon,
  m4a: FileAudioIcon,
  aac: FileAudioIcon,

  // Documents
  pdf: FileTextIcon,
  doc: FileTextIcon,
  docx: FileTextIcon,
  txt: FileTextIcon,
  md: FileTextIcon,

  // Spreadsheets
  xls: FileSpreadsheetIcon,
  xlsx: FileSpreadsheetIcon,
  csv: FileSpreadsheetIcon,

  // Code
  js: FileCodeIcon,
  ts: FileCodeIcon,
  jsx: FileCodeIcon,
  tsx: FileCodeIcon,
  py: FileCodeIcon,
  java: FileCodeIcon,
  cpp: FileCodeIcon,
  c: FileCodeIcon,
  html: FileCodeIcon,
  css: FileCodeIcon,
  json: FileCodeIcon,
  xml: FileCodeIcon,

  // Archives
  zip: FileArchiveIcon,
  rar: FileArchiveIcon,
  "7z": FileArchiveIcon,
  tar: FileArchiveIcon,
  gz: FileArchiveIcon,
};

export function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ICON_MAP[ext] ? ICON_MAP[ext] : FileIcon;
}

export { FolderIcon };
