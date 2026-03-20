import React, { useState, useRef } from 'react';
import { generateFashionVideo } from '../services/gemini';
import { 
  Loader2, Sparkles, Upload, X, Video, Film, Play, AlertCircle, Lock
} from 'lucide-react';

const VideoGenerator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Cinematic slow motion fashion portrait, wind blowing hijab gently, soft lighting, photorealistic, 4k");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setVideoUrl(null);
      setError(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setVideoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateVideo = async () => {
    if (!file) return;
    
    // Check for API Key selection for Veo
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await window.aistudio.openSelectKey();
                // User might have selected a key, assume success as per guidelines.
            } catch (e) {
                setError("Gagal membuka dialog pemilihan API Key.");
                return;
            }
        }
    }

    setLoading(true);
    setError(null);
    
    try {
      const url = await generateFashionVideo(file, prompt);
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      let msg = "Gagal membuat video. Silakan coba lagi.";
      if (err.toString().includes("Requested entity was not found")) {
          // Retry key selection logic if needed, but for now just show error
          msg = "API Key error. Silakan refresh dan pilih key kembali.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <header className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center justify-center gap-2">
            <Video className="text-rose-500" /> Veo Cinematic Video
        </h2>
        <p className="text-stone-500">Hidupkan foto OOTD kamu menjadi video fashion cinematik dengan Google Veo.</p>
        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-medium border border-amber-100">
            <Lock size={10} /> Requires Paid API Key
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden p-6">
                <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <span className="bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Upload Foto
                </h3>
                
                {!preview ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-stone-300 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group"
                    >
                        <div className="bg-stone-100 p-4 rounded-full mb-4 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors text-stone-400">
                            <Upload size={32} />
                        </div>
                        <p className="text-stone-600 font-medium">Upload Hasil Style Gen</p>
                        <p className="text-stone-400 text-sm mt-1">atau foto dari galeri</p>
                    </div>
                ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group">
                        <img src={preview} alt="Upload preview" className="w-full h-64 object-cover" />
                        <button 
                            onClick={clearFile}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
                <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <span className="bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Prompt Video
                </h3>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-28 p-3 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none resize-none bg-stone-50"
                    placeholder="Describe the movement..."
                />
                <button 
                    onClick={handleGenerateVideo}
                    disabled={!file || loading}
                    className="mt-4 w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Film size={20} />}
                    {loading ? "Generating Veo Video..." : "Generate Video"}
                </button>
                {loading && (
                    <p className="text-xs text-center text-stone-400 mt-2 animate-pulse">
                        Proses ini memakan waktu sekitar 1-2 menit. Mohon tunggu...
                    </p>
                )}
              </div>
          </div>

          {/* Result Section */}
          <div className="bg-stone-900 rounded-3xl overflow-hidden shadow-xl flex flex-col relative min-h-[400px]">
             {error && (
                <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl flex items-start gap-2 z-20 backdrop-blur-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs">{error}</p>
                </div>
             )}

             {videoUrl ? (
                <div className="flex-1 flex items-center justify-center bg-black">
                     <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className="w-full h-full object-contain"
                    />
                </div>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-600 p-8">
                    {loading ? (
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-white/10 border-t-rose-500 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-stone-400 font-medium">Sedang merender video...</p>
                        </div>
                    ) : (
                        <>
                            <Film size={48} className="text-stone-700 opacity-50 mb-4" />
                            <p className="text-stone-500">Hasil video akan muncul di sini</p>
                        </>
                    )}
                </div>
             )}
          </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
