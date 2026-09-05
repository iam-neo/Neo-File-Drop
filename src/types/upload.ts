export type FileStatus =
  | 'queued'
  | 'creating_session'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface FileQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  uploadedBytes: number;
  progress: number; // 0 - 100
  speed: number; // bytes per second
  remainingTime: number | null; // seconds
  resumableUri: string | null;
  driveFileId?: string;
  driveFileUrl?: string;
  errorMessage?: string;
  retryCount: number;
  abortController?: AbortController | null;
  lastActiveTime?: number;
}

export type OverallSessionStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'error';

export interface UploadSessionState {
  submissionId: string;
  folderName: string;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  status: OverallSessionStatus;
  overallProgress: number; // 0 - 100
  uploadedBytes: number;
  totalBytes: number;
  overallSpeed: number; // bytes / sec
  remainingSeconds: number | null;
  startedAt: number | null;
  completedAt: number | null;
  error?: string;
}

// Backend API Request & Response Contracts

export interface ApiBaseResponse {
  success: boolean;
  error?: string;
  code?: string;
}

export interface CreateFolderRequest {
  action: 'createFolder';
  folderName: string;
  submissionId: string;
}

export interface CreateFolderResponse extends ApiBaseResponse {
  folderId?: string;
  folderName?: string;
  folderUrl?: string;
}

export interface InitResumableUploadRequest {
  action: 'initResumableUpload';
  folderId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface InitResumableUploadResponse extends ApiBaseResponse {
  resumableUri?: string;
  fileId?: string;
  directModeAvailable?: boolean;
}

export interface RelayChunkRequest {
  action: 'relayUploadChunk';
  resumableUri: string;
  rangeStart: number;
  rangeEnd: number;
  totalBytes: number;
  chunkBase64: string;
}

export interface RelayChunkResponse extends ApiBaseResponse {
  rangeHeader?: string;
  uploadedBytes?: number;
  isComplete?: boolean;
  driveFileId?: string;
  driveFileUrl?: string;
}

export interface QueryStatusRequest {
  action: 'queryUploadStatus';
  resumableUri: string;
  totalBytes: number;
}

export interface QueryStatusResponse extends ApiBaseResponse {
  rangeHeader?: string;
  uploadedBytes?: number;
  isComplete?: boolean;
}

export interface HealthCheckRequest {
  action: 'healthCheck';
}

export interface HealthCheckResponse extends ApiBaseResponse {
  status?: string;
  version?: string;
  configuredFolder?: string;
}
