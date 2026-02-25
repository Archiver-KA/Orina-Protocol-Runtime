export type PostType = 'discussion' | 'question' | 'announcement' | 'achievement';

export interface Post {
  id: string;
  type: PostType;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string | null;
  walletAddress?: string;
  content: string;
  images?: string[];
  poll?: Poll;
  tags?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  viewCount: number;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: number;
  updatedAt?: number;
  /** Flag to distinguish mock vs user-created posts */
  isMock?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  endsAt: number;
  multipleChoice: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  walletAddress?: string;
  content: string;
  likeCount: number;
  replyCount: number;
  parentId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface UserAction {
  userId: string;
  postId: string;
  action: 'like' | 'bookmark' | 'vote';
  timestamp: number;
  pollOptionId?: string;
}

export type FeedFilter = 'all' | 'following' | 'discussions' | 'questions' | 'announcements' | 'achievements' | 'my-posts' | 'my-saved';

export type FeedSort = 'recent' | 'trending' | 'popular' | 'unanswered';

export interface CreatePostData {
  type: PostType;
  content: string;
  images?: string[];
  poll?: {
    question: string;
    options: string[];
    endsAt: number;
    multipleChoice: boolean;
  };
  tags?: string[];
}

export interface TrendingTopic {
  tag: string;
  postCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CommunityStats {
  totalPosts: number;
  totalUsers: number;
  activeToday: number;
  totalComments: number;
}
