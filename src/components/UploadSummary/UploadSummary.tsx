import React from 'react';
import { Upload, ArrowRight, Loader2 } from 'lucide-react';
import { formatBytes } from '../../utils/formatBytes';
import { OverallSessionStatus } from '../../types/upload';

interface UploadSummaryProps {
  totalFiles: number;
  totalBytes: number;
  folderName: string;
  status: OverallSessionStatus;
  onStartUpload: () => void;
  disabled?: boolean;
}

export const UploadSummary: React.FC<UploadSummaryProps> = ({
  totalFiles,
  totalBytes,
  folderName,
  status,
  onStartUpload,
  disabled = false
}) => {
  if (totalFiles === 0 || status === 'completed') return null;

  const isPreparing = status === 'preparing';
  const isUploading = status === 'uploading';
  const isActionDisabled = disabled || isPreparing || isUploading || !folderName.trim();

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
      {/* Left: Summary text */}
      <div className="text-center sm:text-left">
        <h4 className="text-sm font-bold text-slate-100 flex items-center justify-center sm:justify-start gap-2">
          <span>Ready for Drive Delivery</span>
          <span className="bg-blue-500/20 text-blue-300 text-[11px] font-mono px-2 py-0.5 rounded-full border border-blue-400/30">
            {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
          </span>
        </h4>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Total batch size: <strong className="text-slate-200">{formatBytes(totalBytes)}</strong>
          {folderName.trim() && (
            <>
              {' '}• Destination:{' '}
              <span className="text-amber-300 font-semibold">{folderName.trim()}</span>
            </>
          )}
        </p>
      </div>

      {/* Right: Big CTA Button */}
      {(status === 'idle' || status === 'error') && (
        <button
          type="button"
          onClick={onStartUpload}
          disabled={isActionDisabled}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-95 ${
            isActionDisabled
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-70'
              : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 ring-2 ring-blue-400/30 cursor-pointer'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>{status === 'error' ? 'Retry Upload to Drive' : 'Start Upload to Drive'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {isPreparing && (
        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-blue-300 text-sm font-semibold border border-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Creating Google Drive Folder...</span>
        </div>
      )}
    </div>
  );
};
