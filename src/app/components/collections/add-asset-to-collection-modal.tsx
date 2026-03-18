import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Layers3 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import {
  StudioModalBody,
  StudioModalCloseButton,
  StudioModalFooter,
  StudioModalHeader,
  StudioModalPanel,
} from '@/app/components/ui/studio-modal';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import type { CollectionAssetItem, CollectionSummary } from '@/types/collection';

interface AddAssetToCollectionModalProps {
  isOpen: boolean;
  collections: CollectionSummary[];
  assetOptions: CollectionAssetItem[];
  onClose: () => void;
  onSubmit: (collectionId: string, assetId: string) => void;
  onCreateCollection?: () => void;
}

export function AddAssetToCollectionModal({
  isOpen,
  collections,
  assetOptions,
  onClose,
  onSubmit,
  onCreateCollection,
}: AddAssetToCollectionModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCollectionId(collections[0]?.id || '');
    setSelectedAssetId(assetOptions[0]?.id || '');
  }, [assetOptions, collections, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) || null,
    [collections, selectedCollectionId]
  );
  const selectedAsset = useMemo(
    () => assetOptions.find((asset) => asset.id === selectedAssetId) || null,
    [assetOptions, selectedAssetId]
  );

  const alreadyIncluded = Boolean(
    selectedCollection && selectedAsset && selectedCollection.itemIds.includes(selectedAsset.id)
  );

  if (!isOpen || typeof document === 'undefined') return null;

  const collectionOptions = collections.map((collection) => ({
    value: collection.id,
    label: collection.name,
    tag: `${collection.itemCount} items`,
  }));

  const assetDropdownOptions = assetOptions.map((asset) => ({
    value: asset.id,
    label: asset.name,
    tag: asset.sourceLabel,
  }));

  const emptyCollections = collections.length === 0;
  const emptyAssets = assetOptions.length === 0;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="studio-form-backdrop fixed inset-0 z-[145] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[10px]"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-[1] w-full max-w-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <StudioModalPanel className="studio-form-modal max-w-xl">
            <StudioModalHeader className="border-b-0 pb-3">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h2 className="mb-1 text-lg font-bold tracking-tight text-ui-primary">Add Asset to Collection</h2>
                  <p className="text-[10px] uppercase tracking-widest text-ui-muted">
                    Assign owned or listed assets to a collection you created
                  </p>
                </div>
                <StudioModalCloseButton onClick={onClose} />
              </div>
            </StudioModalHeader>

            <StudioModalBody className="space-y-5 pt-0">
              {emptyCollections ? (
                <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-primary">
                    <FolderPlus size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-ui-primary">No collections yet</h3>
                  <p className="mt-2 text-sm text-ui-secondary">
                    Create your first collection before adding assets to it.
                  </p>
                </div>
              ) : emptyAssets ? (
                <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-primary">
                    <Layers3 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-ui-primary">No eligible assets found</h3>
                  <p className="mt-2 text-sm text-ui-secondary">
                    Eligible assets come from your owned assets and listings tied to the active wallet.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ui-muted">Collection</p>
                    <CustomDropdown
                      options={collectionOptions}
                      defaultValue={selectedCollectionId}
                      onChange={setSelectedCollectionId}
                      variant="compact"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ui-muted">Asset</p>
                    <CustomDropdown
                      options={assetDropdownOptions}
                      defaultValue={selectedAssetId}
                      onChange={setSelectedAssetId}
                      variant="compact"
                      className="w-full"
                    />
                  </div>

                  {selectedAsset ? (
                    <div className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-5)] p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-black/10">
                          <ImageWithFallback
                            src={selectedAsset.image}
                            alt={selectedAsset.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ui-muted">
                            {selectedAsset.category}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-base font-bold text-ui-primary">
                            {selectedAsset.name}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ui-secondary">
                            <span>{selectedAsset.price}</span>
                            <span className="rounded-full bg-[var(--t-surface-10)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted">
                              {selectedAsset.sourceLabel}
                            </span>
                            {selectedAsset.blockchain ? <span>{selectedAsset.blockchain}</span> : null}
                          </div>
                        </div>
                      </div>
                      {alreadyIncluded ? (
                        <p className="mt-3 text-xs font-medium text-amber-400">
                          This asset is already inside the selected collection.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </StudioModalBody>

            <StudioModalFooter className="border-t-0 pt-0">
              <StudioActionButton
                type="button"
                onClick={onClose}
                variant="secondary"
                size="lg"
                className="studio-form-secondary flex-1 text-sm font-bold tracking-tight"
              >
                Cancel
              </StudioActionButton>
              {emptyCollections ? (
                <StudioActionButton
                  type="button"
                  onClick={onCreateCollection}
                  variant="primary"
                  size="lg"
                  className="flex-1 text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
                >
                  Create Collection
                </StudioActionButton>
              ) : (
                <StudioActionButton
                  type="button"
                  onClick={() => {
                    if (!selectedCollection || !selectedAsset) return;
                    onSubmit(selectedCollection.id, selectedAsset.id);
                  }}
                  variant="primary"
                  size="lg"
                  className="flex-1 text-sm font-bold tracking-tight shadow-lg shadow-[#2CC295]/20"
                  disabled={!selectedCollection || !selectedAsset || alreadyIncluded}
                >
                  Add to Collection
                </StudioActionButton>
              )}
            </StudioModalFooter>
          </StudioModalPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
