import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
  X,
  Loader2,
  Pause
} from 'lucide-react';
import { FileQueueItem } from '../../types/upload';
import { formatBytes } from '../../utils/formatBytes';
import { formatSpeed } from '../../utils/formatSpeed';
import { formatTime } from '../../utils/formatTime';
import { truncateMiddle, getFileCategory, FileCategory } from '../../utils/fileUtils';

interface FileUploadItemProps {
  item: FileQueueItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  disabled?: boolean;
}

const CategoryIcon: React.FC<{ category: FileCategory }> = ({ category }) => {
  const iconClass = "w-5 h-5";
  switch (category) {
    case 'image':
      return <FileImage className={`${iconClass} text-purple-600`} />;
    case 'video':
      return <FileVideo className={`${iconClass} text-rose-500`} />;
    case 'audio':
      return <FileAudio className={`${iconClass} text-amber-500`} />;
    case 'archive':
      return <FileArchive className={`${iconClass} text-indigo-600`} />;
    case 'code':
      return <FileCode className={`${iconClass} text-emerald-600`} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={`${iconClass} text-emerald-500`} />;
    default:
      return <FileText className={`${iconClass} text-blue-500`} />;
  }
};

export const FileUploadItem: React.FC<FileUploadItemProps> = ({
  item,
  onRemove,
  onRetry,
  onCancel,
  disabled = false
}) => {
  const category = getFileCategory(item.name, item.type);
  const truncatedName = truncateMiddle(item.name, 34);

  return (
    <div className="group bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & File Meta */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
            <CategoryIcon category={category} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold text-slate-800 truncate"
                title={item.name}
              >
                {truncatedName}
              </span>
              <span className="text-xs text-slate-400 shrink-0 font-medium">
                {formatBytes(item.size)}
              </span>
            </div>

            {/* Status info row */}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              {item.status === 'uploading' && (
                <>
                  <span className="text-blue-600 font-medium">
                    {formatSpeed(item.speed)}
                  </span>
                  {item.remainingTime !== null && (
                    <>
                      <span>•</span>
                      <span>{formatTime(item.remainingTime)} left</span>
                    </>
                  )}
                </>
              )}

              {item.status === 'creating_session' && (
                <span className="text-blue-600 font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Starting session...
                </span>
              )}

              {item.status === 'queued' && (
                <span className="text-slate-400">Waiting in queue</span>
              )}

              {item.status === 'paused' && (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Pause className="w-3 h-3" />
                  Paused at {Math.round(item.progress)}%
                </span>
              )}

              {item.status === 'completed' && (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Uploaded
                </span>
              )}

              {item.status === 'error' && (
                <span className="text-rose-500 font-medium truncate" title={item.errorMessage}>
                  {item.errorMessage || 'Upload failed'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">

          {item.status === 'error' && (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Retry this file"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {item.status === 'uploading' && (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Cancel upload"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {(item.status === 'queued' || item.status === 'paused' || item.status === 'cancelled') && !disabled && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Remove from queue"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar for inflight or completed uploads */}
      {(item.status === 'uploading' ||
        item.status === 'creating_session' ||
        item.status === 'paused' ||
        item.status === 'completed') && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
            <span>{formatBytes(item.uploadedBytes)} of {formatBytes(item.size)}</span>
            <span className="font-semibold text-slate-700">{Math.round(item.progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                item.status === 'completed'
                  ? 'bg-emerald-500'
                  : item.status === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
