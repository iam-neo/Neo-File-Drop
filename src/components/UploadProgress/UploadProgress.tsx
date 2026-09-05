import React from 'react';
import { Play, Pause, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatBytes } from '../../utils/formatBytes';
import { formatSpeed } from '../../utils/formatSpeed';
import { formatTime } from '../../utils/formatTime';
import { OverallSessionStatus } from '../../types/upload';

interface UploadProgressProps {
  status: OverallSessionStatus;
  uploadedBytes: number;
  totalBytes: number;
  overallProgress: number; // 0 - 100
  speed: number;
  remainingSeconds: number | null;
  onPause?: () => void;
  onResume?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  status,
  uploadedBytes,
  totalBytes,
  overallProgress,
  speed,
  remainingSeconds,
  onPause,
  onResume
}) => {
  // Strictly clamp between 0 and 100 based on real uploaded bytes
  const clampedPercent = Math.min(100, Math.max(0, overallProgress));

  // Determine message speech bubble
  let speechBubbleText = 'Preparing upload...';
  if (status === 'uploading') {
    if (clampedPercent >= 98) {
      speechBubbleText = 'Almost done! 🎉';
    } else if (clampedPercent >= 50) {
      speechBubbleText = `${Math.round(clampedPercent)}% • Cruising along! 🚀`;
    } else if (clampedPercent > 0) {
      speechBubbleText = `${Math.round(clampedPercent)}% • Uploading... ⚡`;
    } else {
      speechBubbleText = 'Starting chunk transfers...';
    }
  } else if (status === 'paused') {
    speechBubbleText = 'Upload paused ⏸️';
  } else if (status === 'completed') {
    speechBubbleText = 'All files delivered! ✨';
  } else if (status === 'error') {
    speechBubbleText = 'Network glitch detected ⚠️';
  }

  return (
    <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-md transition-all">
      {/* Header bar: Status and Quick Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === 'uploading' && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
            </span>
          )}
          {status === 'completed' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          {status === 'paused' && (
            <Pause className="w-4 h-4 text-amber-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          )}

          <h3 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
            {status === 'uploading'
              ? 'Uploading to Google Drive'
              : status === 'paused'
              ? 'Upload Paused'
              : status === 'completed'
              ? 'Upload Complete'
              : 'Preparing Session'}
          </h3>
        </div>

        {/* Pause / Resume Controls */}
        <div className="flex items-center gap-2">
          {status === 'uploading' && onPause && (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
              title="Pause all uploads"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {status === 'paused' && onResume && (
            <button
              onClick={onResume}
              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
              title="Resume uploads"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}
        </div>
      </div>

      {/* TRACK AREA WITH TRAVELING NEO MASCOT */}
      <div className="pt-8 pb-3 px-2 sm:px-4">
        {/* Runner Track Wrapper: relative, overflow-visible */}
        <div className="relative w-full">
          {/* Traveling Mascot Runner:
              left: clampedPercent%
              transform: translateX(-clampedPercent%)
              Mathematically clamps perfectly at 0%, 50%, and 100% without overflow on any screen size!
          */}
          <div
            className="absolute -top-12 sm:-top-14 transition-all duration-300 ease-out z-10 pointer-events-none"
            style={{
              left: `${clampedPercent}%`,
              transform: `translateX(-${clampedPercent}%)`
            }}
          >
            {/* Speech bubble */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 text-white text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap mb-1 flex items-center gap-1 border border-slate-700/60">
                <span>{speechBubbleText}</span>
              </div>

              {/* Neo Avatar Figure */}
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full p-[2px] bg-gradient-to-tr from-blue-600 via-amber-400 to-rose-400 shadow-md">
                <img
                  src="/images/neo-character.png"
                  alt="Neo traveling along progress bar"
                  className={`w-full h-full object-cover rounded-full bg-white scale-110 ${
                    status === 'uploading' ? 'animate-bounce-subtle' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Real Progress Bar Track */}
          <div className="h-3.5 sm:h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                status === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : status === 'paused'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500'
              }`}
              style={{ width: `${clampedPercent}%` }}
            >
              {/* Subtle animated shimmer highlight */}
              {status === 'uploading' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 mt-3 text-center">
        {/* Uploaded / Total Bytes */}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Uploaded
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
            {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
          </span>
        </div>

        {/* Speed */}
        <div className="flex flex-col border-x border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Speed
          </span>
          <span className="text-xs sm:text-sm font-bold text-blue-600 mt-0.5">
            {status === 'uploading' ? formatSpeed(speed) : '--'}
          </span>
        </div>

        {/* Remaining Time */}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Est. Time
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
            {status === 'uploading' ? formatTime(remainingSeconds) : '--'}
          </span>
        </div>
      </div>
    </div>
  );
};
