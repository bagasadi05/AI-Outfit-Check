import React from 'react';
import { AppMode } from '../types';
import { Sparkles, Home, Video, MessageCircle } from 'lucide-react';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.HOME, icon: Home, label: 'Beranda' },
    { mode: AppMode.GENERATOR, icon: Sparkles, label: 'Style Gen' },
    { mode: AppMode.VIDEO, icon: Video, label: 'Veo Video' },
    { mode: AppMode.CHAT, icon: MessageCircle, label: 'Chat Stylist' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-stone-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around md:justify-between items-center h-16 md:h-20">
          {/* Logo - Desktop Only */}
          <div 
            className="hidden md:flex items-center gap-2 cursor-pointer group"
            onClick={() => setMode(AppMode.HOME)}
          >
            <div className="bg-gradient-to-br from-rose-500 to-purple-600 p-1.5 rounded-lg">
                <Sparkles className="text-white" size={20} />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-stone-900 group-hover:text-rose-600 transition-colors">
              Al Hijab <span className="text-rose-500">Studio</span>
            </span>
          </div>

          <div className="flex justify-around w-full md:w-auto md:gap-4 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = currentMode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => setMode(item.mode)}
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-2.5 px-3 md:px-5 py-2 rounded-2xl transition-all duration-300 relative group min-w-[60px] md:min-w-0 ${
                    isActive 
                      ? 'text-rose-600 md:bg-rose-50' 
                      : 'text-stone-400 hover:text-stone-800'
                  }`}
                >
                  <item.icon size={22} className={`${isActive ? 'stroke-[2.5px]' : 'stroke-2'} group-hover:scale-110 transition-transform`} />
                  <span className={`text-[10px] md:text-sm font-semibold tracking-wide ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-1 md:hidden w-1 h-1 bg-rose-600 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Spacer for desktop layout balance */}
          <div className="hidden md:block w-32"></div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;