import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2 transition-all animate-pulse">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        Network disconnected. Uploads are paused and will safely resume as soon as connection is restored.
      </span>
    </div>
  );
};
