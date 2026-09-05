import React from 'react';
import { FolderPlus, X } from 'lucide-react';
import { sanitizeFolderName } from '../../utils/fileUtils';

interface FolderNameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  submissionId: string;
  error?: string;
}

export const FolderNameInput: React.FC<FolderNameInputProps> = ({
  value,
  onChange,
  disabled = false,
  submissionId,
  error
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const sanitized = sanitizeFolderName(value);
  const previewName = sanitized
    ? `${sanitized} - ${todayStr} - ${submissionId}`
    : `[Folder Name] - ${todayStr} - ${submissionId}`;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="folder-input" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FolderPlus className="w-4 h-4 text-blue-600" />
          Step 1: Destination Folder Name
        </label>
        <span className="text-[11px] text-slate-400">
          {value.length}/60 chars
        </span>
      </div>

      <div className="relative">
        <input
          id="folder-input"
          type="text"
          maxLength={60}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Wedding Raw Footage, Client Assets, Team Submission"
          className={`w-full text-slate-900 placeholder:text-slate-400 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl py-3 pl-4 pr-10 text-sm sm:text-base font-medium outline-none transition-all ${
            error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
              : 'border-slate-200 focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            title="Clear text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>
      ) : (
        <div className="mt-2 text-xs text-slate-500 flex flex-wrap items-center gap-1">
          <span className="text-slate-400">Created as:</span>
          <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px] break-all border border-slate-200">
            {previewName}
          </code>
        </div>
      )}
    </div>
  );
};
