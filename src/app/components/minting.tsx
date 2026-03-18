import { Sparkles, Upload, AlertCircle, CheckCircle, Eye, Heart, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { PillSegmentedToggle } from '@/app/components/pill-segmented-toggle';
import { StandardToggle } from '@/app/components/standard-toggle';
import { ImageUpload, UploadedImage } from '@/app/components/image-upload';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { MintingDeliverySection, type MintingDeliveryState } from '@/app/components/minting-delivery-section';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMintAsset } from '@/hooks/useAssets';
import { AssetType, CONTRACTS } from '@/config/contracts';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useTheme } from '@/app/contexts/ThemeContext';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';
import type { RwaConfigurableAttributeGroup } from '@/app/types/asset';
import type { AssetDeliverySnapshot, AssetDetails, AssetLocationSnapshot } from '@/types/asset';
import type { MyAssetNft, MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import { shortenAddress } from '@/utils/profileUtils';
import { upsertRuntimeMintedAsset, type RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';

function createMintingAttributeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createMintingAttributeOption(label = '') {
  return {
    id: createMintingAttributeId('attr-option'),
    label,
  };
}

function createMintingAttributeGroup(): RwaConfigurableAttributeGroup {
  return {
    id: createMintingAttributeId('attr-group'),
    label: '',
    helpText: '',
    required: false,
    selectionMode: 'single',
    options: [createMintingAttributeOption(''), createMintingAttributeOption('')],
  };
}

type PendingRuntimeMintDraft = {
  walletAddress: string;
  assetType: 'RWA' | 'NFT';
  name: string;
  description: string;
  blockchain: string;
  unitId: string;
  totalAmount: string;
  price: string;
  priceCurrency: string;
  images: string[];
  configurableAttributes: RwaConfigurableAttributeGroup[];
  deliverySnapshot?: AssetDeliverySnapshot;
  assetLocationSnapshot?: AssetLocationSnapshot;
  requestedAt: number;
};

function formatMintedDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parsePositiveNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMintBlockchainName(value: string): string {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('ethereum')) return 'Ethereum';
  if (normalized.includes('polygon')) return 'Polygon';
  if (normalized.includes('arbitrum')) return 'Arbitrum';
  if (normalized.includes('base')) return 'Base';
  if (normalized.includes('bnb') || normalized.includes('bsc')) return 'BSC';
  return String(value || '').trim() || 'Ethereum';
}

function formatRuntimeUsd(price: number, currency: string): string {
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  if (normalizedCurrency === 'ETH') {
    return `~ $${(price * 2500).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (normalizedCurrency === 'USDT' || normalizedCurrency === 'USDC') {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `~ ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${normalizedCurrency || 'USD'}`;
}

function buildMintDeliverySnapshot(state: MintingDeliveryState | null): AssetDeliverySnapshot | undefined {
  if (!state?.isValid || !state.effectiveDraft) return undefined;

  return {
    sourceMode: state.mode,
    preview: state.preview,
    countryCode: state.effectiveDraft.countryCode,
    countryNameSnapshot: state.effectiveDraft.countryNameSnapshot,
    geoPath: state.effectiveDraft.geoPath.map((segment) => ({
      placeId: segment.placeId,
      kind: segment.kind,
      code: segment.code,
      name: segment.name,
      label: segment.label,
    })),
    postalCode: state.effectiveDraft.postalCode || undefined,
    addressLine1: state.effectiveDraft.addressLine1,
    addressLine2: state.effectiveDraft.addressLine2 || undefined,
    deliveryInstructions: state.effectiveDraft.deliveryInstructions || undefined,
    validationStatus: state.effectiveDraft.validationStatus,
    source: state.effectiveDraft.source,
    capturedAt: Date.now(),
  };
}

function buildRuntimeMintedAssetRecord(
  draft: PendingRuntimeMintDraft,
  txHash: string
): RuntimeMintedAssetRecord {
  const now = Date.now();
  const image = draft.images[0] || 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800';
  const normalizedBlockchain = normalizeMintBlockchainName(draft.blockchain);
  const priceNumber = parsePositiveNumber(draft.price, 0);
  const currentPrice = `${draft.price || '0'} ${draft.priceCurrency}`;
  const floorPrice = `${Math.max(priceNumber * 0.9, 0).toFixed(priceNumber >= 1 ? 2 : 4).replace(/\.?0+$/, '') || '0'} ${draft.priceCurrency}`;
  const baseId = `mint-${txHash.slice(2, 10)}-${draft.requestedAt.toString(36)}`;
  const tokenId = `${draft.requestedAt}`;
  const totalAmountNumber = Math.max(1, Math.trunc(parsePositiveNumber(draft.totalAmount, 1)));
  const details: AssetDetails = {
    id: baseId,
    tokenId,
    name: draft.name,
    description: draft.description || `${draft.name} minted on Orina.`,
    category: draft.assetType === 'RWA' ? 'Real World Asset' : 'Digital Art',
    blockchain: normalizedBlockchain,
    currentPrice,
    currentPriceUsd: formatRuntimeUsd(priceNumber, draft.priceCurrency),
    floorPrice,
    image,
    images: draft.images.length > 0 ? draft.images : [image],
    properties: [
      { trait_type: 'Asset Type', value: draft.assetType },
      { trait_type: 'Unit ID', value: draft.unitId || '0' },
      { trait_type: 'Supply', value: totalAmountNumber },
      { trait_type: 'Blockchain', value: normalizedBlockchain },
    ],
    configurableAttributes:
      draft.assetType === 'RWA' && draft.configurableAttributes.length > 0
        ? draft.configurableAttributes
        : undefined,
    deliverySnapshot: draft.deliverySnapshot,
    assetLocationSnapshot: draft.assetLocationSnapshot,
    views: 0,
    favorites: 0,
    totalVolume: '0 ETH',
    totalSales: 0,
    currentOwner: draft.walletAddress,
    creator: draft.walletAddress,
    ownerHistory: [
      {
        address: draft.walletAddress,
        timestamp: now,
        price: 'Minted',
        txHash,
      },
    ],
    priceHistory: [
      {
        timestamp: now,
        price: priceNumber,
        priceUsd:
          String(draft.priceCurrency || '').trim().toUpperCase() === 'ETH'
            ? priceNumber * 2500
            : priceNumber,
        eventType: 'mint',
      },
    ],
    contractAddress: CONTRACTS.ORINA_RWA,
    tokenStandard: 'ERC-721',
    mintDate: now,
    verified: false,
    ipfsUrl: `ipfs://runtime-minted/${baseId}`,
    seller: {
      name: shortenAddress(draft.walletAddress),
      address: draft.walletAddress,
    },
  };

  const myAsset: MyAssetRwa | MyAssetNft =
    draft.assetType === 'RWA'
      ? {
          id: baseId,
          name: draft.name,
          type: 'RWA',
          category: 'Real World Asset',
          image,
          status: 'Paused',
          availableAmount: totalAmountNumber,
          totalAmount: totalAmountNumber,
          minPrice: currentPrice,
          mintedDate: formatMintedDate(now),
        }
      : {
          id: baseId,
          name: draft.name,
          type: 'NFT',
          category: 'Digital Art',
          image,
          currentPrice,
          floorPrice,
          collection: 'Custom Collection',
          transferable: true,
        };

  return {
    id: baseId,
    walletAddress: draft.walletAddress.toLowerCase(),
    assetType: draft.assetType,
    createdAt: now,
    txHash,
    myAsset,
    details,
  };
}

export function Minting() {
  const [assetType, setAssetType] = useState<'RWA' | 'NFT'>('RWA');
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [blockchain, setBlockchain] = useState('Ethereum Mainnet');
  const [unitId, setUnitId] = useState('0');
  const [totalAmount, setTotalAmount] = useState('1000');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('ETH');
  const [expiryType, setExpiryType] = useState<'Expiry' | 'Non-Expiry'>('Expiry');
  const [expiryDays, setExpiryDays] = useState('30');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedImage | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]); // Multi-image for RWA
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For image carousel
  const [imageLoadError, setImageLoadError] = useState(false); // Track image load errors
  const [configurableAttributes, setConfigurableAttributes] = useState<RwaConfigurableAttributeGroup[]>([]);
  const [mintingDeliveryState, setMintingDeliveryState] = useState<MintingDeliveryState | null>(null);
  const [deliveryValidationAttempt, setDeliveryValidationAttempt] = useState(0);
  const [pendingRuntimeMintDraft, setPendingRuntimeMintDraft] = useState<PendingRuntimeMintDraft | null>(null);

  const { address, isConnected } = useAccount();
  const { theme } = useTheme();
  const { mintAsset, hash, isPending, isConfirming, isConfirmed, error, reset } = useMintAsset();
  const { requireWalletActionAsync } = useRequireWalletAction();

  useEffect(() => {
    if (!error || !pendingRuntimeMintDraft) return;
    setPendingRuntimeMintDraft(null);
  }, [error, pendingRuntimeMintDraft]);

  useEffect(() => {
    if (!isConfirmed || !hash || !pendingRuntimeMintDraft) return;

    upsertRuntimeMintedAsset(buildRuntimeMintedAssetRecord(pendingRuntimeMintDraft, hash));
    setPendingRuntimeMintDraft(null);
    reset();
  }, [hash, isConfirmed, pendingRuntimeMintDraft, reset]);

  const handleMint = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (
      !assetName ||
      !totalAmount ||
      (assetType === 'RWA' && expiryType === 'Expiry' && !expiryDays) ||
      (assetType === 'NFT' && expiryDays && Number(expiryDays) < 0)
    ) {
      alert('Please fill in all required fields');
      return;
    }

    if (assetType === 'RWA') {
      setDeliveryValidationAttempt((current) => current + 1);
      if (!mintingDeliveryState?.isValid) {
        alert(
          mintingDeliveryState?.mode === 'default'
            ? 'Please save a default delivery address in Settings or switch to Other Address before minting.'
            : 'Please complete the delivery address fields before minting.'
        );
        return;
      }

      if (!mintingDeliveryState.locationSnapshot) {
        alert('Resolving asset location. Please wait a moment and try again.');
        return;
      }
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_mint_write',
      actionLabel: 'mint assets',
      fallbackPage: 'minting',
    }))) {
      return;
    }

    try {
      reset();
      const resolvedUnitId = assetType === 'RWA' ? unitId : '0';
      const resolvedExpiryDays = assetType === 'RWA' ? expiryDays : expiryDays.trim();
      const expiryTimestamp =
        resolvedExpiryDays && Number(resolvedExpiryDays) > 0
          ? BigInt(Math.floor(Date.now() / 1000) + Number(resolvedExpiryDays) * 24 * 60 * 60)
          : BigInt(0);

      setPendingRuntimeMintDraft({
        walletAddress: address,
        assetType,
        name: assetName.trim(),
        description: description.trim(),
        blockchain,
        unitId: resolvedUnitId,
        totalAmount,
        price,
        priceCurrency,
        images:
          assetType === 'RWA'
            ? uploadedImages.map((image) => image.url).filter(Boolean)
            : uploadedMedia?.url
              ? [uploadedMedia.url]
              : [],
        configurableAttributes: previewConfigurableAttributes,
        deliverySnapshot: assetType === 'RWA' ? buildMintDeliverySnapshot(mintingDeliveryState) : undefined,
        assetLocationSnapshot: assetType === 'RWA' ? mintingDeliveryState?.locationSnapshot : undefined,
        requestedAt: Date.now(),
      });
      await mintAsset(
        BigInt(resolvedUnitId),
        BigInt(totalAmount),
        expiryTimestamp,
        assetType === 'RWA' ? AssetType.RWA : AssetType.NFT,
      );
    } catch (err) {
      setPendingRuntimeMintDraft(null);
      console.error('Minting failed:', err);
    }
  };

  const getStatusMessage = () => {
    if (isPending) return 'Waiting for wallet confirmation...';
    if (isConfirming) return 'Transaction confirming on blockchain...';
    if (isConfirmed) return 'Asset minted successfully!';
    if (error) {
      // Format error message to be user-friendly
      const errorMsg = error.message || String(error);

      // Extract the main error reason
      if (errorMsg.includes('User rejected') || errorMsg.includes('User denied')) {
        return 'Transaction cancelled by user';
      }
      if (errorMsg.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      }
      if (errorMsg.includes('gas required exceeds')) {
        return 'Gas estimation failed - check contract parameters';
      }

      // For other errors, show first line only (before "Request Arguments" or "Contract Call")
      const firstLine = errorMsg.split(/Request Arguments:|Contract Call:/)[0].trim();

      // Truncate if still too long
      if (firstLine.length > 100) {
        return firstLine.substring(0, 97) + '...';
      }

      return firstLine || 'Transaction failed';
    }
    return null;
  };

  const statusMessage = getStatusMessage();
  const studioCardClass = 'bg-ui-card rounded-[24px] p-6 backdrop-blur-[10px]';
  const mintingInputToneClass = 'text-ui-secondary';
  const studioInputClass = `w-full border border-ui-border-subtle bg-ui-input rounded-lg px-4 py-3 text-[14px] leading-[18px] font-bold ${mintingInputToneClass} focus:bg-ui-input-focus focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 shadow-none`;
  const mintingSelectTriggerClass = `minting-neutral-select-trigger !h-[49px] !rounded-lg !border !border-ui-border-subtle !shadow-none !px-4 !text-[14px] !leading-[18px] !font-bold !text-ui-secondary hover:!bg-ui-input-focus`;
  const mintingNeutralTriggerStyle = theme === 'light' ? { background: '#ECEFF2' } : undefined;
  const previewConfigurableAttributes = configurableAttributes
    .map((group) => ({
      ...group,
      label: group.label.trim(),
      helpText: group.helpText?.trim() || '',
      options: group.options
        .map((option) => ({ ...option, label: option.label.trim() }))
        .filter((option) => option.label),
    }))
    .filter((group) => group.label && group.options.length > 0);

  const addConfigurableAttributeGroup = () => {
    setConfigurableAttributes((current) => [...current, createMintingAttributeGroup()]);
  };

  const removeConfigurableAttributeGroup = (groupId: string) => {
    setConfigurableAttributes((current) => current.filter((group) => group.id !== groupId));
  };

  const updateConfigurableAttributeGroup = (
    groupId: string,
    patch: Partial<RwaConfigurableAttributeGroup>
  ) => {
    setConfigurableAttributes((current) =>
      current.map((group) => (group.id === groupId ? { ...group, ...patch } : group))
    );
  };

  const addConfigurableAttributeOption = (groupId: string) => {
    setConfigurableAttributes((current) =>
      current.map((group) =>
        group.id === groupId
          ? { ...group, options: [...group.options, createMintingAttributeOption()] }
          : group
      )
    );
  };

  const updateConfigurableAttributeOption = (groupId: string, optionId: string, label: string) => {
    setConfigurableAttributes((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map((option) =>
                option.id === optionId ? { ...option, label } : option
              ),
            }
          : group
      )
    );
  };

  const removeConfigurableAttributeOption = (groupId: string, optionId: string) => {
    setConfigurableAttributes((current) =>
      current.map((group) =>
        group.id === groupId
          ? {
              ...group,
              options:
                group.options.length <= 1
                  ? group.options
                  : group.options.filter((option) => option.id !== optionId),
            }
          : group
      )
    );
  };

  return (
    <section className="minting-borderless-theme bg-ui-page h-full overflow-hidden relative">
      <style>{`
        .minting-form-stack {
          isolation: isolate;
        }
        .minting-form-stack .dropdown-panel {
          z-index: 9999 !important;
          background: var(--t-dropdown-glass-bg) !important;
        }
        .minting-form-stack .minting-neutral-select-trigger,
        .minting-form-stack .minting-price-token-trigger {
          background: var(--t-input-bg) !important;
          border: 1px solid var(--t-border-subtle) !important;
          box-shadow: none !important;
        }
        .minting-form-stack .minting-neutral-select-trigger:hover,
        .minting-form-stack .minting-neutral-select-trigger:focus-visible,
        .minting-form-stack .minting-price-token-trigger:hover,
        .minting-form-stack .minting-price-token-trigger:focus-visible {
          background: var(--t-input-focus-bg) !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger {
          background: #eceff2 !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:hover,
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:focus-visible {
          background: #e8edf1 !important;
        }
        .minting-price-token-trigger svg {
          width: 14px !important;
          height: 14px !important;
          color: var(--t-text-muted) !important;
        }
        .minting-price-group {
          background: var(--t-input-bg);
          border: 1px solid var(--t-border-subtle);
          border-radius: 0.5rem;
        }
        .minting-form-stack input[type="text"],
        .minting-form-stack input[type="number"],
        .minting-form-stack textarea {
          font-family: 'Space Grotesk', var(--font-sans) !important;
          font-size: 14px !important;
          line-height: 18px !important;
          font-weight: 700 !important;
          letter-spacing: 0 !important;
          color: var(--t-text-secondary) !important;
          -webkit-text-fill-color: var(--t-text-secondary) !important;
          font-variant-numeric: tabular-nums !important;
        }
        .minting-form-stack input[type="text"]::placeholder,
        .minting-form-stack input[type="number"]::placeholder,
        .minting-form-stack textarea::placeholder {
          color: var(--t-text-muted) !important;
          -webkit-text-fill-color: var(--t-text-muted) !important;
          opacity: 1 !important;
        }
        [data-theme="light"] .minting-form-stack input[type="text"],
        [data-theme="light"] .minting-form-stack input[type="number"],
        [data-theme="light"] .minting-form-stack textarea {
          color: color-mix(in srgb, var(--t-text-secondary) 88%, var(--t-text-primary) 12%) !important;
          -webkit-text-fill-color: color-mix(in srgb, var(--t-text-secondary) 88%, var(--t-text-primary) 12%) !important;
        }
        [data-theme="light"] .minting-form-stack input[type="text"]::placeholder,
        [data-theme="light"] .minting-form-stack input[type="number"]::placeholder,
        [data-theme="light"] .minting-form-stack textarea::placeholder {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
          opacity: 1 !important;
        }
      `}</style>


      <div className="h-full overflow-y-auto custom-scrollbar">
        <div className="p-8 relative z-10">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-ui-primary">Asset Creation</h1>
                <p className="text-sm text-ui-muted mt-1">Design, mint and deploy your Web3 assets across multiple chains.</p>
              </div>

              {/* Asset Type Toggle */}
              <PillSegmentedToggle
                options={['RWA', 'NFT']}
                value={assetType}
                onChange={(value) => setAssetType(value as 'RWA' | 'NFT')}
                className="w-full sm:w-1/2 sm:min-w-[280px] sm:max-w-[460px]"
              />
            </div>
          </header>

          {/* Transaction Status Banner */}
          {(isPending || isConfirming || isConfirmed || error) && (
            <div className={`mb-6 p-4 rounded-xl border ${isConfirmed
                ? 'bg-[#2CC295]/10 border-[#2CC295]/30'
                : error
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
              <div className="flex items-center gap-3">
                {isPending || isConfirming ? (
                  <Loader2 className="animate-spin text-blue-400" size={20} />
                ) : isConfirmed ? (
                  <CheckCircle className="text-primary" size={20} />
                ) : (
                  <AlertCircle className="text-red-400" size={20} />
                )}
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isConfirmed ? 'text-primary' : error ? 'text-red-400' : 'text-blue-400'
                    }`}>
                    {statusMessage}
                  </p>
                  {hash && (
                    <p className="text-xs text-ui-muted mt-1 font-mono">
                      Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Asset Type Info Banner */}
          <div className="mb-6 p-4 rounded-xl border border-[#2CC295]/20 bg-[#2CC295]/5">
            <div className="flex items-start gap-3">
              <Sparkles className="text-primary mt-0.5" size={18} />
              <div className="flex-1">
                <p className="font-bold text-sm text-ui-primary mb-1">
                  {assetType === 'RWA' ? 'Real World Asset (RWA)' : 'NFT Asset (Digital)'}
                </p>
                <p className="text-xs text-ui-secondary">
                  {assetType === 'RWA'
                    ? 'Physical assets cannot be transferred. When minted, you gain the right to sell. After buyer purchase and finalize, an NFT receipt will be minted for the buyer.'
                    : 'Digital assets can be transferred freely. These NFTs follow standard ERC-721 protocol and can be traded on any marketplace.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Column - Form */}
            <div className="xl:col-span-8 space-y-6 minting-form-stack">
              {/* Step 1: Media Upload */}
              <div className={`${studioCardClass} relative z-30`}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-7 h-7 bg-[#2CC295]/20 text-primary rounded-full flex items-center justify-center text-xs font-bold border border-[#2CC295]/20">1</span>
                  <h2 className="text-lg font-bold text-ui-primary">Media Upload</h2>
                </div>
                {assetType === 'RWA' ? (
                  <MultiImageUpload
                    onImagesChange={(images) => {
                      setUploadedImages(images);
                      setCurrentImageIndex(0); // Reset to first image
                      console.log('RWA images uploaded:', images);
                    }}
                    maxImages={5}
                    minImages={1}
                  />
                ) : (
                  <ImageUpload
                    variant="asset"
                    onUploadSuccess={(image) => {
                      setUploadedMedia(image);
                      console.log('Asset media uploaded to IPFS:', image);
                    }}
                    onUploadError={(error) => {
                      console.error('Asset upload error:', error);
                    }}
                    currentImageUrl={uploadedMedia?.url}
                    label=""
                    description="Supports JPG, PNG, GIF, MP4 (Max 100MB)"
                    showPreview={true}
                  />
                )}
              </div>

              {/* Step 2: Metadata Input */}
              <div className={studioCardClass}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">2</span>
                  <h2 className="text-lg font-bold text-ui-primary">Metadata Input</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Asset Name</label>
                    <input
                      className={studioInputClass}
                      placeholder="e.g. Genesis Cyber-Samurai #01"
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      className={`${studioInputClass} h-32 resize-none`}
                      placeholder="Provide a detailed description of your asset..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {assetType === 'RWA' && (
                <div className={studioCardClass}>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">3</span>
                      <div>
                        <h2 className="text-lg font-bold text-ui-primary">Attributes</h2>
                        <p className="text-xs text-ui-muted mt-1">
                          Add offchain options like size, grade, warehouse or packaging for buyers to choose during checkout.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addConfigurableAttributeGroup}
                      className="h-10 px-4 rounded-full bg-[#2CC295]/10 text-primary text-xs font-bold inline-flex items-center gap-2 hover:bg-[#2CC295]/15 transition-colors"
                    >
                      <Plus size={14} />
                      Add Attribute
                    </button>
                  </div>

                  {configurableAttributes.length === 0 ? (
                    <div className="rounded-2xl bg-[var(--t-surface-5)] p-5 text-center">
                      <p className="text-sm font-semibold text-ui-primary">No attributes yet</p>
                      <p className="text-xs text-ui-muted mt-1">
                        Example: Ring Size, Warehouse, Packaging, Purity, Finish.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {configurableAttributes.map((group, index) => (
                        <div key={group.id} className="rounded-2xl bg-[var(--t-surface-5)] p-4 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">
                                Attribute Group {index + 1}
                              </p>
                              <p className="text-[10px] text-ui-muted mt-1">
                                This metadata stays offchain and is attached to the buyer order snapshot.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeConfigurableAttributeGroup(group.id)}
                              className="w-9 h-9 rounded-full bg-ui-card text-ui-muted hover:text-red-400 transition-colors inline-flex items-center justify-center"
                              aria-label="Remove attribute group"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Label</label>
                              <input
                                className={studioInputClass}
                                type="text"
                                placeholder="e.g. Ring Size"
                                value={group.label}
                                onChange={(e) => updateConfigurableAttributeGroup(group.id, { label: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Help Text</label>
                              <input
                                className={studioInputClass}
                                type="text"
                                placeholder="Explain what buyer should choose"
                                value={group.helpText || ''}
                                onChange={(e) => updateConfigurableAttributeGroup(group.id, { helpText: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-ui-card p-1">
                              <button
                                type="button"
                                onClick={() => updateConfigurableAttributeGroup(group.id, { selectionMode: 'single' })}
                                className={`h-8 px-4 rounded-full text-xs font-bold transition-colors ${
                                  group.selectionMode === 'single'
                                    ? 'bg-[#2CC295] text-black'
                                    : 'text-ui-secondary hover:text-ui-primary'
                                }`}
                              >
                                Single Select
                              </button>
                              <button
                                type="button"
                                onClick={() => updateConfigurableAttributeGroup(group.id, { selectionMode: 'multi' })}
                                className={`h-8 px-4 rounded-full text-xs font-bold transition-colors ${
                                  group.selectionMode === 'multi'
                                    ? 'bg-[#2CC295] text-black'
                                    : 'text-ui-secondary hover:text-ui-primary'
                                }`}
                              >
                                Multi Select
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => updateConfigurableAttributeGroup(group.id, { required: !group.required })}
                              className={`h-8 px-4 rounded-full text-xs font-bold transition-colors ${
                                group.required
                                  ? 'bg-[#2CC295]/12 text-primary'
                                  : 'bg-ui-card text-ui-secondary hover:text-ui-primary'
                              }`}
                            >
                              {group.required ? 'Required' : 'Optional'}
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest">
                                Buyer Options
                              </label>
                              <button
                                type="button"
                                onClick={() => addConfigurableAttributeOption(group.id)}
                                className="text-xs font-bold text-primary inline-flex items-center gap-1.5 hover:opacity-80"
                              >
                                <Plus size={12} />
                                Add Option
                              </button>
                            </div>
                            <div className="space-y-2">
                              {group.options.map((option) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <input
                                    className={studioInputClass}
                                    type="text"
                                    placeholder="e.g. US 7"
                                    value={option.label}
                                    onChange={(e) =>
                                      updateConfigurableAttributeOption(group.id, option.id, e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeConfigurableAttributeOption(group.id, option.id)}
                                    disabled={group.options.length <= 1}
                                    className="w-10 h-10 rounded-full bg-ui-card text-ui-muted hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
                                    aria-label="Remove attribute option"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Collection Settings */}
              <div className={`${studioCardClass} relative z-[60]`}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">
                      {assetType === 'RWA' ? '4' : '3'}
                    </span>
                    <h2 className="text-lg font-bold text-ui-primary">Collection Settings</h2>
                  </div>
                  <div className="w-full md:w-[calc(50%-0.5rem)] md:max-w-none shrink-0">
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Blockchain</label>
                    <CustomDropdown
                      variant="compact"
                      defaultValue={blockchain}
                      onChange={(value) => setBlockchain(value)}
                      openOnHover
                      disableDefaultTriggerTone
                      triggerStyle={mintingNeutralTriggerStyle}
                      options={[
                        { value: 'Ethereum Mainnet', label: 'Ethereum Mainnet' },
                        { value: 'Polygon', label: 'Polygon' },
                        { value: 'Arbitrum One', label: 'Arbitrum One' },
                        { value: 'Solana', label: 'Solana' },
                      ]}
                      className="w-full"
                      triggerClassName={mintingSelectTriggerClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Price</label>
                    <div className="minting-price-group relative w-full h-[49px] overflow-hidden">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onKeyDown={preventInvalidNumberKeyDown}
                        className="w-full h-[49px] px-4 py-3 pr-[120px] rounded-none text-[14px] leading-[18px] font-bold text-ui-secondary placeholder:text-ui-muted outline-none transition-none"
                        style={{
                          boxSizing: 'border-box',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '0',
                          fontFamily: "'Space Grotesk', var(--font-sans)",
                          boxShadow: 'none',
                        }}
                      />
                      <div className="absolute top-0 right-0 w-[105px] h-full z-[80]">
                        <CustomDropdown
                          options={['ETH', 'USDT', 'USDC', 'ORI']}
                          defaultValue={priceCurrency}
                          onChange={(value) => setPriceCurrency(value)}
                          openOnHover
                          variant="compact"
                          className="w-full h-full overflow-visible"
                          triggerClassName="minting-price-token-trigger !h-full !rounded-none !border-0 !shadow-none !px-4 !text-[15px] !leading-[22px] !font-bold font-sans !bg-transparent !text-ui-secondary hover:!bg-ui-input-focus"
                          menuClassName="mt-1 rounded-[16px] z-[9999]"
                        />
                      </div>
                    </div>
                  </div>

                  {assetType === 'RWA' && (
                    <div>
                      <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Unit ID</label>
                      <CustomDropdown
                        variant="compact"
                        defaultValue={unitId}
                        onChange={(value) => setUnitId(value)}
                        openOnHover
                        disableDefaultTriggerTone
                        triggerStyle={mintingNeutralTriggerStyle}
                        options={[
                          { value: '0', label: 'Unit 0 - Default' },
                          { value: '1', label: 'Unit 1 - Gold (kg)' },
                          { value: '2', label: 'Unit 2 - Silver (kg)' },
                          { value: '3', label: 'Unit 3 - Oil (liter)' },
                          { value: '4', label: 'Unit 4 - Wheat (ton)' },
                        ]}
                        className="w-full"
                        triggerClassName={mintingSelectTriggerClass}
                      />
                      <p className="text-[10px] text-ui-muted mt-1">Units managed by governance</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Total Amount</label>
                    <input
                      className={studioInputClass}
                      placeholder="e.g. 1000"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      onKeyDown={preventInvalidNumberKeyDown}
                    />
                    {assetType === 'RWA' && (
                      <p className="text-[10px] text-ui-muted mt-1">Example: 10 units can be sold to 10 people</p>
                    )}
                  </div>

                  {/* Expiry Type Toggle - Only for RWA */}
                  {assetType === 'RWA' && (
                    <div>
                      <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Expiry Type</label>
                      <StandardToggle
                        options={['Expiry', 'Non-Expiry']}
                        value={expiryType}
                        onChange={(value) => setExpiryType(value as 'Expiry' | 'Non-Expiry')}
                        className="min-h-[49px]"
                      />
                      {expiryType === 'Non-Expiry' && (
                        <p className="text-[10px] text-ui-muted mt-2">Asset will not expire</p>
                      )}
                    </div>
                  )}

                  {/* Expiry Days */}
                  {(assetType === 'NFT' || expiryType === 'Expiry') && (
                    <div>
                      <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">
                        Expiry (Days){assetType === 'NFT' ? ' - Optional' : ''}
                      </label>
                      <input
                        className={`${studioInputClass} ${assetType === 'RWA' && expiryType === 'Non-Expiry' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        placeholder={assetType === 'NFT' ? 'Optional' : 'e.g. 30'}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(e.target.value)}
                        onKeyDown={preventInvalidNumberKeyDown}
                        disabled={assetType === 'RWA' && expiryType === 'Non-Expiry'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Mint Button */}
              <div className={`${studioCardClass} relative z-[10]`}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">
                    {assetType === 'RWA' ? '5' : '4'}
                  </span>
                  <h2 className="text-lg font-bold text-ui-primary">Mint Asset</h2>
                </div>
                {assetType === 'RWA' && (
                  <MintingDeliverySection
                    walletAddress={address}
                    submitAttempt={deliveryValidationAttempt}
                    onChange={setMintingDeliveryState}
                  />
                )}
                <button
                  className={`w-full h-[45px] px-6 ${assetType === 'RWA' ? 'mt-6' : ''} bg-[#2CC295] text-black rounded-full text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
                  onClick={handleMint}
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin mr-2" size={16} />
                      {statusMessage}
                    </div>
                  ) : (
                    'Mint Asset'
                  )}
                </button>
                {statusMessage && !isPending && !isConfirming && (
                  <p className="mt-2 text-sm text-ui-muted">
                    {statusMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="xl:col-span-4">
              <div className="sticky top-0 space-y-6">
                {/* Live Preview */}
                <div className="bg-ui-card border border-ui-border-subtle rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold text-ui-muted uppercase tracking-widest">Live Preview</h3>
                    <span className="px-3 py-1 bg-ui-input backdrop-blur-md text-primary border border-[#2CC295]/30 rounded-full text-[10px] font-bold uppercase">
                      {assetType}
                    </span>
                  </div>
                  <div className="bg-ui-input rounded-xl overflow-hidden border border-ui-border-subtle">
                    <div className="aspect-square bg-ui-input flex items-center justify-center relative group">
                      {assetType === 'RWA' && uploadedImages.length > 0 ? (
                        <>
                          <img
                            alt={`${assetName || 'RWA Asset'} - Image ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover"
                            src={uploadedImages[currentImageIndex].url}
                            onError={() => setImageLoadError(true)}
                          />
                          {/* Image Navigation - Only show if more than 1 image */}
                          {uploadedImages.length > 1 && (
                            <>
                              {/* Previous Button */}
                              <button
                                onClick={() => setCurrentImageIndex(prev =>
                                  prev === 0 ? uploadedImages.length - 1 : prev - 1
                                )}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-ui-dropdown hover:bg-ui-input-focus rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronLeft size={20} className="text-ui-primary" />
                              </button>
                              {/* Next Button */}
                              <button
                                onClick={() => setCurrentImageIndex(prev =>
                                  prev === uploadedImages.length - 1 ? 0 : prev + 1
                                )}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-ui-dropdown hover:bg-ui-input-focus rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronRight size={20} className="text-ui-primary" />
                              </button>
                              {/* Image Counter */}
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-ui-dropdown backdrop-blur-sm rounded-full text-xs text-ui-primary font-mono">
                                {currentImageIndex + 1} / {uploadedImages.length}
                              </div>
                            </>
                          )}
                        </>
                      ) : assetType === 'NFT' && uploadedMedia ? (
                        <img
                          alt={assetName || 'Asset Preview'}
                          className="w-full h-full object-cover"
                          src={uploadedMedia.url}
                          onError={() => setImageLoadError(true)}
                        />
                      ) : (
                        <div className="relative w-full h-full bg-gradient-to-br from-[var(--t-input-bg)] via-[var(--t-surface-2)] to-[var(--t-input-focus-bg)]">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-6">
                              <ImageIcon className="text-ui-muted mx-auto mb-3" size={56} />
                              <p className="text-ui-muted text-sm font-medium">Awaiting asset upload</p>
                              <p className="text-ui-muted text-xs mt-1">
                                {assetType === 'RWA' ? 'Upload 1-5 images' : 'Upload image or video'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-ui-primary font-bold">{assetName || 'Genesis Asset'}</h4>
                          <p className="text-[10px] text-ui-muted uppercase">Collection Name</p>
                        </div>
                        <Heart className="text-ui-muted" size={18} />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-ui-muted uppercase mb-1">Price</p>
                          <p className="text-ui-primary font-mono font-bold">{price ? `${price} ${priceCurrency}` : `0.00 ${priceCurrency}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-ui-muted uppercase mb-1">Rarity</p>
                          <span className="text-[10px] px-2 py-0.5 bg-[#2CC295]/10 text-primary rounded-full font-bold">Common</span>
                        </div>
                      </div>
                      {assetType === 'RWA' && previewConfigurableAttributes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-ui-border-subtle space-y-2.5">
                          <p className="text-[10px] text-ui-muted uppercase tracking-widest font-bold">Attributes</p>
                          {previewConfigurableAttributes.map((group) => (
                            <div key={group.id} className="rounded-xl bg-ui-card px-3 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-ui-primary">{group.label}</p>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-ui-muted">
                                  {group.required ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              {group.helpText && (
                                <p className="text-[10px] text-ui-muted mt-1">{group.helpText}</p>
                              )}
                              <p className="text-[10px] text-ui-secondary mt-1.5">
                                {group.options.map((option) => option.label).join(' · ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="bg-ui-card border border-ui-border-subtle rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-ui-muted">Contract Standard</span>
                    <span className="text-ui-primary font-medium text-right">ERC-721</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ui-muted">Metadata Storage</span>
                    <span className="text-ui-primary font-medium text-right ml-auto">IPFS (Decentralized)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
