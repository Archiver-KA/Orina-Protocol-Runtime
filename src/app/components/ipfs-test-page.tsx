import { useState } from 'react';
import { ImageUpload, UploadedImage } from './image-upload';
import { MultiImageUpload } from './multi-image-upload';
import { IPFSSetupBanner } from './ipfs-setup-banner';
import { Copy, Check, ExternalLink, Image as ImageIcon, Images } from 'lucide-react';
import { getIPFSUrls } from '../../hooks/useIPFSUpload';
import { copyToClipboard as safeCopyToClipboard } from '@/utils/clipboard';

export function IPFSTestPage() {
  const [singleImage, setSingleImage] = useState<UploadedImage | null>(null);
  const [multipleImages, setMultipleImages] = useState<UploadedImage[]>([]);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const renderImageCard = (image: UploadedImage, index?: number) => {
    const urls = getIPFSUrls(image.ipfsHash);
    
    return (
      <div key={image.ipfsHash} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {index !== undefined && (
          <div className="text-xs font-bold text-zinc-500 mb-2">Image #{index + 1}</div>
        )}
        
        {/* Preview */}
        <div className="aspect-video rounded-lg overflow-hidden bg-zinc-950 mb-4">
          <img
            src={image.url}
            alt={image.fileName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          {/* IPFS Hash */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">IPFS Hash</label>
              <button
                onClick={() => copyToClipboard(image.ipfsHash, `hash-${image.ipfsHash}`)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {copiedHash === `hash-${image.ipfsHash}` ? (
                  <Check size={14} className="text-[#2CC295]" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <code className="text-xs text-[#2CC295] break-all font-mono">
              {image.ipfsHash}
            </code>
          </div>

          {/* Primary URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-500 uppercase">Primary URL</label>
              <button
                onClick={() => copyToClipboard(image.url, `url-${image.ipfsHash}`)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {copiedHash === `url-${image.ipfsHash}` ? (
                  <Check size={14} className="text-[#2CC295]" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 break-all flex items-start gap-1"
            >
              <ExternalLink size={12} className="shrink-0 mt-0.5" />
              <span>{image.url}</span>
            </a>
          </div>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>
              <label className="text-xs text-zinc-600">Filename</label>
              <p className="text-xs text-zinc-400 truncate">{image.fileName}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Size</label>
              <p className="text-xs text-zinc-400">
                {(image.fileSize / 1024).toFixed(2)} KB
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-zinc-600">Type</label>
              <p className="text-xs text-zinc-400">{image.mimeType}</p>
            </div>
          </div>

          {/* Gateway URLs */}
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">
              Alternative Gateways
            </label>
            <div className="space-y-1">
              {Object.entries(urls).map(([gateway, url]) => (
                <a
                  key={gateway}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded"
                >
                  <ExternalLink size={10} />
                  <span className="capitalize font-medium">{gateway}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-[#0f0f11] h-full overflow-hidden relative">
      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">IPFS Upload Test Page</h1>
            <p className="text-sm text-zinc-500">
              Test image uploads to IPFS using Pinata. Verify configuration and gateway access.
            </p>
          </header>

          {/* Setup Banner */}
          <div className="mb-6">
            <IPFSSetupBanner dismissible={false} />
          </div>

          <div className="space-y-8">
            {/* Single Upload Test */}
            <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#2CC295]/20 rounded-xl flex items-center justify-center">
                  <ImageIcon className="text-[#2CC295]" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Single Image Upload</h2>
                  <p className="text-sm text-zinc-500">Test uploading one image at a time</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Component */}
                <div>
                  <ImageUpload
                    variant="asset"
                    onUploadSuccess={(image) => {
                      setSingleImage(image);
                      console.log('Single upload success:', image);
                    }}
                    onUploadError={(error) => {
                      console.error('Single upload error:', error);
                    }}
                    label="Upload Test Image"
                    description="JPG, PNG, GIF, WebP (Max 100MB)"
                    showPreview={true}
                  />
                </div>

                {/* Result */}
                <div>
                  {singleImage ? (
                    renderImageCard(singleImage)
                  ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center">
                      <div>
                        <ImageIcon className="text-zinc-700 mx-auto mb-2" size={32} />
                        <p className="text-sm text-zinc-600">Upload result will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Multiple Upload Test */}
            <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Images className="text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Multiple Images Upload</h2>
                  <p className="text-sm text-zinc-500">Test batch upload (max 5 images)</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Upload Component */}
                <MultiImageUpload
                  maxFiles={5}
                  onUploadSuccess={(images) => {
                    setMultipleImages(images);
                    console.log('Batch upload success:', images);
                  }}
                  onUploadError={(error) => {
                    console.error('Batch upload error:', error);
                  }}
                  label="Upload Multiple Images"
                  description="JPG, PNG, GIF, WebP (Max 100MB each)"
                />

                {/* Results Grid */}
                {multipleImages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white mb-4">
                      Upload Results ({multipleImages.length} {multipleImages.length === 1 ? 'file' : 'files'})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {multipleImages.map((image, index) => renderImageCard(image, index))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Testing Guide */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-sm font-bold text-blue-400 mb-3">Testing Checklist</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Upload a small image (&lt; 1MB) - should be fast</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Upload a large image (10-50MB) - test progress indicator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Upload multiple images at once - verify batch upload</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Try uploading unsupported file type - should show error</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Click all gateway URLs - verify image is accessible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">✓</span>
                  <span>Copy IPFS hash - test in external IPFS explorer</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
