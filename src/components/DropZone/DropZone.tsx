import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, HardDrive, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  }, [disabled, onFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
      // reset value so re-selecting same files triggers change
      e.target.value = '';
    }
  }, [onFilesSelected]);

  const openFilePicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFilePicker}
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
        disabled
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : isDragOver
          ? 'bg-blue-50/70 border-blue-500 scale-[1.01] shadow-lg ring-4 ring-blue-100'
          : 'bg-white/80 hover:bg-slate-50/80 border-slate-300 hover:border-blue-400 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Upload icon circle */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-transform ${
          isDragOver
            ? 'bg-blue-600 text-white scale-110 shadow-md'
            : 'bg-blue-50 text-blue-600 group-hover:scale-105 group-hover:bg-blue-100'
        }`}
      >
        <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <div className="mt-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
          Drag and drop files here, or <span className="text-blue-600 underline underline-offset-2">browse</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
          Select single or multiple files of any format.
        </p>
      </div>

      {/* Feature Badges */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-full border border-slate-200/60 transition-colors">
          <HardDrive className="w-3 h-3 text-blue-600" />
          Supports 1 GB+ Files
        </span>
        <span className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-full border border-slate-200/60 transition-colors">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Auto Resumable Chunks
        </span>
      </div>
    </div>
  );
};
