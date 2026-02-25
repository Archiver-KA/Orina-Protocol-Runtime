import { useState, KeyboardEvent } from 'react';
import { Send, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { Comment } from '@/types/community';
import { toast } from 'sonner';
import { shortenUserDisplayName } from '@/utils/profileUtils';

interface CommentInputProps {
  postId: string;
  currentUserId: string;
  currentUserName: string;
  onAddComment: (comment: Comment) => void;
}

export function CommentInput({ postId, currentUserId, currentUserName, onAddComment }: CommentInputProps) {
  const [content, setContent] = useState('');
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useWalletModalContext();

  const handleSubmit = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet to comment', {
        description: 'You need to connect your wallet to interact with the community',
        action: {
          label: 'Connect Wallet',
          onClick: () => openConnectModal(),
        },
      });
      return;
    }

    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    // Create new comment
    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      postId,
      userId: address || currentUserId,
      userName: address ? shortenUserDisplayName(address) : currentUserName,
      content: content.trim(),
      likeCount: 0,
      replyCount: 0,
      createdAt: Date.now(),
    };

    onAddComment(newComment);
    setContent('');
    toast.success('Comment posted!');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFocus = () => {
    if (!isConnected) {
      toast.info('Connect wallet to comment', {
        description: 'Please connect your wallet to participate in discussions',
        action: {
          label: 'Connect',
          onClick: () => openConnectModal(),
        },
      });
    }
  };

  return (
    <div className="flex gap-3 items-center">
      {/* User Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2CC295] to-blue-500 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-white">
          {isConnected && address 
            ? address.slice(2, 4).toUpperCase() 
            : currentUserName.charAt(0)}
        </span>
      </div>

      {/* Input Field */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          placeholder={isConnected ? "Write a comment..." : "Connect wallet to comment..."}
          disabled={!isConnected}
          className={`w-full px-4 py-2.5 pr-10 bg-zinc-900 border rounded-lg text-sm text-white placeholder-zinc-500 transition-all
            ${isConnected 
              ? 'border-zinc-800 focus:outline-none focus:border-[#2CC295] hover:border-zinc-700' 
              : 'border-zinc-800 cursor-not-allowed opacity-75'
            }`}
        />
        
        {!isConnected && (
          <button
            onClick={openConnectModal}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-800 rounded-md transition-colors group"
            title="Connect wallet"
          >
            <Wallet size={16} className="text-zinc-500 group-hover:text-[#2CC295]" />
          </button>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isConnected || !content.trim()}
        className={`p-2.5 rounded-lg transition-all flex items-center justify-center
          ${isConnected && content.trim()
            ? 'bg-[#2CC295] hover:bg-[#25a882] text-black'
            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        title={!isConnected ? "Connect wallet to comment" : "Send comment"}
      >
        <Send size={18} />
      </button>
    </div>
  );
}