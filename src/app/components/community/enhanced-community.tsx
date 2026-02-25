import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useUser } from '@/contexts/UserContext';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { formatDistanceToNow } from 'date-fns';
import { copyWithToast } from '@/utils/clipboard';
import type { Post, Comment, FeedFilter, FeedSort, CreatePostData, TrendingTopic } from '@/types/community';
import type { AppNotification } from '@/types/notifications';
import {
  loadAllPosts,
  savePost,
  saveAllPosts,
  deletePost as deletePostFromStore,
  loadComments,
  saveComment,
  deleteComment,
  saveUserAction,
  hasUserAction,
  filterPosts,
  sortPosts,
  searchPosts,
  extractTrendingTopics,
  validatePost,
  formatCount,
  incrementPostCount,
  decrementPostCount,
  generateMockComments,
  ensureMockData,
  isPostOwner,
  getUserPollVote,
  calculatePollPercentages,
  isPollEnded,
} from '@/utils/communityUtils';
import {
  loadNotifications,
  saveNotifications,
  createNotification,
  getUnreadCount,
} from '@/utils/notifications';
import {
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  MessageSquare,
  Filter,
  Search,
  Plus,
  X,
  Pin,
  Edit2,
  Trash2,
  Flag,
  Check,
  AlertTriangle,
  User,
  BarChart3,
  Bell,
  Reply,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePostModal } from './create-post-modal';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import ReactDOM from 'react-dom';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { createDefaultProfile, loadUserProfile, saveUserProfile } from '@/utils/profileUtils';

// ─── Sub-components ───────────────────────────────────────────

function PostTypeBadge({ type }: { type: Post['type'] }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    achievement: { bg: 'bg-[var(--color-primary-custom)]/10', text: 'text-[var(--color-primary-custom)]', label: 'Achievement' },
    announcement: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Announcement' },
    discussion: { bg: 'bg-zinc-800', text: 'text-zinc-400', label: 'Discussion' },
    question: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Question' },
  };
  const s = map[type] || map.discussion;
  return (
    <span className={`${s.bg} ${s.text} text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter`}>
      {s.label}
    </span>
  );
}

function EmptyState({ filter, isSearching }: { filter: FeedFilter; isSearching: boolean }) {
  const icon = isSearching ? (
    <Search size={28} className="text-zinc-600" />
  ) : filter === 'my-posts' ? (
    <User size={28} className="text-zinc-600" />
  ) : (
    <MessageSquare size={28} className="text-zinc-600" />
  );

  const title = isSearching
    ? 'No results found'
    : filter === 'my-posts'
      ? 'No posts yet'
      : 'Nothing here yet';

  const description = isSearching
    ? 'Try different keywords or remove some filters.'
    : filter === 'my-posts'
      ? 'Create your first post to share with the community!'
      : 'Be the first to start a conversation in this category.';

  return (
    <EmptyStateCard
      icon={icon}
      title={title}
      description={description}
      className="py-20"
    />
  );
}

// ─── Delete Confirmation Dialog ─────────────────────────────

function DeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Post',
  message = 'Are you sure you want to delete this post? All comments and interactions will also be removed.',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#18181b] border border-[var(--color-panel-border)] rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">{title}</h3>
            <p className="text-zinc-500 text-xs">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <StudioActionButton
            onClick={onClose}
            variant="secondary"
            className="flex-1 py-2.5 text-sm"
          >
            Cancel
          </StudioActionButton>
          <StudioActionButton
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400"
          >
            Delete
          </StudioActionButton>
        </div>
      </div>
    </div>
  );
}

// ─── Post Action Menu (Portal-based to prevent overflow clipping) ────

function PostActionMenu({
  post,
  isOwner,
  onEdit,
  onDelete,
  onPin,
  onReport,
}: {
  post: Post;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192 = w-48
      });
    }
  }, [open]);

  const menuContent = open ? (
    <div
      ref={menuRef}
      className="fixed w-48 bg-[#1c1c1f] border border-[var(--color-panel-border)] rounded-xl shadow-2xl z-[9999] py-1 overflow-hidden"
      style={{ top: menuPos.top, left: Math.max(8, menuPos.left) }}
    >
      {isOwner && (
        <>
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Edit2 size={14} /> Edit Post
          </button>
          <button
            onClick={() => { onPin(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Pin size={14} /> {post.isPinned ? 'Unpin Post' : 'Pin Post'}
          </button>
          <div className="border-t border-[var(--color-panel-border)] my-1" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} /> Delete Post
          </button>
        </>
      )}
      {!isOwner && (
        <button
          onClick={() => { onReport(); setOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
        >
          <Flag size={14} /> Report Post
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
      >
        <MoreHorizontal size={20} />
      </button>
      {menuContent && ReactDOM.createPortal(menuContent, document.body)}
    </>
  );
}

// ─── Poll Component ─────────────────────────────────────────

function PollSection({
  post,
  userId,
  isConnected,
  onVote,
}: {
  post: Post;
  userId: string;
  isConnected: boolean;
  onVote: (postId: string, optionId: string) => void;
}) {
  if (!post.poll) return null;
  const { poll } = post;
  const userVote = getUserPollVote(userId, post.id);
  const ended = isPollEnded(poll.endsAt);
  const percentages = calculatePollPercentages(poll.options);
  const showResults = !!userVote || ended;

  return (
    <div className="bg-zinc-900/50 border border-[var(--color-panel-border)] rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-white flex items-center gap-2">
        <BarChart3 size={16} className="text-[var(--color-primary-custom)]" />
        {poll.question}
      </p>
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const pct = percentages[idx];
          const isVoted = userVote === option.id;
          return (
            <button
              key={option.id}
              disabled={!!userVote || ended || !isConnected}
              onClick={() => onVote(post.id, option.id)}
              className={`w-full relative rounded-lg overflow-hidden text-left transition-all ${
                isVoted
                  ? 'border border-[var(--color-primary-custom)]/40'
                  : 'border border-[var(--color-panel-border)] hover:border-zinc-600'
              } ${!isConnected && !showResults ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {showResults && (
                <div
                  className={`absolute inset-0 ${isVoted ? 'bg-[var(--color-primary-custom)]/10' : 'bg-zinc-800/50'}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-zinc-300 flex items-center gap-2">
                  {isVoted && <Check size={14} className="text-[var(--color-primary-custom)]" />}
                  {option.text}
                </span>
                {showResults && (
                  <span className="text-xs font-bold text-zinc-400">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
        <span>{poll.totalVotes} votes</span>
        <span>{ended ? 'Poll ended' : `Ends ${formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}`}</span>
      </div>
    </div>
  );
}

// ─── Trending Topics Bar ────────────────────────────────────

function TrendingTopicsBar({
  topics,
  activeTag,
  onTagClick,
}: {
  topics: TrendingTopic[];
  activeTag: string;
  onTagClick: (tag: string) => void;
}) {
  if (topics.length === 0) return null;

  return (
    <div className="bg-zinc-900/40 border border-[var(--color-panel-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-[var(--color-primary-custom)]" />
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Trending</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.slice(0, 8).map((topic) => {
          const isActive = activeTag.toLowerCase() === topic.tag.toLowerCase();
          return (
            <button
              key={topic.tag}
              onClick={() => onTagClick(isActive ? '' : topic.tag)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[var(--color-primary-custom)]/20 text-[var(--color-primary-custom)] border border-[var(--color-primary-custom)]/30'
                  : 'bg-zinc-800/80 text-zinc-400 border border-transparent hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span>#{topic.tag}</span>
              <span className="text-[10px] text-zinc-500">{topic.postCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Notification Panel ─────────────────────────────────────

function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      // Slight delay to avoid the click that opened the panel from immediately closing it
      const timer = setTimeout(() => document.addEventListener('mousedown', handleOutside), 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-[#18181b] border border-[var(--color-panel-border)] rounded-xl shadow-2xl z-[9999] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-panel-border)]">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--color-primary-custom)]" />
          <span className="text-sm font-bold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-[var(--color-primary-custom)] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] text-[var(--color-primary-custom)] hover:underline font-bold uppercase"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold uppercase"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Bell size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No notifications yet</p>
            <p className="text-xs text-zinc-600 mt-1">Interactions on your posts will appear here</p>
          </div>
        ) : (
          notifications.slice(0, 50).map((notif) => (
            <button
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--color-panel-border)]/50 hover:bg-zinc-800/50 transition-colors ${
                !notif.read ? 'bg-[var(--color-primary-custom)]/5' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notif.read ? 'bg-[var(--color-primary-custom)]' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }).replace('about ', '')}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Threaded Comment Component ─────────────────────────────

function CommentThread({
  comment,
  allComments,
  postId,
  actualUserId,
  actualUserName,
  address,
  userData,
  isConnected,
  depth,
  likedCommentIds,
  onReply,
  onDelete,
  onLikeComment,
}: {
  comment: Comment;
  allComments: Comment[];
  postId: string;
  actualUserId: string;
  actualUserName: string;
  address?: string;
  userData: any;
  isConnected: boolean;
  depth: number;
  likedCommentIds: Set<string>;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onLikeComment: (commentId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const CommentAvatar = getAvatarByUserId(comment.userId);
  const isMine =
    comment.walletAddress && address
      ? comment.walletAddress.toLowerCase() === address.toLowerCase()
      : comment.userId === actualUserId;
  const commentName = isMine ? actualUserName : comment.userName;
  const commentAvatarUrl = (isMine ? (userData?.avatarUrl || userData?.avatar) : comment.userAvatar) || comment.userAvatar;

  // Find direct replies to this comment
  const replies = allComments.filter((c) => c.parentId === comment.id);
  const maxDepth = 3;

  return (
    <div className={depth > 0 ? 'ml-8 mt-3' : ''}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          {commentAvatarUrl ? (
            <img src={commentAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <CommentAvatar className="w-full h-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-zinc-800/50 p-3 rounded-2xl border border-[var(--color-panel-border)]/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white">{commentName}</span>
              <span className="text-[10px] text-zinc-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }).replace('about ', '')}
              </span>
            </div>
            {comment.parentId && depth === 0 && (
              <p className="text-[10px] text-[var(--color-primary-custom)]/70 mb-1 flex items-center gap-1">
                <CornerDownRight size={10} />
                replying to a comment
              </p>
            )}
            <p className="text-xs text-zinc-300 leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button
              onClick={() => onLikeComment(comment.id)}
              className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${
                likedCommentIds.has(comment.id)
                  ? 'text-red-500/80 hover:text-red-500'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Heart size={10} fill={likedCommentIds.has(comment.id) ? 'currentColor' : 'none'} />
              {comment.likeCount > 0 ? comment.likeCount : 'Like'}
            </button>
            {isConnected && (
              <button
                onClick={() => onReply(comment)}
                className="text-[10px] text-zinc-500 font-bold hover:text-[var(--color-primary-custom)] uppercase flex items-center gap-1"
              >
                <Reply size={10} /> Reply
              </button>
            )}
            {isMine && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] text-red-400/60 font-bold hover:text-red-400 uppercase"
              >
                Delete
              </button>
            )}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-[10px] text-[var(--color-primary-custom)]/70 font-bold hover:text-[var(--color-primary-custom)] uppercase flex items-center gap-1"
              >
                {showReplies ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {showReplies && replies.length > 0 && depth < maxDepth && (
        <div className="border-l-2 border-zinc-800/80 ml-4">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              allComments={allComments}
              postId={postId}
              actualUserId={actualUserId}
              actualUserName={actualUserName}
              address={address}
              userData={userData}
              isConnected={isConnected}
              depth={depth + 1}
              likedCommentIds={likedCommentIds}
              onReply={onReply}
              onDelete={onDelete}
              onLikeComment={onLikeComment}
            />
          ))}
        </div>
      )}

      {/* Collapsed replies indicator at max depth */}
      {showReplies && replies.length > 0 && depth >= maxDepth && (
        <div className="ml-8 mt-2">
          <p className="text-[10px] text-zinc-500 italic">
            {replies.length} more {replies.length === 1 ? 'reply' : 'replies'} (max depth reached)
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

interface EnhancedCommunityProps {
  currentUserId?: string;
  currentUserName?: string;
  onNavigateToUserProfile?: (walletAddress: string) => void;
}

export function EnhancedCommunity({
  currentUserId = 'user_current',
  currentUserName = 'Current User',
  onNavigateToUserProfile,
}: EnhancedCommunityProps) {
  // ── State ──
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FeedFilter>('all');
  const [selectedSort, setSelectedSort] = useState<FeedSort>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteCommentConfirmId, setDeleteCommentConfirmId] = useState<string | null>(null);
  const [deleteCommentPostId, setDeleteCommentPostId] = useState<string | null>(null);

  // Reply threading state
  const [replyingTo, setReplyingTo] = useState<Record<string, Comment | null>>({});
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Comment like tracking (local session toggle)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Notification state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);

  // ── Context ──
  const { address, isConnected } = useAccount();
  const { requireWalletAction } = useRequireWalletAction();
  const { userData, displayName } = useUser();

  const actualUserId = userData?.address || address || currentUserId;
  const actualUserName = displayName || userData?.displayName || userData?.username || currentUserName;

  const seedProfileSnapshot = useCallback((walletAddress?: string, snapshot?: { displayName?: string; avatarUrl?: string }) => {
    if (!walletAddress || !walletAddress.startsWith('0x')) return;
    const nextDisplayName = snapshot?.displayName?.trim();
    const nextAvatar = snapshot?.avatarUrl?.trim();
    if (!nextDisplayName && !nextAvatar) return;

    try {
      const existing = loadUserProfile(walletAddress) || createDefaultProfile(walletAddress);
      let changed = false;
      const updated = { ...existing };

      const looksDefaultName =
        !existing.displayName ||
        existing.displayName === existing.address ||
        existing.displayName.includes('...');

      if (nextDisplayName && (looksDefaultName || !existing.displayName)) {
        updated.displayName = nextDisplayName;
        changed = true;
      }

      if (nextAvatar && !existing.avatarUrl && !existing.avatar) {
        updated.avatarUrl = nextAvatar;
        updated.avatar = nextAvatar;
        changed = true;
      }

      if (changed) {
        saveUserProfile(updated);
      }
    } catch (error) {
      console.debug('[Community] Profile snapshot seed skipped:', error);
    }
  }, []);

  // ── Helper: require wallet ──
  const requireWallet = useCallback(
    (actionLabel: string): boolean => {
      if (isConnected && address) return true;
      return requireWalletAction({
        capability: 'community_write',
        actionLabel,
        fallbackPage: 'community',
      });
    },
    [isConnected, address, requireWalletAction]
  );

  // ── Load posts on mount (idempotent) ──
  useEffect(() => {
    ensureMockData();
    setPosts(loadAllPosts());
  }, []);

  // ── Load notifications ──
  useEffect(() => {
    if (address) {
      setNotifications(loadNotifications(address));
    }
  }, [address]);

  // ── Notification helper ──
  const addNotification = useCallback(
    (postOwnerAddress: string, title: string, message: string, metadata?: AppNotification['metadata']) => {
      if (!postOwnerAddress) return;
      // Don't notify yourself
      if (address && postOwnerAddress.toLowerCase() === address.toLowerCase()) return;

      const notif = createNotification('community', title, message, {
        ...metadata,
        actorName: actualUserName,
        actorAddress: address,
      });

      const existing = loadNotifications(postOwnerAddress);
      const updated = [notif, ...existing].slice(0, 100); // Keep max 100
      saveNotifications(postOwnerAddress, updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orina:notifications-changed'));
      }
    },
    [address, actualUserName]
  );

  // ── Processed posts (filter -> search -> sort) ──
  const processedPosts = useMemo(() => {
    let result = filterPosts(posts, selectedFilter, address);
    result = searchPosts(result, searchQuery);
    result = sortPosts(result, selectedSort);
    return result;
  }, [posts, selectedFilter, selectedSort, searchQuery, address]);

  const trendingTopics = useMemo(() => extractTrendingTopics(posts), [posts]);

  // ── Handlers ──

  const refreshPosts = () => setPosts(loadAllPosts());

  useEffect(() => {
    const refreshCommunity = () => {
      refreshPosts();
      setComments((prev) => {
        if (expandedComments.size === 0) return prev;
        const next = { ...prev };
        expandedComments.forEach((postId) => {
          next[postId] = loadComments(postId);
        });
        return next;
      });
      if (address) {
        setNotifications(loadNotifications(address));
      }
    };

    window.addEventListener('orina:community-changed', refreshCommunity as EventListener);
    window.addEventListener('storage', refreshCommunity as EventListener);
    window.addEventListener('orina:notifications-changed', refreshCommunity as EventListener);
    return () => {
      window.removeEventListener('orina:community-changed', refreshCommunity as EventListener);
      window.removeEventListener('storage', refreshCommunity as EventListener);
      window.removeEventListener('orina:notifications-changed', refreshCommunity as EventListener);
    };
  }, [address, expandedComments, refreshPosts]);

  const handleCreatePost = (data: CreatePostData) => {
    seedProfileSnapshot(address, {
      displayName: actualUserName,
      avatarUrl: userData?.avatarUrl || userData?.avatar || undefined,
    });

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: data.type,
      userId: actualUserId,
      userName: actualUserName,
      userAvatar: userData?.avatarUrl || userData?.avatar || undefined,
      userRole: null,
      walletAddress: address,
      content: data.content,
      images: data.images,
      poll: data.poll
        ? {
            id: `poll_${Date.now()}`,
            question: data.poll.question,
            options: data.poll.options.map((text, i) => ({
              id: `option_${i}`,
              text,
              votes: 0,
              percentage: 0,
            })),
            totalVotes: 0,
            endsAt: data.poll.endsAt,
            multipleChoice: data.poll.multipleChoice,
          }
        : undefined,
      tags: data.tags,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      viewCount: 0,
      isPinned: false,
      isEdited: false,
      isMock: false,
      createdAt: Date.now(),
    };

    savePost(newPost);
    refreshPosts();
    toast.success('Post created successfully!');
  };

  const handleEditPost = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setEditingPostId(postId);
    setEditContent(post.content);
  };

  const handleSaveEdit = (postId: string) => {
    if (!validatePost(editContent)) {
      toast.error('Post must be between 10 and 5000 characters');
      return;
    }
    const allPosts = loadAllPosts();
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      post.content = editContent.trim();
      post.isEdited = true;
      post.updatedAt = Date.now();
      saveAllPosts(allPosts);
      refreshPosts();
      toast.success('Post updated');
    }
    setEditingPostId(null);
    setEditContent('');
  };

  const handleDeletePost = (postId: string) => {
    deletePostFromStore(postId);
    refreshPosts();
    setDeleteConfirmId(null);
    toast.success('Post deleted');
  };

  const handleTogglePin = (postId: string) => {
    const allPosts = loadAllPosts();
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      post.isPinned = !post.isPinned;
      saveAllPosts(allPosts);
      refreshPosts();
      toast.success(post.isPinned ? 'Post pinned' : 'Post unpinned');
    }
  };

  const handleLike = (postId: string) => {
    if (!requireWallet('like')) return;
    const wasLiked = hasUserAction(actualUserId, postId, 'like');
    saveUserAction({ userId: actualUserId, postId, action: 'like', timestamp: Date.now() });
    if (wasLiked) {
      decrementPostCount(postId, 'likeCount');
    } else {
      incrementPostCount(postId, 'likeCount');
      // Notify post owner
      const post = posts.find((p) => p.id === postId);
      if (post?.walletAddress) {
        addNotification(
          post.walletAddress,
          'New Like',
          `${actualUserName} liked your post`,
          { postId }
        );
      }
    }
    refreshPosts();
  };

  const handleBookmark = (postId: string) => {
    if (!requireWallet('bookmark')) return;
    const was = hasUserAction(actualUserId, postId, 'bookmark');
    saveUserAction({ userId: actualUserId, postId, action: 'bookmark', timestamp: Date.now() });
    if (was) {
      decrementPostCount(postId, 'bookmarkCount');
    } else {
      incrementPostCount(postId, 'bookmarkCount');
      const post = posts.find((p) => p.id === postId);
      if (post?.walletAddress) {
        addNotification(
          post.walletAddress,
          'New Bookmark',
          `${actualUserName} bookmarked your post`,
          { postId }
        );
      }
    }
    refreshPosts();
  };

  const handleShare = async (postId: string) => {
    const shareUrl = `${window.location.origin}/community/post/${postId}`;
    const success = await copyWithToast(shareUrl, toast, 'Post link copied!', 'Failed to copy link.');
    if (success) {
      incrementPostCount(postId, 'shareCount');
      refreshPosts();
    }
  };

  const handleToggleComments = (postId: string) => {
    const next = new Set(expandedComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      if (!comments[postId]) {
        let loaded = loadComments(postId);
        if (loaded.length === 0) {
          loaded = generateMockComments(postId, 3);
          loaded.forEach((c) => saveComment(c));
        }
        setComments((prev) => ({ ...prev, [postId]: loaded }));
      }
    }
    setExpandedComments(next);
  };

  const handleAddComment = (postId: string) => {
    if (!requireWallet('comment')) return;
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    const replyTarget = replyingTo[postId];

    seedProfileSnapshot(address, {
      displayName: actualUserName,
      avatarUrl: userData?.avatarUrl || userData?.avatar || undefined,
    });

    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      postId,
      userId: actualUserId,
      userName: actualUserName,
      userAvatar: userData?.avatarUrl || userData?.avatar || undefined,
      walletAddress: address,
      content,
      likeCount: 0,
      replyCount: 0,
      parentId: replyTarget?.id,
      createdAt: Date.now(),
    };

    saveComment(newComment);

    // Update parent's replyCount
    if (replyTarget) {
      const allPostComments = comments[postId] || [];
      const parent = allPostComments.find((c) => c.id === replyTarget.id);
      if (parent) {
        parent.replyCount = (parent.replyCount || 0) + 1;
        saveComment(parent);
      }
    }

    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setReplyingTo((prev) => ({ ...prev, [postId]: null }));
    incrementPostCount(postId, 'commentCount');
    refreshPosts();

    // Notify post owner on comment
    const post = posts.find((p) => p.id === postId);
    if (post?.walletAddress) {
      addNotification(
        post.walletAddress,
        'New Comment',
        `${actualUserName} commented on your post: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
        { postId, commentId: newComment.id }
      );
    }

    // Notify parent comment author on reply
    if (replyTarget?.walletAddress) {
      addNotification(
        replyTarget.walletAddress,
        'New Reply',
        `${actualUserName} replied to your comment: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
        { postId, commentId: newComment.id }
      );
    }
  };

  const handleReplyToComment = (postId: string, comment: Comment) => {
    setReplyingTo((prev) => ({ ...prev, [postId]: comment }));
    // Focus the input
    setTimeout(() => {
      commentInputRefs.current[postId]?.focus();
    }, 100);
  };

  const handleCancelReply = (postId: string) => {
    setReplyingTo((prev) => ({ ...prev, [postId]: null }));
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    deleteComment(commentId);
    setComments((prev) => ({
      ...prev,
      [postId]: prev[postId]?.filter((c) => c.id !== commentId && c.parentId !== commentId) || [],
    }));
    decrementPostCount(postId, 'commentCount');
    refreshPosts();
    setDeleteCommentConfirmId(null);
    setDeleteCommentPostId(null);
    toast.success('Comment deleted');
  };

  const handleLikeComment = (commentId: string) => {
    if (!requireWallet('like a comment')) return;
    const alreadyLiked = likedComments.has(commentId);
    // Toggle liked state
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    // Update comment like count
    setComments((prev) => {
      const updated = { ...prev };
      for (const pid of Object.keys(updated)) {
        updated[pid] = updated[pid].map((c) =>
          c.id === commentId
            ? { ...c, likeCount: Math.max(0, c.likeCount + (alreadyLiked ? -1 : 1)) }
            : c
        );
      }
      return updated;
    });
  };

  const handlePollVote = (postId: string, optionId: string) => {
    if (!requireWallet('vote')) return;
    const allPosts = loadAllPosts();
    const post = allPosts.find((p) => p.id === postId);
    if (!post?.poll) return;

    const existingVote = getUserPollVote(actualUserId, postId);
    if (existingVote) return;

    saveUserAction({ userId: actualUserId, postId, action: 'vote', timestamp: Date.now(), pollOptionId: optionId });

    const opt = post.poll.options.find((o) => o.id === optionId);
    if (opt) opt.votes++;
    post.poll.totalVotes++;

    const total = post.poll.totalVotes;
    post.poll.options.forEach((o) => {
      o.percentage = total > 0 ? Math.round((o.votes / total) * 100) : 0;
    });

    saveAllPosts(allPosts);
    refreshPosts();
    toast.success('Vote recorded!');
  };

  const handleNavigateProfile = (post: Post) => {
    const targetAddress = post.walletAddress || post.userId;
    seedProfileSnapshot(post.walletAddress, {
      displayName: post.userName,
      avatarUrl: post.userAvatar,
    });
    if (onNavigateToUserProfile && post.walletAddress) {
      onNavigateToUserProfile(targetAddress);
    }
  };

  const handleTrendingTagClick = (tag: string) => {
    setSearchQuery(tag);
    if (tag) {
      setSelectedFilter('all');
    }
  };

  // ── Notification handlers ──
  const handleMarkNotifRead = (id: string) => {
    if (!address) return;
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    saveNotifications(address, updated);
  };

  const handleMarkAllNotifsRead = () => {
    if (!address) return;
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(address, updated);
  };

  const handleClearAllNotifs = () => {
    if (!address) return;
    setNotifications([]);
    saveNotifications(address, []);
  };

  const unreadNotifCount = useMemo(() => getUnreadCount(notifications), [notifications]);

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="h-full overflow-hidden bg-[#0f0f11] relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-panel-border); border-radius: 10px; }
        .post-card { background: #18181b; border: 1px solid var(--color-panel-border); }
        .ambient-blob {
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%; filter: blur(80px); z-index: 0; pointer-events: none;
        }
      `}</style>

      <div className="ambient-blob -top-40 -left-40" />
      <div className="ambient-blob -bottom-40 -right-40" />

      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {/* ─── Header ─── */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Community Feed</h1>
              <p className="text-zinc-500 text-sm mt-1">
                {isConnected
                  ? `Welcome back, ${actualUserName}`
                  : 'Connect your wallet to participate'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              {isConnected && (
                <div className="relative hidden">
                  <button
                    onClick={() => {
                      // Refresh notifications when opening
                      if (!isNotifPanelOpen && address) {
                        setNotifications(loadNotifications(address));
                      }
                      setIsNotifPanelOpen(!isNotifPanelOpen);
                    }}
                    className="relative p-2.5 rounded-lg bg-zinc-900 border border-[var(--color-panel-border)] text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <Bell size={18} />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[var(--color-primary-custom)] text-black text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </span>
                    )}
                  </button>
                  <NotificationPanel
                    isOpen={isNotifPanelOpen}
                    onClose={() => setIsNotifPanelOpen(false)}
                    notifications={notifications}
                    onMarkRead={handleMarkNotifRead}
                    onMarkAllRead={handleMarkAllNotifsRead}
                    onClearAll={handleClearAllNotifs}
                  />
                </div>
              )}

              <StudioActionButton
                onClick={() => {
                  if (!requireWallet('create a post')) return;
                  setIsCreateModalOpen(true);
                }}
                variant="primary"
                size="md"
                className="text-sm px-5 py-2.5 rounded-lg"
                leftIcon={<Plus size={18} />}
              >
                Create Post
              </StudioActionButton>
            </div>
          </div>

          {/* ─── Search ─── */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, tags, users..."
              className="w-full pl-11 pr-10 py-2.5 bg-zinc-900/60 border border-[var(--color-panel-border)] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary-custom)]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ─── Trending Topics Bar ─── */}
          <TrendingTopicsBar
            topics={trendingTopics}
            activeTag={searchQuery}
            onTagClick={handleTrendingTagClick}
          />

          {/* ─── Filters ─── */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <CustomDropdown
                options={[
                  { value: 'all', label: 'All Discussions' },
                  { value: 'discussions', label: 'Discussions' },
                  { value: 'questions', label: 'Questions' },
                  { value: 'announcements', label: 'Announcements' },
                  { value: 'achievements', label: 'Achievements' },
                  ...(isConnected ? [{ value: 'my-posts', label: 'My Posts' }] : []),
                ]}
                defaultValue={selectedFilter}
                onChange={(v) => setSelectedFilter(v as FeedFilter)}
                variant="compact"
                className="w-full"
                icon={Filter}
              />
            </div>
            <div className="relative min-w-[180px]">
              <CustomDropdown
                options={[
                  { value: 'recent', label: 'Sort by: Newest' },
                  { value: 'popular', label: 'Sort by: Popular' },
                  { value: 'trending', label: 'Sort by: Trending' },
                ]}
                defaultValue={selectedSort}
                onChange={(v) => setSelectedSort(v as FeedSort)}
                variant="compact"
                className="w-full"
              />
            </div>
          </div>

          {/* ─── Post Feed ─── */}
          {processedPosts.length === 0 ? (
            <EmptyState filter={selectedFilter} isSearching={!!searchQuery.trim()} />
          ) : (
            <div className="space-y-6">
              {processedPosts.map((post) => {
                const isLiked = hasUserAction(actualUserId, post.id, 'like');
                const isBookmarked = hasUserAction(actualUserId, post.id, 'bookmark');
                const isCommentsOpen = expandedComments.has(post.id);
                const postComments = comments[post.id] || [];
                const PostAvatar = getAvatarByUserId(post.userId);
                const isOwner = isPostOwner(post, address);
                const isEditing = editingPostId === post.id;
                const postDisplayName = isOwner ? actualUserName : post.userName;
                const postAvatarUrl = (isOwner ? (userData?.avatarUrl || userData?.avatar) : post.userAvatar) || post.userAvatar;

                // Separate top-level comments from replies
                const topLevelComments = postComments.filter((c) => !c.parentId);
                const currentReply = replyingTo[post.id];

                return (
                  <div
                    key={post.id}
                    className={`post-card rounded-2xl ${post.isPinned ? 'ring-1 ring-[var(--color-primary-custom)]/20' : ''}`}
                  >
                    {/* Pin indicator */}
                    {post.isPinned && (
                      <div className="flex items-center gap-2 px-5 py-2 bg-[var(--color-primary-custom)]/5 border-b border-[var(--color-primary-custom)]/10">
                        <Pin size={12} className="text-[var(--color-primary-custom)]" />
                        <span className="text-[10px] text-[var(--color-primary-custom)] font-bold uppercase tracking-widest">
                          Pinned Post
                        </span>
                      </div>
                    )}

                    <div className="p-5 space-y-4">
                      {/* ─ Post Header ─ */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleNavigateProfile(post)}
                            className="relative w-11 h-11 rounded-full border border-zinc-700 overflow-hidden hover:ring-2 hover:ring-[var(--color-primary-custom)] transition-all cursor-pointer"
                            title={`View ${postDisplayName}'s profile`}
                          >
                            {postAvatarUrl ? (
                              <img src={postAvatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PostAvatar className="w-full h-full" />
                            )}
                            {post.type === 'achievement' && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--color-primary-custom)] border-2 border-[#18181b] rounded-full flex items-center justify-center pointer-events-none">
                                <Check size={10} className="text-black font-bold" />
                              </span>
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleNavigateProfile(post)}
                                className="text-white font-bold text-sm hover:text-[var(--color-primary-custom)] transition-colors cursor-pointer"
                              >
                                {postDisplayName}
                              </button>
                              <PostTypeBadge type={post.type} />
                              {post.isEdited && (
                                <span className="text-[9px] text-zinc-600 italic">(edited)</span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 uppercase tracking-wide font-mono">
                              {post.userRole || 'Community Member'} &middot;{' '}
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        <PostActionMenu
                          post={post}
                          isOwner={isOwner}
                          onEdit={() => handleEditPost(post.id)}
                          onDelete={() => setDeleteConfirmId(post.id)}
                          onPin={() => handleTogglePin(post.id)}
                          onReport={() => toast.info('Post reported. We will review it.')}
                        />
                      </div>

                      {/* ─ Content (view / edit) ─ */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-4 py-3 bg-black/40 border border-[var(--color-primary-custom)]/30 rounded-lg text-white text-sm resize-none focus:outline-none min-h-[120px]"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <StudioActionButton
                              onClick={() => { setEditingPostId(null); setEditContent(''); }}
                              variant="secondary"
                              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                            >
                              Cancel
                            </StudioActionButton>
                            <StudioActionButton
                              onClick={() => handleSaveEdit(post.id)}
                              disabled={editContent.trim().length < 10}
                              variant="primary"
                              className="px-4 py-2 text-xs disabled:bg-zinc-700 disabled:text-zinc-500"
                            >
                              Save Changes
                            </StudioActionButton>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {post.content}
                          </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {post.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setSearchQuery(tag)}
                                  className="text-[var(--color-primary-custom)] hover:underline text-xs cursor-pointer"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─ Images ─ */}
                      {post.images && post.images.length > 0 && (
                        <div
                          className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-xl overflow-hidden border border-[var(--color-panel-border)]`}
                        >
                          {post.images.map((image, index) => (
                            <ImageWithFallback
                              key={index}
                              src={image}
                              alt={`Post image ${index + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                          ))}
                        </div>
                      )}

                      {/* ─ Poll ─ */}
                      <PollSection
                        post={post}
                        userId={actualUserId}
                        isConnected={isConnected}
                        onVote={handlePollVote}
                      />

                      {/* ─ Actions Bar ─ */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-2 transition-all group ${
                              isLiked ? 'text-red-500/80 hover:text-red-500' : 'text-zinc-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                            <span className="text-xs font-bold">{post.likeCount > 0 ? formatCount(post.likeCount) : '0'}</span>
                          </button>
                          <button
                            onClick={() => handleToggleComments(post.id)}
                            className={`flex items-center gap-2 transition-all group ${
                              isCommentsOpen ? 'text-[var(--color-primary-custom)]' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <MessageSquare size={20} />
                            <span className="text-xs font-bold">{post.commentCount}</span>
                          </button>
                          <button
                            onClick={() => handleShare(post.id)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all group"
                          >
                            <Share2 size={20} />
                            <span className="text-xs font-bold">{post.shareCount}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono">
                            {formatCount(post.viewCount)} Views
                          </span>
                          <button
                            onClick={() => handleBookmark(post.id)}
                            className={`transition-all ${
                              isBookmarked ? 'text-[var(--color-primary-custom)]' : 'text-zinc-500 hover:text-[var(--color-primary-custom)]'
                            }`}
                          >
                            <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ─ Comments Section ─ */}
                    {isCommentsOpen && (
                      <div className="bg-zinc-900/50 border-t border-[var(--color-panel-border)] p-5 space-y-4">
                        {topLevelComments.length === 0 && postComments.length === 0 && (
                          <p className="text-xs text-zinc-500 text-center py-4">No comments yet. Be the first!</p>
                        )}

                        {/* Threaded Comments */}
                        <div className="space-y-3">
                          {topLevelComments.map((comment) => (
                            <CommentThread
                              key={comment.id}
                              comment={comment}
                              allComments={postComments}
                              postId={post.id}
                              actualUserId={actualUserId}
                              actualUserName={actualUserName}
                              address={address}
                              userData={userData}
                              isConnected={isConnected}
                              depth={0}
                              likedCommentIds={likedComments}
                              onReply={(c) => handleReplyToComment(post.id, c)}
                              onDelete={(cId) => {
                                setDeleteCommentConfirmId(cId);
                                setDeleteCommentPostId(post.id);
                              }}
                              onLikeComment={handleLikeComment}
                            />
                          ))}
                        </div>

                        {/* Reply indicator */}
                        {currentReply && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary-custom)]/5 border border-[var(--color-primary-custom)]/20 rounded-lg">
                            <CornerDownRight size={14} className="text-[var(--color-primary-custom)]" />
                            <span className="text-xs text-[var(--color-primary-custom)]">
                              Replying to <strong>{currentReply.userName}</strong>
                            </span>
                            <button
                              onClick={() => handleCancelReply(post.id)}
                              className="ml-auto text-zinc-500 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Add Comment Input - no avatar, cleaner layout */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex-1 relative">
                            <input
                              ref={(el) => { commentInputRefs.current[post.id] = el; }}
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                              className="w-full bg-zinc-900 border border-[var(--color-panel-border)] rounded-xl px-4 py-2.5 text-sm focus:ring-[var(--color-primary-custom)] focus:border-[var(--color-primary-custom)] focus:outline-none text-white pr-12"
                              placeholder={
                                !isConnected
                                  ? 'Connect wallet to comment...'
                                  : currentReply
                                    ? `Reply to ${currentReply.userName}...`
                                    : 'Write a comment...'
                              }
                              disabled={!isConnected}
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              disabled={!isConnected || !commentInputs[post.id]?.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--color-primary-custom)] disabled:bg-zinc-700 text-black disabled:text-zinc-500 rounded-lg flex items-center justify-center hover:bg-[var(--color-primary-custom)]/90 transition-all"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Post Modal ─── */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePost}
        userId={actualUserId}
        userName={actualUserName}
      />

      {/* ─── Delete Post Confirmation ─── */}
      <DeleteDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDeletePost(deleteConfirmId)}
        title="Delete Post"
        message="Are you sure you want to delete this post? All comments and interactions will also be removed."
      />

      {/* ─── Delete Comment Confirmation ─── */}
      <DeleteDialog
        isOpen={!!deleteCommentConfirmId}
        onClose={() => { setDeleteCommentConfirmId(null); setDeleteCommentPostId(null); }}
        onConfirm={() => {
          if (deleteCommentConfirmId && deleteCommentPostId) {
            handleDeleteComment(deleteCommentPostId, deleteCommentConfirmId);
          }
        }}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? All replies will also be removed."
      />
    </div>
  );
}
