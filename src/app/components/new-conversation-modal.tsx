import { useState, useEffect } from 'react';
import { X, UserPlus, MessageSquarePlus, Shield, Copy, ArrowRight, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (walletAddress: string, displayName?: string) => void;
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

  if (!isOpen) return null;

  const isValidAddress = walletAddress.trim().startsWith('0x') && walletAddress.trim().length === 42;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      onCreateConversation(
        trimmedAddress, 
        displayName.trim() || undefined
      );
      
      setWalletAddress('');
      setDisplayName('');
      onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Container - ✅ FIX: removed overflow-hidden so inner flex scroll works */}
      <div className="relative w-full max-w-[560px] bg-[#0f0f11] rounded-xl shadow-2xl border border-[#27272a] flex flex-col max-h-[90vh]">
        <style>{`
          .hidden-scrollbar::-webkit-scrollbar { display: none; }
          .ambient-blob-sm {
            position: absolute;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(44, 194, 149, 0.04) 0%, rgba(18, 18, 18, 0) 70%);
            border-radius: 50%;
            filter: blur(60px);
            z-index: 0;
            pointer-events: none;
          }
          .modal-animate-in {
            animation: modalFadeIn 0.3s ease-out, modalZoomIn 0.3s ease-out;
          }
          @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalZoomIn { from { transform: scale(0.95); } to { transform: scale(1); } }
        `}</style>

        {/* ✅ FIX: min-h-0 + flex-1 instead of h-full — enables flex overflow scrolling */}
        <div className="modal-animate-in flex flex-col min-h-0 flex-1 relative overflow-hidden rounded-xl">
          {/* Ambient Blobs */}
          <div className="ambient-blob-sm -top-20 -right-20" />

          {/* Header */}
          <div className="p-6 md:p-8 pb-6 relative z-10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                >
                  <X className="text-zinc-400" size={20} />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">New Conversation</h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Wallet-to-Wallet Secure Messaging
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#2CC295]/10 rounded-full border border-[#2CC295]/20 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                Encrypted
              </span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0 hidden-scrollbar px-6 md:px-8 pb-6 relative z-10 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Wallet Address Section */}
            <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Recipient Wallet
                </h3>
                <Wallet className="text-zinc-600" size={14} />
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb..."
                    className="w-full bg-black/40 border border-[#27272a] rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2CC295] focus:border-[#2CC295] font-mono transition-all"
                    disabled={isValidating}
                  />
                  {walletAddress.trim() && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                      isValidAddress ? 'bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.6)]' : 'bg-red-500'
                    }`} />
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 font-mono">
                  {walletAddress.trim() 
                    ? isValidAddress 
                      ? `Valid address detected (${walletAddress.trim().slice(0, 6)}...${walletAddress.trim().slice(-4)})`
                      : 'Invalid address format - must be 42 characters starting with 0x'
                    : 'Enter the full Ethereum wallet address (starts with 0x)'
                  }
                </p>
              </div>
            </div>

            {/* Display Name Section */}
            <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Contact Label
                </h3>
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Optional</span>
              </div>

              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., John's Wallet, Trading Partner"
                className="w-full bg-black/40 border border-[#27272a] rounded-lg px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2CC295] focus:border-[#2CC295] transition-all"
                disabled={isValidating}
              />
              <p className="text-[9px] text-zinc-500">
                Give this conversation a friendly name (defaults to shortened address)
              </p>
            </div>

            {/* Protocol Info */}
            <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Protocol Information
                </h3>
                <Shield className="text-[#2CC295]" size={14} />
              </div>

              <div className="space-y-3 font-mono">
                <div className="flex justify-between border-b border-[#27272a] pb-2">
                  <span className="text-[9px] text-zinc-500 uppercase">Channel Type</span>
                  <span className="text-[10px] text-zinc-300">Direct Messaging</span>
                </div>
                <div className="flex justify-between border-b border-[#27272a] pb-2">
                  <span className="text-[9px] text-zinc-500 uppercase">Encryption</span>
                  <span className="text-[10px] text-[#2CC295]">End-to-End</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-zinc-500 uppercase">Storage</span>
                  <span className="text-[10px] text-zinc-300">Wallet-Synced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions - ✅ FIX: flex-shrink-0 prevents footer from being compressed */}
          <div className="border-t border-[#27272a] p-6 md:p-8 pt-5 bg-zinc-900/20 relative z-10 space-y-4 flex-shrink-0">
            <button
              onClick={handleSubmit}
              disabled={isValidating || !isValidAddress}
              className="w-full bg-[#2CC295] hover:brightness-110 text-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2CC295]/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <MessageSquarePlus size={16} />
              <span className="text-xs font-black uppercase tracking-widest">
                {isValidating ? 'Creating...' : 'Start Conversation'}
              </span>
            </button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.6)] animate-pulse" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                  Message Protocol: Active
                </span>
              </div>
              <button
                onClick={handleClose}
                className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}