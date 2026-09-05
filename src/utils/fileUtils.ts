/**
 * File helper utilities
 */

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'pdf'
  | 'spreadsheet'
  | 'document'
  | 'other';

/**
 * Truncates a filename in the middle so the extension and first part stay legible.
 */
export function truncateMiddle(filename: string, maxLength: number = 32): string {
  if (filename.length <= maxLength) return filename;

  const dotIdx = filename.lastIndexOf('.');
  const ext = dotIdx !== -1 ? filename.slice(dotIdx) : '';
  const nameWithoutExt = dotIdx !== -1 ? filename.slice(0, dotIdx) : filename;

  const availableLen = maxLength - ext.length - 3; // 3 for '...'
  if (availableLen <= 4) {
    return filename.slice(0, maxLength - 3) + '...';
  }

  const frontChars = Math.ceil(availableLen * 0.6);
  const backChars = Math.floor(availableLen * 0.4);

  return `${nameWithoutExt.slice(0, frontChars)}...${nameWithoutExt.slice(nameWithoutExt.length - backChars)}${ext}`;
}

/**
 * Strips invalid filesystem/Drive characters from a folder name
 */
export function sanitizeFolderName(name: string): string {
  // Remove control chars, slashes, colons, wildcards, question marks, pipes, quotes
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return cleaned.slice(0, 100);
}

/**
 * Detects category from MIME type or file extension
 */
export function getFileCategory(name: string, mimeType: string = ''): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'heic', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) {
    return 'audio';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) {
    return 'archive';
  }
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (['xls', 'xlsx', 'csv', 'ods', 'tsv'].includes(ext)) {
    return 'spreadsheet';
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext)) {
    return 'document';
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'json', 'yaml', 'yml', 'xml', 'sql', 'sh'].includes(ext)) {
    return 'code';
  }

  return 'other';
}

/**
 * Generates an uppercase 6-character random alphanumeric submission ID
 */
export function generateSubmissionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous 0, O, 1, I
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
