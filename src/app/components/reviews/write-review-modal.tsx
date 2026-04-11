import { X, Star, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Review } from '@/types/review';
import { validateReviewForm, generateReviewId } from '@/utils/reviewUtils';
import { StarRating } from './star-rating';
import { toast } from 'sonner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

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
        className="studio-form-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme studio-form-modal w-full max-w-2xl overflow-hidden rounded-[32px] border border-ui-border-subtle shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-ui-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ui-primary">
                  {existingReview ? 'Edit Review' : 'Write a Review'}
                </h2>
                <p className="mt-1 text-sm text-ui-secondary">{assetName}</p>
              </div>
              <StudioModalCloseButton onClick={handleClose} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Rating */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-ui-primary">
                Overall Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating
                  rating={rating}
                  size={32}
                  interactive
                  onChange={setRating}
                />
                <span className="text-sm font-semibold text-[#2CC295]">
                  {getRatingLabel(rating)}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ui-primary">
                Review Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience in one sentence"
                maxLength={100}
                className="studio-form-input w-full rounded-[24px] border border-ui-border-subtle px-4 py-3 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-ui-muted">
                {title.length}/100 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ui-primary">
                Your Review *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share details about your experience with this asset..."
                rows={6}
                maxLength={2000}
                className="studio-form-input w-full resize-none rounded-[24px] border border-ui-border-subtle px-4 py-3 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none transition-colors"
              />
              <p className="mt-1 text-xs text-ui-muted">
                {content.length}/2000 characters (minimum 20)
              </p>
            </div>

            {/* Photos */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-ui-primary">
                Add Photos (Optional)
              </label>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="group relative aspect-square overflow-hidden rounded-[24px] bg-[var(--t-surface-5)]">
                      <img
                        src={`https://source.unsplash.com/200x200/?${photo}`}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <StudioActionButton
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        variant="danger"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                      >
                        <X size={14} className="text-white" />
                      </StudioActionButton>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 5 && (
                <StudioActionButton
                  type="button"
                  onClick={handleAddPhoto}
                  variant="secondary"
                  size="lg"
                  className="w-full text-sm text-ui-primary"
                >
                  <Upload size={18} className="text-ui-secondary" />
                  <span className="text-sm text-ui-secondary">
                    Add Photo ({photos.length}/5)
                  </span>
                </StudioActionButton>
              )}

              <p className="mt-2 text-xs text-ui-muted">
                Photos help others make informed decisions
              </p>
            </div>

            {/* Guidelines */}
            <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4">
              <p className="mb-2 text-xs font-semibold text-ui-primary">Review Guidelines:</p>
              <ul className="space-y-1 text-xs text-ui-secondary">
                <li>• Be honest and share your genuine experience</li>
                <li>• Focus on the asset quality and transaction process</li>
                <li>• Avoid offensive language or personal attacks</li>
                <li>• Keep it relevant to this specific asset</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-ui-border-subtle p-6">
            <p className="text-xs text-ui-muted">
              * Required fields
            </p>

            <div className="flex items-center gap-3">
              <StudioActionButton
                type="button"
                onClick={handleClose}
                variant="secondary"
                size="lg"
                className="text-ui-primary"
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                variant="primary"
                size="lg"
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
              </StudioActionButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
