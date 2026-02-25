import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, BarChart3, Type, MessageSquare, Megaphone, Trophy, Shield } from 'lucide-react';
import { PostType, CreatePostData } from '@/types/community';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { UploadedImage } from '@/app/components/image-upload';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '@/contexts/UserContext';
import { getAvatarByUserId } from '@/app/components/user-avatars';

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

  // Prevent body scroll when modal is open
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
      images: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    // Add poll if enabled
    if (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
      postData.poll = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()),
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
    setTags(tags.filter(t => t !== tag));
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
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      >
        {/* Backdrop Overlay */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        ></div>

        {/* Modal Container */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-6xl h-[90vh] bg-[#0f0f11] rounded-xl shadow-2xl border border-[#27272a] overflow-hidden"
        >
          <style>{`
            .ambient-blob {
              position: absolute;
              width: 600px;
              height: 600px;
              background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
              border-radius: 50%;
              filter: blur(80px);
              z-index: 0;
              pointer-events: none;
            }
          `}</style>

          <form onSubmit={handleSubmit} className="h-full flex">
            {/* Main Content Section */}
            <section className="flex-1 overflow-y-auto custom-scrollbar relative">
              {/* Ambient Blobs */}
              <div className="ambient-blob -top-40 -left-40"></div>
              <div className="ambient-blob -bottom-40 -right-40"></div>

              <div className="p-6 md:p-8 relative z-10">
                {/* Header */}
                <div className="pb-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                      >
                        <X className="text-zinc-400" size={20} />
                      </button>
                      <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Create New Post</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                          Share with the RWA Community
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-zinc-900 rounded-full border border-[#27272a] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        @{userName}
                      </span>
                      <span className="px-3 py-1 bg-[#2CC295]/10 rounded-full border border-[#2CC295]/20 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                        Draft
                      </span>
                    </div>
                  </div>
                </div>

                {/* Post Type Selection */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-[#2CC295]" />
                    <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Post Type</h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {postTypes.map(({ type, label, icon: Icon, description }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`
                          p-4 rounded-xl border transition-all text-left
                          ${selectedType === type
                            ? 'bg-[#2CC295]/10 border-[#2CC295]/30 text-white'
                            : 'bg-zinc-900/30 border-[#27272a] text-zinc-400 hover:bg-zinc-900/50'
                          }
                        `}
                      >
                        <Icon size={18} className={selectedType === type ? 'text-[#2CC295]' : 'text-zinc-500'} />
                        <p className="font-bold text-xs mt-2 uppercase tracking-wider">{label}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Area */}
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 mb-6">
                  <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                    Content *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your thoughts with the community..."
                    rows={8}
                    className="w-full px-4 py-3 bg-black/40 border border-[#27272a] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/50 resize-none transition-colors text-sm"
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

                {/* Images Section */}
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={14} className="text-[#2CC295]" />
                    <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Images (Optional)</h3>
                  </div>
                  <MultiImageUpload
                    maxFiles={4}
                    onUploadSuccess={(images) => {
                      setUploadedImages(images);
                      console.log('Community post images uploaded to IPFS:', images);
                    }}
                    onUploadError={(error) => {
                      console.error('Community post image upload error:', error);
                    }}
                    currentImages={uploadedImages.map(img => img.url)}
                    label=""
                    description={`Maximum 4 images • ${4 - uploadedImages.length} remaining`}
                  />
                </div>

                {/* Tags Section */}
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Type size={14} className="text-[#2CC295]" />
                    <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Tags (Optional)</h3>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddTag)}
                      placeholder="Add tags..."
                      className="flex-1 px-4 py-2.5 bg-black/40 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={tags.length >= 5}
                      className="px-4 py-2.5 bg-[#2CC295] hover:brightness-110 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg transition-all text-xs uppercase tracking-wider"
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
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2CC295]/10 border border-[#2CC295]/30 text-[#2CC295] rounded-lg text-xs font-bold hover:bg-[#2CC295]/20 transition-colors"
                        >
                          <span>#{tag}</span>
                          <X size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Maximum 5 tags • {5 - tags.length} remaining</p>
                </div>

                {/* Poll Section */}
                {selectedType === 'discussion' && (
                  <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                    <button
                      type="button"
                      onClick={() => setShowPoll(!showPoll)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <BarChart3 size={18} className={showPoll ? 'text-[#2CC295]' : 'text-zinc-500'} />
                        <div className="text-left">
                          <p className="font-bold text-xs text-white uppercase tracking-wider">Add Poll</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Let people vote on options</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${showPoll ? 'bg-[#2CC295] border-[#2CC295]' : 'border-zinc-700'}`}>
                        {showPoll && <div className="w-2 h-2 bg-black rounded-sm" />}
                      </div>
                    </button>

                    {showPoll && (
                      <div className="mt-6 pt-6 border-t border-[#27272a] space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Poll Question</label>
                          <input
                            type="text"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="What would you like to ask?"
                            className="w-full px-4 py-2.5 bg-black/40 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/50 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Options</label>
                          <div className="space-y-2">
                            {pollOptions.map((option, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updatePollOption(index, e.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                  className="flex-1 px-4 py-2.5 bg-black/40 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295]/50 transition-colors"
                                />
                                {pollOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removePollOption(index)}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
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
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Duration</label>
                          <select
                            value={pollDuration}
                            onChange={(e) => setPollDuration(Number(e.target.value))}
                            className="w-full px-4 py-2.5 bg-black/40 border border-[#27272a] rounded-lg text-sm text-white focus:outline-none focus:border-[#2CC295]/50 transition-colors"
                          >
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Right Sidebar - Preview & Actions */}
            <aside className="w-80 bg-[#141417] flex flex-col border-l border-[#27272a] overflow-hidden">
              {/* Preview Header */}
              <div className="p-6 border-b border-[#27272a]">
                <h2 className="text-white font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Shield className="text-[#2CC295]" size={18} />
                  Post Preview
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Review before posting</p>
              </div>

              {/* Scrollable Preview Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Post Type Preview */}
                <div className="space-y-3">
                  <h3 className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Post Type</h3>
                  <div className="bg-zinc-900/50 border border-[#27272a] p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      {postTypes.find(pt => pt.type === selectedType) && (
                        <>
                          {(() => {
                            const Icon = postTypes.find(pt => pt.type === selectedType)!.icon;
                            return <Icon size={16} className="text-[#2CC295]" />;
                          })()}
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">
                              {postTypes.find(pt => pt.type === selectedType)!.label}
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                              {postTypes.find(pt => pt.type === selectedType)!.description}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Stats */}
                <div className="space-y-3">
                  <h3 className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Content Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/50 border border-[#27272a] p-3 rounded-xl">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Characters</p>
                      <p className="text-lg font-bold text-white">{content.length}</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-[#27272a] p-3 rounded-xl">
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Words</p>
                      <p className="text-lg font-bold text-white">
                        {content.trim() ? content.trim().split(/\s+/).length : 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {(uploadedImages.length > 0 || tags.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Attachments</h3>
                    <div className="bg-zinc-900/50 border border-[#27272a] p-4 rounded-xl space-y-3">
                      {uploadedImages.length > 0 && (
                        <div className="flex items-center justify-between py-2 border-b border-[#27272a]">
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

                {/* Readiness Check */}
                <div className="space-y-3">
                  <h3 className="text-[9px] uppercase tracking-widest font-bold text-zinc-600">Readiness</h3>
                  <div className="bg-zinc-900/50 border border-[#27272a] p-4 rounded-xl space-y-2">
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
              </div>

              {/* Footer Actions - Fixed */}
              <div className="border-t border-[#27272a] p-6 space-y-3 bg-zinc-950/80 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] text-white py-3 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={content.trim().length < 10}
                  className="w-full bg-[#2CC295] hover:brightness-110 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:border-[#27272a] text-black py-3 rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                >
                  Publish Post
                </button>
              </div>
            </aside>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}