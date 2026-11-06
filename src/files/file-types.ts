/**
 * File types the app accepts (admin uploads and files received from
 * LINE / Facebook), and helpers to classify them.
 */
export type FileKind = 'image' | 'video' | 'audio' | 'file';

const MIME_BY_EXTENSION: Record<string, { mime: string; kind: FileKind }> = {
  // images
  jpg: { mime: 'image/jpeg', kind: 'image' },
  jpeg: { mime: 'image/jpeg', kind: 'image' },
  png: { mime: 'image/png', kind: 'image' },
  gif: { mime: 'image/gif', kind: 'image' },
  webp: { mime: 'image/webp', kind: 'image' },
  // video
  mp4: { mime: 'video/mp4', kind: 'video' },
  mov: { mime: 'video/quicktime', kind: 'video' },
  webm: { mime: 'video/webm', kind: 'video' },
  // audio
  mp3: { mime: 'audio/mpeg', kind: 'audio' },
  m4a: { mime: 'audio/mp4', kind: 'audio' },
  aac: { mime: 'audio/aac', kind: 'audio' },
  wav: { mime: 'audio/wav', kind: 'audio' },
  ogg: { mime: 'audio/ogg', kind: 'audio' },
  // documents
  pdf: { mime: 'application/pdf', kind: 'file' },
  doc: { mime: 'application/msword', kind: 'file' },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'file',
  },
  xls: { mime: 'application/vnd.ms-excel', kind: 'file' },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    kind: 'file',
  },
  ppt: { mime: 'application/vnd.ms-powerpoint', kind: 'file' },
  pptx: {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    kind: 'file',
  },
  txt: { mime: 'text/plain', kind: 'file' },
  csv: { mime: 'text/csv', kind: 'file' },
  zip: { mime: 'application/zip', kind: 'file' },
};

export const ALLOWED_FILE_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

export function getExtension(fileNameOrPath: string): string {
  const clean = fileNameOrPath.split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return '';
  return clean.slice(dot + 1).toLowerCase();
}

export function isAllowedFileName(fileName: string): boolean {
  return getExtension(fileName) in MIME_BY_EXTENSION;
}

export function mimeFromExtension(ext: string): string {
  return (
    MIME_BY_EXTENSION[ext.toLowerCase()]?.mime ?? 'application/octet-stream'
  );
}

export function kindFromExtension(ext: string): FileKind {
  return MIME_BY_EXTENSION[ext.toLowerCase()]?.kind ?? 'file';
}

/** Best extension for a Content-Type header (ignores parameters). */
export function extensionFromMime(contentType?: string | null): string | null {
  if (!contentType) return null;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  const match = Object.entries(MIME_BY_EXTENSION).find(
    ([, v]) => v.mime === mime,
  );
  return match ? match[0] : null;
}
