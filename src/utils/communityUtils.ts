import { Post, Comment, UserAction, FeedFilter, FeedSort, PostType, TrendingTopic } from '@/types/community';
import { isGuestModeForced } from '@/utils/guestMode';
import {
  dispatchSyncEvent,
  encodeEq,
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

// ─── Storage Keys ───────────────────────────────────────────
const POSTS_KEY = 'studio_community_posts';
const COMMENTS_KEY = 'studio_community_comments';
const USER_ACTIONS_KEY = 'studio_user_actions';
const INIT_FLAG_KEY = 'studio_community_initialized_v2';
const COMMUNITY_SYNC_EVENT = 'orina:community-changed';
const COMMUNITY_POSTS_HYDRATE_IN_FLIGHT = new Set<string>();
const COMMUNITY_COMMENTS_HYDRATE_IN_FLIGHT = new Set<string>();
const COMMUNITY_POST_SYNC_TIMERS = new Map<string, number>();
const COMMUNITY_COMMENT_SYNC_TIMERS = new Map<string, number>();

// ─── Address Normalization ──────────────────────────────────
function normalizeAddress(address: string): string {
  return address.toLowerCase();
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

function queueCommunitySync(map: Map<string, number>, key: string, job: () => void): void {
  if (typeof window === 'undefined') return;
  const prev = map.get(key);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    map.delete(key);
    job();
  }, 250);
  map.set(key, timer);
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
  return {
    id: clientId,
    type: (metadata.type as PostType) || 'discussion',
    userId: metadata.userId || metadata.walletAddress || row.author_user_id,
    userName: metadata.userName || 'Community Member',
    userAvatar: metadata.userAvatar || undefined,
    userRole: metadata.userRole || null,
    walletAddress: metadata.walletAddress || undefined,
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
  };
}

function mapDbCommentToLocal(row: DbCommunityCommentRow, postClientId: string): Comment {
  const metadata = row.metadata || {};
  return {
    id: metadata.clientId || row.id,
    postId: postClientId,
    userId: metadata.userId || metadata.walletAddress || row.author_user_id,
    userName: metadata.userName || 'Community Member',
    userAvatar: metadata.userAvatar || undefined,
    walletAddress: metadata.walletAddress || undefined,
    content: row.content || '',
    likeCount: Number(metadata.likeCount || 0),
    replyCount: Number(metadata.replyCount || 0),
    parentId: metadata.parentClientId || undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
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
    localStorage.setItem(POSTS_KEY, JSON.stringify(mapped));
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
    const all = loadAllComments().filter((c) => c.postId !== clientPostId);
    const mapped = rows.map((row) => {
      const localComment = mapDbCommentToLocal(row, clientPostId);
      setLocalSupabaseId('community_comment', commentMapKey(localComment.id), row.id);
      return localComment;
    });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify([...all, ...mapped]));
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
  if (!isSupabaseRestEnabled()) return;
  if (!['like', 'bookmark'].includes(action.action)) return;
  const userId = getCachedRemoteProfileId(action.userId) || await ensureRemoteProfileIdForWallet(action.userId);
  const targetDbId = getLocalSupabaseId('community_post', postMapKey(action.postId));
  if (!userId || !targetDbId) return;
  const reactionType = action.action;
  try {
    if (added) {
      await restUpsert(
        'community_reactions',
        [{
          user_id: userId,
          target_type: 'post',
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
          target_type: encodeEq('post'),
          target_id: encodeEq(targetDbId),
          reaction_type: encodeEq(reactionType),
        })
      );
    }
  } catch (error) {
    console.debug('[Community] Supabase reaction sync skipped:', error);
  }
}

/**
 * Check if a post belongs to the given wallet address
 */
export function isPostOwner(post: Post, walletAddress?: string): boolean {
  if (!walletAddress || !post.walletAddress) return false;
  return normalizeAddress(post.walletAddress) === normalizeAddress(walletAddress);
}

// ─── Posts CRUD ─────────────────────────────────────────────

/**
 * Load all posts from localStorage — NEVER returns undefined
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
    void hydratePostsFromSupabase();
    return parsed;
  } catch (error) {
    console.error('[Community] Failed to load posts:', error);
    return [];
  }
}

/**
 * Save a single post (insert or update)
 */
export function savePost(post: Post): void {
  try {
    if (shouldBlockGuestCommunityWrite('savePost')) return;
    const posts = loadAllPosts();
    const existingIndex = posts.findIndex((p) => p.id === post.id);

    if (existingIndex !== -1) {
      posts[existingIndex] = post;
    } else {
      posts.unshift(post);
    }

    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
    queueCommunitySync(COMMUNITY_POST_SYNC_TIMERS, post.id, () => { void syncPostToSupabase(post); });
  } catch (error) {
    console.error('[Community] Failed to save post:', error);
  }
}

/**
 * Bulk save posts (overwrite entire storage)
 */
export function saveAllPosts(posts: Post[]): void {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
    posts.filter((p) => !p.isMock).forEach((post) => {
      queueCommunitySync(COMMUNITY_POST_SYNC_TIMERS, post.id, () => { void syncPostToSupabase(post); });
    });
  } catch (error) {
    console.error('[Community] Failed to save all posts:', error);
  }
}

/**
 * Delete a post and its associated comments
 */
export function deletePost(postId: string): void {
  try {
    if (shouldBlockGuestCommunityWrite('deletePost')) return;
    const posts = loadAllPosts();
    const filtered = posts.filter((p) => p.id !== postId);
    localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
    
    // Delete associated comments
    deleteCommentsByPost(postId);
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
    void syncDeletePostToSupabase(postId);
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
    return Array.isArray(parsed) ? parsed : [];
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

export function saveComment(comment: Comment): void {
  try {
    if (shouldBlockGuestCommunityWrite('saveComment')) return;
    const comments = loadAllComments();
    const existingIndex = comments.findIndex((c) => c.id === comment.id);
    if (existingIndex !== -1) {
      comments[existingIndex] = comment;
    } else {
      comments.push(comment);
    }
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
    queueCommunitySync(COMMUNITY_COMMENT_SYNC_TIMERS, comment.id, () => { void syncCommentToSupabase(comment); });
  } catch (error) {
    console.error('[Community] Failed to save comment:', error);
  }
}

export function deleteComment(commentId: string): void {
  try {
    if (shouldBlockGuestCommunityWrite('deleteComment')) return;
    const comments = loadAllComments();
    // Also delete all child replies of this comment
    const idsToDelete = new Set<string>([commentId]);
    // Recursively find all descendants
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
    const filtered = comments.filter((c) => !idsToDelete.has(c.id));
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(filtered));
    dispatchSyncEvent(COMMUNITY_SYNC_EVENT);
    idsToDelete.forEach((id) => { void syncDeleteCommentToSupabase(id); });
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
    return Array.isArray(parsed) ? parsed : [];
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
export function saveUserAction(action: UserAction): boolean {
  try {
    if (shouldBlockGuestCommunityWrite('saveUserAction')) return false;
    const actions = allActions();
    const normUserId = normalizeAddress(action.userId);

    const existingIndex = actions.findIndex(
      (a) =>
        normalizeAddress(a.userId) === normUserId &&
        a.postId === action.postId &&
        a.action === action.action &&
        a.pollOptionId === action.pollOptionId
    );

    if (existingIndex !== -1) {
      actions.splice(existingIndex, 1);
      localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));
      if (!isGuestModeForced()) {
        void syncReactionToSupabase(action, false);
      }
      return false; // removed
    } else {
      actions.push({ ...action, userId: normUserId });
      localStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));
      if (!isGuestModeForced()) {
        void syncReactionToSupabase({ ...action, userId: normUserId }, true);
      }
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

export function incrementPostCount(postId: string, field: 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount' | 'viewCount'): void {
  if (shouldBlockGuestCommunityWrite('incrementPostCount')) return;
  const posts = loadAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (post) {
    post[field]++;
    saveAllPosts(posts);
  }
}

export function decrementPostCount(postId: string, field: 'likeCount' | 'commentCount' | 'shareCount' | 'bookmarkCount'): void {
  if (shouldBlockGuestCommunityWrite('decrementPostCount')) return;
  const posts = loadAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (post && post[field] > 0) {
    post[field]--;
    saveAllPosts(posts);
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
    default:
      return posts;
  }
}

export function sortPosts(posts: Post[], sort: FeedSort): Post[] {
  const pinned = posts.filter((p) => p.isPinned);
  const unpinned = posts.filter((p) => !p.isPinned);
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

// ─── Initialization ─────────────────────────────────────────

/**
 * Idempotently seed mock data. Returns true if seeding happened.
 * Only seeds if the init flag is missing AND no user-created posts exist.
 */
export function ensureMockData(): boolean {
  const alreadyInit = localStorage.getItem(INIT_FLAG_KEY);
  if (alreadyInit) return false;

  const existing = loadAllPosts();
  // If there are already user-created posts, mark as initialized and skip
  const hasUserPosts = existing.some((p) => !p.isMock);
  if (hasUserPosts && existing.length > 0) {
    localStorage.setItem(INIT_FLAG_KEY, 'true');
    return false;
  }

  // Remove any leftover mock posts and re-seed cleanly
  const userPosts = existing.filter((p) => !p.isMock);
  const freshMock = generateMockPosts();
  saveAllPosts([...freshMock, ...userPosts]);
  localStorage.setItem(INIT_FLAG_KEY, 'true');
  console.log('[Community] Mock data seeded');
  return true;
}

// ─── Mock Data ──────────────────────────────────────────────

export function generateMockPosts(): Post[] {
  const now = Date.now();
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;

  const mockUsers = [
    { id: 'user_alice', name: 'Alice Johnson', role: 'Verified Creator', wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' },
    { id: 'user_bob', name: 'Bob Smith', role: 'Community Moderator', wallet: '0x8B7F0977Bb4f0fE84b7f0aC0e7a4e1b7c5e6d8f9' },
    { id: 'user_carol', name: 'Carol Williams', role: 'Top Contributor', wallet: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' },
    { id: 'user_dave', name: 'Dave Brown', role: 'Early Adopter', wallet: '0x9f8e7d6c5b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d' },
    { id: 'user_eve', name: 'Eve Davis', role: 'Community Member', wallet: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0' },
  ];

  return [
    {
      id: 'mock_post_1',
      type: 'announcement',
      userId: mockUsers[1].id,
      userName: mockUsers[1].name,
      userRole: mockUsers[1].role,
      walletAddress: mockUsers[1].wallet,
      content: 'Exciting news! Orina v2.0 is now live with enhanced IPFS integration, improved analytics dashboard, and brand new community features. Check out the changelog for all the details!',
      tags: ['announcement', 'update', 'v2'],
      likeCount: 142,
      commentCount: 28,
      shareCount: 45,
      bookmarkCount: 67,
      viewCount: 3420,
      isPinned: true,
      isEdited: false,
      isMock: true,
      createdAt: now - oneHour * 2,
    },
    {
      id: 'mock_post_2',
      type: 'discussion',
      userId: mockUsers[0].id,
      userName: mockUsers[0].name,
      userRole: mockUsers[0].role,
      walletAddress: mockUsers[0].wallet,
      content: "What are your thoughts on the future of RWA tokenization? I believe we're just scratching the surface of what's possible with real-world assets on blockchain. The potential for democratizing access to traditionally illiquid assets is incredible.",
      tags: ['rwa', 'tokenization', 'discussion'],
      likeCount: 89,
      commentCount: 34,
      shareCount: 12,
      bookmarkCount: 23,
      viewCount: 1890,
      isPinned: false,
      isEdited: false,
      isMock: true,
      createdAt: now - oneHour * 5,
    },
    {
      id: 'mock_post_3',
      type: 'question',
      userId: mockUsers[2].id,
      userName: mockUsers[2].name,
      userRole: mockUsers[2].role,
      walletAddress: mockUsers[2].wallet,
      content: "How do I upload large files (>100MB) to IPFS using the Orina platform? I've been trying to upload my 3D model collection but keep running into timeout issues. Any suggestions?",
      tags: ['help', 'ipfs', 'upload'],
      likeCount: 45,
      commentCount: 15,
      shareCount: 3,
      bookmarkCount: 12,
      viewCount: 876,
      isPinned: false,
      isEdited: false,
      isMock: true,
      createdAt: now - oneHour * 8,
    },
    {
      id: 'mock_post_4',
      type: 'achievement',
      userId: mockUsers[3].id,
      userName: mockUsers[3].name,
      userRole: mockUsers[3].role,
      walletAddress: mockUsers[3].wallet,
      content: "Just hit 10,000 sales on my digital art collection! Thank you to everyone in this amazing community for the support. Couldn't have done it without you all!",
      tags: ['milestone', 'achievement', 'digitalart'],
      likeCount: 256,
      commentCount: 78,
      shareCount: 34,
      bookmarkCount: 45,
      viewCount: 5240,
      isPinned: false,
      isEdited: false,
      isMock: true,
      createdAt: now - oneDay * 1,
    },
    {
      id: 'mock_post_5',
      type: 'discussion',
      userId: mockUsers[4].id,
      userName: mockUsers[4].name,
      userRole: mockUsers[4].role,
      walletAddress: mockUsers[4].wallet,
      content: "Looking for feedback on my new NFT collection before launch. Would love to hear what the community thinks about the concept and pricing strategy. Drop your thoughts below!",
      tags: ['feedback', 'nft', 'community'],
      likeCount: 67,
      commentCount: 42,
      shareCount: 8,
      bookmarkCount: 19,
      viewCount: 1450,
      isPinned: false,
      isEdited: true,
      isMock: true,
      createdAt: now - oneDay * 2,
    },
  ];
}

export function generateMockComments(postId: string, count: number = 3): Comment[] {
  const now = Date.now();
  const oneHour = 1000 * 60 * 60;

  const mockUsers = [
    { id: 'user_frank', name: 'Frank Wilson' },
    { id: 'user_grace', name: 'Grace Martinez' },
    { id: 'user_henry', name: 'Henry Taylor' },
    { id: 'user_iris', name: 'Iris Anderson' },
    { id: 'user_jack', name: 'Jack Thompson' },
  ];

  const texts = [
    'Great post! This is exactly what I was looking for. Thanks for sharing!',
    "Really insightful perspective. I hadn't thought about it that way before.",
    "Could you elaborate more on this? I'd love to learn more details.",
    'Amazing work! Keep it up!',
    'I have a different opinion on this, but I respect your viewpoint.',
    'This helped me solve my problem. Much appreciated!',
    'Totally agree with you on this one. Well said!',
    'Interesting take. Would love to discuss this further.',
  ];

  const comments: Comment[] = [];
  for (let i = 0; i < count; i++) {
    const user = mockUsers[i % mockUsers.length];
    comments.push({
      id: `mock_comment_${postId}_${i}`,
      postId,
      userId: user.id,
      userName: user.name,
      content: texts[i % texts.length],
      likeCount: Math.floor(Math.random() * 20),
      replyCount: Math.floor(Math.random() * 5),
      createdAt: now - oneHour * (i + 1),
    });
  }
  return comments;
}
