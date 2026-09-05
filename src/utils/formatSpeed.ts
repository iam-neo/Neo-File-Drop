import { formatBytes } from './formatBytes';

/**
 * Formats upload speed in bytes per second into human-readable string (e.g. 5.4 MB/s)
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '0 B/s';
  return `${formatBytes(bytesPerSecond, 1)}/s`;
}
