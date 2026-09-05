import { useState, useCallback, useMemo } from 'react';
import { FileQueueItem } from '../types/upload';

export function useFileQueue() {
  const [files, setFiles] = useState<FileQueueItem[]>([]);

  /**
   * Adds new files to the queue, avoiding exact duplicates (same name, size, lastModified)
   */
  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const existingSignatures = new Set(
        prev.map((f) => `${f.file.name}_${f.file.size}_${f.file.lastModified}`)
      );

      const itemsToAdd: FileQueueItem[] = [];

      for (const file of newFiles) {
        const sig = `${file.name}_${file.size}_${file.lastModified}`;
        if (!existingSignatures.has(sig)) {
          existingSignatures.add(sig);
          itemsToAdd.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            status: 'queued',
            uploadedBytes: 0,
            progress: 0,
            speed: 0,
            remainingTime: null,
            resumableUri: null,
            retryCount: 0,
            abortController: null
          });
        }
      }

      return [...prev, ...itemsToAdd];
    });
  }, []);

  /**
   * Removes a file from the queue by ID
   */
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.abortController) {
        target.abortController.abort();
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  /**
   * Clears the entire queue
   */
  const clearQueue = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.abortController) {
          f.abortController.abort();
        }
      });
      return [];
    });
  }, []);

  /**
   * Updates partial properties of a file item
   */
  const updateFile = useCallback((id: string, updates: Partial<FileQueueItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  /**
   * Computed summary statistics
   */
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const uploadedBytes = files.reduce((acc, f) => acc + f.uploadedBytes, 0);
    const completedCount = files.filter((f) => f.status === 'completed').length;
    const errorCount = files.filter((f) => f.status === 'error').length;
    const uploadingCount = files.filter((f) => f.status === 'uploading' || f.status === 'creating_session').length;
    const pausedCount = files.filter((f) => f.status === 'paused').length;

    const overallProgress =
      totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 1000) / 10) : 0;

    return {
      totalFiles,
      totalBytes,
      uploadedBytes,
      completedCount,
      errorCount,
      uploadingCount,
      pausedCount,
      overallProgress
    };
  }, [files]);

  return {
    files,
    setFiles,
    addFiles,
    removeFile,
    clearQueue,
    updateFile,
    stats
  };
}
