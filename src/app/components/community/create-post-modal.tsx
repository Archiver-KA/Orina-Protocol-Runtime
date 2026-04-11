import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, BarChart3, Type, MessageSquare, Megaphone, Trophy, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';

import { PostType, CreatePostData } from '@/types/community';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { CustomDropdown } from '@/app/components/custom-dropdown';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostData) => boolean | void | Promise<boolean | void>;
  userId: string;
  userName: string;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, userId, userName }: CreatePostModalProps) {
  const { address } = useEffectiveViewer();
  const [selectedType, setSelectedType] = useState<PostType>('discussion');
  const [content, setContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const postTypes: Array<{ type: PostType; label: string; icon: any; description: string }> = [
    { type: 'discussion', label: 'Discussion', icon: MessageSquare, description: 'Start a conversation' },
    { type: 'question', label: 'Question', icon: MessageSquare, description: 'Ask the community' },
    { type: 'announcement', label: 'Announcement', icon: Megaphone, description: 'Share news' },
    { type: 'achievement', label: 'Achievement', icon: Trophy, description: 'Celebrate success' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (content.trim().length < 10) {
      toast.error('Post content must be at least 10 characters');
      return;
    }

    const postData: CreatePostData = {
      type: selectedType,
      content: content.trim(),
      images: uploadedImages.length > 0 ? uploadedImages.map((img) => img.url) : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (showPoll && pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) {
      postData.poll = {
        question: pollQuestion.trim(),
        options: pollOptions.filter((o) => o.trim()),
        endsAt: Date.now() + pollDuration * 24 * 60 * 60 * 1000,
        multipleChoice: false,
      };
    }

    let shouldClose = false;
    try {
      setIsSubmitting(true);
      const result = await onSubmit(postData);
      shouldClose = result !== false;
    } catch (error) {
      console.error('[Community] Create post modal submit failed:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to create post right now.');
    } finally {
      setIsSubmitting(false);
      if (shouldClose) {
        handleClose(true);
      }
    }
  };

  const handleClose = (force = false) => {
    if (isSubmitting && !force) return;
    setContent('');
    setUploadedImages([]);
    setTags([]);
    setTagInput('');
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollDuration(7);
    setSelectedType('discussion');
    onClose();
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const sectionShellClass = 'studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-6';
  const insetShellClass = 'studio-portal-subsurface rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]';
  const inputClass = 'studio-portal-input w-full rounded-[24px] border border-ui-border-subtle bg-ui-input px-4 py-3 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/40 transition-colors';
  const compactInputClass = 'studio-portal-input flex-1 rounded-[24px] border border-ui-border-subtle bg-ui-input px-4 py-2.5 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/40 transition-colors';

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="studio-modal-theme studio-portal-modal relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .hidden-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          <header className="studio-portal-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-ui-primary">Create New Post</h1>
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-ui-muted">
                  Share with the RWA Community
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="studio-portal-chip inline-flex h-7 items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 text-[9px] font-semibold uppercase tracking-widest text-ui-secondary">
                  @{userName || userId}
                </span>
                <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-semibold text-[#2CC295] uppercase tracking-widest">
                  Draft
                </span>
                <StudioModalCloseButton onClick={handleClose} />
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
            <div className="h-full p-5 md:p-6 pt-4 relative z-10">
              <div className="w-full h-full mx-auto flex flex-col lg:flex-row items-start gap-6">
                <section className="w-full lg:flex-1 min-w-0 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className={`${sectionShellClass} mb-6`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Post Type</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {postTypes.map(({ type, label, icon: Icon, description }) => (
                        <StudioActionButton
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(type)}
                          variant="secondary"
                          size="lg"
                          className={`
                            h-auto min-h-[96px] w-full justify-start !rounded-[24px] !border-0 px-4 py-4 text-left transition-[background-color,color]
                            ${selectedType === type
                              ? 'bg-[#2CC295]/10 text-ui-primary'
                              : `bg-[var(--t-surface-2)] text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary`
                            }
                          `}
                        >
                          <span className="flex w-full flex-col items-start">
                            <Icon size={16} className={selectedType === type ? 'text-[#2CC295]' : 'text-ui-muted'} />
                            <span className="mt-2 text-xs font-semibold uppercase tracking-wider">{label}</span>
                            <span className="mt-1 text-[10px] text-ui-muted">{description}</span>
                          </span>
                        </StudioActionButton>
                      ))}
                    </div>
                  </div>

                  <div className={`${sectionShellClass} mb-6`}>
                    <label className="mb-3 block text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">
                      Content *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Share your thoughts with the community..."
                      rows={8}
                      className={`${inputClass} resize-none`}
                      required
                      minLength={10}
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] uppercase tracking-widest text-ui-muted">Minimum 10 characters</p>
                      <p className={`text-[10px] font-mono ${content.length > 4900 ? 'text-red-400' : 'text-ui-muted'}`}>
                        {content.length} / 5000
                      </p>
                    </div>
                  </div>

                  <div className={`${sectionShellClass} mb-6`}>
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Images (Optional)</h3>
                    </div>
                    <MultiImageUpload
                      walletAddress={address}
                      value={uploadedImages}
                      onImagesChange={setUploadedImages}
                      maxImages={4}
                      minImages={0}
                    />
                  </div>

                  <div className={`${sectionShellClass} mb-6`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Type size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Tags (Optional)</h3>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleAddTag)}
                        placeholder="Add tags..."
                        className={compactInputClass}
                      />
                      <StudioActionButton
                        type="button"
                        onClick={handleAddTag}
                        disabled={tags.length >= 5}
                        variant="primary"
                        size="md"
                        className="text-xs uppercase tracking-wider disabled:opacity-50"
                      >
                        Add
                      </StudioActionButton>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                          <StudioActionButton
                            key={tag}
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            variant="secondary"
                            size="sm"
                            className="border-[#2CC295]/20 bg-[#2CC295]/10 text-[#2CC295] hover:bg-[#2CC295]/20 hover:text-[#2CC295]"
                          >
                            <span>#{tag}</span>
                            <X size={12} />
                          </StudioActionButton>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] uppercase tracking-widest text-ui-muted">Maximum 5 tags • {5 - tags.length} remaining</p>
                  </div>

                  {selectedType === 'discussion' && (
                    <div className={sectionShellClass}>
                      <StudioActionButton
                        type="button"
                        onClick={() => setShowPoll(!showPoll)}
                        variant="secondary"
                        size="lg"
                        className="h-auto w-full justify-between rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-4 text-left text-ui-primary hover:bg-[var(--t-surface-10)]"
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 size={16} className={showPoll ? 'text-[#2CC295]' : 'text-ui-muted'} />
                          <div className="text-left">
                            <p className="text-xs font-semibold uppercase tracking-wider text-ui-primary">Add Poll</p>
                            <p className="mt-0.5 text-[10px] text-ui-muted">Let people vote on options</p>
                          </div>
                        </div>
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${showPoll ? 'border-[#2CC295] bg-[#2CC295]' : 'border-ui-border-subtle'}`}>
                          {showPoll && <div className="w-2 h-2 bg-black rounded-sm" />}
                        </div>
                      </StudioActionButton>

                      {showPoll && (
                        <div className="mt-6 space-y-4 border-t border-ui-border-subtle pt-6">
                          <div>
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Poll Question</label>
                            <input
                              type="text"
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="What would you like to ask?"
                              className={compactInputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Options</label>
                            <div className="space-y-2">
                              {pollOptions.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updatePollOption(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className={compactInputClass}
                                  />
                                  {pollOptions.length > 2 && (
                                    <StudioActionButton
                                      type="button"
                                      onClick={() => removePollOption(index)}
                                      variant="secondary"
                                      size="icon"
                                      className="studio-portal-secondary h-10 w-10 text-ui-primary"
                                    >
                                      <X size={16} className="text-ui-muted" />
                                    </StudioActionButton>
                                  )}
                                </div>
                              ))}
                            </div>
                            {pollOptions.length < 6 && (
                              <StudioActionButton
                                type="button"
                                onClick={addPollOption}
                                variant="ghost"
                                size="sm"
                                className="mt-3 text-xs uppercase tracking-wider text-[#2CC295] hover:bg-[#2CC295]/10 hover:text-[#2CC295]"
                              >
                                + Add Option
                              </StudioActionButton>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Duration</label>
                            <CustomDropdown
                              options={[
                                { value: '1', label: '1 day' },
                                { value: '3', label: '3 days' },
                                { value: '7', label: '7 days' },
                                { value: '14', label: '14 days' },
                                { value: '30', label: '30 days' },
                              ]}
                              defaultValue={String(pollDuration)}
                              onChange={(v) => setPollDuration(Number(v))}
                              variant="compact"
                              className="w-full"
                              triggerClassName="h-[43px] rounded-[16px]"
                              menuClassName="z-[120]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <aside className="w-full lg:w-[300px] lg:max-w-[300px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                  <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ui-primary">
                      <Shield className="text-[#2CC295]" size={16} />
                      Post Preview
                    </h2>
                    <p className="mt-1 text-xs text-ui-muted">Review before posting</p>
                  </div>

                  <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5 space-y-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Post Type</h3>
                    <div className={`${insetShellClass} p-4`}>
                      <div className="flex items-center gap-3">
                        {postTypes.find((pt) => pt.type === selectedType) && (
                          <>
                            {(() => {
                              const Icon = postTypes.find((pt) => pt.type === selectedType)!.icon;
                              return <Icon size={16} className="text-[#2CC295]" />;
                            })()}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-tight text-ui-primary">
                                {postTypes.find((pt) => pt.type === selectedType)!.label}
                              </p>
                              <p className="mt-0.5 text-[10px] text-ui-muted">
                                {postTypes.find((pt) => pt.type === selectedType)!.description}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5 space-y-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Content Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`${insetShellClass} p-3`}>
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-ui-muted">Characters</p>
                        <p className="text-lg font-semibold text-ui-primary">{content.length}</p>
                      </div>
                      <div className={`${insetShellClass} p-3`}>
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-ui-muted">Words</p>
                        <p className="text-lg font-semibold text-ui-primary">
                          {content.trim() ? content.trim().split(/\s+/).length : 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(uploadedImages.length > 0 || tags.length > 0) && (
                    <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5 space-y-3">
                      <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Attachments</h3>
                      <div className={`${insetShellClass} space-y-3 p-4`}>
                        {uploadedImages.length > 0 && (
                          <div className="flex items-center justify-between border-b border-ui-border-subtle py-2">
                            <span className="text-xs text-ui-muted">Images</span>
                            <span className="text-xs font-semibold text-[#2CC295]">{uploadedImages.length}</span>
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-ui-muted">Tags</span>
                            <span className="text-xs font-semibold text-[#2CC295]">{tags.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5 space-y-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Readiness</h3>
                    <div className={`${insetShellClass} space-y-2 p-4`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ui-muted">Min. Characters</span>
                        <span className={`text-xs font-semibold ${content.length >= 10 ? 'text-[#2CC295]' : 'text-ui-muted'}`}>
                          {content.length >= 10 ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ui-muted">Post Type</span>
                        <span className="text-xs font-semibold text-[#2CC295]">✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-5 space-y-3">
                    <StudioActionButton
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      variant="secondary"
                      size="lg"
                      className="studio-portal-secondary w-full text-sm text-ui-primary"
                    >
                      Cancel
                    </StudioActionButton>
                    <StudioActionButton
                      type="submit"
                      disabled={isSubmitting || content.trim().length < 10}
                      variant="primary"
                      size="lg"
                      className="w-full text-sm disabled:bg-zinc-800 disabled:text-zinc-600"
                    >
                      {isSubmitting ? 'Publishing...' : 'Publish Post'}
                    </StudioActionButton>
                  </div>
                </aside>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
