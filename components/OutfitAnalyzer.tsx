import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Send, Sparkles } from 'lucide-react';
import { analyzeUploadedLook } from '../services/gemini';

const OutfitAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [query, setQuery] = useState("What hijab color matches this outfit best?");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setAnalysis(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await analyzeUploadedLook(file, query);
      setAnalysis(result);
    } catch (error) {
      setAnalysis("Sorry, I had trouble analyzing that image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <header className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-stone-800">Outfit Analyzer</h2>
        <p className="text-stone-500">Upload a photo of your clothes and get instant hijab pairing advice.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {/* Upload Area */}
        <div className="p-6 md:p-8">
            {!preview ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group"
                >
                    <div className="bg-stone-100 p-4 rounded-full mb-4 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors text-stone-400">
                        <Upload size={32} />
                    </div>
                    <p className="text-stone-600 font-medium">Click to upload photo</p>
                    <p className="text-stone-400 text-sm mt-1">or drag and drop</p>
                </div>
            ) : (
                <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                    <img src={preview} alt="Upload preview" className="w-full max-h-[400px] object-contain mx-auto" />
                    <button 
                        onClick={clearFile}
                        className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
            />
        </div>

        {/* Query & Action */}
        <div className="border-t border-stone-100 p-6 md:p-8 bg-stone-50/50">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">What do you want to know?</label>
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-200 outline-none"
                    />
                </div>
                <button 
                    onClick={handleAnalyze}
                    disabled={!file || loading}
                    className="w-full bg-stone-800 hover:bg-stone-900 text-white font-medium py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
                    {loading ? "Analyzing..." : "Analyze Look"}
                </button>
            </div>
        </div>
      </div>

      {/* Result Display */}
      {analysis && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border-l-4 border-rose-400 animate-in slide-in-from-bottom-2 fade-in">
            <h3 className="font-serif font-bold text-xl text-stone-800 mb-3 flex items-center gap-2">
                <Sparkles size={20} className="text-rose-500" />
                Stylist's Verdict
            </h3>
            <div className="prose prose-stone text-stone-600 leading-relaxed whitespace-pre-wrap">
                {analysis}
            </div>
        </div>
      )}
    </div>
  );
};

export default OutfitAnalyzer;