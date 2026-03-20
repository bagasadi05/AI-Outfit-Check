import React, { useState, useRef } from 'react';
import { X, Crop, MousePointer2, Scissors } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onUseOriginal: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ 
  imageSrc, 
  onCancel, 
  onUseOriginal, 
  onCropComplete 
}) => {
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsSelecting(true);
    setStartPos({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const newX = Math.min(startPos.x, currentX);
    const newY = Math.min(startPos.y, currentY);
    const newWidth = Math.abs(currentX - startPos.x);
    const newHeight = Math.abs(currentY - startPos.y);

    setCropRect({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const processCrop = () => {
    if (!imgRef.current || cropRect.width < 10 || cropRect.height < 10) {
        onUseOriginal();
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const realX = cropRect.x * scaleX;
    const realY = cropRect.y * scaleY;
    const realWidth = cropRect.width * scaleX;
    const realHeight = cropRect.height * scaleY;

    canvas.width = realWidth;
    canvas.height = realHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.drawImage(
            image,
            realX, realY, realWidth, realHeight,
            0, 0, realWidth, realHeight
        );

        canvas.toBlob((blob) => {
            if (blob) {
                onCropComplete(blob);
            }
        }, 'image/jpeg', 0.95);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                  <Crop size={20} className="text-rose-500" />
                  <span className="font-bold text-sm tracking-wide">Select Area to Use</span>
              </div>
              <button onClick={onCancel} className="text-stone-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
              </button>
          </div>

          {/* Crop Area */}
          <div 
              ref={cropContainerRef}
              className="flex-1 bg-black relative overflow-hidden flex items-center justify-center cursor-crosshair select-none p-8"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
          >
              <img 
                  ref={imgRef}
                  src={imageSrc} 
                  alt="Crop Preview" 
                  className="max-w-full max-h-[60vh] object-contain pointer-events-none" 
                  onDragStart={(e) => e.preventDefault()}
              />
              
              {/* Crop Rect Overlay */}
              {cropRect.width > 0 && (
                  <div 
                      className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      style={{
                          left: cropRect.x,
                          top: cropRect.y,
                          width: cropRect.width,
                          height: cropRect.height,
                      }}
                  >
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                          <div className="border-r border-white/30 col-span-1"></div>
                          <div className="border-r border-white/30 col-span-1"></div>
                          <div className="border-b border-white/30 row-span-1 col-span-3 -mt-[200%]"></div>
                      </div>
                      <div className="absolute -top-6 left-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {Math.round(cropRect.width)} x {Math.round(cropRect.height)}
                      </div>
                  </div>
              )}
              
              {!cropRect.width && !isSelecting && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium border border-white/10 animate-pulse">
                          <MousePointer2 size={16} />
                          Drag to select area
                      </div>
                  </div>
              )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-stone-900 border-t border-white/10 flex justify-between items-center gap-4">
              <button 
                  onClick={onUseOriginal}
                  className="text-stone-400 hover:text-white text-sm font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
              >
                  Use Full Image
              </button>
              <div className="flex gap-2">
                  <button 
                      onClick={onCancel}
                      className="px-4 py-2 rounded-xl text-stone-300 font-bold text-sm hover:bg-white/10 transition-all"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={processCrop}
                      className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-900/20 transition-all flex items-center gap-2"
                  >
                      <Scissors size={16} />
                      Crop & Use
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ImageCropper;