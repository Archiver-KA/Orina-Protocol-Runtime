import { describe, expect, it } from 'vitest';
import { buildEditProfileUpdates } from '@/app/components/profile/edit-profile-modal.utils';
import type { UserProfile } from '@/types/profile';

const baseProfile: UserProfile = {
  id: 'profile-1',
  address: '0x1234567890abcdef1234567890abcdef12345678',
  username: 'legacy_user',
  displayName: 'Legacy User',
  email: 'legacy@example.com',
  bio: 'Legacy bio',
  avatar: 'ipfs://legacy-avatar',
  banner: 'ipfs://legacy-banner',
  stats: {
    assetsOwned: 0,
    totalSpent: 0,
    totalSales: 0,
    totalVolume: 0,
    joinedDate: 0,
    lastActive: 0,
  },
  followers: [],
  following: [],
  badges: [],
  story: {
    draftBlocks: [],
    draftSettings: {
      category: '',
      tags: '',
    },
    publishedBlocks: [],
    publishedSettings: {
      category: '',
      tags: '',
    },
    updatedAt: 0,
  },
  settings: {
    notifications: {
      email: true,
      push: true,
      sales: true,
      offers: true,
      followers: true,
    },
    privacy: {
      showActivity: true,
      showBalance: true,
      showFollowers: true,
    },
    display: {
      theme: 'dark',
      currency: 'ETH',
      language: 'en',
    },
  },
  verified: false,
};

describe('buildEditProfileUpdates', () => {
  it('preserves legacy media URLs when no new uploads are selected', () => {
    const result = buildEditProfileUpdates(
      baseProfile,
      {
        displayName: '  Updated User  ',
        username: ' updated_user ',
        email: '  Updated@Example.com ',
        bio: '  Updated bio  ',
        twitter: ' @updated ',
        discord: '   ',
        telegram: '',
        website: ' https://orina.io ',
      },
      {
        avatarImage: null,
        bannerImage: null,
      },
    );

    expect(result).toMatchObject({
      displayName: 'Updated User',
      username: 'updated_user',
      email: 'updated@example.com',
      bio: 'Updated bio',
      avatarUrl: 'ipfs://legacy-avatar',
      bannerUrl: 'ipfs://legacy-banner',
      socialLinks: {
        twitter: '@updated',
        discord: undefined,
        telegram: undefined,
        website: 'https://orina.io',
      },
    });
  });

  it('prefers uploaded media URLs over existing profile media', () => {
    const result = buildEditProfileUpdates(
      {
        ...baseProfile,
        avatarUrl: 'ipfs://current-avatar-url',
        bannerUrl: 'ipfs://current-banner-url',
      },
      {
        displayName: '',
        username: 'next_user',
        email: '',
        bio: '',
        twitter: '',
        discord: '',
        telegram: '',
        website: '',
      },
      {
        avatarImage: {
          ipfsHash: 'avatar-hash',
          url: 'ipfs://new-avatar',
          fileName: 'avatar.png',
          fileSize: 1,
          mimeType: 'image/png',
        },
        bannerImage: {
          ipfsHash: 'banner-hash',
          url: 'ipfs://new-banner',
          fileName: 'banner.png',
          fileSize: 1,
          mimeType: 'image/png',
        },
      },
    );

    expect(result).toMatchObject({
      displayName: undefined,
      username: 'next_user',
      email: undefined,
      bio: undefined,
      avatarUrl: 'ipfs://new-avatar',
      bannerUrl: 'ipfs://new-banner',
    });
  });
});