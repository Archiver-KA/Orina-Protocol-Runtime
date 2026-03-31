import { useState, useEffect } from 'react';
import { Upload, Twitter, MessageCircle, Send, Globe, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { UserProfile } from '@/types/profile';
import { ImageUpload, UploadedImage } from '@/app/components/image-upload';
import { StudioFieldHint, StudioFieldLabel, StudioInputField, StudioTextareaField } from '@/app/components/ui/studio-form-fields';
import { StudioModalBody, StudioModalCloseButton, StudioModalFooter, StudioModalHeader, StudioModalPanel } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

interface EditProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => void;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [twitter, setTwitter] = useState(profile.socialLinks?.twitter || '');
  const [discord, setDiscord] = useState(profile.socialLinks?.discord || '');
  const [telegram, setTelegram] = useState(profile.socialLinks?.telegram || '');
  const [website, setWebsite] = useState(profile.socialLinks?.website || '');
  const [bannerImage, setBannerImage] = useState<UploadedImage | null>(null);
  const [avatarImage, setAvatarImage] = useState<UploadedImage | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      displayName: displayName.trim() || undefined,
      username: username.trim(),
      email: email.trim().toLowerCase() || undefined,
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

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-form-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-[1] w-full max-w-2xl h-[calc(100dvh-3rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <StudioModalPanel className="studio-form-modal max-w-2xl h-[calc(100dvh-3rem)]">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Header */}
              <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-3 md:pb-4">
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-ui-primary tracking-tight mb-1">Edit Profile</h2>
                    <p className="text-[10px] text-ui-muted uppercase tracking-widest">
                      Update your public profile and social links
                    </p>
                  </div>
                  <StudioModalCloseButton onClick={onClose} />
                </div>
              </StudioModalHeader>

              {/* Scrollable Body */}
              <StudioModalBody
                className="hidden-scrollbar p-6 md:p-8 pt-0 space-y-6"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Banner Upload */}
                <div className="studio-form-surface p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-[20px] backdrop-blur-[8px]">
                  <ImageUpload
                    walletAddress={profile.address}
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
                    hidePlaceholderIcon
                  />
                </div>

                {/* Avatar Upload */}
                <div className="studio-form-surface flex items-center justify-center p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-[20px] backdrop-blur-[8px]">
                  <ImageUpload
                    className="flex w-full max-w-[220px] flex-col items-center"
                    walletAddress={profile.address}
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
                    hidePlaceholderIcon
                  />
                </div>

                {/* Display Name */}
                <div>
                  <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                    Display Name
                  </StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                    className="studio-form-input p-4"
                  />
                  <StudioFieldHint className="text-[10px]">
                    {displayName.length}/50 characters
                  </StudioFieldHint>
                </div>

                {/* Username */}
                <div>
                  <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
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
                    className="studio-form-input py-4"
                  />
                  <StudioFieldHint className="text-[10px]">
                    Letters, numbers, and underscores only
                  </StudioFieldHint>
                </div>

                {/* Email */}
                <div>
                  <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                    Email
                  </StudioFieldLabel>
                  <StudioInputField
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    maxLength={120}
                    leftSlot={<Mail size={16} className="text-ui-secondary" />}
                    className="studio-form-input py-4"
                  />
                  <StudioFieldHint className="text-[10px]">
                    Synced with your Orina profile preferences and shared with Settings.
                  </StudioFieldHint>
                </div>

                {/* Bio */}
                <div>
                  <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                    Bio
                  </StudioFieldLabel>
                  <StudioTextareaField
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={200}
                    rows={4}
                    className="studio-form-input p-4"
                  />
                  <StudioFieldHint className="text-[10px]">
                    {bio.length}/200 characters
                  </StudioFieldHint>
                </div>

                {/* Social Links */}
                <div className="space-y-4 pt-4 border-t border-ui-border-subtle">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                    Social Links
                  </h3>

                  <div>
                    <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                      Twitter
                    </StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="twitter_handle"
                    leftSlot={<Twitter size={16} className="text-ui-secondary" />}
                    className="studio-form-input py-4"
                  />
                  </div>

                  <div>
                    <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                      Discord
                    </StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="https://discord.gg/..."
                    leftSlot={<MessageCircle size={16} className="text-ui-secondary" />}
                    className="studio-form-input py-4"
                  />
                  </div>

                  <div>
                    <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                      Telegram
                    </StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="https://t.me/..."
                    leftSlot={<Send size={16} className="text-ui-secondary" />}
                    className="studio-form-input py-4"
                  />
                  </div>

                  <div>
                    <StudioFieldLabel className="text-ui-muted text-[10px] uppercase tracking-widest font-bold">
                      Website
                    </StudioFieldLabel>
                  <StudioInputField
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    leftSlot={<Globe size={16} className="text-ui-secondary" />}
                    className="studio-form-input py-4"
                  />
                  </div>
                </div>
              </StudioModalBody>

              {/* Footer */}
              <StudioModalFooter className="p-6 md:p-8 pt-0 border-t-0">
                <StudioActionButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                  className="studio-form-secondary flex-1 text-sm font-bold tracking-tight"
                >
                  Cancel
                </StudioActionButton>
                <StudioActionButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1 text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
                  leftIcon={<Upload size={16} />}
                >
                  Save Profile
                </StudioActionButton>
              </StudioModalFooter>
            </form>
          </StudioModalPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
