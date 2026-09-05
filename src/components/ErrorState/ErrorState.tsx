import React from 'react';
import { AlertTriangle, RotateCcw, Settings } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  onOpenSettings
}) => {
  const isConfigError =
    message.toLowerCase().includes('url') ||
    message.toLowerCase().includes('configured') ||
    message.toLowerCase().includes('connect');

  return (
    <div className="w-full bg-rose-50/70 rounded-2xl border border-rose-200/80 p-5 sm:p-8 shadow-sm text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 mb-4">
        <AlertTriangle className="w-7 h-7 text-rose-500" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-rose-800">
        {isConfigError ? 'Connection Issue' : 'Upload Error'}
      </h3>
      <p className="text-sm text-rose-600 mt-1.5 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}

        {isConfigError && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-5 py-3 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Open Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
