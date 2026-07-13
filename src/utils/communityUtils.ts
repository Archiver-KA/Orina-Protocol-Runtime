/**
 * @deprecated Phase 3 - Hybrid wallet data: Community.
 * localStorage persistence should migrate to remote-first via the
 * community_posts, community_comments (000004) server table.
 * See spec: 15-local-api-audit-and-server-migration-plan.md
 */
import { Post, Comment, UserAction, FeedFilter, FeedSort, PostType, TrendingTopic, CommunityStats } from '@/types/community';
import { isGuestModeForced } from '@/utils/guestMode';
import {
  dispatchSyncEvent,
  encodeEq,
  encodeIn,
  getLocalSupabaseId,
  isSupabaseRestEnabled,
  restDelete,
  restPatch,
  restSelect,
  restUpsert,
  setLocalSupabaseId,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileUtils';
import {
  ensureSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';


// ─── Storage Keys ───────────────────────────────────────────
const POSTS_KEY = 'studio_community_posts';
const COMMENTS_KEY = 'studio_community_comments';
const USER_ACTIONS_KEY = 'studio_user_actions';
const COMMUNITY_SYNC_EVENT = 'orina:community-changed';
const COMMUNITY_POSTS_HYDRATE_IN_FLIGHT = new Set<string>();
const COMMUNITY_COMMENTS_HYDRATE_IN_FLIGHT = new Set<string>();

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function resolveWalletAddressLike(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (isLikelyWalletAddress(trimmed)) return trimmed;
  }
  return undefined;
}

function normalizePostType(value: unknown): PostType {
  switch (value) {
    case 'discussion':
    case 'question':
    case 'announcement':
    case 'achievement':
      return value;
    default:
      return 'discussion';
  }
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizePoll(raw: unknown, fallbackCreatedAt: number): Post['poll'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const poll = raw as Record<string, unknown>;
  const rawOptions = Array.isArray(poll.options) ? poll.options : [];
  const options = rawOptions
    .map((option, index) => {
      if (typeof option === 'string') {
        const text = option.trim();
        if (!text) return null;
        return {
          id: `option_${index}`,
          text,
          votes: 0,
          percentage: 0,
        };
      }

      if (!option || typeof option !== 'object') return null;
      const parsedOption = option as Record<string, unknown>;
      const text = typeof parsedOption.text === 'string' ? parsedOption.text.trim() : '';
      if (!text) return null;
      return {
        id:
          typeof parsedOption.id === 'string' && parsedOption.id.trim()
            ? parsedOption.id
            : `option_${index}`,
        text,
        votes: toFiniteNumber(parsedOption.votes, 0),
        percentage: toFiniteNumber(parsedOption.percentage, 0),
      };
    })
    .filter((option): option is NonNullable<typeof option> => !!option);

  if (options.length === 0) return undefined;

  const question = typeof poll.question === 'string' ? poll.question.trim() : '';
  return {
    id:
      typeof poll.id === 'string' && poll.id.trim()
        ? poll.id
        : `poll_${fallbackCreatedAt}`,
    question: question || 'Community Poll',
    options,
    totalVotes: toFiniteNumber(poll.totalVotes, options.reduce((sum, option) => sum + option.votes, 0)),
    endsAt: toFiniteNumber(poll.endsAt, fallbackCreatedAt),
    multipleChoice: !!poll.multipleChoice,
  };
}

function normalizePostRecord(raw: unknown): Post | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  if (!id) return null;

  const createdAt = toFiniteNumber(parsed.createdAt, Date.now());
  const walletAddress =
    typeof parsed.walletAddress === 'string' && parsed.walletAddress.trim().startsWith('0x')
      ? parsed.walletAddress.trim()
      : undefined;
  const userId =
    typeof parsed.userId === 'string' && parsed.userId.trim()
      ? parsed.userId.trim()
      : walletAddress || 'community_user';
  const userName =
    typeof parsed.userName === 'string' && parsed.userName.trim()
      ? parsed.userName.trim()
      : 'Community Member';
  const content = typeof parsed.content === 'string' ? parsed.content : '';

  return {
    id,
    type: normalizePostType(parsed.type),
    userId,
    userName,
    userAvatar:
      typeof parsed.userAvatar === 'string' && parsed.userAvatar.trim()
        ? parsed.userAvatar.trim()
        : undefined,
    userRole:
      typeof parsed.userRole === 'string' && parsed.userRole.trim()
        ? parsed.userRole.trim()
        : null,
    walletAddress,
    content,
    images: normalizeStringArray(parsed.images),
    poll: normalizePoll(parsed.poll, createdAt),
    tags: normalizeStringArray(parsed.tags),
    likeCount: Math.max(0, toFiniteNumber(parsed.likeCount, 0)),
    commentCount: Math.max(0, toFiniteNumber(parsed.commentCount, 0)),
    shareCount: Math.max(0, toFiniteNumber(parsed.shareCount, 0)),
    bookmarkCount: Math.max(0, toFiniteNumber(parsed.bookmarkCount, 0)),
    viewCount: Math.max(0, toFiniteNumber(parsed.viewCount, 0)),
    isPinned: !!parsed.isPinned,
    isEdited: !!parsed.isEdited,
    isMock: !!parsed.isMock,
    createdAt,
    updatedAt:
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : undefined,
  };
}

function normalizeCommentRecord(raw: unknown): Comment | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  const id = normalizeOptionalString(parsed.id);
  const postId = normalizeOptionalString(parsed.postId);
  if (!id || !postId || id.startsWith('mock_comment_')) return null;

  const createdAt = toFiniteNumber(parsed.createdAt, Date.now());
  const walletAddress =
    typeof parsed.walletAddress === 'string' && parsed.walletAddress.trim().startsWith('0x')
      ? parsed.walletAddress.trim()
      : undefined;
  const userId = normalizeOptionalString(parsed.userId) || walletAddress || 'community_user';
  const userName = normalizeOptionalString(parsed.userName) || 'Community Member';

  return {
    id,
    postId,
    userId,
    userName,
    userAvatar: normalizeOptionalString(parsed.userAvatar),
    walletAddress,
    content: typeof parsed.content === 'string' ? parsed.content : '',
    likeCount: Math.max(0, toFiniteNumber(parsed.likeCount, 0)),
    replyCount: Math.max(0, toFiniteNumber(parsed.replyCount, 0)),
    parentId: normalizeOptionalString(parsed.parentId),
    createdAt,
    updatedAt:
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : undefined,
  };
}

function normalizeUserActionRecord(raw: unknown): UserAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  const userId = normalizeAddress(normalizeOptionalString(parsed.userId));
  const postId = normalizeOptionalString(parsed.postId);
  const action = parsed.action;
  const pollOptionId = normalizeOptionalString(parsed.pollOptionId);

  if (!userId || !postId) return null;
  if (action !== 'like' && action !== 'bookmark' && action !== 'vote') return null;
  if (action === 'vote' && !pollOptionId) return null;

  return {
    userId,
    postId,
    action,
    timestamp: toFiniteNumber(parsed.timestamp, Date.now()),
    pollOptionId,
  };
}

// ─── Address Normalization ──────────────────────────────────
function normalizeAddress(address?: string | null): string {
  return typeof address === 'string' ? address.toLowerCase() : '';
}

function isLikelyWalletAddress(value?: string | null): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ''));
}

function shouldBlockGuestCommunityWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[Community] Blocked guest-mode write: ${op}`);
  return true;
}

type DbCommunityPostRow = {
  id: string;
  author_user_id: string;
  content: string | null;
  media: any[] | null;
  poll: any | null;
  visibility: string;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbCommunityCommentRow = {
  id: string;
  post_id: string;
  author_user_id: string;
  parent_comment_id: string | null;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DbCommunityReactionRow = {
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  reaction_type: string;
  created_at: string;
};

type DbUserFollowRow = {
  following_user_id: string;
};

export interface CommunityFeedServerSnapshot {
  posts: Post[];
  trendingTopics: TrendingTopic[];
  stats: CommunityStats;
  likedPostIds: string[];
  bookmarkedPostIds: string[];
  followingPostIds: string[];
}

export interface CommunityCommentsServerSnapshot {
  comments: Comment[];
  likedCommentIds: string[];
}

export interface CommunityHubServerSnapshot {
  stats: CommunityStats;
  trendingTopics: TrendingTopic[];
}



function postMapKey(clientPostId: string): string {
  return `post_${clientPostId}`;
}

function commentMapKey(clientCommentId: string): string {
  return `comment_${clientCommentId}`;
}

function mapDbPostToLocal(row: DbCommunityPostRow): Post {
  const metadata = row.metadata || {};
  const clientId = metadata.clientId || row.id;
  const walletAddress = resolveWalletAddressLike(metadata.walletAddress, metadata.userId);
  const normalized = normalizePostRecord({
    id: clientId,
    type: (metadata.type as PostType) || 'discussion',
    userId: metadata.userId || walletAddress || row.author_user_id,
    userName: metadata.userName || 'Community Member',
    userAvatar: metadata.userAvatar || undefined,
    userRole: metadata.userRole || null,
    walletAddress: walletAddress || undefined,
    content: row.content || '',
    images: Array.isArray(row.media) ? row.media : (metadata.images || undefined),
    poll: row.poll || metadata.poll || undefined,
    tags: Array.isArray(metadata.tags) ? metadata.tags : undefined,
    likeCount: Number(metadata.likeCount || 0),
    commentCount: Number(metadata.commentCount || 0),
    shareCount: Number(metadata.shareCount || 0),
    bookmarkCount: Number(metadata.bookmarkCount || 0),
    viewCount: Number(metadata.viewCount || 0),
    isPinned: !!metadata.isPinned,
    isEdited: !!metadata.isEdited,
    isMock: !!metadata.isMock,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  });

  return normalized || {
    id: String(clientId || row.id),
    type: 'discussion',
    userId: String(row.author_user_id || row.id),
    userName: 'Community Member',
    content: row.content || '',
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    viewCount: 0,
    isPinned: false,
    isEdited: false,
    isMock: false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function mapDbCommentToLocal(row: DbCommunityCommentRow, postClientId: string): Comment {
  const metadata = row.metadata || {};
  const walletAddress = resolveWalletAddressLike(metadata.walletAddress, metadata.userId);
  const normalized = normalizeCommentRecord({
    id: metadata.clientId || row.id,
    postId: postClientId,
    userId: metadata.userId || walletAddress || row.author_user_id,
    userName: metadata.userName || 'Community Member',
    userAvatar: metadata.userAvatar || undefined,
    walletAddress: walletAddress || undefined,
    content: row.content || '',
    likeCount: Number(metadata.likeCount || 0),
    replyCount: Number(metadata.replyCount || 0),
    parentId: metadata.parentClientId || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  });

  return normalized || {
    id: String(metadata.clientId || row.id),
    postId: String(postClientId || row.post_id || row.id),
    userId: String(metadata.userId || metadata.walletAddress || row.author_user_id || row.id),
    userName: 'Community Member',
    content: row.content || '',
    likeCount: 0,
    replyCount: 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function postMetadataFromLocal(post: Post) {
  return {
    clientId: post.id,
    type: post.type,
    userId: post.userId,
    userName: post.userName,
    userAvatar: post.userAvatar || null,
    userRole: post.userRole || null,
    walletAddress: post.walletAddress || null,
    tags: post.tags || [],
    likeCount: post.likeCount || 0,
    commentCount: post.commentCount || 0,
    shareCount: post.shareCount || 0,
    bookmarkCount: post.bookmarkCount || 0,
    viewCount: post.viewCount || 0,
    isPinned: !!post.isPinned,
    isEdited: !!post.isEdited,
    isMock: !!post.isMock,
    poll: post.poll || null,
  };
}

function commentMetadataFromLocal(comment: Comment) {
  return {
    clientId: comment.id,
    parentClientId: comment.parentId || null,
    userId: comment.userId,
    userName: comment.userName,
    userAvatar: comment.userAvatar || null,
    walletAddress: comment.walletAddress || null,
    likeCount: comment.likeCount || 0,
    replyCount: comment.replyCount || 0,
  };
}

const EMPTY_COMMUNITY_STATS: CommunityStats = {
  totalPosts: 0,
  totalUsers: 0,
  activeToday: 0,
  totalComments: 0,
};

const EMPTY_COMMUNITY_FEED_SNAPSHOT: CommunityFeedServerSnapshot = {
  posts: [],
  trendingTopics: [],
  stats: EMPTY_COMMUNITY_STATS,
  likedPostIds: [],
  bookmarkedPostIds: [],
  followingPostIds: [],
};

const EMPTY_COMMUNITY_COMMENTS_SNAPSHOT: CommunityCommentsServerSnapshot = {
  comments: [],
  likedCommentIds: [],
};

async function resolveCommunityProfileId(walletAddress?: string | null): Promise<string | null> {
  const normalized = normalizeAddress(walletAddress);
  if (!isLikelyWalletAddress(normalized)) return null;
  try {
    return (await ensureRemoteProfileIdForWallet(normalized)) || getCachedRemoteProfileId(normalized);
  } catch (error) {
    console.debug('[Community] Remote profile resolution skipped:', error);
    return getCachedRemoteProfileId(normalized);
  }
}

function communityStatsFromRows(postRows: DbCommunityPostRow[], commentRows: DbCommunityCommentRow[]): CommunityStats {
  const participantIds = new Set<string>();
  const activeTodayIds = new Set<string>();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayTs = startOfToday.getTime();

  postRows.forEach((row) => {
    participantIds.add(row.author_user_id);
    if (Date.parse(row.created_at) >= startOfTodayTs) {
      activeTodayIds.add(row.author_user_id);
    }
  });

  commentRows.forEach((row) => {
    participantIds.add(row.author_user_id);
    if (Date.parse(row.created_at) >= startOfTodayTs) {
      activeTodayIds.add(row.author_user_id);
    }
  });

  return {
    totalPosts: postRows.length,
    totalUsers: participantIds.size,
    activeToday: activeTodayIds.size,
    totalComments: commentRows.length,
  };
}

function writeServerPostsToLocal(posts: Post[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch (error) {
    console.debug('[Community] Write server posts cache skipped:', error);
  }
}

function writeServerCommentsToLocal(postId: string, comments: Comment[]): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadAllComments().filter((comment) => comment.postId !== postId);
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify([...existing, ...comments]));
  } catch (error) {
    console.debug('[Community] Write server comments cache skipped:', error);
  }
}

function replaceServerScopedUserActions(
  userId: string,
  scopedPostIds: string[],
  likedPostIds: string[],
  bookmarkedPostIds: string[]
): void {
  if (typeof window === 'undefined') return;
  const normalizedUserId = normalizeAddress(userId);
  if (!normalizedUserId) return;

  const scopedIds = new Set(scopedPostIds);
  const preserved = allActions().filter((action) => {
    if (normalizeAddress(action.userId) !== normalizedUserId) return true;
    if (!scopedIds.has(action.postId)) return true;
    return false;
  });
  const timestamp = Date.now();
  const hydrated: UserAction[] = [
    ...likedPostIds.map((postId) => ({
      userId: normalizedUserId,
      postId,
      action: 'like' as const,
      timestamp,
    })),
    ...bookmarkedPostIds.map((postId) => ({
      userId: normalizedUserId,
      postId,
      action: 'bookmark' as const,
      timestamp,
    })),
  ];

  try {
    window.localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify([...preserved, ...hydrated]));
  } catch (error) {
    console.debug('[Community] Write server user actions skipped:', error);
  }
}

async function syncReactionRecordToSupabase(
  walletAddress: string,
  targetType: 'post' | 'comment',
  clientTargetId: string,
  reactionType: 'like' | 'bookmark',
  added: boolean
): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  const normalizedWallet = normalizeAddress(walletAddress);
  if (!isLikelyWalletAddress(normalizedWallet)) return;

  if (isSupabaseAuthClaimBridgeEnabled()) {
    try {
      await ensureSupabaseBridgeAccessToken({
        walletAddress: normalizedWallet,
        promptOnAuthMissing: false,
      });
    } catch (error) {
      console.debug('[Community] Claim bridge exchange skipped before reaction sync:', error);
    }
  }

  const userId = getCachedRemoteProfileId(normalizedWallet) || await ensureRemoteProfileIdForWallet(normalizedWallet);
  const targetDbId = targetType === 'post'
    ? getLocalSupabaseId('community_post', postMapKey(clientTargetId))
    : getLocalSupabaseId('community_comment', commentMapKey(clientTargetId));
  if (!userId || !targetDbId) return;

  try {
    if (added) {
      await restUpsert(
        'community_reactions',
        [{
          user_id: userId,
          target_type: targetType,
          target_id: targetDbId,
          reaction_type: reactionType,
        }],
        { onConflict: 'user_id,target_type,target_id,reaction_type' }
      );
    } else {
      await restDelete(
        'community_reactions',
        toQuery({
          user_id: encodeEq(userId),
          target_type: encodeEq(targetType),
          target_id: encodeEq(targetDbId),
          reaction_type: encodeEq(reactionType),
        })
      );
    }
  } catch (error) {
    console.debug('[Community] Supabase reaction sync skipped:', error);
  }
}

async function hydratePostsFromSupabase(): Promise<void> {
  if (!isSupabaseRestEnabled() || COMMUNITY_POSTS_HYDRATE_IN_FLIGHT.has('posts')) return;
  COMMUNITY_POSTS_HYDRATE_IN_FLIGHT.add('posts');
  try {
    const rows = await restSelect<DbCommunityPostRow>(
      'community_posts',
      toQuery({
        select: 'id,author_user_id,content,media,poll,visibility,metadata,created_at,updated_at,deleted_at',
        deleted_at: 'is.null',
        order: 'created_at.desc',
        limit: '200',
      })
    );
    const mapped = rows.map(mapDbPostToLocal);
    mapped.forEach((post, idx) => setLocalSupabaseId('community_post', postMapKey(post.id), rows[idx].id));

    const existing = loadAllPosts();
    const existingById = new Map(existing.map((post) => [post.id, post] as const));
    const mappedWithLocalPreference = mapped.map((remotePost) => {
      const localPost = existingById.get(remotePost.id);
      if (!localPost) return remotePost;

      const remoteTs = remotePost.updatedAt || remotePost.createdAt || 0;
      const localTs = localPost.updatedAt || localPost.createdAt || 0;
      return localTs > remoteTs ? localPost : remotePost;
    });
    const remoteIds = new Set(mappedWithLocalPreference.map((p) => p.id));
    const localOnly = existing.filter(
      (post) =>
        !getLocalSupabaseId('community_post', postMapKey(post.id)) &&
        !remoteIds.has(post.id)
    );
    const merged = [...mappedWithLocalPreference, ...localOnly].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    localStorage.setItem(POSTS_KEY, JSON.stringify(merged));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.debug('[Community] Supabase posts hydrate skipped:', error);
  } finally {
    COMMUNITY_POSTS_HYDRATE_IN_FLIGHT.delete('posts');
  }
}

async function hydrateCommentsForPostFromSupabase(clientPostId: string): Promise<void> {
  if (!isSupabaseRestEnabled() || !clientPostId || COMMUNITY_COMMENTS_HYDRATE_IN_FLIGHT.has(clientPostId)) return;
  const dbPostId = getLocalSupabaseId('community_post', postMapKey(clientPostId));
  if (!dbPostId) return;
  COMMUNITY_COMMENTS_HYDRATE_IN_FLIGHT.add(clientPostId);
  try {
    const rows = await restSelect<DbCommunityCommentRow>(
      'community_comments',
      toQuery({
        select: 'id,post_id,author_user_id,parent_comment_id,content,metadata,created_at,updated_at,deleted_at',
        post_id: encodeEq(dbPostId),
        deleted_at: 'is.null',
        order: 'created_at.asc',
        limit: '500',
      })
    );
    const allComments = loadAllComments();
    const all = allComments.filter((c) => c.postId !== clientPostId);
    const mapped = rows.map((row) => {
      const localComment = mapDbCommentToLocal(row, clientPostId);
      setLocalSupabaseId('community_comment', commentMapKey(localComment.id), row.id);
      return localComment;
    });
    const remoteIds = new Set(mapped.map((c) => c.id));
    const localOnlyForPost = allComments.filter(
      (c) =>
        c.postId === clientPostId &&
        !getLocalSupabaseId('community_comment', commentMapKey(c.id)) &&
        !remoteIds.has(c.id)
    );
    const mergedForPost = [...mapped, ...localOnlyForPost].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify([...all, ...mergedForPost]));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.debug('[Community] Supabase comments hydrate skipped:', error);
  } finally {
    COMMUNITY_COMMENTS_HYDRATE_IN_FLIGHT.delete(clientPostId);
  }
}

async function syncPostToSupabase(post: Post): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  const wallet = post.walletAddress || post.userId;
  if (wallet && isLikelyWalletAddress(wallet) && isSupabaseAuthClaimBridgeEnabled()) {
    try {
      await ensureSupabaseBridgeAccessToken({
        walletAddress: wallet,
        promptOnAuthMissing: false,
      });
    } catch (error) {
      console.debug('[Community] Claim bridge exchange skipped before post sync:', error);
    }
  }
  const authorId = wallet ? await ensureRemoteProfileIdForWallet(wallet) : null;
  if (!authorId) return;

  const payload = {
    author_user_id: authorId,
    content: post.content || null,
    media: post.images || [],
    poll: post.poll || null,
    visibility: 'public',
    metadata: postMetadataFromLocal(post),
    deleted_at: null,
  };

  const mappedDbId = getLocalSupabaseId('community_post', postMapKey(post.id));
  try {
    if (mappedDbId) {
      const rows = await restPatch<DbCommunityPostRow>(
        'community_posts',
        toQuery({ id: encodeEq(mappedDbId) }),
        payload
      );
      if (rows[0]?.id) {
        setLocalSupabaseId('community_post', postMapKey(post.id), rows[0].id);
      }
    } else {
      const rows = await restUpsert<DbCommunityPostRow>('community_posts', [payload]);
      if (rows[0]?.id) {
        setLocalSupabaseId('community_post', postMapKey(post.id), rows[0].id);
      }
    }
  } catch (error) {
    console.debug('[Community] Supabase post sync skipped:', error);
  }
}

async function syncCommentToSupabase(comment: Comment): Promise<void> {
  if (!isSupabaseRestEnabled()) return;
  const dbPostId = getLocalSupabaseId('community_post', postMapKey(comment.postId));
  if (!dbPostId) return;
  const wallet = comment.walletAddress || comment.userId;
  if (wallet && isLikelyWalletAddress(wallet) && isSupabaseAuthClaimBridgeEnabled()) {
    try {
      await ensureSupabaseBridgeAccessToken({
        walletAddress: wallet,
        promptOnAuthMissing: false,
      });
    } catch (error) {
      console.debug('[Community] Claim bridge exchange skipped before comment sync:', error);
    }
  }
  const authorId = wallet ? await ensureRemoteProfileIdForWallet(wallet) : null;
  if (!authorId) return;
  const parentDbId = comment.parentId ? getLocalSupabaseId('community_comment', commentMapKey(comment.parentId)) : null;

  const payload = {
    post_id: dbPostId,
    author_user_id: authorId,
    parent_comment_id: parentDbId || null,
    content: comment.content || null,
    metadata: commentMetadataFromLocal(comment),
    deleted_at: null,
  };

  const mappedDbId = getLocalSupabaseId('community_comment', commentMapKey(comment.id));
  try {
    if (mappedDbId) {
      const rows = await restPatch<DbCommunityCommentRow>(
        'community_comments',
        toQuery({ id: encodeEq(mappedDbId) }),
        payload
      );
      if (rows[0]?.id) setLocalSupabaseId('community_comment', commentMapKey(comment.id), rows[0].id);
    } else {
      const rows = await restUpsert<DbCommunityCommentRow>('community_comments', [payload]);
      if (rows[0]?.id) setLocalSupabaseId('community_comment', commentMapKey(comment.id), rows[0].id);
    }
  } catch (error) {
    console.debug('[Community] Supabase comment sync skipped:', error);
  }
}

async function syncDeletePostToSupabase(postId: string): Promise<void> {
  const dbPostId = getLocalSupabaseId('community_post', postMapKey(postId));
  if (!dbPostId) return;
  try {
    await restDelete('community_posts', toQuery({ id: encodeEq(dbPostId) }));
  } catch (error) {
    console.debug('[Community] Supabase post delete skipped:', error);
  }
}

async function syncDeleteCommentToSupabase(commentId: string): Promise<void> {
  const dbCommentId = getLocalSupabaseId('community_comment', commentMapKey(commentId));
  if (!dbCommentId) return;
  try {
    await restDelete('community_comments', toQuery({ id: encodeEq(dbCommentId) }));
  } catch (error) {
    console.debug('[Community] Supabase comment delete skipped:', error);
  }
}

async function syncReactionToSupabase(action: UserAction, added: boolean): Promise<void> {
  if (!['like', 'bookmark'].includes(action.action)) return;
  await syncReactionRecordToSupabase(action.userId, 'post', action.postId, action.action, added);
}

export async function loadCommunityFeedFromServer(currentWalletAddress?: string): Promise<CommunityFeedServerSnapshot> {
  if (!isSupabaseRestEnabled()) return EMPTY_COMMUNITY_FEED_SNAPSHOT;

  try {
    const currentProfileId = await resolveCommunityProfileId(currentWalletAddress);
    const [postRows, followRows] = await Promise.all([
      restSelect<DbCommunityPostRow>(
        'community_posts',
        toQuery({
          select: 'id,author_user_id,content,media,poll,visibility,metadata,created_at,updated_at,deleted_at',
          deleted_at: 'is.null',
          order: 'created_at.desc',
          limit: '200',
        })
      ),
      currentProfileId
        ? restSelect<DbUserFollowRow>(
            'user_follows',
            toQuery({
              select: 'following_user_id',
              follower_user_id: encodeEq(currentProfileId),
              limit: '500',
            })
          )
        : Promise.resolve([] as DbUserFollowRow[]),
    ]);

    const mappedPosts = postRows.map((row) => {
      const localPost = mapDbPostToLocal(row);
      setLocalSupabaseId('community_post', postMapKey(localPost.id), row.id);
      return localPost;
    });

    if (postRows.length === 0) {
      writeServerPostsToLocal([]);
      if (currentWalletAddress) {
        replaceServerScopedUserActions(currentWalletAddress, [], [], []);
      }
      return EMPTY_COMMUNITY_FEED_SNAPSHOT;
    }

    const dbPostIds = postRows.map((row) => row.id);
    const [commentRows, reactionRows] = await Promise.all([
      restSelect<DbCommunityCommentRow>(
        'community_comments',
        toQuery({
          select: 'id,post_id,author_user_id,parent_comment_id,content,metadata,created_at,updated_at,deleted_at',
          post_id: encodeIn(dbPostIds),
          deleted_at: 'is.null',
          order: 'created_at.asc',
          limit: '2000',
        })
      ),
      restSelect<DbCommunityReactionRow>(
        'community_reactions',
        toQuery({
          select: 'user_id,target_type,target_id,reaction_type,created_at',
          target_type: encodeEq('post'),
          target_id: encodeIn(dbPostIds),
          limit: '4000',
        })
      ),
    ]);

    const commentCountByPostId = new Map<string, number>();
    commentRows.forEach((row) => {
      commentCountByPostId.set(row.post_id, (commentCountByPostId.get(row.post_id) || 0) + 1);
    });

    const likeCountByPostId = new Map<string, number>();
    const bookmarkCountByPostId = new Map<string, number>();
    reactionRows.forEach((row) => {
      if (row.reaction_type === 'like') {
        likeCountByPostId.set(row.target_id, (likeCountByPostId.get(row.target_id) || 0) + 1);
      }
      if (row.reaction_type === 'bookmark') {
        bookmarkCountByPostId.set(row.target_id, (bookmarkCountByPostId.get(row.target_id) || 0) + 1);
      }
    });

    const likedPostIds: string[] = [];
    const bookmarkedPostIds: string[] = [];
    const followedProfileIds = new Set(followRows.map((row) => row.following_user_id));

    const posts = mappedPosts.map((post, index) => {
      const dbPostId = postRows[index].id;
      if (currentProfileId) {
        reactionRows.forEach((row) => {
          if (row.user_id !== currentProfileId || row.target_id !== dbPostId) return;
          if (row.reaction_type === 'like') likedPostIds.push(post.id);
          if (row.reaction_type === 'bookmark') bookmarkedPostIds.push(post.id);
        });
      }

      return {
        ...post,
        likeCount: likeCountByPostId.get(dbPostId) || 0,
        commentCount: commentCountByPostId.get(dbPostId) || 0,
        bookmarkCount: bookmarkCountByPostId.get(dbPostId) || 0,
        shareCount: 0,
        viewCount: 0,
      };
    });

    const followingPostIds = posts
      .filter((_, index) => followedProfileIds.has(postRows[index].author_user_id))
      .map((post) => post.id);

    const stats = communityStatsFromRows(postRows, commentRows);
    const trendingTopics = extractTrendingTopics(posts);

    writeServerPostsToLocal(posts);
    if (currentWalletAddress) {
      replaceServerScopedUserActions(currentWalletAddress, posts.map((post) => post.id), likedPostIds, bookmarkedPostIds);
    }

    return {
      posts,
      trendingTopics,
      stats,
      likedPostIds,
      bookmarkedPostIds,
      followingPostIds,
    };
  } catch (error) {
    console.debug('[Community] Server feed load skipped:', error);
    return EMPTY_COMMUNITY_FEED_SNAPSHOT;
  }
}

export async function loadCommunityCommentsFromServer(
  postId: string,
  currentWalletAddress?: string
): Promise<CommunityCommentsServerSnapshot> {
  if (!isSupabaseRestEnabled()) return EMPTY_COMMUNITY_COMMENTS_SNAPSHOT;
  const dbPostId = getLocalSupabaseId('community_post', postMapKey(postId));
  if (!dbPostId) return EMPTY_COMMUNITY_COMMENTS_SNAPSHOT;

  try {
    const [currentProfileId, commentRows] = await Promise.all([
      resolveCommunityProfileId(currentWalletAddress),
      restSelect<DbCommunityCommentRow>(
        'community_comments',
        toQuery({
          select: 'id,post_id,author_user_id,parent_comment_id,content,metadata,created_at,updated_at,deleted_at',
          post_id: encodeEq(dbPostId),
          deleted_at: 'is.null',
          order: 'created_at.asc',
          limit: '1000',
        })
      ),
    ]);

    if (commentRows.length === 0) {
      writeServerCommentsToLocal(postId, []);
      return EMPTY_COMMUNITY_COMMENTS_SNAPSHOT;
    }

    const mappedComments = commentRows.map((row) => {
      const localComment = mapDbCommentToLocal(row, postId);
      setLocalSupabaseId('community_comment', commentMapKey(localComment.id), row.id);
      return localComment;
    });

    const commentDbIds = commentRows.map((row) => row.id);
    const reactionRows = await restSelect<DbCommunityReactionRow>(
      'community_reactions',
      toQuery({
        select: 'user_id,target_type,target_id,reaction_type,created_at',
        target_type: encodeEq('comment'),
        target_id: encodeIn(commentDbIds),
        reaction_type: encodeEq('like'),
        limit: '4000',
      })
    );

    const likeCountByCommentId = new Map<string, number>();
    reactionRows.forEach((row) => {
      likeCountByCommentId.set(row.target_id, (likeCountByCommentId.get(row.target_id) || 0) + 1);
    });

    const replyCountByParentId = new Map<string, number>();
    mappedComments.forEach((comment) => {
      if (!comment.parentId) return;
      replyCountByParentId.set(comment.parentId, (replyCountByParentId.get(comment.parentId) || 0) + 1);
    });

    const likedCommentIds: string[] = [];
    const comments = mappedComments.map((comment, index) => {
      const dbCommentId = commentRows[index].id;
      if (currentProfileId && reactionRows.some((row) => row.user_id === currentProfileId && row.target_id === dbCommentId)) {
        likedCommentIds.push(comment.id);
      }
      return {
        ...comment,
        likeCount: likeCountByCommentId.get(dbCommentId) || 0,
        replyCount: replyCountByParentId.get(comment.id) || 0,
      };
    });

    writeServerCommentsToLocal(postId, comments);
    return {
      comments,
      likedCommentIds,
    };
  } catch (error) {
    console.debug('[Community] Server comments load skipped:', error);
    return EMPTY_COMMUNITY_COMMENTS_SNAPSHOT;
  }
}

export async function loadCommunityHubFromServer(currentWalletAddress?: string): Promise<CommunityHubServerSnapshot> {
  const snapshot = await loadCommunityFeedFromServer(currentWalletAddress);
  return {
    stats: snapshot.stats,
    trendingTopics: snapshot.trendingTopics,
  };
}

export async function persistCommunityPostToServer(post: Post): Promise<void> {
  await syncPostToSupabase(post);
}

export async function deleteCommunityPostFromServer(postId: string): Promise<void> {
  await syncDeletePostToSupabase(postId);
}

export async function persistCommunityCommentToServer(comment: Comment): Promise<void> {
  await syncCommentToSupabase(comment);
}

export async function deleteCommunityCommentFromServer(commentId: string): Promise<void> {
  await syncDeleteCommentToSupabase(commentId);
}

export async function toggleCommunityReactionOnServer(input: {
  walletAddress?: string | null;
  targetType: 'post' | 'comment';
  clientTargetId: string;
  reactionType: 'like' | 'bookmark';
  active: boolean;
}): Promise<void> {
  const normalizedWallet = normalizeAddress(input.walletAddress);
  if (!isLikelyWalletAddress(normalizedWallet)) return;
  await syncReactionRecordToSupabase(
    normalizedWallet,
    input.targetType,
    input.clientTargetId,
    input.reactionType,
    input.active
  );
}

/**
 * Check if a post belongs to the given wallet address
 */
export function isPostOwner(post: Post, walletAddress?: string): boolean {
  const ownerWallet = resolveWalletAddressLike(post.walletAddress, post.userId);
  if (!walletAddress || !ownerWallet) return false;
  return normalizeAddress(ownerWallet) === normalizeAddress(walletAddress);
}

// ─── Posts CRUD ─────────────────────────────────────────────

/**
 * Load all posts from localStorage cache — NEVER returns undefined.
 * Mock posts are excluded; only real server-synced data is returned.
 */
export function loadAllPosts(): Post[] {
  try {
    const stored = localStorage.getItem(POSTS_KEY);
    if (!stored) {
      void hydratePostsFromSupabase();
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map(normalizePostRecord)
      .filter((post): post is Post => !!post && !post.isMock);
    const normalizedJson = JSON.stringify(sanitized);
    if (normalizedJson !== stored) {
      localStorage.setItem(POSTS_KEY, normalizedJson);
    }
    void hydratePostsFromSupabase();
    return sanitized;
  } catch (error) {
    console.error('[Community] Failed to load posts:', error);
    return [];
  }
}

/**
 * Save a single post (insert or update) — server-first.
 */
export async function savePost(post: Post): Promise<void> {
  try {
    if (shouldBlockGuestCommunityWrite('savePost')) return;
    const normalizedPost = normalizePostRecord(post);
    if (!normalizedPost) {
      console.error('[Community] Refused to save invalid post payload');
      return;
    }
    await syncPostToSupabase(normalizedPost);
    const posts = loadAllPosts();
    const existingIndex = posts.findIndex((p) => p.id === normalizedPost.id);
    if (existingIndex !== -1) {
      posts[existingIndex] = normalizedPost;
    } else {
      posts.unshift(normalizedPost);
    }
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to save post:', error);
  }
}

/**
 * Bulk save posts (overwrite entire storage) — server-first.
 */
export async function saveAllPosts(posts: Post[]): Promise<void> {
  try {
    const sanitized = posts
      .map(normalizePostRecord)
      .filter((post): post is Post => !!post);
    await Promise.allSettled(sanitized.map((post) => syncPostToSupabase(post)));
    localStorage.setItem(POSTS_KEY, JSON.stringify(sanitized));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to save all posts:', error);
  }
}

/**
 * Delete a post and its associated comments — server-first.
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    if (shouldBlockGuestCommunityWrite('deletePost')) return;
    await syncDeletePostToSupabase(postId);
    const posts = loadAllPosts();
    const filtered = posts.filter((p) => p.id !== postId);
    localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
    deleteCommentsByPost(postId);
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to delete post:', error);
  }
}

// ─── Comments CRUD ──────────────────────────────────────────

function loadAllComments(): Comment[] {
  try {
    const stored = localStorage.getItem(COMMENTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map(normalizeCommentRecord)
      .filter((comment): comment is Comment => !!comment);
    const serialized = JSON.stringify(sanitized);
    if (serialized !== stored) {
      localStorage.setItem(COMMENTS_KEY, serialized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function loadComments(postId: string): Comment[] {
  const comments = loadAllComments().filter((c) => c.postId === postId);
  void hydrateCommentsForPostFromSupabase(postId);
  return comments;
}

/**
 * Load top-level comments (no parentId) for a post
 */
export function loadTopLevelComments(postId: string): Comment[] {
  return loadAllComments().filter((c) => c.postId === postId && !c.parentId);
}

/**
 * Load replies for a specific comment
 */
export function loadReplies(parentCommentId: string): Comment[] {
  return loadAllComments().filter((c) => c.parentId === parentCommentId);
}

/**
 * Build a threaded comment tree for a post
 */
export function buildCommentTree(postId: string): Comment[] {
  const all = loadComments(postId);
  // Return all comments; the UI will handle nesting by parentId
  return all;
}

export async function saveComment(comment: Comment): Promise<void> {
  try {
    if (shouldBlockGuestCommunityWrite('saveComment')) return;
    const sanitizedComment = normalizeCommentRecord(comment);
    if (!sanitizedComment) {
      console.warn('[Community] Ignored invalid comment payload.');
      return;
    }
    await syncCommentToSupabase(sanitizedComment);
    const comments = loadAllComments();
    const existingIndex = comments.findIndex((c) => c.id === sanitizedComment.id);
    if (existingIndex !== -1) {
      comments[existingIndex] = sanitizedComment;
    } else {
      comments.push(sanitizedComment);
    }
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to save comment:', error);
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    if (shouldBlockGuestCommunityWrite('deleteComment')) return;
    const comments = loadAllComments();
    const idsToDelete = new Set<string>([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of comments) {
        if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
          idsToDelete.add(c.id);
          changed = true;
        }
      }
    }
    await Promise.allSettled(Array.from(idsToDelete).map((id) => syncDeleteCommentToSupabase(id)));
    const filtered = comments.filter((c) => !idsToDelete.has(c.id));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(filtered));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to delete comment:', error);
  }
}

function deleteCommentsByPost(postId: string): void {
  try {
    const comments = loadAllComments();
    const filtered = comments.filter((c) => c.postId !== postId);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(filtered));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
  } catch (error) {
    console.error('[Community] Failed to delete comments for post:', error);
  }
}

// ─── User Actions (Like / Bookmark / Vote) ──────────────────

function allActions(): UserAction[] {
  try {
    const stored = localStorage.getItem(USER_ACTIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map(normalizeUserActionRecord)
      .filter((action): action is UserAction => !!action);
    const serialized = JSON.stringify(sanitized);
    if (serialized !== stored) {
      localStorage.setItem(USER_ACTIONS_KEY, serialized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function loadUserActions(userId: string): UserAction[] {
  const norm = normalizeAddress(userId);
  return allActions().filter((a) => normalizeAddress(a.userId) === norm);
}

/**
 * Toggle-save a user action. Returns true if action was ADDED, false if REMOVED.
 */
export async function saveUserAction(action: UserAction): Promise<boolean> {
  try {
    if (shouldBlockGuestCommunityWrite('saveUserAction')) return false;
    const actions = allActions();
    const normalizedAction = normalizeUserActionRecord(action);
    if (!normalizedAction) {
      console.warn('[Community] Ignored invalid user action payload.');
      return false;
    }
    const normUserId = normalizedAction.userId;

    const existingIndex = actions.findIndex(
      (a) =>
        normalizeAddress(a.userId) === normUserId &&
        a.postId === normalizedAction.postId &&
        a.action === normalizedAction.action &&
        a.pollOptionId === normalizedAction.pollOptionId
    );

    if (existingIndex !== -1) {
      if (!isGuestModeForced()) {
        await syncReactionToSupabase(normalizedAction, false);
      }
      actions.splice(existingIndex, 1);
      localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));
      return false; // removed
    } else {
      if (!isGuestModeForced()) {
        await syncReactionToSupabase(normalizedAction, true);
      }
      actions.push(normalizedAction);
      localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));
      return true; // added
    }
  } catch (error) {
    console.error('[Community] Failed to save user action:', error);
    return false;
  }
}

export function hasUserAction(userId: string, postId: string, action: 'like' | 'bookmark'): boolean {
  const normUserId = normalizeAddress(userId);
  return allActions().some(
    (a) => normalizeAddress(a.userId) === normUserId && a.postId === postId && a.action === action
  );
}

export function getUserPollVote(userId: string, postId: string): string | null {
  const normUserId = normalizeAddress(userId);
  const voteAction = allActions().find(
    (a) => normalizeAddress(a.userId) === normUserId && a.postId === postId && a.action === 'vote'
  );
  return voteAction?.pollOptionId || null;
}

// ─── Post Count Helpers ─────────────────────────────────────

export async function incrementPostCount(postId: string, field: 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount' | 'viewCount'): Promise<void> {
  if (shouldBlockGuestCommunityWrite('incrementPostCount')) return;
  const posts = loadAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (post) {
    post[field]++;
    await saveAllPosts(posts);
  }
}

export async function decrementPostCount(postId: string, field: 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount'): Promise<void> {
  if (shouldBlockGuestCommunityWrite('decrementPostCount')) return;
  const posts = loadAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (post && post[field] > 0) {
    post[field]--;
    await saveAllPosts(posts);
  }
}

// ─── Filter / Sort ──────────────────────────────────────────

export function filterPosts(posts: Post[], filter: FeedFilter, currentWalletAddress?: string): Post[] {
  switch (filter) {
    case 'all':
      return posts;
    case 'following':
      return posts; // TODO
    case 'discussions':
      return posts.filter((p) => p.type === 'discussion');
    case 'questions':
      return posts.filter((p) => p.type === 'question');
    case 'announcements':
      return posts.filter((p) => p.type === 'announcement');
    case 'achievements':
      return posts.filter((p) => p.type === 'achievement');
    case 'my-posts':
      if (!currentWalletAddress) return [];
      return posts.filter((p) => isPostOwner(p, currentWalletAddress));
    case 'my-saved':
      if (!currentWalletAddress) return [];
      return posts.filter((p) => hasUserAction(currentWalletAddress, p.id, 'bookmark'));
    default:
      return posts;
  }
}

export function sortPosts(posts: Post[], sort: FeedSort, currentWalletAddress?: string): Post[] {
  const isPinnedVisibleToViewer = (post: Post) =>
    !!post.isPinned && (!!currentWalletAddress ? isPostOwner(post, currentWalletAddress) : true);

  const pinned = posts.filter((p) => isPinnedVisibleToViewer(p));
  const unpinned = posts.filter((p) => !isPinnedVisibleToViewer(p));
  let sorted = [...unpinned];

  switch (sort) {
    case 'recent':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'trending': {
      const now = Date.now();
      sorted.sort((a, b) => {
        const ageA = Math.max(1, (now - a.createdAt) / (1000 * 60 * 60));
        const ageB = Math.max(1, (now - b.createdAt) / (1000 * 60 * 60));
        const scoreA = (a.likeCount * 2 + a.commentCount * 3 + a.viewCount) / ageA;
        const scoreB = (b.likeCount * 2 + b.commentCount * 3 + b.viewCount) / ageB;
        return scoreB - scoreA;
      });
      break;
    }
    case 'popular':
      sorted.sort((a, b) => (b.likeCount + b.commentCount) - (a.likeCount + a.commentCount));
      break;
    case 'unanswered':
      sorted = sorted.filter((p) => p.type === 'question' && p.commentCount === 0);
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }

  return [...pinned, ...sorted];
}

export function searchPosts(posts: Post[], query: string): Post[] {
  if (!query.trim()) return posts;
  const q = query.toLowerCase();
  return posts.filter(
    (p) =>
      p.content.toLowerCase().includes(q) ||
      p.userName.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
  );
}

// ─── Labels / Formatting ──────────────────────────────��─────

export function getPostTypeLabel(type: PostType): string {
  const map: Record<PostType, string> = { discussion: 'Discussion', question: 'Question', announcement: 'Announcement', achievement: 'Achievement' };
  return map[type] || type;
}

export function getPostTypeColor(type: PostType): string {
  const map: Record<PostType, string> = { discussion: 'blue', question: 'purple', announcement: 'orange', achievement: 'green' };
  return map[type] || 'gray';
}

export function getFilterLabel(filter: FeedFilter): string {
  const map: Record<FeedFilter, string> = {
    all: 'All Posts',
    following: 'Following',
    discussions: 'Discussions',
    questions: 'Questions',
    announcements: 'Announcements',
    achievements: 'Achievements',
    'my-posts': 'My Posts',
    'my-saved': 'My Saved',
  };
  return map[filter] || filter;
}

export function getSortLabel(sort: FeedSort): string {
  const map: Record<FeedSort, string> = { recent: 'Recent', trending: 'Trending', popular: 'Popular', unanswered: 'Unanswered' };
  return map[sort] || sort;
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
  if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
  return count.toString();
}

// ─── Trending ───────────────────────────────────────────────

export function extractTrendingTopics(posts: Post[]): TrendingTopic[] {
  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags?.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, postCount: count, trend: 'stable' as const }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 10);
}

// ─── Validation ─────────────────────────────────────────────

export function validatePost(content: string): boolean {
  return content.trim().length >= 10 && content.trim().length <= 5000;
}

// ─── Poll Helpers ───────────────────────────────────────────

export function calculatePollPercentages(options: { votes: number }[]): number[] {
  const total = options.reduce((sum, opt) => sum + opt.votes, 0);
  if (total === 0) return options.map(() => 0);
  return options.map((opt) => Math.round((opt.votes / total) * 100));
}

export function isPollEnded(endsAt: number): boolean {
  return Date.now() > endsAt;
}

