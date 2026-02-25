import { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { unsplash_tool } from '@/tools/unsplash';

interface AssetImageGalleryProps {
  images: string[];
  name: string;
}

export function AssetImageGallery({ images, name }: AssetImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      {/* Main Gallery */}
      <div className="space-y-4">
        {/* Main Image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 group">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ImageWithFallback
                src={`https://source.unsplash.com/800x800/?${images[currentIndex]}`}
                alt={`${name} - Image ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} className="text-white" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={24} className="text-white" />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full transition-all opacity-0 group-hover:opacity-100"
          >
            <Maximize2 size={20} className="text-white" />
          </button>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
              <p className="text-xs text-white font-bold">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`
                  aspect-square rounded-lg overflow-hidden border-2 transition-all
                  ${index === currentIndex
                    ? 'border-[#2CC295] scale-95'
                    : 'border-transparent hover:border-zinc-700'
                  }
                `}
              >
                <ImageWithFallback
                  src={`https://source.unsplash.com/200x200/?${image}`}
                  alt={`${name} - Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} className="text-white" />
            </button>

            <div className="relative max-w-7xl w-full" onClick={(e) => e.stopPropagation()}>
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ImageWithFallback
                  src={`https://source.unsplash.com/1600x1200/?${images[currentIndex]}`}
                  alt={`${name} - Fullscreen`}
                  className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
                />
              </motion.div>

              {/* Lightbox Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                  >
                    <ChevronLeft size={32} className="text-white" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-all"
                  >
                    <ChevronRight size={32} className="text-white" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                    <p className="text-sm text-white font-bold">
                      {currentIndex + 1} / {images.length}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
