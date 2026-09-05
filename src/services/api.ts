/**
 * Google Apps Script Web App API Client
 */

import {
  CreateFolderRequest,
  CreateFolderResponse,
  InitResumableUploadRequest,
  InitResumableUploadResponse,
  RelayChunkRequest,
  RelayChunkResponse,
  QueryStatusRequest,
  QueryStatusResponse,
  HealthCheckRequest,
  HealthCheckResponse
} from '../types/upload';

const STORAGE_KEY_API_URL = 'neo_apps_script_url';

/**
 * Gets the configured Apps Script Web App URL from localStorage or environment
 */
export function getAppsScriptUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_API_URL);
  if (stored && stored.trim().startsWith('http')) {
    return stored.trim();
  }
  const envUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    return envUrl.trim();
  }
  return '';
}

/**
 * Saves an Apps Script Web App URL to localStorage
 */
export function saveAppsScriptUrl(url: string): void {
  if (url) {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  }
}

/**
 * Sends a POST request to Google Apps Script Web App using simple CORS headers (text/plain).
 * This prevents preflight OPTIONS check which Apps Script does not support.
 */
async function callAppsScript<T>(payload: unknown, signal?: AbortSignal): Promise<T> {
  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    throw new Error('Apps Script Web App URL is not configured. Please set VITE_APPS_SCRIPT_URL or enter it in Settings.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    // MUST be text/plain to bypass CORS preflight in Google Apps Script!
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
    signal
  });

  if (!response.ok) {
    throw new Error(`Server responded with HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data as T;
  } catch {
    throw new Error(`Invalid JSON response from server: ${text.slice(0, 150)}`);
  }
}

export const apiService = {
  /**
   * Health check to test Apps Script connection
   */
  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResponse> {
    const request: HealthCheckRequest = { action: 'healthCheck' };
    return callAppsScript<HealthCheckResponse>(request, signal);
  },

  /**
   * Creates a dedicated submission folder in the owner's Google Drive
   */
  async createFolder(folderName: string, submissionId: string, signal?: AbortSignal): Promise<CreateFolderResponse> {
    const request: CreateFolderRequest = {
      action: 'createFolder',
      folderName,
      submissionId
    };
    return callAppsScript<CreateFolderResponse>(request, signal);
  },

  /**
   * Requests a resumable upload session URI from Google Drive API v3 via Apps Script
   */
  async initResumableUpload(
    folderId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    signal?: AbortSignal
  ): Promise<InitResumableUploadResponse> {
    const request: InitResumableUploadRequest = {
      action: 'initResumableUpload',
      folderId,
      fileName,
      fileSize,
      mimeType
    };
    return callAppsScript<InitResumableUploadResponse>(request, signal);
  },

  /**
   * Fallback: Relays a single chunk (e.g. 5MB) via Apps Script if browser-direct upload hits CORS or network restrictions
   */
  async relayUploadChunk(
    resumableUri: string,
    rangeStart: number,
    rangeEnd: number,
    totalBytes: number,
    chunkBase64: string,
    signal?: AbortSignal
  ): Promise<RelayChunkResponse> {
    const request: RelayChunkRequest = {
      action: 'relayUploadChunk',
      resumableUri,
      rangeStart,
      rangeEnd,
      totalBytes,
      chunkBase64
    };
    return callAppsScript<RelayChunkResponse>(request, signal);
  },

  /**
   * Queries Google Drive for the byte progress of an interrupted resumable upload
   */
  async queryStatus(
    resumableUri: string,
    totalBytes: number,
    signal?: AbortSignal
  ): Promise<QueryStatusResponse> {
    const request: QueryStatusRequest = {
      action: 'queryUploadStatus',
      resumableUri,
      totalBytes
    };
    return callAppsScript<QueryStatusResponse>(request, signal);
  }
};
