import { useState, useEffect, useMemo } from 'react';
import { MessageSquarePlus, Wallet, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (walletAddress: string, displayName?: string) => Promise<void> | void;
}

export function NewConversationModal({ 
  isOpen, 
  onClose, 
  onCreateConversation 
}: NewConversationModalProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const trimmedAddress = walletAddress.trim();
  const trimmedLabel = displayName.trim();
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedAddress);

  const recipientLabel = useMemo(() => {
    if (trimmedLabel) return trimmedLabel;
    if (isValidAddress) return `${trimmedAddress.slice(0, 6)}...${trimmedAddress.slice(-4)}`;
    return 'Waiting for recipient';
  }, [trimmedAddress, trimmedLabel, isValidAddress]);

  const handleSubmit = async () => {
    const trimmedAddress = walletAddress.trim();
    
    if (!trimmedAddress) {
      toast.error('Please enter a wallet address');
      return;
    }
    
    if (!trimmedAddress.startsWith('0x')) {
      toast.error('Wallet address must start with 0x');
      return;
    }
    
    if (trimmedAddress.length !== 42) {
      toast.error('Invalid wallet address length (must be 42 characters)');
      return;
    }
    
    setIsValidating(true);
    
    try {
      await onCreateConversation(
        trimmedAddress, 
        displayName.trim() || undefined
      );
      
      handleClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setWalletAddress('');
    setDisplayName('');
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white tracking-tight truncate">New Conversation</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  Wallet-to-Wallet Secure Messaging
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                  Encrypted
                </span>
                <StudioModalCloseButton onClick={handleClose} />
              </div>
            </div>
          </div>

          <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
            <div className="h-full p-5 md:p-6 pt-4 relative z-10">
              <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Recipient Wallet</h3>
                      <Wallet className="text-[#52525B]" size={14} />
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb..."
                          className="w-full h-[49px] bg-[rgba(18,18,18,0.5)] border border-[rgba(255,255,255,0.1)] rounded-[12px] px-4 text-sm text-[#F1F5F9] placeholder:text-[rgba(241,245,249,0.45)] focus:outline-none focus:border-[#2CC295] font-mono transition-colors"
                          disabled={isValidating}
                        />
                        {trimmedAddress && (
                          <div
                            className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${isValidAddress ? 'bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.6)]' : 'bg-red-500'}`}
                          />
                        )}
                      </div>
                      <p className="text-[9px] text-[#71717A] font-mono">
                        {trimmedAddress
                          ? isValidAddress
                            ? `Valid address (${trimmedAddress.slice(0, 6)}...${trimmedAddress.slice(-4)})`
                            : 'Invalid address format. Must be 42 chars starting with 0x.'
                          : 'Enter full recipient wallet address'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Contact Label</h3>
                      <span className="text-[9px] font-bold uppercase tracking-[1px] text-[#71717A]">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., John's Wallet, Trading Partner"
                      className="w-full h-[49px] bg-[rgba(18,18,18,0.5)] border border-[rgba(255,255,255,0.1)] rounded-[12px] px-4 text-sm text-[#F1F5F9] placeholder:text-[rgba(241,245,249,0.45)] focus:outline-none focus:border-[#2CC295] transition-colors"
                      disabled={isValidating}
                    />
                    <p className="text-[9px] text-[#71717A]">
                      Label helps identify this conversation in your message list.
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Conversation Preview</h3>
                      <User className="text-[#52525B]" size={14} />
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2CC295]/20 border border-[#2CC295]/30 text-[#2CC295] font-bold text-sm inline-flex items-center justify-center">
                        {recipientLabel.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{recipientLabel}</p>
                        <p className="text-[10px] text-[#71717A] font-mono truncate">
                          {isValidAddress ? trimmedAddress : 'No valid address yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isValidating || !isValidAddress}
                    className="w-full h-[49px] rounded-full bg-[#2CC295] text-black text-sm font-black uppercase tracking-[0.08em] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageSquarePlus size={16} />
                    {isValidating ? 'Creating...' : 'Start Conversation'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
