import { X, Star, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Review } from '@/types/review';
import { validateReviewForm, generateReviewId } from '@/utils/reviewUtils';
import { StarRating } from './star-rating';
import { toast } from 'sonner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  userId: string;
  userName: string;
  existingReview?: Review | null;
  onSubmit: (review: Review) => void;
}

export function WriteReviewModal({
  isOpen,
  onClose,
  assetId,
  assetName,
  userId,
  userName,
  existingReview,
  onSubmit,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [content, setContent] = useState(existingReview?.content || '');
  const [photos, setPhotos] = useState<string[]>(existingReview?.photos || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title);
      setContent(existingReview.content);
      setPhotos(existingReview.photos || []);
    }
  }, [existingReview]);

  const handleSubmit = async () => {
    // Validate
    const validation = validateReviewForm({ rating, title, content });
    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const review: Review = {
      id: existingReview?.id || generateReviewId(),
      assetId,
      userId,
      userName,
      rating,
      title: title.trim(),
      content: content.trim(),
      photos: photos.length > 0 ? photos : undefined,
      verifiedPurchase: true, // Mock - would check actual purchase
      helpfulCount: existingReview?.helpfulCount || 0,
      createdAt: existingReview?.createdAt || Date.now(),
      updatedAt: existingReview ? Date.now() : undefined,
    };

    onSubmit(review);
    
    toast.success(existingReview ? 'Review updated!' : 'Review submitted!');
    
    setIsSubmitting(false);
    handleClose();
  };

  const handleClose = () => {
    setRating(0);
    setTitle('');
    setContent('');
    setPhotos([]);
    onClose();
  };

  const handleAddPhoto = () => {
    const photoKeywords = [
      'luxury product detail',
      'premium quality close up',
      'elegant design',
      'high end craftsmanship',
    ];
    const randomKeyword = photoKeywords[Math.floor(Math.random() * photoKeywords.length)];
    setPhotos([...photos, randomKeyword]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const getRatingLabel = (rating: number): string => {
    if (rating === 5) return 'Excellent!';
    if (rating === 4) return 'Very Good';
    if (rating === 3) return 'Good';
    if (rating === 2) return 'Fair';
    if (rating === 1) return 'Poor';
    return 'Select rating';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme bg-ui-card w-full max-w-2xl rounded-2xl border border-ui-border-subtle overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {existingReview ? 'Edit Review' : 'Write a Review'}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">{assetName}</p>
              </div>
              <StudioModalCloseButton onClick={handleClose} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Rating */}
            <div>
              <label className="block text-sm font-bold text-white mb-3">
                Overall Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating
                  rating={rating}
                  size={32}
                  interactive
                  onChange={setRating}
                />
                <span className="text-sm font-bold text-[#2CC295]">
                  {getRatingLabel(rating)}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Review Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience in one sentence"
                maxLength={100}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#2CC295] transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {title.length}/100 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Your Review *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share details about your experience with this asset..."
                rows={6}
                maxLength={2000}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#2CC295] transition-colors resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {content.length}/2000 characters (minimum 20)
              </p>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Add Photos (Optional)
              </label>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 group">
                      <img
                        src={`https://source.unsplash.com/200x200/?${photo}`}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 5 && (
                <button
                  onClick={handleAddPhoto}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
                >
                  <Upload size={18} className="text-zinc-500" />
                  <span className="text-sm text-zinc-400">
                    Add Photo ({photos.length}/5)
                  </span>
                </button>
              )}

              <p className="text-xs text-zinc-500 mt-2">
                Photos help others make informed decisions
              </p>
            </div>

            {/* Guidelines */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <p className="text-xs font-bold text-white mb-2">Review Guidelines:</p>
              <ul className="text-xs text-zinc-500 space-y-1">
                <li>• Be honest and share your genuine experience</li>
                <li>• Focus on the asset quality and transaction process</li>
                <li>• Avoid offensive language or personal attacks</li>
                <li>• Keep it relevant to this specific asset</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              * Required fields
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
