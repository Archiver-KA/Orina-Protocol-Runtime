import { useState, useEffect } from 'react';
import { X, Upload, Link as LinkIcon } from 'lucide-react';
import { UserProfile } from '@/types/profile';
import { ImageUpload, UploadedImage } from '@/app/components/image-upload';
import { StudioFieldHint, StudioFieldLabel, StudioInputField, StudioTextareaField } from '@/app/components/ui/studio-form-fields';
import { StudioModalBackdrop, StudioModalBody, StudioModalFooter, StudioModalHeader, StudioModalPanel, StudioModalShell } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => void;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [twitter, setTwitter] = useState(profile.socialLinks?.twitter || '');
  const [discord, setDiscord] = useState(profile.socialLinks?.discord || '');
  const [telegram, setTelegram] = useState(profile.socialLinks?.telegram || '');
  const [website, setWebsite] = useState(profile.socialLinks?.website || '');
  const [bannerImage, setBannerImage] = useState<UploadedImage | null>(null);
  const [avatarImage, setAvatarImage] = useState<UploadedImage | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      displayName: displayName.trim() || undefined,
      username: username.trim(),
      bio: bio.trim() || undefined,
      // Include IPFS uploaded images
      avatarUrl: avatarImage?.url || profile.avatarUrl,
      bannerUrl: bannerImage?.url || profile.bannerUrl,
      socialLinks: {
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
        telegram: telegram.trim() || undefined,
        website: website.trim() || undefined,
      },
    });
  };

  return (
    <StudioModalShell className="z-50 p-4 md:p-6">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out, zoom-in-95 0.3s ease-out;
        }
      `}</style>

      {/* Backdrop Overlay */}
      <StudioModalBackdrop onBackdropClick={onClose} />

      {/* Modal Container */}
      <StudioModalPanel className="relative max-w-2xl h-[90vh] bg-[#0f0f11] rounded-xl animate-in">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <StudioModalHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <StudioActionButton
                  type="button"
                  onClick={onClose}
                  size="icon"
                  variant="secondary"
                  className="bg-zinc-900/50"
                >
                  <X className="text-zinc-400" size={20} />
                </StudioActionButton>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">Edit Profile</h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    Update Your Information
                  </p>
                </div>
              </div>
            </div>
          </StudioModalHeader>

          {/* Scrollable Body */}
          <StudioModalBody className="hidden-scrollbar p-6 md:p-8 space-y-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Banner Upload */}
            <div>
              <ImageUpload
                variant="banner"
                onUploadSuccess={(image) => {
                  setBannerImage(image);
                  console.log('Banner uploaded to IPFS:', image);
                }}
                onUploadError={(error) => {
                  console.error('Banner upload error:', error);
                }}
                currentImageUrl={bannerImage?.url || profile.bannerUrl}
                label="Profile Banner"
                description="Recommended: 1500x500px"
                showPreview={true}
              />
            </div>

            {/* Avatar Upload */}
            <div>
              <ImageUpload
                variant="avatar"
                onUploadSuccess={(image) => {
                  setAvatarImage(image);
                  console.log('Avatar uploaded to IPFS:', image);
                }}
                onUploadError={(error) => {
                  console.error('Avatar upload error:', error);
                }}
                currentImageUrl={avatarImage?.url || profile.avatarUrl}
                label="Profile Picture"
                description="Recommended: 400x400px"
                showPreview={true}
              />
            </div>

            {/* Display Name */}
            <div>
              <StudioFieldLabel>
                Display Name
              </StudioFieldLabel>
              <StudioInputField
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                className="px-4 py-3"
              />
              <StudioFieldHint className="text-[10px]">
                {displayName.length}/50 characters
              </StudioFieldHint>
            </div>

            {/* Username */}
            <div>
              <StudioFieldLabel>
                Username
              </StudioFieldLabel>
              <StudioInputField
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                maxLength={30}
                required
                leftSlot={<span>@</span>}
                className="py-3"
              />
              <StudioFieldHint className="text-[10px]">
                Letters, numbers, and underscores only
              </StudioFieldHint>
            </div>

            {/* Bio */}
            <div>
              <StudioFieldLabel>
                Bio
              </StudioFieldLabel>
              <StudioTextareaField
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={200}
                rows={4}
                className="px-4 py-3"
              />
              <StudioFieldHint className="text-[10px]">
                {bio.length}/200 characters
              </StudioFieldHint>
            </div>

            {/* Social Links */}
            <div className="space-y-4 pt-4 border-t border-[#27272a]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Social Links
              </h3>

              {/* Twitter */}
              <div>
                <StudioFieldLabel className="text-zinc-500 font-normal tracking-wider">Twitter</StudioFieldLabel>
                <StudioInputField
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="twitter_handle"
                  leftSlot={<LinkIcon size={16} />}
                  className="py-3"
                />
              </div>

              {/* Discord */}
              <div>
                <StudioFieldLabel className="text-zinc-500 font-normal tracking-wider">Discord</StudioFieldLabel>
                <StudioInputField
                  type="text"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="https://discord.gg/..."
                  leftSlot={<LinkIcon size={16} />}
                  className="py-3"
                />
              </div>

              {/* Telegram */}
              <div>
                <StudioFieldLabel className="text-zinc-500 font-normal tracking-wider">Telegram</StudioFieldLabel>
                <StudioInputField
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/..."
                  leftSlot={<LinkIcon size={16} />}
                  className="py-3"
                />
              </div>

              {/* Website */}
              <div>
                <StudioFieldLabel className="text-zinc-500 font-normal tracking-wider">Website</StudioFieldLabel>
                <StudioInputField
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  leftSlot={<LinkIcon size={16} />}
                  className="py-3"
                />
              </div>
            </div>
          </StudioModalBody>

          {/* Footer - Fixed at bottom */}
          <StudioModalFooter className="justify-end bg-zinc-900/30 flex-shrink-0">
            <StudioActionButton
              type="button"
              onClick={onClose}
              variant="secondary"
              size="lg"
              className="bg-zinc-900/50"
            >
              Cancel
            </StudioActionButton>
            <StudioActionButton
              type="submit"
              variant="primary"
              size="lg"
              className="shadow-lg shadow-[#2CC295]/20"
              leftIcon={<Upload size={16} />}
            >
              Save Changes
            </StudioActionButton>
          </StudioModalFooter>
        </form>
      </StudioModalPanel>
    </StudioModalShell>
  );
}
