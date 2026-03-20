import React from 'react';
import { AppMode } from '../types';
import { Sparkles } from 'lucide-react';

interface HeroProps {
  setMode: (mode: AppMode) => void;
}

const Hero: React.FC<HeroProps> = ({ setMode }) => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-6 max-w-3xl mx-auto pt-4 md:pt-8">
        <span className="inline-block px-4 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-2 border border-rose-100">
            Powered by Gemini 2.5 AI
        </span>
        <h1 className="text-4xl md:text-7xl font-serif font-bold text-stone-900 leading-[1.1]">
          Temukan Gaya <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600 italic">Hijab Sempurnamu</span>
        </h1>
        <p className="text-stone-500 text-base md:text-xl leading-relaxed max-w-xl mx-auto px-4">
          Asisten fashion AI pribadi untuk gaya muslimah modis. Rancang outfit impian atau analisis koleksi lemari Anda secara instan.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button 
            onClick={() => setMode(AppMode.GENERATOR)}
            className="w-full sm:w-auto px-10 py-4 bg-stone-900 text-white rounded-full font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-stone-300 transform hover:-translate-y-1"
          >
            <Sparkles size={18} />
            Mulai Virtual Makeover
          </button>
        </div>
      </div>

      <div className="relative rounded-[2.5rem] overflow-hidden aspect-[16/10] md:aspect-[21/9] bg-stone-200 shadow-2xl mx-2 md:mx-0">
          <img 
            src="https://images.unsplash.com/photo-1621295286596-370133c949d0?q=80&w=2671&auto=format&fit=crop" 
            alt="Modest Fashion Collage" 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-[2000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent flex items-end p-8 md:p-12">
            <div className="text-white max-w-lg">
                <p className="font-serif text-2xl md:text-3xl italic mb-2">"Kesantunan adalah bentuk tertinggi dari keanggunan."</p>
                <p className="text-stone-300 text-sm md:text-base font-medium">Inspirasi fashion harian yang didukung oleh teknologi kecerdasan buatan masa depan.</p>
            </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 md:px-0 pb-8">
         {[
             { title: "Smart Matching", desc: "Analisis teori warna untuk perpaduan hijab yang harmonis.", icon: "🎨" },
             { title: "Occasion Ready", desc: "Dari gaya santai akhir pekan hingga acara formal pernikahan.", icon: "✨" },
             { title: "Trend Aware", desc: "Selalu terupdate dengan tren fashion muslimah global terkini.", icon: "📈" }
         ].map((feat, i) => (
             <div key={i} className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all group">
                 <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">{feat.icon}</div>
                 <h3 className="font-serif font-bold text-xl text-stone-800 mb-2">{feat.title}</h3>
                 <p className="text-stone-500 text-sm leading-relaxed">{feat.desc}</p>
             </div>
         ))}
      </div>
    </div>
  );
};

export default Hero;