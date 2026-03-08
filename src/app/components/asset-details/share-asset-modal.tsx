import { useState } from 'react';
import { Copy, Check, Facebook, Twitter, Send, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/utils/clipboard';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface ShareAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  assetUrl: string;
}

export function ShareAssetModal({ isOpen, onClose, assetName, assetUrl }: ShareAssetModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Generate full URL
  const fullUrl = `https://orina.app${assetUrl}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(fullUrl);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  const handleShareTwitter = () => {
    const text = `Check out this amazing RWA asset: ${assetName}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(url, '_blank');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme bg-ui-card w-full max-w-md rounded-2xl border border-ui-border-subtle overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Share Asset</h2>
              <StudioModalCloseButton onClick={onClose} />
            </div>
            <p className="text-sm text-zinc-400 mt-1 line-clamp-1">
              {assetName}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareTwitter}
                className="flex items-center justify-center gap-2 p-4 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 rounded-xl transition-all group"
              >
                <Twitter size={20} className="text-[#1DA1F2]" />
                <span className="text-sm font-bold text-[#1DA1F2]">Twitter</span>
              </button>

              <button
                onClick={handleShareFacebook}
                className="flex items-center justify-center gap-2 p-4 bg-[#4267B2]/10 hover:bg-[#4267B2]/20 border border-[#4267B2]/30 rounded-xl transition-all group"
              >
                <Facebook size={20} className="text-[#4267B2]" />
                <span className="text-sm font-bold text-[#4267B2]">Facebook</span>
              </button>
            </div>

            {/* Copy Link */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Asset Link
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-400 truncate">
                  {fullUrl}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`
                    flex-shrink-0 px-4 py-3 rounded-lg font-bold transition-all
                    ${copied
                      ? 'bg-green-500 text-white'
                      : 'bg-[#2CC295] hover:bg-[#25a882] text-black'
                    }
                  `}
                >
                  {copied ? (
                    <Check size={20} />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* QR Code Toggle */}
            <div>
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full flex items-center justify-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all"
              >
                <QrCode size={20} className="text-[#2CC295]" />
                <span className="text-sm font-bold text-white">
                  {showQR ? 'Hide QR Code' : 'Show QR Code'}
                </span>
              </button>

              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 flex justify-center"
                  >
                    <div className="p-6 bg-white rounded-xl">
                      <QRCodeSVG
                        value={fullUrl}
                        size={200}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-400">
                💡 Anyone with this link can view the asset details. Share it on social media or send it directly to interested buyers.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
