import { Review } from '@/types/review';

/**
 * Generate mock reviews for asset
 */
export function generateMockReviews(assetId: string): Review[] {
  const reviews: Review[] = [
    // 5-star reviews
    {
      id: `review_${assetId}_1`,
      assetId,
      userId: 'user_001',
      userName: 'Sarah Johnson',
      userAvatar: 'portrait professional woman',
      rating: 5,
      title: 'Exceptional quality and great investment!',
      content: 'I purchased this asset three months ago and I couldn\'t be happier with my decision. The quality exceeds expectations, and the documentation was thorough. The verification process was smooth, and the seller was very responsive to all my questions. Highly recommend for serious investors looking for premium RWA assets.',
      photos: ['luxury investment property', 'asset documentation certificate'],
      verifiedPurchase: true,
      helpfulCount: 24,
      createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    },
    {
      id: `review_${assetId}_2`,
      assetId,
      userId: 'user_002',
      userName: 'Michael Chen',
      userAvatar: 'portrait professional man asian',
      rating: 5,
      title: 'Perfect for my portfolio',
      content: 'This is exactly what I was looking for to diversify my portfolio. The asset is properly authenticated, and all legal documents are in order. The blockchain integration makes ownership transfer seamless. Very satisfied with this purchase.',
      verifiedPurchase: true,
      helpfulCount: 18,
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    },
    {
      id: `review_${assetId}_3`,
      assetId,
      userId: 'user_003',
      userName: 'Emma Williams',
      userAvatar: 'portrait professional woman blonde',
      rating: 5,
      title: 'Outstanding value',
      content: 'The asset quality is outstanding and the price was very competitive compared to similar offerings. I appreciate the transparency in the listing and the detailed condition report. Would definitely buy from this marketplace again.',
      photos: ['premium quality asset'],
      verifiedPurchase: true,
      helpfulCount: 15,
      createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    },

    // 4-star reviews
    {
      id: `review_${assetId}_4`,
      assetId,
      userId: 'user_004',
      userName: 'David Martinez',
      userAvatar: 'portrait professional man',
      rating: 4,
      title: 'Great asset, minor shipping delay',
      content: 'The asset itself is fantastic and exactly as described. My only minor complaint is that the shipping took a bit longer than expected (about 2 weeks). However, the seller kept me updated throughout the process, and everything arrived in perfect condition. Overall very satisfied.',
      verifiedPurchase: true,
      helpfulCount: 12,
      createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    },
    {
      id: `review_${assetId}_5`,
      assetId,
      userId: 'user_005',
      userName: 'Lisa Anderson',
      userAvatar: 'portrait professional woman brunette',
      rating: 4,
      title: 'Solid investment',
      content: 'Good quality asset with proper documentation. The authentication process was thorough which gave me confidence in the purchase. Would have given 5 stars if the platform interface was a bit more user-friendly, but overall a good experience.',
      verifiedPurchase: true,
      helpfulCount: 9,
      createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    },

    // 3-star review
    {
      id: `review_${assetId}_6`,
      assetId,
      userId: 'user_006',
      userName: 'Robert Taylor',
      userAvatar: 'portrait professional man glasses',
      rating: 3,
      title: 'Decent but has some issues',
      content: 'The asset is okay but not as premium as I expected from the description. There were some minor discrepancies in the condition report. The seller did address my concerns, but I think the price could have been better for what was delivered.',
      verifiedPurchase: true,
      helpfulCount: 6,
      createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    },

    // Recent reviews
    {
      id: `review_${assetId}_7`,
      assetId,
      userId: 'user_007',
      userName: 'Jennifer Lee',
      userAvatar: 'portrait professional woman asian',
      rating: 5,
      title: 'Exceeded my expectations!',
      content: 'Just received my asset last week and I\'m thrilled! The quality is even better than the photos showed. The seller provided excellent customer service and answered all my questions promptly. The smart contract execution was flawless. Definitely recommending this to my friends in crypto.',
      photos: ['premium asset close up', 'asset packaging'],
      verifiedPurchase: true,
      helpfulCount: 3,
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    },
    {
      id: `review_${assetId}_8`,
      assetId,
      userId: 'user_008',
      userName: 'Thomas Brown',
      userAvatar: 'portrait professional man beard',
      rating: 4,
      title: 'Good purchase',
      content: 'Happy with my purchase. The asset is as described and the transaction was smooth. The blockchain verification adds a nice layer of security. Only suggestion would be to improve the customer support response time, but overall positive experience.',
      verifiedPurchase: false,
      helpfulCount: 2,
      createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    },

    // Non-verified review
    {
      id: `review_${assetId}_9`,
      assetId,
      userId: 'user_009',
      userName: 'Amanda White',
      userAvatar: 'portrait professional woman redhead',
      rating: 5,
      title: 'Looks amazing!',
      content: 'I\'ve been researching this asset for months and finally decided to pull the trigger. So glad I did! The photos don\'t do it justice. The craftsmanship and attention to detail are incredible. Can\'t wait to show it off to my colleagues.',
      verifiedPurchase: false,
      helpfulCount: 1,
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    },

    // Another 4-star
    {
      id: `review_${assetId}_10`,
      assetId,
      userId: 'user_010',
      userName: 'Kevin Garcia',
      userAvatar: 'portrait professional man latino',
      rating: 4,
      title: 'Very satisfied',
      content: 'This is my third purchase on this platform and I continue to be impressed. The asset quality is consistently high, and the tokenization process makes ownership transfer so easy. Minor room for improvement in the UI/UX, but the core product is excellent.',
      photos: ['asset overview'],
      verifiedPurchase: true,
      helpfulCount: 7,
      createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    },
  ];

  return reviews;
}

/**
 * Get realistic review templates
 */
export const reviewTemplates = {
  positive: [
    'Exceptional quality and great investment!',
    'Perfect for my portfolio',
    'Outstanding value',
    'Exceeded my expectations!',
    'Highly recommended',
  ],
  neutral: [
    'Good asset, minor issues',
    'Solid investment',
    'Decent purchase',
    'As described',
  ],
  negative: [
    'Not as expected',
    'Had some issues',
    'Could be better',
  ],
};
