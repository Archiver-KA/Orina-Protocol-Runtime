import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId } from '/utils/supabase/info';
import { getIpfsUploadAuthHeaders } from '@/utils/ipfsUploadAuth';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioLoadingOverlay } from '@/app/components/ui/studio-loading-overlay';
import { StudioTransientState } from '@/app/components/ui/studio-transient-state';

export interface UploadedImage {
  ipfsHash: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ImageUploadProps {
  onUploadSuccess: (image: UploadedImage) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  accept?: string;
  currentImageUrl?: string;
  className?: string;
  variant?: 'avatar' | 'banner' | 'asset' | 'evidence';
  label?: string;
  description?: string;
  showPreview?: boolean;
  /** Required for authenticated IPFS upload (H1 bridge). */
  walletAddress?: string | null;
}

export function ImageUpload({
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 100,
  accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
  currentImageUrl,
  className = '',
  variant = 'asset',
  label,
  description,
  showPreview = true,
  walletAddress,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      const error = `File size exceeds ${maxSizeMB}MB limit`;
      setErrorMessage(error);
      setUploadStatus('error');
      onUploadError?.(error);
      return;
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(t => t.trim());
    if (!allowedTypes.includes(file.type)) {
      const error = `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
      setErrorMessage(error);
      setUploadStatus('error');
      onUploadError?.(error);
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload to IPFS
    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      if (!walletAddress?.trim()) {
        const err = 'Connect your wallet and complete wallet sign-in to upload.';
        setErrorMessage(err);
        setUploadStatus('error');
        onUploadError?.(err);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await getIpfsUploadAuthHeaders(walletAddress);

      // Simulate progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload`,
        {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Log raw response for debugging
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }
        
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Use Pinata gateway by default (most reliable)
      const uploadedImage: UploadedImage = {
        ipfsHash: result.ipfsHash,
        url: result.urls.pinata,
        fileName: result.metadata.fileName,
        fileSize: result.metadata.fileSize,
        mimeType: result.metadata.mimeType,
      };

      setUploadStatus('success');
      onUploadSuccess(uploadedImage);

      // Reset status after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('IPFS upload error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setErrorMessage(errorMsg);
      setUploadStatus('error');
      onUploadError?.(errorMsg);

      // Clear preview on error
      setPreviewUrl(currentImageUrl || '');
    } finally {
      setIsUploading(false);
    }
  }, [accept, maxSizeMB, currentImageUrl, onUploadSuccess, onUploadError, projectId, walletAddress]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearPreview = () => {
    setPreviewUrl('');
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'avatar':
        return {
          container: 'w-32 h-32 rounded-full',
          preview: 'rounded-full',
        };
      case 'banner':
        return {
          container: 'w-full h-40',
          preview: 'rounded-xl',
        };
      case 'asset':
        return {
          container: 'w-full h-64',
          preview: 'rounded-xl',
        };
      case 'evidence':
        return {
          container: 'w-full h-48',
          preview: 'rounded-lg',
        };
      default:
        return {
          container: 'w-full h-64',
          preview: 'rounded-xl',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-bold text-ui-muted mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div
        className={`relative ${styles.container} border-2 border-dashed ${
          uploadStatus === 'error'
            ? 'border-red-500/50 bg-red-500/5'
            : uploadStatus === 'success'
            ? 'border-[#2CC295]/50 bg-[#2CC295]/5'
            : 'border-ui-border-subtle bg-ui-input'
        } ${isUploading ? 'cursor-wait' : 'cursor-pointer'} hover:border-[#2CC295] hover:bg-ui-input-focus transition-all ${styles.preview} overflow-hidden group`}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <AnimatePresence mode="wait">
          {previewUrl && showPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full"
            >
              <img
                src={previewUrl}
                alt="Preview"
                className={`w-full h-full object-cover ${styles.preview}`}
              />

              {isUploading && (
                <StudioLoadingOverlay
                  label="Uploading to IPFS..."
                  subLabel={`${uploadProgress}%`}
                  size={variant === 'avatar' ? 24 : 30}
                />
              )}
              
              {/* Overlay with Upload icon to replace */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-ui-dropdown transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-ui-input rounded-xl flex items-center justify-center">
                    <Upload className="text-primary" size={24} />
                  </div>
                  <p className="text-ui-primary text-xs font-medium">Change Image</p>
                </div>
              </div>

              {/* Error badge only - success badge removed to keep avatar/banner layout centered */}
              {uploadStatus === 'error' && (
                <div className="absolute top-2 right-2">
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={12} />
                    Failed
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
            >
              {isUploading ? (
                <StudioLoadingIndicator
                  layout="stacked"
                  tone="primary"
                  size={variant === 'avatar' ? 32 : 40}
                  label="Uploading to IPFS..."
                  subLabel={`${uploadProgress}%`}
                  className="justify-center"
                />
              ) : (
                <>
                  {variant === 'avatar' ? (
                    <>
                      <div className="w-12 h-12 bg-ui-input rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="text-primary" size={24} />
                      </div>
                      <p className="text-sm font-medium text-ui-primary">Upload Photo</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-ui-input rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="text-primary" size={28} />
                      </div>
                      <p className="text-ui-primary font-medium mb-1">Drag and drop or click to upload</p>
                    </>
                  )}
                  {description && (
                    <p className="text-xs text-ui-muted mt-1">{description}</p>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {uploadStatus === 'error' && errorMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
          <StudioTransientState variant="error" title={errorMessage} />
        </motion.div>
      )}

      {/* Success message with IPFS info */}
      {uploadStatus === 'success' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
          <StudioTransientState variant="success" title="Successfully uploaded to IPFS" />
        </motion.div>
      )}
    </div>
  );
}
