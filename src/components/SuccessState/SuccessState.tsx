import React from 'react';
import { ExternalLink, CheckCircle2, FolderCheck, Plus } from 'lucide-react';
import { FileQueueItem, UploadSessionState } from '../../types/upload';
import { formatBytes } from '../../utils/formatBytes';

interface SuccessStateProps {
  session: UploadSessionState;
  files: FileQueueItem[];
  onUploadMore: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  session,
  files,
  onUploadMore
}) => {
  const completedFiles = files.filter((f) => f.status === 'completed');
  const totalUploadedBytes = completedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-lg text-center transition-all animate-fade-in">
      {/* Top Neo Mascot Badge */}
      <div className="relative inline-block mx-auto mb-5">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-emerald-500 via-blue-500 to-amber-400 p-[3px] shadow-xl">
          <div className="w-full h-full bg-white rounded-[22px] overflow-hidden flex items-center justify-center">
            <img
              src="/images/neo-character.png"
              alt="Neo celebrating successful upload"
              className="w-full h-full object-cover object-top scale-110"
            />
          </div>
        </div>
        <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-white shadow-md">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
        Upload Complete!
      </h2>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        All {completedFiles.length} {completedFiles.length === 1 ? 'file has' : 'files have'} been uploaded and safely organized in your Google Drive.
      </p>

      {/* Session Details Card */}
      <div className="mt-6 max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-left text-xs text-slate-600 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Folder Name:</span>
          <span className="font-bold text-slate-800">{session.folderName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Submission ID:</span>
          <code className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-blue-600">
            {session.submissionId}
          </code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Total Delivered:</span>
          <span className="font-semibold text-slate-800">{formatBytes(totalUploadedBytes)}</span>
        </div>
      </div>

      {/* Primary Action: Open Google Drive Folder */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
        {session.driveFolderUrl && (
          <a
            href={session.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95"
          >
            <FolderCheck className="w-4 h-4" />
            <span>Open in Google Drive</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          type="button"
          onClick={onUploadMore}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-5 py-3.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload More Files</span>
        </button>
      </div>
    </div>
  );
};
