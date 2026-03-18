import { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { ImageUpload, type UploadedImage } from '@/app/components/image-upload';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import {
  StudioFieldHint,
  StudioFieldLabel,
  StudioInputField,
  StudioTextareaField,
} from '@/app/components/ui/studio-form-fields';
import {
  StudioModalBody,
  StudioModalCloseButton,
  StudioModalFooter,
  StudioModalHeader,
  StudioModalPanel,
} from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import type { CollectionDraft, CollectionSummary } from '@/types/collection';

const COLLECTION_CATEGORY_OPTIONS = [
  'Generative Art',
  'Digital Art',
  'Real Estate',
  'Collectibles',
  'Luxury',
  'Luxury Vehicle',
  'Gaming',
  'Curated',
  'Institutional',
];

interface CollectionEditorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  collection?: CollectionSummary | null;
  initialItemIds?: string[];
  onClose: () => void;
  onSubmit: (draft: CollectionDraft) => void;
}

export function CollectionEditorModal({
  isOpen,
  mode,
  collection,
  initialItemIds = [],
  onClose,
  onSubmit,
}: CollectionEditorModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(COLLECTION_CATEGORY_OPTIONS[0]);
  const [bio, setBio] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploadedCover, setUploadedCover] = useState<UploadedImage | null>(null);

  const existingCoverImage = collection?.coverImage || '';
  const effectiveItemIds = collection?.itemIds || initialItemIds;

  const categoryOptions = useMemo(() => {
    const values = new Set(COLLECTION_CATEGORY_OPTIONS);
    if (collection?.category) values.add(collection.category);
    return Array.from(values).map((value) => ({ value, label: value }));
  }, [collection?.category]);

  useEffect(() => {
    if (!isOpen) return;

    setName(collection?.name || '');
    setCategory(collection?.category || COLLECTION_CATEGORY_OPTIONS[0]);
    setBio(collection?.bio || '');
    setTagsInput(collection?.tags.join(', ') || '');
    setUploadedCover(null);
  }, [collection, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = name.trim();
    if (!normalizedName) return;

    onSubmit({
      name: normalizedName,
      category: category.trim() || COLLECTION_CATEGORY_OPTIONS[0],
      bio: bio.trim(),
      tags: tagsInput
        .split(',')
        .map((value) => value.trim().replace(/^#/, ''))
        .filter(Boolean),
      coverImage: uploadedCover?.url || existingCoverImage,
      itemIds: effectiveItemIds,
    });
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-form-backdrop fixed inset-0 z-[146] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-[1] w-full max-w-2xl h-[calc(100dvh-3rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <StudioModalPanel className="studio-form-modal max-w-2xl h-[calc(100dvh-3rem)]">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <StudioModalHeader className="p-6 md:p-8 border-b-0 pb-3 md:pb-4">
                <div className="mb-3 md:mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="mb-1 text-lg font-bold tracking-tight text-ui-primary">
                      {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
                    </h2>
                    <p className="text-[10px] uppercase tracking-widest text-ui-muted">
                      Curate a collection with cover image, bio, tags, and owned assets
                    </p>
                  </div>
                  <StudioModalCloseButton onClick={onClose} />
                </div>
              </StudioModalHeader>

              <StudioModalBody
                className="hidden-scrollbar space-y-6 p-6 pt-0 md:p-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="studio-form-surface rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4 backdrop-blur-[8px]">
                  <ImageUpload
                    variant="banner"
                    currentImageUrl={uploadedCover?.url || existingCoverImage}
                    onUploadSuccess={setUploadedCover}
                    onUploadError={() => undefined}
                    label="Collection Cover"
                    description="Recommended: 1600x900px"
                    showPreview
                  />
                </div>

                <div>
                  <StudioFieldLabel>Collection Name</StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Orina Genesis"
                    maxLength={50}
                    className="studio-form-input p-4"
                    required
                  />
                  <StudioFieldHint>{name.length}/50 characters</StudioFieldHint>
                </div>

                <div>
                  <StudioFieldLabel>Category</StudioFieldLabel>
                  <CustomDropdown
                    options={categoryOptions}
                    defaultValue={category}
                    onChange={setCategory}
                    variant="compact"
                    className="w-full"
                  />
                </div>

                <div>
                  <StudioFieldLabel>Bio</StudioFieldLabel>
                  <StudioTextareaField
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Describe the thesis, tone, or collector profile for this collection..."
                    maxLength={240}
                    rows={5}
                    className="studio-form-input p-4"
                  />
                  <StudioFieldHint>{bio.length}/240 characters</StudioFieldHint>
                </div>

                <div>
                  <StudioFieldLabel>Tags</StudioFieldLabel>
                  <StudioInputField
                    type="text"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="rwa, logistics, yield"
                    className="studio-form-input p-4"
                  />
                  <StudioFieldHint>Separate tags with commas</StudioFieldHint>
                </div>

                <div className="rounded-[20px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ui-muted">Collection Assets</p>
                  <p className="mt-2 text-sm text-ui-secondary">
                    {effectiveItemIds.length > 0
                      ? `${effectiveItemIds.length} asset${effectiveItemIds.length === 1 ? '' : 's'} currently linked to this collection.`
                      : 'You can add assets after saving this collection.'}
                  </p>
                </div>
              </StudioModalBody>

              <StudioModalFooter className="p-6 pt-0 md:p-8 md:pt-0 border-t-0">
                <StudioActionButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                  className="studio-form-secondary flex-1 text-sm font-bold tracking-tight transition-all hover:border-[#2CC295]/35 hover:bg-[var(--t-surface-hover)] hover:text-ui-primary"
                >
                  Cancel
                </StudioActionButton>
                <StudioActionButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1 text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
                  leftIcon={<Upload size={16} />}
                  disabled={!name.trim()}
                >
                  {mode === 'create' ? 'Create Collection' : 'Save Collection'}
                </StudioActionButton>
              </StudioModalFooter>
            </form>
          </StudioModalPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
