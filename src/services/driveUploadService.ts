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
 * Performs a direct binary PUT chunk upload using XMLHttpRequest
 * Allows real-time progress events via xhr.upload.onprogress
 */
function putChunkDirectXHR(
  resumableUri: string,
  chunk: Blob,
  contentRange: string,
  onChunkProgress?: (loadedInChunk: number) => void,
  signal?: AbortSignal
): Promise<{ status: number; rangeHeader: string | null; responseText: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled by user', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', resumableUri, true);
    xhr.setRequestHeader('Content-Range', contentRange);

    const abortHandler = () => {
      xhr.abort();
      reject(new DOMException('Upload cancelled by user', 'AbortError'));
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    if (xhr.upload && onChunkProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onChunkProgress(e.loaded);
        }
      };
    }

    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      resolve({
        status: xhr.status,
        rangeHeader: xhr.getResponseHeader('Range') || xhr.getResponseHeader('range'),
        responseText: xhr.responseText
      });
    };

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      reject(new TypeError('Direct PUT network or CORS error'));
    };

    xhr.onabort = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      reject(new DOMException('Upload cancelled by user', 'AbortError'));
    };

    xhr.send(chunk);
  });
}

/**
 * Gets optimal chunk size for a given file size (strictly multiple of 256 KiB)
 * Uses 10 MiB for large files to reduce round-trips, and 5 MiB for smaller files
 */
function getChunkSize(fileSize: number): number {
  if (fileSize >= 30 * 1024 * 1024) {
    return 10 * 1024 * 1024; // 10 MiB (40 * 256 KiB)
  }
  return 5 * 1024 * 1024; // 5 MiB (20 * 256 KiB)
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
  const chunkSize = getChunkSize(totalBytes);
  let currentOffset = startOffset;
  let useDirectUpload = true; // Primary high-speed direct path

  // Rolling speed measurement
  let lastTime = performance.now();
  let lastUploadedBytes = currentOffset;
  let rollingSpeed = 0;

  const emitProgress = (inFlightUploaded: number) => {
    const now = performance.now();
    const timeDeltaSec = (now - lastTime) / 1000;
    if (timeDeltaSec >= 0.25) {
      const bytesDelta = inFlightUploaded - lastUploadedBytes;
      const currentSpeed = Math.max(0, bytesDelta / timeDeltaSec);
      rollingSpeed = rollingSpeed === 0 ? currentSpeed : rollingSpeed * 0.7 + currentSpeed * 0.3;
      lastTime = now;
      lastUploadedBytes = inFlightUploaded;
    }

    const remainingBytes = Math.max(0, totalBytes - inFlightUploaded);
    const estimatedSecondsRemaining =
      rollingSpeed > 0 ? Math.ceil(remainingBytes / rollingSpeed) : null;
    const progressPercent = Math.min(
      99.9,
      Math.round((inFlightUploaded / totalBytes) * 1000) / 10
    );

    onProgress({
      fileId,
      uploadedBytes: inFlightUploaded,
      totalBytes,
      progressPercent,
      bytesPerSecond: rollingSpeed,
      estimatedSecondsRemaining
    });
  };

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

    const nextEnd = Math.min(currentOffset + chunkSize, totalBytes);
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
          // FAST PATH: Direct binary PUT to Google Drive with live socket progress events
          const res = await putChunkDirectXHR(
            resumableUri,
            chunk,
            contentRange,
            (loadedInChunk) => {
              emitProgress(currentOffset + loadedInChunk);
            },
            signal
          );

          if (res.status === 308) {
            // Chunk accepted, upload incomplete
            if (res.rangeHeader) {
              const match = res.rangeHeader.match(/bytes=0-(\d+)/);
              if (match && match[1]) {
                currentOffset = parseInt(match[1], 10) + 1;
              } else {
                currentOffset = nextEnd;
              }
            } else {
              currentOffset = nextEnd;
            }
            chunkUploaded = true;
          } else if (res.status === 200 || res.status === 201) {
            // Upload complete!
            currentOffset = totalBytes;
            chunkUploaded = true;

            let resultJson: { id?: string } = {};
            try {
              resultJson = JSON.parse(res.responseText);
            } catch {
              resultJson = {};
            }

            const driveFileId = resultJson.id || '';
            const driveFileUrl = driveFileId
              ? `https://drive.google.com/file/d/${driveFileId}/view`
              : '';

            onProgress({
              fileId,
              uploadedBytes: totalBytes,
              totalBytes,
              progressPercent: 100,
              bytesPerSecond: rollingSpeed,
              estimatedSecondsRemaining: 0
            });

            return {
              driveFileId,
              driveFileUrl,
              totalBytes
            };
          } else if (res.status >= 500 && res.status < 600) {
            // Transient Google Drive server error: retry with exponential backoff
            attempt++;
            if (attempt > MAX_RETRIES) {
              throw new Error(`Google Drive returned HTTP ${res.status} after ${MAX_RETRIES} retries`);
            }
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, delay));
            currentOffset = await queryCurrentOffset(resumableUri, totalBytes, signal);
          } else {
            throw new Error(`Google Drive returned HTTP ${res.status}: ${res.responseText.slice(0, 200)}`);
          }
        } else {
          // RELIABILITY FALLBACK: Relay chunk via Apps Script
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

        // Detect if browser encountered CORS or direct fetch failure
        if (useDirectUpload && attempt === 0) {
          console.warn('[Neo Upload] Direct PUT encountered network/CORS restriction. Switching smoothly to server relay fallback...');
          useDirectUpload = false;
          continue;
        }

        attempt++;
        if (attempt > MAX_RETRIES) {
          throw err;
        }

        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    emitProgress(currentOffset);
  }

  return {
    driveFileId: '',
    driveFileUrl: '',
    totalBytes
  };
}
