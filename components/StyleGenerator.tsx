import React, { useState, useRef, useEffect } from 'react';
import { generateVirtualTryOn, generateOutfitImage, getOutfitRecommendations } from '../services/gemini';
import ImageCropper from './ImageCropper';
import { 
  Loader2, Sparkles, Download, Upload, X, Shirt, Image as ImageIcon, 
  User, Wand2, RefreshCw, RotateCcw, BrainCircuit, Maximize, 
  ZoomIn, ZoomOut, RectangleHorizontal, RectangleVertical, Square, Lock, Unlock, Undo2, AlertCircle,
  Crop, Ratio
} from 'lucide-react';

// Data Categories for each mode
const OUTFIT_CATEGORIES = {
  Gaya: [
    'Casual Daily', 'Formal Kantor', 'Syar\'i Modern', 'Street Style', 'Vintage Retro', 'Korean Look', 'Minimalist',
    'Cewek Bumi (Earth Tone)', 'Cewek Mamba (All Black)', 'Cewek Kue (Colorful)', 'Old Money Aesthetic', 'Sporty Hijab', 'Preppy Look', 'Bohemian', 'Y2K Modest'
  ],
  Atasan: [
    'Kemeja Oversized', 'Blouse Ruffle', 'Tunik Panjang', 'Sweater Rajut', 'Blazer', 'T-shirt', 'Cardigan', 'Outer Kimono',
    'Vest Knit', 'Long Coat', 'Jaket Denim', 'Kemeja Flannel', 'Blouse Satin', 'Tunik Asimetris', 'Jaket Varsity', 'Outer Brokat', 'Crop Top + Inner', 'Puff Sleeve Blouse'
  ],
  Bawahan: [
    'Rok Plisket', 'Kulot Highwaist', 'Jeans Loose', 'Rok A-Line', 'Celana Bahan', 'Rok Span', 'Celana Cargo',
    'Rok Cargo', 'Rok Denim Panjang', 'Wide Leg Jeans', 'Rok Tutu', 'Rok Serut', 'Celana Linen', 'Rok Lilit Batik', 'Palazzo Pants', 'Rok Maxy'
  ],
  Hijab: [
    'Pashmina Plisket', 'Segi Empat Paris', 'Bergo Sport', 'Turban', 'Pashmina Silk', 'Syar\'i Layer', 'Scarf Pattern',
    'Pashmina Inner', 'Hijab Voal Printing', 'Bella Square', 'Pashmina Ceruty', 'Khimar French', 'Clean Hijab Style', 'Hijab Instan Tali'
  ]
};

const BG_CATEGORIES = {
  Lokasi: ['Cafe Aesthetic', 'Taman Bunga', 'Pantai Sunset', 'City Street', 'Studio Minimalis', 'Perpustakaan', 'Pegunungan', 'Art Gallery', 'Bandara'],
  Suasana: ['Cerah (Daylight)', 'Golden Hour', 'Malam Kota (City Lights)', 'Mendung Dramatis', 'Indoor Warm', 'Studio White', 'Soft Dreamy']
};

const POSE_CATEGORIES = {
  'Gaya (Preset)': [
    'Basic Standing (Hands Side)', 'Hand on Hip (Confident)', 'Walking Candid (Street)', 
    'Sitting Elegant (Cafe)', 'Leaning Against Wall', 'Looking Over Shoulder', 
    'Adjusting Hijab (Candid)', 'Holding Bag Forward', 'Crossed Arms (Boss Lady)',
    'Twirling Skirt (Dynamic)', 'Selfie Mirror Pose', 'Squatting/Crouching (Streetwear)'
  ],
  'Angle': [
    'Eye Level (Normal)', 'Low Angle (Legs Elongated)', 'High Angle (Cute)', 
    'Side Profile (Silhouette)', 'Close Up (Portrait)', 'Wide Shot (Scenery)'
  ],
  'Ekspresi': [
    'Senyum Natural (Ramah)', 'Fierce (Model Look)', 'Tertawa Lepas (Candid)', 
    'Soft Smile (Anggun)', 'Melihat ke Samping (Dreamy)', 'Mata Tertutup (Estetik)'
  ]
};

const ASPECT_RATIOS = [
    { label: '3:4', value: '3:4', Icon: RectangleVertical },
    { label: '4:3', value: '4:3', Icon: RectangleHorizontal },
    { label: '1:1', value: '1:1', Icon: Square },
    { label: '9:16', value: '9:16', Icon: RectangleVertical },
    { label: '16:9', value: '16:9', Icon: RectangleHorizontal },
];

const base64ToFile = async (url: string, filename: string): Promise<File> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

const StyleGenerator: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [modelPhoto, setModelPhoto] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [refPhoto, setRefPhoto] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  
  const [creativity, setCreativity] = useState(35);
  const [activeTab, setActiveTab] = useState<'outfit' | 'bg' | 'pose'>('outfit');
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [faceLock, setFaceLock] = useState(true);

  const [outfitSel, setOutfitSel] = useState<Record<string, string>>({});
  const [bgSel, setBgSel] = useState<Record<string, string>>({});
  const [poseSel, setPoseSel] = useState<Record<string, string>>({});
  const [customPrompt, setCustomPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);
  
  const [history, setHistory] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cropper specific state
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempRefImg, setTempRefImg] = useState<string | null>(null);
  const [tempRefFile, setTempRefFile] = useState<File | null>(null);

  const modelInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
     setResultImages([]);
     setHistory([]);
  }, [modelPhoto]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [resultImages]);
  
  useEffect(() => {
      setRefPhoto(null);
      setRefPreview(null);
  }, [activeTab]);

  // --- HANDLERS ---
  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setModelPhoto(file);
      setModelPreview(URL.createObjectURL(file));
      setResultImages([]);
    }
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setTempRefFile(file);
      setTempRefImg(URL.createObjectURL(file));
      setShowCropModal(true);
      e.target.value = '';
    }
  };

  // Callback from ImageCropper
  const handleCropComplete = (blob: Blob) => {
      const croppedFile = new File([blob], "cropped_ref.jpg", { type: "image/jpeg" });
      setRefPhoto(croppedFile);
      setRefPreview(URL.createObjectURL(croppedFile));
      
      // Cleanup
      setShowCropModal(false);
      setTempRefImg(null);
      setTempRefFile(null);
  };

  const closeCropModal = () => {
      setShowCropModal(false);
      setTempRefImg(null);
      setTempRefFile(null);
  };

  const handleUseOriginal = () => {
      if (tempRefFile && tempRefImg) {
          setRefPhoto(tempRefFile);
          setRefPreview(tempRefImg);
      }
      closeCropModal();
  };

  const handleResetResult = () => {
      setResultImages([]);
      setHistory([]);
  };
  
  const handleUndo = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (history.length === 0) return;
      const previousState = history[history.length - 1];
      setResultImages(previousState);
      setHistory(prev => prev.slice(0, -1));
  };

  const toggleSelection = (category: string, item: string) => {
    const setSel = activeTab === 'outfit' ? setOutfitSel : activeTab === 'bg' ? setBgSel : setPoseSel;
    setSel(prev => ({ ...prev, [category]: prev[category] === item ? '' : item }));
  };

  const randomizeSelections = () => {
    let categories: any = {};
    let setSel: any = null;

    if (activeTab === 'outfit') { categories = OUTFIT_CATEGORIES; setSel = setOutfitSel; }
    else if (activeTab === 'bg') { categories = BG_CATEGORIES; setSel = setBgSel; }
    else { categories = POSE_CATEGORIES; setSel = setPoseSel; }

    const newSel: any = {};
    Object.keys(categories).forEach(cat => {
      const items = categories[cat];
      newSel[cat] = items[Math.floor(Math.random() * items.length)];
    });
    setSel(newSel);
  };

  const handleAIRecommendation = async () => {
      if (!modelPhoto) {
          setError("Silakan upload foto terlebih dahulu agar AI bisa menganalisis.");
          return;
      }
      setAnalyzing(true);
      setError(null);
      try {
          const promptRecommendation = await getOutfitRecommendations(modelPhoto);
          setCustomPrompt(promptRecommendation);
          setOutfitSel({});
      } catch (err) {
          setError("Gagal mendapatkan rekomendasi AI. Silakan coba lagi.");
      } finally {
          setAnalyzing(false);
      }
  };

  const getActiveSelections = () => {
    if (activeTab === 'outfit') return outfitSel;
    if (activeTab === 'bg') return bgSel;
    return poseSel;
  };

  const getActiveCategories = () => {
    if (activeTab === 'outfit') return OUTFIT_CATEGORIES;
    if (activeTab === 'bg') return BG_CATEGORIES;
    return POSE_CATEGORIES;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);

    progressInterval.current = setInterval(() => {
        setProgress((prev) => {
            if (prev >= 90) return 90;
            const increment = prev < 50 ? 5 : 1; 
            return prev + increment;
        });
    }, 300);

    const selections = getActiveSelections();
    const hasSelections = Object.values(selections).some(val => !!val);
    let prompt = "";

    if (activeTab === 'outfit') {
        if (!hasSelections && !customPrompt) {
             prompt = "Seorang model fashion muslimah tampil memukau dengan gaya OOTD kekinian yang elegan. Menggunakan outfit modest wear premium dengan perpaduan warna earth tone yang lembut, hijab style modern yang rapi. Pencahayaan cinematic, resolusi 8k super detail, photorealistic masterpiece, tekstur kain nyata.";
        } else {
            const style = selections['Gaya'];
            const top = selections['Atasan'];
            const bottom = selections['Bawahan'];
            const hijab = selections['Hijab'];
            
            let description = "";
            if (style) description = `Seorang model fashion muslimah memancarkan pesona ${style} yang anggun dan percaya diri.`;
            else description = "Seorang model fashion muslimah tampil menawan dengan gaya OOTD terkini.";

            if (top && bottom) description += ` Ia mengenakan kombinasi ${top} yang dipadukan secara estetik dengan ${bottom}.`;
            else if (top) description += ` Ia terlihat stylish mengenakan ${top} yang modis.`;
            else if (bottom) description += ` Ia mengenakan ${bottom} yang memberikan siluet elegan.`;

            if (hijab) description += ` Penampilannya semakin sempurna dengan balutan hijab ${hijab} yang rapi.`;

            if (customPrompt) {
                description += ` Detail tambahan: ${customPrompt}.`;
            } else {
                let enhancers = " Wajah cantik natural, proporsi tubuh ideal, pencahayaan studio yang soft, detail tekstur kain high-definition, photorealistic 8k.";
                if (style && (style.includes('Street') || style.includes('Casual'))) enhancers = " Pencahayaan natural outdoor, gaya candid yang hidup, 8k uhd.";
                else if (style && (style.includes('Formal') || style.includes('Luxury'))) enhancers = " Pencahayaan elegan, kesan mewah, detail kain premium, 8k.";
                description += enhancers;
            }
            prompt = description;
        }
    } else {
        if (!hasSelections && !customPrompt) {
             if (activeTab === 'bg') prompt = "Latar belakang aesthetic modern minimalist cafe dengan pencahayaan natural yang lembut, resolusi tinggi 8k.";
             else prompt = "Pose fashion model profesional yang elegan dan natural, berdiri percaya diri, high fashion photography style.";
        } else {
            const descriptionParts = Object.entries(selections).filter(([_, val]) => val).map(([key, val]) => `${key}: ${val}`);
            if (customPrompt) descriptionParts.push(customPrompt);
            prompt = descriptionParts.join(', ');
        }
    }
    
    if (!prompt && !refPhoto) prompt = "Modest fashion model, high quality";

    if (faceLock) prompt += ". STRICT REQUIREMENT: Keep the model's face, features, expression, and skin tone 100% identical to the original image. Do not edit the face.";

    try {
        let sourceImageFile = modelPhoto;

        if (resultImages.length > 0) {
            try {
                sourceImageFile = await base64ToFile(resultImages[0], "edited_image.png");
            } catch (e) {
                console.warn("Failed to reuse result image", e);
                sourceImageFile = modelPhoto;
            }
        }

        const ugcPoses = [
            "Pose 1: Casual standing, natural everyday look, perfect for UGC video thumbnail",
            "Pose 2: Dynamic angle, showing off the outfit details, lifestyle UGC shot",
            "Pose 3: Walking confidently, street style aesthetic, engaging UGC content",
            "Pose 4: Relaxed sitting pose, aesthetic cafe vibe, authentic UGC style"
        ];

        const promises = ugcPoses.map(async (posePrompt) => {
            let currentPrompt = prompt + ". " + posePrompt;
            if (sourceImageFile) {
                 return await generateVirtualTryOn(sourceImageFile, currentPrompt, refPhoto, creativity, activeTab, aspectRatio, faceLock);
            } else {
                 if (activeTab !== 'outfit') {
                     throw new Error("Upload foto terlebih dahulu untuk mengganti Background atau Pose.");
                 }
                 currentPrompt += ". Full body shot of a muslimah model, photorealistic, 8k.";
                 return await generateOutfitImage(currentPrompt, aspectRatio);
            }
        });

        const urls = await Promise.all(promises);
       
        if (urls.length > 0) {
            setHistory(prev => [...prev, resultImages]);
            setResultImages(urls);
        }
    } catch (err: any) {
        let displayError = "Terjadi kesalahan saat memproses permintaan Anda.";
        const msg = (err.message || err.toString()).toLowerCase();
        if (msg.includes('401') || msg.includes('api key')) displayError = "Akses ditolak: API Key tidak valid.";
        else if (msg.includes('safety') || msg.includes('blocked')) displayError = "Gambar tidak dapat dibuat karena kebijakan konten.";
        setError(displayError);
    } finally {
        if (progressInterval.current) clearInterval(progressInterval.current);
        setProgress(100);
        setTimeout(() => setLoading(false), 600);
    }
  };

  // Zoom/Pan logic simplified
  const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.5, 4)); };
  const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.5, 1)); if (zoom <= 1.5) setPan({x:0, y:0}); };
  const handleResetZoom = (e: React.MouseEvent) => { e.stopPropagation(); setZoom(1); setPan({x:0,y:0}); };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
    }
  };
  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault(); 
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    }
  };

  const getProgressMessage = () => {
    if (progress < 30) return "Menganalisis permintaan...";
    if (progress < 60) return "Mengenerate detail visual...";
    if (progress < 85) return "Penyempurnaan tekstur & cahaya...";
    return "Menyelesaikan proses...";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-stone-900">
          Al Hijab <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600">Magic Studio</span>
        </h1>
        <p className="text-stone-500 text-sm md:text-base">Virtual Makeover: Ganti gaya hijab, outfit, background, atau pose dengan AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <h3 className="font-bold text-stone-800 tracking-wide text-sm">FOTO & MODE</h3>
            </div>
            {/* Upload & Preview */}
            <div className="mb-4">
              {!modelPreview ? (
                <div onClick={() => modelInputRef.current?.click()} className="h-64 border-2 border-dashed border-stone-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-all group">
                  <div className="bg-rose-50 p-3 rounded-full mb-3 group-hover:bg-rose-100"><Upload size={24} className="text-rose-500" /></div>
                  <span className="text-stone-600 font-medium text-sm">Upload Foto OOTD</span>
                </div>
              ) : (
                <div className="relative h-64 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                  <img src={modelPreview} alt="Model" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setFaceLock(!faceLock); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md border transition-all ${faceLock ? 'bg-rose-500/90 border-rose-400 text-white' : 'bg-white/80 border-white/50 text-stone-500'}`}>
                          {faceLock ? <Lock size={12} /> : <Unlock size={12} />} {faceLock ? 'Wajah Terkunci' : 'Wajah Tidak Terkunci'}
                      </button>
                  </div>
                  <button onClick={() => { setModelPhoto(null); setModelPreview(null); }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full"><X size={16} /></button>
                </div>
              )}
              <input ref={modelInputRef} type="file" accept="image/*" onChange={handleModelUpload} className="hidden" />
            </div>

            {/* Controls Row */}
            <div className="mb-6 space-y-5">
                {/* Aspect Ratio Menu */}
                <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 flex items-center gap-1.5">
                        <Ratio size={12} /> Ratio Output
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] font-medium transition-all ${aspectRatio === ratio.value ? 'bg-stone-800 text-white border-stone-800 shadow-md' : 'bg-white text-stone-500 border-stone-100 hover:border-rose-200 hover:text-rose-600'}`}>
                                <ratio.Icon size={16} className="mb-1" /> {ratio.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Edit Mode Menu */}
                <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-2 block">Mode Edit</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'outfit', label: 'Outfit', icon: Shirt },
                            { id: 'bg', label: 'BG', icon: ImageIcon },
                            { id: 'pose', label: 'Pose', icon: User },
                        ].map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${activeTab === tab.id ? 'border-rose-500 bg-rose-50 text-rose-600 font-bold shadow-sm' : 'border-stone-100 bg-white text-stone-500 hover:bg-stone-50'}`}>
                                <tab.icon size={18} className="mb-1" /> <span className="text-[10px]">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Creativity Slider */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-stone-600">CREATIVITY LEVEL</span><span className="text-xs font-bold text-rose-500">{creativity}%</span></div>
                    <input type="range" min="10" max="90" value={creativity} onChange={(e) => setCreativity(Number(e.target.value))} className="w-full accent-rose-500 h-1.5 bg-stone-200 rounded-lg cursor-pointer"/>
                </div>
            </div>

            {/* Reference */}
            <div className="mt-4 border-t border-stone-100 pt-4">
                <span className="text-xs font-bold text-stone-600 uppercase mb-2 block">
                    {activeTab === 'outfit' ? 'Ref Outfit' : activeTab === 'bg' ? 'Ref Background' : 'Ref Pose (Opsional)'}
                </span>
                {!refPreview ? (
                    <div onClick={() => refInputRef.current?.click()} className="h-20 border border-dashed border-stone-300 rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-stone-50 transition-colors">
                    <Upload size={16} className="text-stone-400" /> <span className="text-xs font-bold text-stone-600">Upload Referensi</span>
                    </div>
                ) : (
                    <div className="relative h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-200">
                        <img src={refPreview} alt="Ref" className="w-full h-full object-cover" />
                        <button onClick={() => { setRefPhoto(null); setRefPreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors"><X size={12} /></button>
                        <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1"><Crop size={10} /> {refPhoto?.name.startsWith('cropped') ? 'Cropped' : 'Original'}</div>
                    </div>
                )}
                <input ref={refInputRef} type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />
            </div>
          </div>

          {/* 2. PROMPT */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <h3 className="font-bold text-stone-800 tracking-wide text-sm">DESKRIPSI</h3>
                </div>
                <button onClick={randomizeSelections} disabled={analyzing} className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-purple-100 transition-colors"><Wand2 size={12} /> Acak</button>
            </div>
            <div className="space-y-4 mb-4">
                {Object.entries(getActiveCategories()).map(([cat, items]) => (
                    <div key={cat} className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase">{cat}</label>
                        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide -mx-1 px-1">
                            {items.map(item => (
                                <button key={item} onClick={() => toggleSelection(cat, item)} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${getActiveSelections()[cat] === item ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-stone-200 text-stone-600 hover:border-rose-200'}`}>{item}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-t border-stone-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-stone-400 uppercase">Custom Prompt</label>
                    {activeTab === 'outfit' && (
                        <button onClick={handleAIRecommendation} disabled={analyzing || !modelPhoto} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors disabled:opacity-50">
                            {analyzing ? <Loader2 size={10} className="animate-spin" /> : <BrainCircuit size={10} />} Rekomendasi AI
                        </button>
                    )}
                </div>
                <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Deskripsi tambahan..." className="w-full text-sm p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-200 outline-none resize-none h-24 bg-stone-50 transition-all focus:bg-white" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 h-full">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 h-full flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                        <h3 className="font-bold text-stone-800 tracking-wide text-sm">HASIL</h3>
                    </div>
                    {resultImages.length > 0 && <button onClick={handleResetResult} className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1 transition-colors"><RotateCcw size={12} /> Reset</button>}
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1"><h4 className="font-bold text-red-800 text-sm mb-1">Error</h4><p className="text-red-600 text-xs">{error}</p></div>
                    </div>
                )}

                <div className={`flex-1 bg-stone-900 rounded-2xl relative overflow-hidden min-h-[500px] flex items-center justify-center group ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                    onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
                    onTouchStart={handlePanStart} onTouchMove={handlePanMove} onTouchEnd={() => setIsDragging(false)}
                >
                    {resultImages.length > 0 ? (
                        <>
                            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} className="w-full h-full flex items-center justify-center p-4">
                                <div className="grid grid-cols-2 gap-4 w-full h-full max-h-full">
                                    {resultImages.map((img, idx) => (
                                        <div key={idx} className="relative w-full h-full flex items-center justify-center bg-stone-800 rounded-xl overflow-hidden group/item">
                                            <img src={img} alt={`Result ${idx + 1}`} className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                                            <a href={img} onClick={(e) => e.stopPropagation()} download={`hijab-makeover-${idx + 1}.png`} className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/40 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button onClick={handleZoomIn} className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm"><ZoomIn size={18} /></button>
                                <button onClick={handleZoomOut} className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm"><ZoomOut size={18} /></button>
                                {zoom > 1 && <button onClick={handleResetZoom} className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm"><Maximize size={18} /></button>}
                            </div>
                            <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                 {history.length > 0 && <button onClick={handleUndo} className="bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white/20"><Undo2 size={20} /></button>}
                                 <button onClick={(e) => { e.stopPropagation(); handleGenerate(); }} className="bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white/20"><RefreshCw size={20} /></button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-8 w-full max-w-md mx-auto">
                             {loading ? (
                                <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="relative mb-2"><div className="w-16 h-16 border-4 border-white/10 border-t-rose-500 rounded-full animate-spin"></div><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-500 animate-pulse" size={20} /></div>
                                    <div className="w-full space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase"><span>Proses AI</span><span>{progress}%</span></div>
                                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} /></div>
                                        <p className="text-white text-sm font-medium animate-pulse mt-2">{getProgressMessage()}</p>
                                    </div>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center gap-4 text-stone-600">
                                    <Sparkles size={48} className="text-stone-700 opacity-50" />
                                    <p className="text-stone-500">Hasil generate akan muncul di sini</p>
                                </div>
                             )}
                        </div>
                    )}
                    {!loading && zoom === 1 && (
                         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs z-10">
                             <button onClick={handleGenerate} disabled={(!modelPhoto && resultImages.length === 0) && !Object.values(getActiveSelections()).some(v => v)} className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-full shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95">
                                <Wand2 size={18} /> {resultImages.length > 0 ? 'Regenerate Makeover' : 'Generate Makeover'}
                            </button>
                         </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* CROPPER COMPONENT */}
      {showCropModal && tempRefImg && (
          <ImageCropper 
              imageSrc={tempRefImg}
              onCancel={closeCropModal}
              onUseOriginal={handleUseOriginal}
              onCropComplete={handleCropComplete}
          />
      )}
    </div>
  );
};

export default StyleGenerator;