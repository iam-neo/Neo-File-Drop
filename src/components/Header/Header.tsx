import React from 'react';
import { HardDrive } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  isConfigured: boolean;
  isOffline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isConfigured,
  isOffline
}) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Left: Mascot & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-amber-400 p-[2px] shadow-sm hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex items-center justify-center">
              <img
                src="/images/neo-character.png"
                alt="Neo"
                className="w-full h-full object-cover object-top scale-110"
              />
            </div>
            {/* Status dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isOffline ? 'bg-amber-500' : isConfigured ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              title={isOffline ? 'Offline' : isConfigured ? 'Ready to upload' : 'Setup required'}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none">
                Neo File Drop
              </h1>
              <span className="hidden xs:inline-flex items-center text-[11px] font-semibold tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                Drive Direct
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
              <span>Public upload portal</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <HardDrive className="w-3 h-3 text-blue-500" />
                No login required
              </span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isConfigured && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Drive Ready</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
