import React, { useState, Suspense } from 'react';
import { AppMode } from './types';
import Navigation from './components/Navigation';
import LoadingScreen from './components/common/LoadingScreen';

// Lazy load heavy components
const StyleGenerator = React.lazy(() => import('./components/StyleGenerator'));

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.GENERATOR);

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.GENERATOR:
      default:
        return (
            <Suspense fallback={<LoadingScreen />}>
                <StyleGenerator />
            </Suspense>
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navigation currentMode={currentMode} setMode={setCurrentMode} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-12">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {renderContent()}
        </div>
      </main>

      <footer className="hidden md:block text-center py-8 text-stone-400 text-sm border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-serif italic text-stone-500 mb-1">"Elegan dalam Kesantunan"</p>
          <p>&copy; 2024 Al Hijab Magic Studio. Powered by Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;