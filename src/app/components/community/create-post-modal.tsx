import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { X, Image as ImageIcon, BarChart3, Type, MessageSquare, Megaphone, Trophy, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

import { PostType, CreatePostData } from '@/types/community';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { CustomDropdown } from '@/app/components/custom-dropdown';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostData) => void;
  userId: string;
  userName: string;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, userId, userName }: CreatePostModalProps) {
  const [selectedType, setSelectedType] = useState<PostType>('discussion');
  const [content, setContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(7);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (content.trim().length < 10) {
      alert('Post content must be at least 10 characters');
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

    onSubmit(postData);
    handleClose();
  };

  const handleClose = () => {
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
                <h1 className="text-lg font-bold text-white tracking-tight truncate">Create New Post</h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  Share with the RWA Community
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="studio-portal-chip h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                  @{userName || userId}
                </span>
                <span className="h-7 px-3 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
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
                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Post Type</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {postTypes.map(({ type, label, icon: Icon, description }) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(type)}
                          className={`
                            p-4 rounded-[16px] text-left transition-all
                            ${selectedType === type
                              ? 'bg-[#2CC295]/10 text-white'
                              : 'studio-portal-subsurface bg-[rgba(255,255,255,0.03)] text-zinc-400 hover:bg-[rgba(255,255,255,0.05)]'
                            }
                          `}
                        >
                          <Icon size={16} className={selectedType === type ? 'text-[#2CC295]' : 'text-zinc-500'} />
                          <p className="font-bold text-xs mt-2 uppercase tracking-wider">{label}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">{description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 mb-6">
                    <label className="block text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-3">
                      Content *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Share your thoughts with the community..."
                      rows={8}
                      className="studio-portal-input w-full px-4 py-3 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/40 resize-none transition-colors text-sm"
                      required
                      minLength={10}
                      maxLength={5000}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Minimum 10 characters</p>
                      <p className={`text-[10px] font-mono ${content.length > 4900 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {content.length} / 5000
                      </p>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Images (Optional)</h3>
                    </div>
                    <MultiImageUpload
                      walletAddress={address}
                      value={uploadedImages}
                      onImagesChange={setUploadedImages}
                      maxImages={4}
                      minImages={0}
                    />
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Type size={14} className="text-[#2CC295]" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Tags (Optional)</h3>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleAddTag)}
                        placeholder="Add tags..."
                        className="studio-portal-input flex-1 px-4 py-2.5 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-[16px] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/40 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        disabled={tags.length >= 5}
                        className="h-10 px-4 rounded-full bg-[#2CC295] hover:brightness-110 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2CC295]/10 text-[#2CC295] rounded-full text-xs font-bold hover:bg-[#2CC295]/20 transition-colors"
                          >
                            <span>#{tag}</span>
                            <X size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Maximum 5 tags • {5 - tags.length} remaining</p>
                  </div>

                  {selectedType === 'discussion' && (
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-6">
                      <button
                        type="button"
                        onClick={() => setShowPoll(!showPoll)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 size={16} className={showPoll ? 'text-[#2CC295]' : 'text-zinc-500'} />
                          <div className="text-left">
                            <p className="font-bold text-xs text-white uppercase tracking-wider">Add Poll</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Let people vote on options</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showPoll ? 'bg-[#2CC295] border-[#2CC295]' : 'border-zinc-700'}`}>
                          {showPoll && <div className="w-2 h-2 bg-black rounded-sm" />}
                        </div>
                      </button>

                      {showPoll && (
                        <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)] space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-2">Poll Question</label>
                            <input
                              type="text"
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="What would you like to ask?"
                              className="studio-portal-input w-full px-4 py-2.5 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-[16px] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/40 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-2">Options</label>
                            <div className="space-y-2">
                              {pollOptions.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updatePollOption(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="studio-portal-input flex-1 px-4 py-2.5 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-[16px] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/40 transition-colors"
                                  />
                                  {pollOptions.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removePollOption(index)}
                                      className="studio-portal-secondary w-10 h-10 flex items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                    >
                                      <X size={16} className="text-zinc-500" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {pollOptions.length < 6 && (
                              <button
                                type="button"
                                onClick={addPollOption}
                                className="mt-3 text-xs text-[#2CC295] hover:underline font-bold uppercase tracking-wider"
                              >
                                + Add Option
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-2">Duration</label>
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
                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-white tracking-tight">
                      <Shield className="text-[#2CC295]" size={16} />
                      Post Preview
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Review before posting</p>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Post Type</h3>
                    <div className="studio-portal-subsurface bg-[rgba(255,255,255,0.03)] rounded-[16px] p-4">
                      <div className="flex items-center gap-3">
                        {postTypes.find((pt) => pt.type === selectedType) && (
                          <>
                            {(() => {
                              const Icon = postTypes.find((pt) => pt.type === selectedType)!.icon;
                              return <Icon size={16} className="text-[#2CC295]" />;
                            })()}
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight">
                                {postTypes.find((pt) => pt.type === selectedType)!.label}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {postTypes.find((pt) => pt.type === selectedType)!.description}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Content Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="studio-portal-subsurface bg-[rgba(255,255,255,0.03)] p-3 rounded-[16px]">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Characters</p>
                        <p className="text-lg font-bold text-white">{content.length}</p>
                      </div>
                      <div className="studio-portal-subsurface bg-[rgba(255,255,255,0.03)] p-3 rounded-[16px]">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Words</p>
                        <p className="text-lg font-bold text-white">
                          {content.trim() ? content.trim().split(/\s+/).length : 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(uploadedImages.length > 0 || tags.length > 0) && (
                    <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Attachments</h3>
                      <div className="studio-portal-subsurface bg-[rgba(255,255,255,0.03)] p-4 rounded-[16px] space-y-3">
                        {uploadedImages.length > 0 && (
                          <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                            <span className="text-xs text-zinc-500">Images</span>
                            <span className="text-xs font-bold text-[#2CC295]">{uploadedImages.length}</span>
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-zinc-500">Tags</span>
                            <span className="text-xs font-bold text-[#2CC295]">{tags.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A]">Readiness</h3>
                    <div className="studio-portal-subsurface bg-[rgba(255,255,255,0.03)] p-4 rounded-[16px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Min. Characters</span>
                        <span className={`text-xs font-bold ${content.length >= 10 ? 'text-[#2CC295]' : 'text-zinc-600'}`}>
                          {content.length >= 10 ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Post Type</span>
                        <span className="text-xs font-bold text-[#2CC295]">✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="studio-portal-surface bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="studio-portal-secondary w-full h-[45px] rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-[#F1F5F9] transition-colors text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={content.trim().length < 10}
                      className="w-full h-[45px] rounded-full bg-[#2CC295] hover:brightness-110 disabled:bg-zinc-800 disabled:text-zinc-600 text-black transition-all text-sm font-bold"
                    >
                      Publish Post
                    </button>
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
