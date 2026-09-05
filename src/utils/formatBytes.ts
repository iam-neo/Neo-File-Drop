/**
 * Formats a number of bytes into a human-readable string (e.g. 1.25 GB, 500 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);

  const value = bytes / Math.pow(k, safeIndex);
  // Remove unnecessary trailing zeros like 5.00 -> 5
  return `${parseFloat(value.toFixed(dm))} ${sizes[safeIndex]}`;
}
