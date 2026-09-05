import React from 'react';
import { Trash2, Files } from 'lucide-react';
import { FileQueueItem } from '../../types/upload';
import { FileUploadItem } from '../FileUploadItem/FileUploadItem';
import { formatBytes } from '../../utils/formatBytes';

interface FileQueueProps {
  files: FileQueueItem[];
  onRemoveFile: (id: string) => void;
  onRetryFile: (id: string) => void;
  onCancelFile: (id: string) => void;
  onClearQueue: () => void;
  isUploading: boolean;
}

export const FileQueue: React.FC<FileQueueProps> = ({
  files,
  onRemoveFile,
  onRetryFile,
  onCancelFile,
  onClearQueue,
  isUploading
}) => {
  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Files className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Selected Files ({files.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            • {formatBytes(totalSize)}
          </span>
        </div>

        {!isUploading && (
          <button
            type="button"
            onClick={onClearQueue}
            className="text-xs font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
            title="Clear all files"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* File List */}
      <div className="mt-3 space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {files.map((item) => (
          <FileUploadItem
            key={item.id}
            item={item}
            onRemove={onRemoveFile}
            onRetry={onRetryFile}
            onCancel={onCancelFile}
            disabled={isUploading}
          />
        ))}
      </div>
    </div>
  );
};
