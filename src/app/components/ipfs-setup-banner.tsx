import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { checkIPFSConfigured, getIPFSSetupUrl } from '../../utils/ipfs-config';
import { IPFSSetupGuide } from './ipfs-setup-guide';

interface IPFSSetupBannerProps {
  showOnlyIfNotConfigured?: boolean;
  dismissible?: boolean;
}

export function IPFSSetupBanner({ 
  showOnlyIfNotConfigured = true, 
  dismissible = true 
}: IPFSSetupBannerProps) {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    checkConfiguration();
    
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('ipfs-setup-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const checkConfiguration = async () => {
    const configured = await checkIPFSConfigured();
    setIsConfigured(configured);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ipfs-setup-banner-dismissed', 'true');
  };

  const handleShowGuide = () => {
    setShowSetupGuide(true);
  };

  // Don't show if still checking
  if (isConfigured === null) {
    return null;
  }

  // Don't show if configured and we should hide when configured
  if (isConfigured && showOnlyIfNotConfigured) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed && dismissible) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            <div className={`border-l-4 p-4 ${
              isConfigured
                ? 'bg-[#2CC295]/10 border-[#2CC295]'
                : 'bg-amber-500/10 border-amber-500'
            }`}>
              <div className="flex items-start gap-3">
                {!isConfigured && (
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                )}
                
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${
                    isConfigured ? 'text-[#2CC295]' : 'text-amber-500'
                  }`}>
                    {isConfigured 
                      ? 'IPFS Upload Configured' 
                      : 'IPFS Upload Not Configured'
                    }
                  </h4>
                  
                  <p className="text-xs text-zinc-400 mt-1">
                    {isConfigured
                      ? 'Your images and assets will be uploaded to IPFS for permanent decentralized storage.'
                      : 'Image uploads require IPFS configuration. Set up PINATA_JWT to enable avatar, banner, and asset uploads.'
                    }
                  </p>

                  {!isConfigured && (
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={handleShowGuide}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors"
                      >
                        <Settings size={14} />
                        Setup Guide
                      </button>
                      
                      <a
                        href={getIPFSSetupUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                      >
                        Supabase Dashboard <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                  >
                    <X size={16} className="text-zinc-500" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <IPFSSetupGuide
          onClose={() => setShowSetupGuide(false)}
          onSetupComplete={() => {
            setShowSetupGuide(false);
            setIsConfigured(true);
            checkConfiguration(); // Re-check after setup
          }}
        />
      )}
    </>
  );
}