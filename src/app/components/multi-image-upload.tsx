import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { UploadedImage } from '@/app/components/image-upload';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioLoadingOverlay } from '@/app/components/ui/studio-loading-overlay';
import { StudioTransientState } from '@/app/components/ui/studio-transient-state';

interface MultiImageUploadProps {
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  minImages?: number;
}

export function MultiImageUpload({ 
  onImagesChange, 
  maxImages = 5, 
  minImages = 1 
}: MultiImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const { uploadMultipleFiles, isUploading, error } = useIPFSUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Check max limit
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed. You can upload ${maxImages - images.length} more.`);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        alert(`${file.name} exceeds 100MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    try {
      setUploadingCount(validFiles.length);
      console.log(`[Multi-Upload] Uploading ${validFiles.length} files...`);
      
      const result = await uploadMultipleFiles(validFiles);
      
      if (result.success && result.files.length > 0) {
        const newImages: UploadedImage[] = result.files.map(file => ({
          url: file.url,
          ipfsHash: file.ipfsHash,
          size: file.fileSize,
          type: file.mimeType,
        }));

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
        
        console.log(`[Multi-Upload] Successfully uploaded ${newImages.length} images`);
      }

      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.map(e => `${e.fileName}: ${e.error}`).join('\n');
        alert(`Some uploads failed:\n${errorMsg}`);
      }

    } catch (err) {
      console.error('[Multi-Upload] Failed to upload:', err);
      alert(`Failed to upload images: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploadingCount(0);
      e.target.value = ''; // Reset input
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages);
    console.log('[Multi-Upload] Image removed, total:', updatedImages.length);
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading || images.length >= maxImages}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="multi-image-upload"
        />
        <label
          htmlFor="multi-image-upload"
          className={`
            flex flex-col items-center justify-center
            w-full h-40 rounded-xl border-2 border-dashed
            transition-all cursor-pointer
            ${images.length >= maxImages
              ? 'bg-ui-input border-ui-border-subtle cursor-not-allowed'
              : 'bg-ui-input border-ui-border-subtle hover:border-[#2CC295] hover:bg-ui-input-focus'
            }
          `}
        >
          {isUploading ? (
              <StudioLoadingIndicator
                layout="stacked"
                tone="primary"
                size={32}
                label="Uploading to IPFS..."
                labelClassName="text-sm font-medium text-ui-primary"
                subLabel={uploadingCount > 0 ? `${uploadingCount} file${uploadingCount > 1 ? 's' : ''}` : undefined}
              />
            ) : (
              <>
              <Upload className="text-ui-muted mb-3" size={32} />
              <p className="text-sm text-ui-primary font-medium">
                {images.length >= maxImages 
                  ? `Maximum ${maxImages} images reached`
                  : 'Click to upload images'
                }
              </p>
              <p className="text-xs text-ui-muted mt-1">
                {images.length}/{maxImages} images • Min {minImages} required
              </p>
              </>
          )}
        </label>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden border border-ui-border-subtle bg-ui-input group"
            >
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
                onError={() => setBrokenImages(prev => new Set(prev.add(index)))}
              />
              
              {/* Remove Button */}
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X size={14} className="text-white" />
              </button>

              {/* Image Number Badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-ui-dropdown backdrop-blur-sm rounded text-xs text-ui-primary font-mono">
                #{index + 1}
              </div>
            </div>
          ))}

          {/* Uploading Placeholder */}
          {uploadingCount > 0 && (
            <div className="relative aspect-square rounded-xl overflow-hidden border border-ui-border-subtle bg-ui-input">
              <StudioLoadingOverlay
                className="bg-ui-dropdown backdrop-blur-sm"
                panel={false}
                size={24}
                label={undefined}
                subLabel={undefined}
              >
                <StudioLoadingIndicator layout="inline" tone="primary" size={24} />
              </StudioLoadingOverlay>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <StudioTransientState variant="error" title={error} inline={false} />
      )}

      {/* Validation Message */}
      {images.length > 0 && images.length < minImages && (
        <StudioTransientState
          variant="warning"
          title={`Upload at least ${minImages} image${minImages > 1 ? 's' : ''} to continue`}
          inline={false}
        />
      )}
    </div>
  );
}
