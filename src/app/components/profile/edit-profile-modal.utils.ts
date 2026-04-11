import type { UploadedImage } from '@/app/components/image-upload';
import type { UserProfile } from '@/types/profile';

export interface EditProfileFormValues {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  twitter: string;
  discord: string;
  telegram: string;
  website: string;
}

export interface EditProfileMediaState {
  avatarImage: UploadedImage | null;
  bannerImage: UploadedImage | null;
}

export function buildEditProfileUpdates(
  profile: UserProfile,
  formValues: EditProfileFormValues,
  mediaState: EditProfileMediaState,
): Partial<UserProfile> {
  const avatarUrl = mediaState.avatarImage?.url || profile.avatarUrl || profile.avatar;
  const bannerUrl = mediaState.bannerImage?.url || profile.bannerUrl || profile.banner;

  return {
    displayName: formValues.displayName.trim() || undefined,
    username: formValues.username.trim(),
    email: formValues.email.trim().toLowerCase() || undefined,
    bio: formValues.bio.trim() || undefined,
    avatarUrl: avatarUrl || undefined,
    bannerUrl: bannerUrl || undefined,
    socialLinks: {
      twitter: formValues.twitter.trim() || undefined,
      discord: formValues.discord.trim() || undefined,
      telegram: formValues.telegram.trim() || undefined,
      website: formValues.website.trim() || undefined,
    },
  };
}