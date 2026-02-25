import { Post, Comment, PostType } from '@/types/community';

/**
 * Image pool for posts
 */
const postImages = {
  blockchain: [
    'https://images.unsplash.com/photo-1630815006371-03023f315214?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBibG9ja2NoYWluJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzA0OTMwNDB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1765258923753-1c1dd0fc3b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwbmV0d29yayUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzcwMzgzMTgzfDA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  crypto: [
    'https://images.unsplash.com/photo-1639825752750-5061ded5503b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcnlwdG9jdXJyZW5jeSUyMHRyYWRpbmclMjBjaGFydHxlbnwxfHx8fDE3NzAzNzg4Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1768839724256-28cd4a373209?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNpYWwlMjBkYXRhJTIwdmlzdWFsaXphdGlvbnxlbnwxfHx8fDE3NzA0MzQ2NDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  realEstate: [
    'https://images.unsplash.com/photo-1612301988752-5a5b19021f45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZWFsJTIwZXN0YXRlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3MDQzMDcwOHww&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1753932917352-8686d6c85646?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxza3lzY3JhcGVyJTIwYnVpbGRpbmclMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzcwNDkzMDQyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  tokenization: [
    'https://images.unsplash.com/photo-1642432556591-72cbc671b707?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdG9rZW5pemF0aW9uJTIwYWJzdHJhY3R8ZW58MXx8fHwxNzcwNDkzMDQxfDA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  luxury: [
    'https://images.unsplash.com/photo-1759910546811-8d9df1501688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMGNvbGxlY3Rpb258ZW58MXx8fHwxNzcwNDkzMDQ0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1723974591057-ccadada1f283?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcnQlMjBnYWxsZXJ5fGVufDF8fHx8MTc3MDQ4ODkyM3ww&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  achievement: [
    'https://images.unsplash.com/photo-1643616802160-bcca2171c24a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwY2VydGlmaWNhdGUlMjBhY2hpZXZlbWVudHxlbnwxfHx8fDE3NzA0OTMwNDJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    'https://images.unsplash.com/photo-1758599543110-f9cf3903a2ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwY2VsZWJyYXRpb24lMjBidXNpbmVzc3xlbnwxfHx8fDE3NzA0OTMwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
  workspace: [
    'https://images.unsplash.com/photo-1718220216044-006f43e3a9b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzcwNDY1MjQ1fDA&ixlib=rb-4.1.0&q=80&w=1080',
  ],
};

const userNames = [
  'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
  'Ethan Hunt', 'Fiona Green', 'George Wilson', 'Hannah Lee',
  'Isaac Newton', 'Julia Roberts', 'Kevin Hart', 'Laura Palmer',
  'Michael Scott', 'Nina Williams', 'Oscar Wilde', 'Patricia Moore',
];

const userRoles: Array<'verified' | 'moderator' | 'admin' | null> = [
  'verified', 'verified', null, 'verified',
  'moderator', null, 'verified', null,
  'admin', 'verified', null, 'verified',
  'moderator', null, 'verified', null,
];

const discussionTopics = [
  {
    content: 'What are your thoughts on the recent growth in RWA tokenization? I\'ve been following this space for a while and it seems like we\'re reaching a tipping point.',
    tags: ['rwa', 'tokenization', 'trends'],
  },
  {
    content: 'Just completed my first RWA asset purchase on this platform! The process was surprisingly smooth. Has anyone else had similar experiences?',
    tags: ['experience', 'testimonial'],
  },
  {
    content: 'Looking at the real estate sector - what regions do you think will see the most tokenization activity in 2026?',
    tags: ['real-estate', 'predictions'],
  },
  {
    content: 'The integration between traditional finance and DeFi through RWAs is fascinating. What challenges do you see ahead?',
    tags: ['defi', 'traditional-finance'],
  },
];

const questionTopics = [
  {
    content: 'How do I verify the authenticity of a tokenized real estate asset? What documentation should I look for?',
    tags: ['verification', 'real-estate', 'help'],
  },
  {
    content: 'Can someone explain the difference between fractional ownership and full asset tokenization?',
    tags: ['education', 'basics'],
  },
  {
    content: 'What are the tax implications of buying and selling RWA tokens in different jurisdictions?',
    tags: ['tax', 'legal', 'compliance'],
  },
  {
    content: 'Has anyone successfully transferred their RWA tokens to a hardware wallet? Which ones are compatible?',
    tags: ['security', 'wallets', 'technical'],
  },
];

const announcementTopics = [
  {
    content: '🎉 Platform Update: We\'ve just launched our new mobile app for iOS and Android! Download now and manage your RWA portfolio on the go.',
    tags: ['announcement', 'mobile', 'update'],
  },
  {
    content: '📢 New Asset Category: Luxury Collectibles are now available for tokenization! Explore watches, art, and rare items.',
    tags: ['announcement', 'new-category', 'luxury'],
  },
  {
    content: '⚠️ Scheduled Maintenance: The platform will undergo maintenance on Feb 5th from 2-4 AM UTC. Plan accordingly.',
    tags: ['maintenance', 'announcement'],
  },
];

const achievementTopics = [
  {
    content: '🏆 Just reached my 10th successful RWA transaction! This platform has been amazing for diversifying my portfolio.',
    tags: ['milestone', 'achievement'],
  },
  {
    content: '🎯 Portfolio Update: My RWA investments have grown 45% this quarter. Here\'s my strategy...',
    tags: ['success', 'portfolio', 'strategy'],
  },
  {
    content: '💎 Earned "Diamond Trader" badge after completing 50 verified transactions! The journey has been incredible.',
    tags: ['badge', 'achievement', 'trading'],
  },
];

const comments = [
  'Great post! I completely agree with your perspective.',
  'This is really interesting. Can you share more details?',
  'Thanks for sharing this insight!',
  'I had a similar experience. The platform is really well-designed.',
  'Bookmarked for future reference. Very helpful!',
  'Could you elaborate on this point? I\'d love to learn more.',
  'This is exactly what I was looking for. Thank you!',
  'Interesting take. Have you considered the alternative approach?',
  'Very informative post. Appreciate the detailed explanation.',
  'I\'m new to this space and this helps a lot!',
];

/**
 * Generate random post ID
 */
function generatePostId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random comment ID
 */
function generateCommentId(): string {
  return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get random item from array
 */
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random user data
 */
function getRandomUser(index: number) {
  return {
    userId: `user_${index + 1}`,
    userName: userNames[index % userNames.length],
    userRole: userRoles[index % userRoles.length],
  };
}

/**
 * Generate mock post
 */
function generateMockPost(type: PostType, index: number): Post {
  const user = getRandomUser(index);
  const now = Date.now();
  const createdAt = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last 7 days
  
  let content = '';
  let tags: string[] = [];
  let poll = undefined;
  let images: string[] | undefined = undefined;
  
  switch (type) {
    case 'discussion':
      const discussion = getRandomItem(discussionTopics);
      content = discussion.content;
      tags = discussion.tags;
      // 40% chance of having images
      if (Math.random() > 0.6) {
        // Select images based on tags
        if (tags.includes('rwa') || tags.includes('tokenization')) {
          images = [getRandomItem(postImages.blockchain), getRandomItem(postImages.tokenization)];
        } else if (tags.includes('real-estate')) {
          images = [getRandomItem(postImages.realEstate)];
        } else if (tags.includes('defi')) {
          images = [getRandomItem(postImages.crypto), getRandomItem(postImages.blockchain)];
        } else {
          images = [getRandomItem(postImages.crypto)];
        }
        // Randomly use 1 or 2 images
        if (Math.random() > 0.5) {
          images = [images[0]];
        }
      }
      break;
      
    case 'question':
      const question = getRandomItem(questionTopics);
      content = question.content;
      tags = question.tags;
      // 20% chance of having images for questions
      if (Math.random() > 0.8) {
        if (tags.includes('real-estate')) {
          images = [getRandomItem(postImages.realEstate)];
        } else {
          images = [getRandomItem(postImages.workspace)];
        }
      }
      break;
      
    case 'announcement':
      const announcement = getRandomItem(announcementTopics);
      content = announcement.content;
      tags = announcement.tags;
      // 50% chance of having images for announcements
      if (Math.random() > 0.5) {
        if (tags.includes('luxury')) {
          images = [getRandomItem(postImages.luxury), getRandomItem(postImages.luxury)];
        } else {
          images = [getRandomItem(postImages.blockchain)];
        }
      }
      break;
      
    case 'achievement':
      const achievement = getRandomItem(achievementTopics);
      content = achievement.content;
      tags = achievement.tags;
      // 60% chance of having images for achievements
      if (Math.random() > 0.4) {
        if (tags.includes('portfolio') || tags.includes('strategy')) {
          images = [getRandomItem(postImages.crypto), getRandomItem(postImages.achievement)];
        } else {
          images = [getRandomItem(postImages.achievement)];
        }
      }
      break;
  }
  
  // 20% chance of having a poll for discussions
  if (type === 'discussion' && Math.random() > 0.8) {
    const pollOptions = [
      'Strongly Agree',
      'Agree',
      'Neutral',
      'Disagree',
    ].map((text, i) => ({
      id: `option_${i}`,
      text,
      votes: Math.floor(Math.random() * 50),
      percentage: 0, // Will be calculated
    }));
    
    const totalVotes = pollOptions.reduce((sum, opt) => sum + opt.votes, 0);
    pollOptions.forEach((opt) => {
      opt.percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
    });
    
    poll = {
      id: `poll_${index}`,
      question: 'What do you think about this topic?',
      options: pollOptions,
      totalVotes,
      endsAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      multipleChoice: false,
    };
  }
  
  return {
    id: generatePostId(),
    type,
    ...user,
    content,
    images,
    poll,
    tags,
    likeCount: Math.floor(Math.random() * 100),
    commentCount: Math.floor(Math.random() * 30),
    shareCount: Math.floor(Math.random() * 20),
    bookmarkCount: Math.floor(Math.random() * 40),
    viewCount: Math.floor(Math.random() * 500) + 100,
    isPinned: index === 0 && type === 'announcement', // Pin first announcement
    isEdited: Math.random() > 0.9,
    createdAt,
  };
}

/**
 * Generate mock posts
 */
export function generateMockPosts(): Post[] {
  const posts: Post[] = [];
  
  // Generate 20 posts with varied types
  const types: PostType[] = ['discussion', 'question', 'announcement', 'achievement'];
  
  for (let i = 0; i < 20; i++) {
    const type = types[i % types.length];
    posts.push(generateMockPost(type, i));
  }
  
  // Sort by creation date (newest first)
  return posts.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Generate mock comments for a post
 */
export function generateMockComments(postId: string, count: number = 5): Comment[] {
  const mockComments: Comment[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const user = getRandomUser(i);
    mockComments.push({
      id: generateCommentId(),
      postId,
      ...user,
      content: getRandomItem(comments),
      likeCount: Math.floor(Math.random() * 20),
      replyCount: Math.floor(Math.random() * 5),
      createdAt: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
    });
  }
  
  return mockComments.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all available tags
 */
export function getAllTags(): string[] {
  return [
    'rwa',
    'tokenization',
    'real-estate',
    'defi',
    'trading',
    'education',
    'security',
    'legal',
    'tax',
    'strategy',
    'portfolio',
    'luxury',
    'collectibles',
    'announcement',
    'help',
    'technical',
  ];
}