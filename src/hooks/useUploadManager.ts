import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  FileQueueItem,
  UploadSessionState
} from '../types/upload';
import { apiService } from '../services/api';
import {
  uploadFileChunks,
  queryCurrentOffset,
  UploadProgressInfo
} from '../services/driveUploadService';
import { generateSubmissionId, sanitizeFolderName } from '../utils/fileUtils';

const CONCURRENT_UPLOADS = 2;

interface UseUploadManagerProps {
  files: FileQueueItem[];
  updateFile: (id: string, updates: Partial<FileQueueItem>) => void;
  stats: {
    totalFiles: number;
    totalBytes: number;
    uploadedBytes: number;
    completedCount: number;
    errorCount: number;
    uploadingCount: number;
    pausedCount: number;
    overallProgress: number;
  };
}

export function useUploadManager({ files, updateFile, stats }: UseUploadManagerProps) {
  const [folderName, setFolderName] = useState('');
  const [session, setSession] = useState<UploadSessionState>({
    submissionId: generateSubmissionId(),
    folderName: '',
    driveFolderId: null,
    driveFolderUrl: null,
    status: 'idle',
    overallProgress: 0,
    uploadedBytes: 0,
    totalBytes: 0,
    overallSpeed: 0,
    remainingSeconds: null,
    startedAt: null,
    completedAt: null
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // References to keep state fresh in async concurrency loops
  const filesRef = useRef(files);
  filesRef.current = files;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const activeUploadsCountRef = useRef(0);
  const isCancelledOrPausedRef = useRef(false);

  // Speed calculation references
  const speedSampleRef = useRef<{ time: number; bytes: number }>({
    time: performance.now(),
    bytes: 0
  });

  // Confetti celebration trigger
  const triggerCelebration = useCallback(() => {
    try {
      // Multi-stage confetti blast
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
    } catch {
      // Ignore confetti errors
    }
  }, []);

  /**
   * Worker function to upload a single file item
   */
  const processFileUpload = useCallback(
    async (item: FileQueueItem, driveFolderId: string) => {
      activeUploadsCountRef.current++;
      const abortController = new AbortController();

      updateFile(item.id, {
        status: 'uploading',
        abortController,
        errorMessage: undefined
      });

      try {
        let resumableUri = item.resumableUri;

        // Step 1: Initialize Resumable Upload Session if not already obtained
        if (!resumableUri) {
          updateFile(item.id, { status: 'creating_session' });
          const initRes = await apiService.initResumableUpload(
            driveFolderId,
            item.name,
            item.size,
            item.type,
            abortController.signal
          );

          if (!initRes.success || !initRes.resumableUri) {
            throw new Error(initRes.error || 'Failed to initialize resumable upload session');
          }

          resumableUri = initRes.resumableUri;
          updateFile(item.id, {
            resumableUri,
            status: 'uploading'
          });
        }

        // Step 2: Determine start byte offset (0 for fresh, or query if resumed)
        let startOffset = item.uploadedBytes;
        if (startOffset > 0) {
          startOffset = await queryCurrentOffset(
            resumableUri,
            item.size,
            abortController.signal
          );
        }

        // Step 3: Run chunked upload loop
        const result = await uploadFileChunks(
          item.id,
          item.file,
          resumableUri,
          (progress: UploadProgressInfo) => {
            updateFile(item.id, {
              uploadedBytes: progress.uploadedBytes,
              progress: progress.progressPercent,
              speed: progress.bytesPerSecond,
              remainingTime: progress.estimatedSecondsRemaining
            });
          },
          abortController.signal,
          startOffset
        );

        // Step 4: Mark file completed
        updateFile(item.id, {
          status: 'completed',
          progress: 100,
          uploadedBytes: item.size,
          driveFileId: result.driveFileId,
          driveFileUrl: result.driveFileUrl,
          abortController: null,
          speed: 0,
          remainingTime: 0
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Paused or cancelled by user/offline
          updateFile(item.id, {
            status: 'paused',
            abortController: null,
            speed: 0,
            remainingTime: null
          });
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Upload failed';
          updateFile(item.id, {
            status: 'error',
            errorMessage: errorMsg,
            retryCount: item.retryCount + 1,
            abortController: null,
            speed: 0,
            remainingTime: null
          });
        }
      } finally {
        activeUploadsCountRef.current--;
        // Trigger queue scheduler to pick the next queued item
        scheduleNext();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateFile]
  );

  /**
   * Concurrency scheduler: checks how many slots are open and starts pending uploads
   */
  const scheduleNext = useCallback(() => {
    if (isCancelledOrPausedRef.current) return;

    const currentFiles = filesRef.current;
    const activeFolderId = sessionRef.current.driveFolderId;

    if (!activeFolderId) return;

    // Check overall completion
    const allFinished = currentFiles.every(
      (f) => f.status === 'completed' || f.status === 'error' || f.status === 'cancelled'
    );
    const hasActiveOrQueued = currentFiles.some(
      (f) => f.status === 'uploading' || f.status === 'creating_session' || f.status === 'queued'
    );

    if (allFinished && !hasActiveOrQueued && currentFiles.length > 0) {
      const anySuccess = currentFiles.some((f) => f.status === 'completed');
      const allSuccess = currentFiles.every((f) => f.status === 'completed');

      setSession((prev) => ({
        ...prev,
        status: allSuccess ? 'completed' : anySuccess ? 'completed' : 'error',
        completedAt: Date.now(),
        overallSpeed: 0,
        remainingSeconds: 0
      }));

      if (anySuccess) {
        triggerCelebration();
      }
      return;
    }

    // Fill available concurrency slots
    while (activeUploadsCountRef.current < CONCURRENT_UPLOADS) {
      const nextItem = filesRef.current.find((f) => f.status === 'queued');
      if (!nextItem) break;

      // Mark as reserved immediately to avoid race condition
      updateFile(nextItem.id, { status: 'uploading' });
      processFileUpload(nextItem, activeFolderId);
    }
  }, [processFileUpload, triggerCelebration, updateFile]);

  /**
   * Starts the upload process
   */
  const startUpload = useCallback(async () => {
    const rawName = folderName.trim();
    if (!rawName) {
      alert('Please enter a folder name before starting upload.');
      return;
    }

    if (filesRef.current.length === 0) {
      alert('Please add at least one file to upload.');
      return;
    }

    isCancelledOrPausedRef.current = false;
    const sanitized = sanitizeFolderName(rawName);

    setSession((prev) => ({
      ...prev,
      status: 'preparing',
      folderName: sanitized,
      startedAt: Date.now(),
      error: undefined
    }));

    try {
      let folderId = sessionRef.current.driveFolderId;
      let folderUrl = sessionRef.current.driveFolderUrl;

      // Step 1: Create dedicated Google Drive folder if not yet created
      if (!folderId) {
        const createRes = await apiService.createFolder(
          sanitized,
          sessionRef.current.submissionId
        );

        if (!createRes.success || !createRes.folderId) {
          throw new Error(createRes.error || 'Failed to create Google Drive folder');
        }

        folderId = createRes.folderId;
        folderUrl = createRes.folderUrl || `https://drive.google.com/drive/folders/${folderId}`;

        setSession((prev) => ({
          ...prev,
          driveFolderId: folderId,
          driveFolderUrl: folderUrl
        }));
      }

      setSession((prev) => ({
        ...prev,
        status: 'uploading'
      }));

      // Step 2: Kick off concurrency scheduler
      scheduleNext();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize upload session';
      setSession((prev) => ({
        ...prev,
        status: 'error',
        error: msg
      }));
    }
  }, [folderName, scheduleNext]);

  /**
   * Pauses all active uploads cleanly
   */
  const pauseAll = useCallback(() => {
    isCancelledOrPausedRef.current = true;
    filesRef.current.forEach((f) => {
      if (f.status === 'uploading' || f.status === 'creating_session') {
        if (f.abortController) {
          f.abortController.abort();
        }
        updateFile(f.id, { status: 'paused', speed: 0, remainingTime: null });
      }
    });

    setSession((prev) => ({
      ...prev,
      status: 'paused',
      overallSpeed: 0,
      remainingSeconds: null
    }));
  }, [updateFile]);

  /**
   * Resumes paused uploads
   */
  const resumeAll = useCallback(() => {
    isCancelledOrPausedRef.current = false;

    // Reset paused files to queued so scheduler picks them up
    filesRef.current.forEach((f) => {
      if (f.status === 'paused') {
        updateFile(f.id, { status: 'queued' });
      }
    });

    setSession((prev) => ({
      ...prev,
      status: 'uploading'
    }));

    setTimeout(() => {
      scheduleNext();
    }, 50);
  }, [scheduleNext, updateFile]);

  /**
   * Retries an individual failed file
   */
  const retryFile = useCallback(
    (fileId: string) => {
      const target = filesRef.current.find((f) => f.id === fileId);
      if (!target || !sessionRef.current.driveFolderId) return;

      updateFile(fileId, {
        status: 'queued',
        errorMessage: undefined
      });

      if (sessionRef.current.status !== 'uploading') {
        setSession((prev) => ({ ...prev, status: 'uploading' }));
      }

      isCancelledOrPausedRef.current = false;
      setTimeout(() => {
        scheduleNext();
      }, 50);
    },
    [scheduleNext, updateFile]
  );

  /**
   * Cancels an individual file
   */
  const cancelFile = useCallback(
    (fileId: string) => {
      const target = filesRef.current.find((f) => f.id === fileId);
      if (target?.abortController) {
        target.abortController.abort();
      }
      updateFile(fileId, {
        status: 'cancelled',
        abortController: null,
        speed: 0,
        remainingTime: null
      });
    },
    [updateFile]
  );

  /**
   * Resets entire session for a fresh upload
   */
  const resetSession = useCallback(() => {
    filesRef.current.forEach((f) => {
      if (f.abortController) {
        f.abortController.abort();
      }
    });

    setFolderName('');
    setSession({
      submissionId: generateSubmissionId(),
      folderName: '',
      driveFolderId: null,
      driveFolderUrl: null,
      status: 'idle',
      overallProgress: 0,
      uploadedBytes: 0,
      totalBytes: 0,
      overallSpeed: 0,
      remainingSeconds: null,
      startedAt: null,
      completedAt: null
    });
  }, []);

  // Update session progress and speed periodically
  useEffect(() => {
    if (session.status !== 'uploading') return;

    const interval = setInterval(() => {
      const currentUploaded = stats.uploadedBytes;
      const now = performance.now();
      const timeDelta = (now - speedSampleRef.current.time) / 1000;

      let speed = 0;
      if (timeDelta >= 1) {
        const bytesDelta = currentUploaded - speedSampleRef.current.bytes;
        speed = Math.max(0, bytesDelta / timeDelta);
        speedSampleRef.current = { time: now, bytes: currentUploaded };
      }

      const remainingBytes = Math.max(0, stats.totalBytes - currentUploaded);
      const remainingSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : null;

      setSession((prev) => ({
        ...prev,
        overallProgress: stats.overallProgress,
        uploadedBytes: stats.uploadedBytes,
        totalBytes: stats.totalBytes,
        overallSpeed: speed > 0 ? speed : prev.overallSpeed,
        remainingSeconds
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, stats]);

  // Network online/offline automatic handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // If we were paused or in error due to network loss, auto resume
      if (sessionRef.current.status === 'paused') {
        resumeAll();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (sessionRef.current.status === 'uploading') {
        pauseAll();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pauseAll, resumeAll]);

  return {
    folderName,
    setFolderName,
    session,
    setSession,
    isOffline,
    startUpload,
    pauseAll,
    resumeAll,
    retryFile,
    cancelFile,
    resetSession
  };
}
