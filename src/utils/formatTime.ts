/**
 * Formats duration in seconds into a clean, human-readable string (e.g. "2m 15s", "45s", "1h 10m")
 */
export function formatTime(seconds: number | null): string {
  if (seconds === null || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '--';
  }

  const rounded = Math.round(seconds);
  if (rounded === 0) return 'Almost done';

  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
