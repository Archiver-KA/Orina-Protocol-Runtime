import { X, Send, ArrowRight, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { useAccount } from 'wagmi';
import { findOrCreateConversation, addMessageToConversation } from '@/utils/conversationUtils';

interface QuickMessageModalProps {
  recipientName: string;
  recipientAddress: string;
  recipientAvatar?: string;
  onClose: () => void;
  onViewFullConversation: (conversationId: number | string) => void;
}

export function QuickMessageModal({
  recipientName,
  recipientAddress,
  recipientAvatar,
  onClose,
  onViewFullConversation,
}: QuickMessageModalProps) {
  // ✅ PHASE 1: Get current user's wallet address
  const { address: currentUserAddress } = useAccount();
  
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [conversationId, setConversationId] = useState<number | string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || !currentUserAddress) return;

    setIsSending(true);
    
    // Find or create conversation (using current user's address)
    const { conversation } = findOrCreateConversation(
      currentUserAddress,
      recipientAddress,
      recipientName,
      recipientAvatar
    );
    
    setConversationId(conversation.id);
    
    // Add message to conversation
    addMessageToConversation(currentUserAddress, conversation.id, message.trim(), 'me');
    
    // Trigger storage event for Messages page to reload
    window.dispatchEvent(new Event('storage'));
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsSending(false);
    setMessageSent(true);

    // Auto-close after 1 second and navigate to full conversation
    setTimeout(() => {
      onViewFullConversation(conversation.id);
      onClose();
    }, 1000);
  };

  const handleViewFullConversation = () => {
    if (!currentUserAddress) return;
    
    // Find or create conversation without message
    const { conversation } = findOrCreateConversation(
      currentUserAddress,
      recipientAddress,
      recipientName,
      recipientAvatar
    );
    
    // Trigger storage event for Messages page to reload
    window.dispatchEvent(new Event('storage'));
    
    onViewFullConversation(conversation.id);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Truncate wallet address
  const truncatedAddress = `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#0f0f11] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#27272a] bg-zinc-900/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {recipientAvatar ? (
                <img
                  src={recipientAvatar}
                  alt={recipientName}
                  className="w-11 h-11 rounded-full border-2 border-[#27272a]"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold text-base shadow-lg">
                  {recipientName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-white font-bold text-sm">{recipientName}</h2>
                <p className="text-[10px] text-zinc-500 font-mono">{truncatedAddress}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
            >
              <X size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-6 space-y-5">
          {messageSent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center">
                <Send size={32} className="text-[#2CC295]" />
              </div>
              <h3 className="text-white font-bold text-base mb-2">Message Sent!</h3>
              <p className="text-sm text-zinc-400">Opening full conversation...</p>
            </motion.div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  rows={6}
                  disabled={isSending}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295]/50 transition-all resize-none disabled:opacity-50"
                  autoFocus
                />
                <p className="text-[10px] text-zinc-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isSending}
                  className="flex-1 px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#2CC295]/20"
                >
                  <Send size={16} />
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  onClick={handleViewFullConversation}
                  className="p-3 bg-zinc-900/50 hover:bg-zinc-800 border border-[#27272a] text-white rounded-xl transition-colors"
                  title="View Full Conversation"
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Quick Tip */}
              <div className="flex items-start gap-3 p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
                <Lightbulb size={14} className="text-[#2CC295] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  <span className="text-zinc-300 font-bold">Quick Tip:</span> This seller may have an AI Agent enabled that can respond instantly to common questions about their assets.
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}