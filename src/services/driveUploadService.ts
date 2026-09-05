/**
 * Google Drive Resumable Upload Engine
 * Implements Google Drive API v3 Resumable Protocol:
 * - 5 MiB chunking with Blob.slice() (strictly multiple of 256 KiB)
 * - Content-Range: bytes START-END/TOTAL
 * - HTTP 308 Resume Incomplete handling
 * - Exponential backoff on transient errors
 * - Network resume byte-offset recovery
 * - Seamless Apps Script relay fallback if browser-direct CORS is blocked
 */

import { apiService } from './api';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MiB (exactly 20 * 256 KiB)
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

export interface UploadProgressInfo {
  fileId: string;
  uploadedBytes: number;
  totalBytes: number;
  progressPercent: number; // 0 - 100
  bytesPerSecond: number;
  estimatedSecondsRemaining: number | null;
}

export interface UploadResult {
  driveFileId: string;
  driveFileUrl: string;
  totalBytes: number;
}

/**
 * Helper to convert a Blob/Slice to Base64 (used solely for fallback relay of single 5MB chunk)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:*/*;base64," prefix
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Checks with Google Drive how many bytes were already received for an interrupted resumable URI.
 * Sends PUT with Content-Range: bytes * / TOTAL
 */
export async function queryCurrentOffset(
  resumableUri: string,
  totalBytes: number,
  signal?: AbortSignal
): Promise<number> {
  try {
    const response = await fetch(resumableUri, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes */${totalBytes}`
      },
      signal
    });

    if (response.status === 308) {
      const range = response.headers.get('Range');
      if (range) {
        const match = range.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          return parseInt(match[1], 10) + 1;
        }
      }
      return 0;
    }

    if (response.status === 200 || response.status === 201) {
      return totalBytes;
    }
  } catch (err: unknown) {
    // If direct fetch fails (e.g. CORS), fallback to Apps Script status query
    try {
      const statusRes = await apiService.queryStatus(resumableUri, totalBytes, signal);
      if (statusRes.success && typeof statusRes.uploadedBytes === 'number') {
        return statusRes.uploadedBytes;
      }
    } catch {
      // Ignore fallback failure, default to 0
    }
  }

  return 0;
}

/**
 * Uploads a file using chunked resumable uploading
 */
export async function uploadFileChunks(
  fileId: string,
  file: File,
  resumableUri: string,
  onProgress: (info: UploadProgressInfo) => void,
  signal: AbortSignal,
  startOffset: number = 0
): Promise<UploadResult> {
  const totalBytes = file.size;
  let currentOffset = startOffset;
  let useDirectUpload = true; // start with direct upload, fallback to relay if CORS fails

  // Speed measurement tracking
  let lastTime = performance.now();
  let lastUploadedBytes = currentOffset;
  let rollingSpeed = 0;

  // Handle empty 0-byte file edge case
  if (totalBytes === 0) {
    const emptyBlob = new Blob([]);
    const res = await fetch(resumableUri, {
      method: 'PUT',
      headers: {
        'Content-Range': 'bytes */0'
      },
      body: emptyBlob,
      signal
    });
    const data = await res.json().catch(() => ({}));
    return {
      driveFileId: data.id || 'unknown',
      driveFileUrl: data.id ? `https://drive.google.com/file/d/${data.id}/view` : '',
      totalBytes: 0
    };
  }

  while (currentOffset < totalBytes) {
    if (signal.aborted) {
      throw new DOMException('Upload cancelled by user', 'AbortError');
    }

    const nextEnd = Math.min(currentOffset + CHUNK_SIZE, totalBytes);
    const chunk = file.slice(currentOffset, nextEnd);
    const contentRange = `bytes ${currentOffset}-${nextEnd - 1}/${totalBytes}`;

    let chunkUploaded = false;
    let attempt = 0;

    while (!chunkUploaded && attempt <= MAX_RETRIES) {
      if (signal.aborted) {
        throw new DOMException('Upload cancelled by user', 'AbortError');
      }

      try {
        if (useDirectUpload) {
          // Primary Path: Direct upload to Google Drive resumable session URI
          const response = await fetch(resumableUri, {
            method: 'PUT',
            headers: {
              'Content-Range': contentRange
            },
            body: chunk,
            signal
          });

          if (response.status === 308) {
            // Chunk accepted, upload incomplete
            const rangeHeader = response.headers.get('Range');
            if (rangeHeader) {
              const match = rangeHeader.match(/bytes=0-(\d+)/);
              if (match && match[1]) {
                currentOffset = parseInt(match[1], 10) + 1;
              } else {
                currentOffset = nextEnd;
              }
            } else {
              currentOffset = nextEnd;
            }
            chunkUploaded = true;
          } else if (response.status === 200 || response.status === 201) {
            // Upload complete!
            currentOffset = totalBytes;
            chunkUploaded = true;

            const resultJson = await response.json().catch(() => ({}));
            const driveFileId = resultJson.id || '';
            const driveFileUrl = driveFileId
              ? `https://drive.google.com/file/d/${driveFileId}/view`
              : '';

            // Final progress update
            onProgress({
              fileId,
              uploadedBytes: totalBytes,
              totalBytes,
              progressPercent: 100,
              bytesPerSecond: 0,
              estimatedSecondsRemaining: 0
            });

            return {
              driveFileId,
              driveFileUrl,
              totalBytes
            };
          } else if (response.status >= 500 && response.status < 600) {
            // Transient Google Drive server error: retry with exponential backoff
            attempt++;
            if (attempt > MAX_RETRIES) {
              throw new Error(`Google Drive returned HTTP ${response.status} after ${MAX_RETRIES} retries`);
            }
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
            await new Promise((res) => setTimeout(res, delay));
            // Query current offset before retrying
            currentOffset = await queryCurrentOffset(resumableUri, totalBytes, signal);
          } else {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Upload failed with HTTP ${response.status}: ${errorText.slice(0, 200)}`);
          }
        } else {
          // Fallback Path: Relay chunk via Apps Script if browser-direct upload is blocked by CORS/firewall
          const chunkBase64 = await blobToBase64(chunk);
          const relayRes = await apiService.relayUploadChunk(
            resumableUri,
            currentOffset,
            nextEnd - 1,
            totalBytes,
            chunkBase64,
            signal
          );

          if (!relayRes.success) {
            throw new Error(relayRes.error || 'Failed to relay chunk via server');
          }

          if (relayRes.isComplete) {
            currentOffset = totalBytes;
            chunkUploaded = true;

            onProgress({
              fileId,
              uploadedBytes: totalBytes,
              totalBytes,
              progressPercent: 100,
              bytesPerSecond: 0,
              estimatedSecondsRemaining: 0
            });

            return {
              driveFileId: relayRes.driveFileId || '',
              driveFileUrl: relayRes.driveFileUrl || '',
              totalBytes
            };
          } else {
            currentOffset = relayRes.uploadedBytes || nextEnd;
            chunkUploaded = true;
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }

        // Check if browser threw a network/CORS error on direct upload
        if (useDirectUpload && attempt === 0) {
          console.warn('[Neo Upload] Direct PUT encountered network/CORS restriction. Switching smoothly to server relay fallback...');
          useDirectUpload = false;
          // Don't count switching mode as a failed attempt
          continue;
        }

        attempt++;
        if (attempt > MAX_RETRIES) {
          throw err;
        }

        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    // Update real speed and progress calculations
    const now = performance.now();
    const timeDeltaSec = (now - lastTime) / 1000;
    if (timeDeltaSec >= 0.5) {
      const bytesDelta = currentOffset - lastUploadedBytes;
      const currentSpeed = bytesDelta / timeDeltaSec;
      rollingSpeed = rollingSpeed === 0 ? currentSpeed : rollingSpeed * 0.7 + currentSpeed * 0.3;
      lastTime = now;
      lastUploadedBytes = currentOffset;
    }

    const remainingBytes = Math.max(0, totalBytes - currentOffset);
    const estimatedSecondsRemaining =
      rollingSpeed > 0 ? Math.ceil(remainingBytes / rollingSpeed) : null;
    const progressPercent = Math.min(100, Math.round((currentOffset / totalBytes) * 1000) / 10);

    onProgress({
      fileId,
      uploadedBytes: currentOffset,
      totalBytes,
      progressPercent,
      bytesPerSecond: rollingSpeed,
      estimatedSecondsRemaining
    });
  }

  return {
    driveFileId: '',
    driveFileUrl: '',
    totalBytes
  };
}
