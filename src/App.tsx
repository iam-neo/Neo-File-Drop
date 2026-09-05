import { useState, useCallback } from 'react';
import { getAppsScriptUrl } from './services/api';
import { useFileQueue } from './hooks/useFileQueue';
import { useUploadManager } from './hooks/useUploadManager';

// Components
import { OfflineBanner } from './components/OfflineBanner/OfflineBanner';
import { Header } from './components/Header/Header';
import { FolderNameInput } from './components/FolderNameInput/FolderNameInput';
import { DropZone } from './components/DropZone/DropZone';
import { FileQueue } from './components/FileQueue/FileQueue';
import { UploadSummary } from './components/UploadSummary/UploadSummary';
import { UploadProgress } from './components/UploadProgress/UploadProgress';
import { SuccessState } from './components/SuccessState/SuccessState';
import { ErrorState } from './components/ErrorState/ErrorState';
import { SettingsModal } from './components/SettingsModal/SettingsModal';

export default function App() {
  const [isConfigured, setIsConfigured] = useState(() => !!getAppsScriptUrl());
  const [showSettings, setShowSettings] = useState(false);

  const { files, addFiles, removeFile, clearQueue, updateFile, stats } = useFileQueue();

  const {
    folderName,
    setFolderName,
    session,
    isOffline,
    startUpload,
    pauseAll,
    resumeAll,
    retryFile,
    cancelFile,
    resetSession
  } = useUploadManager({ files, updateFile, stats });

  const isUploading =
    session.status === 'uploading' ||
    session.status === 'preparing' ||
    session.status === 'paused';

  const isComplete = session.status === 'completed';

  const handleUploadMore = useCallback(() => {
    clearQueue();
    resetSession();
  }, [clearQueue, resetSession]);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleConfigured = useCallback((configured: boolean) => {
    setIsConfigured(configured);
  }, []);

  return (
    <>
      {/* Offline Banner */}
      <OfflineBanner isOffline={isOffline} />

      {/* Sticky Header */}
      <Header
        onOpenSettings={handleOpenSettings}
        isConfigured={isConfigured}
        isOffline={isOffline}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
        {/* --- SUCCESS STATE --- */}
        {isComplete ? (
          <SuccessState
            session={session}
            files={files}
            onUploadMore={handleUploadMore}
          />
        ) : (
          <>
            {/* Session-level error */}
            {session.status === 'error' && session.error && (
              <ErrorState
                message={session.error}
                onRetry={startUpload}
                onOpenSettings={handleOpenSettings}
              />
            )}

            {/* Overall Upload Progress (while uploading) */}
            {isUploading && (
              <UploadProgress
                status={session.status}
                uploadedBytes={stats.uploadedBytes}
                totalBytes={stats.totalBytes}
                overallProgress={stats.overallProgress}
                speed={session.overallSpeed}
                remainingSeconds={session.remainingSeconds}
                onPause={pauseAll}
                onResume={resumeAll}
              />
            )}

            {/* Step 1: Folder Name Input */}
            <FolderNameInput
              value={folderName}
              onChange={setFolderName}
              disabled={isUploading}
              submissionId={session.submissionId}
            />

            {/* Step 2: File Drop Zone */}
            {!isUploading && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1 flex items-center gap-1.5">
                  <span className="text-blue-600">Step 2:</span> Select Files
                </label>
                <DropZone
                  onFilesSelected={addFiles}
                  disabled={isUploading}
                />
              </div>
            )}

            {/* File Queue List */}
            <FileQueue
              files={files}
              onRemoveFile={removeFile}
              onRetryFile={retryFile}
              onCancelFile={cancelFile}
              onClearQueue={clearQueue}
              isUploading={isUploading}
            />

            {/* Upload Action Bar */}
            {!isUploading && (
              <UploadSummary
                totalFiles={stats.totalFiles}
                totalBytes={stats.totalBytes}
                folderName={folderName}
                status={session.status}
                onStartUpload={startUpload}
                disabled={!isConfigured}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-100 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p className="flex items-center gap-1.5">
            <img src="/images/neo-character.png" alt="" className="w-4 h-4 rounded-full" />
            <span>Neo File Drop — Secure Upload Portal</span>
          </p>
          <p className="text-slate-300 font-medium">
            Files upload directly to Google Drive via resumable protocol.
          </p>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        onConfigured={handleConfigured}
      />
    </>
  );
}
