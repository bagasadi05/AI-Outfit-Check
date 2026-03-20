import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-in fade-in duration-300">
      <div className="relative mb-4">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-rose-500 rounded-full animate-spin"></div>
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-500 animate-pulse" size={16} />
      </div>
      <p className="text-stone-500 font-medium text-sm animate-pulse">Memuat Modul AI...</p>
    </div>
  );
};

export default LoadingScreen;