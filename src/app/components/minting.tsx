import { Sparkles, AlertCircle, Heart, Eye, Clock, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { PillSegmentedToggle } from '@/app/components/pill-segmented-toggle';
import { StandardToggle } from '@/app/components/standard-toggle';
import { ImageUpload, UploadedImage } from '@/app/components/image-upload';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { MintingDeliverySection, type MintingDeliveryState } from '@/app/components/minting-delivery-section';
import { MintingDraftsList } from '@/app/components/minting-drafts-list';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { useMintAsset } from '@/hooks/useAssets';
import { useAllUnits } from '@/hooks/useUnits';
import { AssetType, EXPLORER_URLS } from '@/config/contracts';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useTheme } from '@/app/contexts/ThemeContext';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';
import type { RwaConfigurableAttributeGroup } from '@/app/types/asset';
import type { AssetDeliverySnapshot, AssetDetails, AssetLocationSnapshot } from '@/types/asset';
import type { MyAssetNft, MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import { shortenAddress } from '@/utils/profileUtils';
import { upsertRuntimeMintedAsset, type RuntimeMintedAssetRecord } from '@/utils/runtimeMintedAssets';
import { syncRuntimeMintedAssetToMarketplace } from '@/utils/assetMetadataSync';
import {
  createMintingDraftId,
  deleteMintingDraft,
  loadMintingDrafts,
  subscribeToMintingDrafts,
  upsertMintingDraft,
  type MintingDraftDeliveryState,
  type MintingDraftMedia,
  type MintingDraftRecord,
} from '@/utils/mintingDrafts';
import {
  getCategoryDisplayLabel,
  getTaxonomyCategoryOptions,
  hydrateTaxonomyFromSupabase,
  normalizeCategoryFilterValue,
  TAXONOMY_SYNC_EVENT,
} from '@/utils/taxonomy';
import { getTaxonomyBadgeTone } from '@/utils/taxonomyAppearance';
import { getUnitDisplayLabel } from '@/utils/onchainNormalization';
import { getMarketplaceAssetChainInfo } from '@/utils/marketplaceNetwork';
import { ORINA_RWA_ABI } from '@/config/abis';
import { decodeEventLog } from 'viem';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { PROTOCOL_NETWORK_OPTIONS } from '@/utils/protocolNetwork';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { dispatchAppNavigation, navigateToMarketplaceCategory } from '@/utils/appNavigation';
import type { MintingSidebarTelemetry } from '@/app/components/minting-right-sidebar';

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
  sourceDraftId?: string | null;
  category?: string;
  subcategory?: string;
  name: string;
  description: string;
  blockchain: string;
  unitId: string;
  unitName?: string;
  unitLabel?: string;
  totalAmount: string;
  price: string;
  priceCurrency: string;
  images: string[];
  configurableAttributes: RwaConfigurableAttributeGroup[];
  deliverySnapshot?: AssetDeliverySnapshot;
  assetLocationSnapshot?: AssetLocationSnapshot;
  requestedAt: number;
};

type MintSuccessState = {
  assetId: string;
  assetName: string;
  assetType: 'RWA' | 'NFT';
  hash: `0x${string}`;
  chainId: number | null;
  marketplaceSynced: boolean;
  category?: string;
  subcategory?: string;
};

type ReceiptLogLike = {
  address: `0x${string}`;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

type MintingWorkspaceMode = 'Create' | 'Drafts';
const MINTING_WORKSPACE_TABS: MintingWorkspaceMode[] = ['Create', 'Drafts'];

type MintingProps = {
  onSidebarTelemetryChange?: (telemetry: MintingSidebarTelemetry | null) => void;
};

type MintingGasEstimateState = {
  isEstimatingGas: boolean;
  gasEstimateError: string | null;
  estimatedGasUnits: string | null;
  gasPriceWei: string | null;
  estimatedCostWei: string | null;
  lastEstimatedAt: number | null;
};

const EMPTY_MINTING_GAS_ESTIMATE_STATE: MintingGasEstimateState = {
  isEstimatingGas: false,
  gasEstimateError: null,
  estimatedGasUnits: null,
  gasPriceWei: null,
  estimatedCostWei: null,
  lastEstimatedAt: null,
};

function resolveMintingUnitId(assetType: 'RWA' | 'NFT', unitId: string): string {
  return assetType === 'RWA' ? unitId : '0';
}

function resolveMintingExpiryDays(
  assetType: 'RWA' | 'NFT',
  expiryType: 'Expiry' | 'Non-Expiry',
  expiryDays: string,
): string {
  if (assetType === 'RWA') {
    return expiryType === 'Expiry' ? expiryDays.trim() : '';
  }
  return expiryDays.trim();
}

function resolveMintingExpiryTimestamp(expiryDays: string): bigint {
  return expiryDays && Number(expiryDays) > 0
    ? BigInt(Math.floor(Date.now() / 1000) + Number(expiryDays) * 24 * 60 * 60)
    : 0n;
}

function parseWholePositiveAmount(raw: string): bigint | null {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = BigInt(normalized);
  return parsed > 0n ? parsed : null;
}

function formatGasEstimateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (!message) return 'Unable to estimate gas right now.';
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds to estimate this mint transaction.';
  }
  if (message.includes('execution reverted')) {
    return 'Mint transaction is currently not executable with the selected parameters.';
  }
  return message.split(/Request Arguments:|Contract Call:/)[0].trim() || 'Unable to estimate gas right now.';
}

function cloneMintingAttributeOptions(options: RwaConfigurableAttributeGroup['options']) {
  return options.map((option) => ({ ...option }));
}

function cloneMintingAttributeGroups(groups: RwaConfigurableAttributeGroup[]) {
  return groups.map((group) => ({
    ...group,
    options: cloneMintingAttributeOptions(group.options),
  }));
}

function normalizeDraftMedia(value: Partial<UploadedImage> | null | undefined): MintingDraftMedia | null {
  if (!value?.url) return null;
  return {
    ipfsHash: String(value.ipfsHash || ''),
    url: String(value.url || ''),
    fileName: String(value.fileName || ''),
    fileSize: Number(value.fileSize || 0),
    mimeType: String(value.mimeType || ''),
  };
}

function toUploadedImage(value: MintingDraftMedia | null | undefined): UploadedImage | null {
  if (!value?.url) return null;
  return {
    ipfsHash: String(value.ipfsHash || ''),
    url: String(value.url || ''),
    fileName: String(value.fileName || ''),
    fileSize: Number(value.fileSize || 0),
    mimeType: String(value.mimeType || ''),
  };
}

function toUploadedImages(values: MintingDraftMedia[]): UploadedImage[] {
  return values
    .map((value) => toUploadedImage(value))
    .filter((value): value is UploadedImage => Boolean(value));
}

function hasMeaningfulDraftContent(input: {
  assetName: string;
  description: string;
  price: string;
  totalAmount: string;
  uploadedMedia: UploadedImage | null;
  uploadedImages: UploadedImage[];
  configurableAttributes: RwaConfigurableAttributeGroup[];
  draftSubcategory: string;
}) {
  return Boolean(
    input.assetName.trim() ||
    input.description.trim() ||
    input.price.trim() ||
    input.totalAmount.trim() ||
    input.uploadedMedia?.url ||
    input.uploadedImages.length > 0 ||
    input.configurableAttributes.length > 0 ||
    input.draftSubcategory.trim()
  );
}

function computeDraftCompleteness(input: {
  assetType: 'RWA' | 'NFT';
  assetName: string;
  description: string;
  price: string;
  totalAmount: string;
  uploadedMedia: UploadedImage | null;
  uploadedImages: UploadedImage[];
  category: string;
  subcategory: string;
  blockchain: string;
  deliveryState: MintingDraftDeliveryState | null;
}) {
  const checks = [
    Boolean(input.assetName.trim()),
    Boolean(input.description.trim()),
    Boolean(input.price.trim()),
    Boolean(input.totalAmount.trim()),
    Boolean(input.category.trim()),
    Boolean(input.blockchain.trim()),
  ];

  if (input.assetType === 'RWA') {
    checks.push(input.uploadedImages.length > 0);
    checks.push(Boolean(input.subcategory.trim()));
    checks.push(Boolean(input.deliveryState?.isValid));
  } else {
    checks.push(Boolean(input.uploadedMedia?.url));
    checks.push(Boolean(input.subcategory.trim()));
  }

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

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

function formatMintingPreviewDuration(expiryDays: string): string {
  const normalizedValue = String(expiryDays || '').trim();
  if (!normalizedValue) return 'No expiry';

  const parsedDays = Number(normalizedValue);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) return 'No expiry';
  if (parsedDays >= 1) return `${Math.floor(parsedDays)}d`;

  const hours = Math.max(1, Math.round(parsedDays * 24));
  return `${hours}h`;
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
  txHash: string,
  mintedAssetId: bigint,
  assetContract: `0x${string}`,
): RuntimeMintedAssetRecord {
  const now = Date.now();
  const image = draft.images[0] || 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800';
  const normalizedBlockchain = normalizeMintBlockchainName(draft.blockchain);
  const priceNumber = parsePositiveNumber(draft.price, 0);
  const currentPrice = `${draft.price || '0'} ${draft.priceCurrency}`;
  const floorPrice = `${Math.max(priceNumber * 0.9, 0).toFixed(priceNumber >= 1 ? 2 : 4).replace(/\.?0+$/, '') || '0'} ${draft.priceCurrency}`;
  const baseId = `mint-${txHash.slice(2, 10)}-${draft.requestedAt.toString(36)}`;
  const tokenId = mintedAssetId.toString();
  const totalAmountNumber = Math.max(1, Math.trunc(parsePositiveNumber(draft.totalAmount, 1)));
  const categorySlug = normalizeCategoryFilterValue(
    draft.category || (draft.assetType === 'RWA' ? 'physical_goods' : 'digital_assets'),
    draft.subcategory
  );
  const categoryLabel = getCategoryDisplayLabel(categorySlug, draft.subcategory);
  const details: AssetDetails = {
    id: tokenId,
    assetUid: baseId,
    tokenId,
    onchainAssetId: tokenId,
    unitId: draft.unitId || undefined,
    unitName: draft.unitName || (draft.unitId ? getUnitDisplayLabel(Number(draft.unitId)) : undefined),
    unitLabel: draft.unitLabel || draft.unitName || (draft.unitId ? getUnitDisplayLabel(Number(draft.unitId)) : undefined),
    name: draft.name,
    description: draft.description || `${draft.name} minted on Orina.`,
    category: categorySlug,
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
    contractAddress: assetContract,
    tokenStandard: 'OrinaRWA Asset Record',
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
          id: tokenId,
          name: draft.name,
          type: 'RWA',
          category: categorySlug,
          image,
          status: 'Pending Indexing',
          availableAmount: totalAmountNumber,
          totalAmount: totalAmountNumber,
          minPrice: currentPrice,
          mintedDate: formatMintedDate(now),
        }
      : {
          id: tokenId,
          name: draft.name,
          type: 'NFT',
          category: categorySlug,
          image,
          currentPrice,
          floorPrice,
          collection: 'Custom Collection',
          transferable: true,
        };

  return {
    id: tokenId,
    walletAddress: draft.walletAddress.toLowerCase(),
    assetType: draft.assetType,
    createdAt: now,
    txHash,
    myAsset,
    details,
  };
}

function extractMintedAssetIdFromReceipt(
  receipt: { logs: readonly ReceiptLogLike[] } | null | undefined,
  assetContract: `0x${string}`,
): bigint | null {
  if (!receipt) return null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== assetContract.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: ORINA_RWA_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName !== 'AssetMinted') continue;
      return typeof decoded.args.assetId === 'bigint' ? decoded.args.assetId : null;
    } catch {
      // ignore unrelated logs
    }
  }

  return null;
}

export function Minting({ onSidebarTelemetryChange }: MintingProps = {}) {
  const [workspaceMode, setWorkspaceMode] = useState<MintingWorkspaceMode>('Create');
  const [assetType, setAssetType] = useState<'RWA' | 'NFT'>('RWA');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState('0');
  const [totalAmount, setTotalAmount] = useState('1000');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('ETH');
  const [draftCategory, setDraftCategory] = useState(assetType === 'RWA' ? 'physical_goods' : 'digital_assets');
  const [draftSubcategory, setDraftSubcategory] = useState('');
  const [taxonomyVersion, setTaxonomyVersion] = useState(0);
  const [expiryType, setExpiryType] = useState<'Expiry' | 'Non-Expiry'>('Expiry');
  const [expiryDays, setExpiryDays] = useState('30');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedImage | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]); // Multi-image for RWA
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For image carousel
  const [configurableAttributes, setConfigurableAttributes] = useState<RwaConfigurableAttributeGroup[]>([]);
  const [mintingDrafts, setMintingDrafts] = useState<MintingDraftRecord[]>([]);
  const [mintingDeliveryState, setMintingDeliveryState] = useState<MintingDeliveryState | null>(null);
  const [deliveryStateSeed, setDeliveryStateSeed] = useState<MintingDraftDeliveryState | null>(null);
  const [deliverySectionVersion, setDeliverySectionVersion] = useState(0);
  const [deliveryValidationAttempt, setDeliveryValidationAttempt] = useState(0);
  const [pendingRuntimeMintDraft, setPendingRuntimeMintDraft] = useState<PendingRuntimeMintDraft | null>(null);
  const [lastMintSuccess, setLastMintSuccess] = useState<MintSuccessState | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [gasEstimateState, setGasEstimateState] = useState<MintingGasEstimateState>(EMPTY_MINTING_GAS_ESTIMATE_STATE);

  // ── On-chain unit data ─────────────────────────────────────────
  const { units: allUnits, isLoading: unitsLoading, isOnChain } = useAllUnits();
  const selectedUnit = allUnits.find((u) => String(u.id) === unitId) ?? allUnits[0];


  const { address, isConnected } = useEffectiveViewer();
  const { selectedNetwork, selectedNetworkKey, syncNetworkFromValue } = useProtocolNetworkRouter();
  const { assetAddress, chainId } = useProtocolDataNetwork();
  const blockchain = selectedNetwork.label;
  const publicClient = usePublicClient({ chainId: chainId ?? undefined });
  const { theme } = useTheme();
  const { mintAsset, hash, isPending, isConfirming, isConfirmed, error, reset } = useMintAsset();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const selectedMintCategory = useMemo(
    () => normalizeCategoryFilterValue(draftCategory, draftSubcategory),
    [draftCategory, draftSubcategory],
  );
  const mintCategoryLabel = useMemo(
    () => getCategoryDisplayLabel(selectedMintCategory, draftSubcategory || undefined),
    [draftSubcategory, selectedMintCategory],
  );
  const mintCategoryOptions = useMemo(() => {
    const taxonomyOptions = getTaxonomyCategoryOptions();
    if (!selectedMintCategory) return taxonomyOptions;
    if (taxonomyOptions.some((option) => option.value === selectedMintCategory)) {
      return taxonomyOptions;
    }
    return [
      ...taxonomyOptions,
      {
        value: selectedMintCategory,
        label: getCategoryDisplayLabel(selectedMintCategory, draftSubcategory || undefined),
      },
    ];
  }, [draftSubcategory, selectedMintCategory, taxonomyVersion]);

  const syncMintingDrafts = async () => {
    const drafts = await loadMintingDrafts(address);
    setMintingDrafts(drafts);
  };

  const resetMintingEditor = (nextAssetType: 'RWA' | 'NFT' = assetType) => {
    setAssetType(nextAssetType);
    setEditingDraftId(null);
    setAssetName('');
    setDescription('');
    setUnitId('0');
    setTotalAmount('1000');
    setPrice('');
    setPriceCurrency('ETH');
    setDraftCategory(nextAssetType === 'RWA' ? 'physical_goods' : 'digital_assets');
    setDraftSubcategory('');
    setExpiryType('Expiry');
    setExpiryDays('30');
    setUploadedMedia(null);
    setUploadedImages([]);
    setCurrentImageIndex(0);
    setConfigurableAttributes([]);
    setMintingDeliveryState(null);
    setDeliveryStateSeed(null);
    setDeliverySectionVersion((current) => current + 1);
    setDeliveryValidationAttempt(0);
    setPendingRuntimeMintDraft(null);
    setLastMintSuccess(null);
    setAmountError(null);
    reset();
  };

  const handleAssetTypeChange = (value: 'RWA' | 'NFT') => {
    setAssetType(value);
    setDraftCategory(value === 'RWA' ? 'physical_goods' : 'digital_assets');
    setDraftSubcategory('');
    setAmountError(null);
  };

  const buildCurrentMintingDraft = (): MintingDraftRecord | null => {
    if (!address) return null;

    const hasContent = hasMeaningfulDraftContent({
      assetName,
      description,
      price,
      totalAmount,
      uploadedMedia,
      uploadedImages,
      configurableAttributes,
      draftSubcategory,
    });
    if (!hasContent) return null;

    const now = Date.now();
    const draftId = editingDraftId || createMintingDraftId();
    const uploadedMediaDraft = normalizeDraftMedia(uploadedMedia);
    const uploadedImageDrafts = uploadedImages
      .map((image) => normalizeDraftMedia(image))
      .filter((image): image is MintingDraftMedia => Boolean(image));
    const previewImage = uploadedImageDrafts[0]?.url || uploadedMediaDraft?.url || '';
    const completeness = computeDraftCompleteness({
      assetType,
      assetName,
      description,
      price,
      totalAmount,
      uploadedMedia,
      uploadedImages,
      category: draftCategory,
      subcategory: draftSubcategory,
      blockchain,
      deliveryState: (mintingDeliveryState as MintingDraftDeliveryState | null) ?? null,
    });
    const existingDraft = editingDraftId ? mintingDrafts.find((draft) => draft.id === editingDraftId) : null;

    return {
      id: draftId,
      walletAddress: address.toLowerCase(),
      status: 'draft',
      assetType,
      name: assetName.trim(),
      description: description.trim(),
      category: draftCategory,
      subcategory: draftSubcategory,
      blockchain,
      unitId,
      totalAmount,
      price,
      priceCurrency,
      expiryType,
      expiryDays,
      uploadedMedia: uploadedMediaDraft,
      uploadedImages: uploadedImageDrafts,
      configurableAttributes: cloneMintingAttributeGroups(configurableAttributes),
      deliveryState: (mintingDeliveryState as MintingDraftDeliveryState | null) ?? null,
      previewImage,
      completeness,
      createdAt: existingDraft?.createdAt ?? now,
      updatedAt: now,
    };
  };

  const handleSaveDraft = async () => {
    if (!address) {
      toast.error('Connect wallet to save a draft');
      return;
    }

    const draft = buildCurrentMintingDraft();
    if (!draft) {
      toast.error('Add some asset details before saving a draft');
      return;
    }

    await upsertMintingDraft(draft);
    setWorkspaceMode('Drafts');
    toast.success(editingDraftId ? 'Draft updated' : 'Draft saved');
    resetMintingEditor(draft.assetType);
  };

  const handleEditDraft = (draftId: string) => {
    const draft = getDraftById(draftId);
    if (!draft) {
      toast.error('Draft not found');
      return;
    }

    setWorkspaceMode('Create');
    setEditingDraftId(draft.id);
    setAssetType(draft.assetType);
    setAssetName(draft.name);
    setDescription(draft.description);
    void syncNetworkFromValue(draft.blockchain);
    setUnitId(draft.unitId || '0');
    setTotalAmount(draft.totalAmount || '1000');
    setPrice(draft.price || '');
    setPriceCurrency(draft.priceCurrency || 'ETH');
    setDraftCategory(draft.category || (draft.assetType === 'RWA' ? 'physical_goods' : 'digital_assets'));
    setDraftSubcategory(draft.subcategory || '');
    setExpiryType(draft.expiryType);
    setExpiryDays(draft.expiryDays);
    setUploadedMedia(toUploadedImage(draft.uploadedMedia));
    setUploadedImages(toUploadedImages(draft.uploadedImages));
    setCurrentImageIndex(0);
    setConfigurableAttributes(cloneMintingAttributeGroups(draft.configurableAttributes));
    setMintingDeliveryState((draft.deliveryState as MintingDeliveryState | null) ?? null);
    setDeliveryStateSeed((draft.deliveryState as MintingDraftDeliveryState | null) ?? null);
    setDeliverySectionVersion((current) => current + 1);
    setDeliveryValidationAttempt(0);
    setPendingRuntimeMintDraft(null);
    setAmountError(null);
    reset();
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!address) return;

    const draft = mintingDrafts.find((item) => item.id === draftId);
    if (!draft) return;

    const confirmed = window.confirm(`Delete draft "${draft.name || `${draft.assetType} draft`}"?`);
    if (!confirmed) return;

    await deleteMintingDraft(address, draftId);
    if (editingDraftId === draftId) {
      resetMintingEditor(draft.assetType);
    }
    toast.success('Draft deleted');
  };

  const getDraftById = (draftId: string) => {
    return mintingDrafts.find((draft) => draft.id === draftId) || null;
  };

  useEffect(() => {
    void syncMintingDrafts();
    const unsubscribe = subscribeToMintingDrafts(() => void syncMintingDrafts());
    return () => unsubscribe();
  }, [address]);

  useEffect(() => {
    if (!error || !pendingRuntimeMintDraft) return;
    setPendingRuntimeMintDraft(null);
  }, [error, pendingRuntimeMintDraft]);

  useEffect(() => {
    if (uploadedImages.length === 0) {
      setCurrentImageIndex(0);
      return;
    }

    if (currentImageIndex >= uploadedImages.length) {
      setCurrentImageIndex(uploadedImages.length - 1);
    }
  }, [currentImageIndex, uploadedImages]);

  useEffect(() => {
    if (!isConfirmed || !hash || !pendingRuntimeMintDraft || !publicClient || !assetAddress) return;

    let cancelled = false;

    const persistMintedRuntimeRecord = async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        const mintedAssetId = extractMintedAssetIdFromReceipt(
          receipt as { logs: readonly ReceiptLogLike[] },
          assetAddress,
        );
        if (!mintedAssetId) {
          throw new Error('Mint receipt did not expose AssetMinted(assetId)');
        }
        if (cancelled) return;

        const runtimeRecord = buildRuntimeMintedAssetRecord(
          pendingRuntimeMintDraft,
          hash,
          mintedAssetId,
          assetAddress,
        );

        upsertRuntimeMintedAsset(runtimeRecord, {
          chainId,
          assetContract: assetAddress,
        });

        const marketplaceSync = await syncRuntimeMintedAssetToMarketplace(
          runtimeRecord,
          pendingRuntimeMintDraft.walletAddress,
          chainId,
        );

        if (marketplaceSync.ok) {
          upsertRuntimeMintedAsset(
            {
              ...runtimeRecord,
              myAsset: runtimeRecord.assetType === 'RWA'
                ? {
                    ...runtimeRecord.myAsset,
                    status: 'Active',
                  }
                : runtimeRecord.myAsset,
            } as RuntimeMintedAssetRecord,
            {
              chainId,
              assetContract: assetAddress,
            },
          );
        } else {
          toast.warning('Asset minted on-chain, but marketplace sync is still pending.');
        }

        setLastMintSuccess({
          assetId: mintedAssetId.toString(),
          assetName: pendingRuntimeMintDraft.name,
          assetType: pendingRuntimeMintDraft.assetType,
          hash,
          chainId: chainId ?? null,
          marketplaceSynced: marketplaceSync.ok,
          category: pendingRuntimeMintDraft.category,
          subcategory: pendingRuntimeMintDraft.subcategory,
        });

        if (pendingRuntimeMintDraft.sourceDraftId) {
          void deleteMintingDraft(pendingRuntimeMintDraft.walletAddress, pendingRuntimeMintDraft.sourceDraftId);
        }
        setPendingRuntimeMintDraft(null);
        setEditingDraftId(null);
        reset();
      } catch (mintSyncError) {
        console.error('[Minting] Failed to persist canonical minted asset runtime record', mintSyncError);
        toast.error(mintSyncError instanceof Error ? mintSyncError.message : 'Unable to resolve minted asset ID from chain');
      }
    };

    void persistMintedRuntimeRecord();

    return () => {
      cancelled = true;
    };
  }, [assetAddress, chainId, hash, isConfirmed, pendingRuntimeMintDraft, publicClient, reset]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.name) setAssetName(detail.name);
      if (detail.description) setDescription(detail.description);
      if (detail.estimatedPrice?.suggested) setPrice(String(detail.estimatedPrice.suggested));
      if (detail.category) setDraftCategory(String(detail.category));
      if (detail.subcategory) setDraftSubcategory(String(detail.subcategory));
    };
    window.addEventListener('ai:mint-draft', handler);
    return () => window.removeEventListener('ai:mint-draft', handler);
  }, []);

  useEffect(() => {
    const syncTaxonomy = () => {
      setTaxonomyVersion((value) => value + 1);
    };

    void hydrateTaxonomyFromSupabase().catch(() => undefined);
    window.addEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    return () => {
      window.removeEventListener(TAXONOMY_SYNC_EVENT, syncTaxonomy as EventListener);
    };
  }, []);

  // ── Amount validation against UnitRegistry constraints ─────────
  const validateAmount = (raw: string, unit: typeof selectedUnit): string | null => {
    const n = Number(raw);
    if (!raw || isNaN(n) || n <= 0) return 'Amount must be a positive number';
    if (!unit) return null;
    const amount = BigInt(Math.trunc(n));
    if (amount < unit.minAmount) {
      return `Minimum amount: ${unit.minAmount.toString()} (${unit.name})`;
    }
    if (unit.step > 0n && amount % unit.step !== 0n) {
      return `Amount must be a multiple of ${unit.step.toString()} (step for ${unit.name})`;
    }
    return null;
  };

  const handleAmountChange = (raw: string) => {
    setTotalAmount(raw);
    if (assetType === 'RWA' && selectedUnit) {
      setAmountError(validateAmount(raw, selectedUnit));
    } else {
      setAmountError(null);
    }
  };

  const handleUnitChange = (value: string) => {
    setUnitId(value);
    const unit = allUnits.find((u) => String(u.id) === value);
    if (unit) setAmountError(validateAmount(totalAmount, unit));
  };

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

    // ── Unit constraint validation (RWA) ──────────────────────────
    if (assetType === 'RWA' && selectedUnit) {
      const unitErr = validateAmount(totalAmount, selectedUnit);
      if (unitErr) {
        setAmountError(unitErr);
        return;
      }
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

    if (!normalizedMintAmount) {
      alert('Total amount must be a whole positive number');
      return;
    }

    const continueMintAssets = async () => {
      try {
        setLastMintSuccess(null);
        reset();
        const expiryTimestamp = resolveMintingExpiryTimestamp(resolvedExpiryDays);

        setPendingRuntimeMintDraft({
          walletAddress: address,
          assetType,
          sourceDraftId: editingDraftId,
          category: draftCategory,
          subcategory: draftSubcategory || undefined,
          name: assetName.trim(),
          description: description.trim(),
          blockchain,
          unitId: resolvedUnitId,
          unitName: selectedUnit?.name,
          unitLabel: selectedUnit?.label,
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
          normalizedMintAmount,
          expiryTimestamp,
          assetType === 'RWA' ? AssetType.RWA : AssetType.NFT,
        );
      } catch (err) {
        setPendingRuntimeMintDraft(null);
        console.error('Minting failed:', err);
      }
    };

    if (!(await requireWalletActionAsync({
      capability: 'protocol_mint_write',
      actionLabel: 'mint assets',
      fallbackPage: 'minting',
      onSecurityCheckConfirmed: continueMintAssets,
    }))) {
      return;
    }

    await continueMintAssets();
  };

  const getStatusMessage = () => {
    if (isPending) return 'Waiting for wallet confirmation...';
    if (isConfirming) return 'Transaction confirming on blockchain...';
    if (lastMintSuccess) {
      return lastMintSuccess.marketplaceSynced
        ? 'Asset minted successfully!'
        : 'Asset minted on-chain. Marketplace sync is still pending.';
    }
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
  const statusHash = lastMintSuccess?.hash ?? hash;
  const lastMintExplorerUrl = lastMintSuccess?.hash
    ? `${EXPLORER_URLS[lastMintSuccess.chainId ?? 97] ?? EXPLORER_URLS[97]}/tx/${lastMintSuccess.hash}`
    : null;
  const studioCardClass = 'bg-ui-card rounded-[24px] p-6 backdrop-blur-[10px]';
  const mintingInputToneClass = 'text-ui-secondary';
  const studioInputClass = `w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-3 text-[14px] leading-[18px] font-semibold ${mintingInputToneClass} focus:bg-[var(--t-surface-10)] focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 shadow-none`;
  const mintingSelectTriggerClass = `minting-neutral-select-trigger !h-[49px] !rounded-lg !border-0 !shadow-none !px-4 !text-[14px] !leading-[18px] !font-semibold !text-ui-secondary hover:!bg-[var(--t-surface-10)]`;
  const mintingNeutralTriggerStyle = theme === 'light' ? { background: 'var(--t-surface-5)' } : undefined;
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
  const resolvedUnitId = useMemo(() => resolveMintingUnitId(assetType, unitId), [assetType, unitId]);
  const resolvedExpiryDays = useMemo(
    () => resolveMintingExpiryDays(assetType, expiryType, expiryDays),
    [assetType, expiryDays, expiryType],
  );
  const normalizedMintAmount = useMemo(() => parseWholePositiveAmount(totalAmount), [totalAmount]);
  const mintNativeSymbol = chainId === 56 || chainId === 97 ? 'BNB' : 'ETH';
  const canEstimateMintGas =
    Boolean(isConnected && address && chainId && assetAddress && publicClient)
    && normalizedMintAmount !== null
    && !amountError;
  const previewImageUrl = assetType === 'RWA'
    ? uploadedImages[currentImageIndex]?.url || uploadedImages[0]?.url || ''
    : uploadedMedia?.url || '';
  const previewHasMedia = Boolean(previewImageUrl);
  const previewMediaCount = assetType === 'RWA' ? uploadedImages.length : (uploadedMedia?.url ? 1 : 0);
  const previewCategoryTone = useMemo(() => getTaxonomyBadgeTone(selectedMintCategory), [selectedMintCategory]);
  const previewChainInfo = useMemo(
    () => getMarketplaceAssetChainInfo({
      chainId: chainId ?? selectedNetwork.chainId ?? undefined,
      blockchain: selectedNetworkKey || blockchain,
      network: chainId === 97 || selectedNetworkKey === 'bnb-testnet' ? 'testnet' : 'mainnet',
    }),
    [blockchain, chainId, selectedNetwork.chainId, selectedNetworkKey],
  );
  const previewPriceNumber = useMemo(() => parsePositiveNumber(price, 0), [price]);
  const previewPriceValue = price ? `${price} ${priceCurrency}` : `0.00 ${priceCurrency}`;
  const previewPriceUsd = previewPriceNumber > 0 ? formatRuntimeUsd(previewPriceNumber, priceCurrency) : null;
  const previewEndingIn = useMemo(() => formatMintingPreviewDuration(resolvedExpiryDays), [resolvedExpiryDays]);
  const previewSupplyValue = assetType === 'RWA'
    ? `${normalizedMintAmount?.toString() || String(Math.max(1, Math.trunc(parsePositiveNumber(totalAmount, 1))))} units`
    : '1 of 1';
  const previewChainBadgeLabel =
    previewChainInfo.blockchain === 'BSC'
      ? 'BNB'
      : previewChainInfo.blockchain.slice(0, 3).toUpperCase();
  const previewTitle = assetName.trim() || 'Genesis Asset';
  const previewDescription =
    description.trim() || 'Marketplace card preview updates as you edit mint metadata, pricing, and media.';

  useEffect(() => {
    if (!onSidebarTelemetryChange) return;
    return () => onSidebarTelemetryChange(null);
  }, [onSidebarTelemetryChange]);

  useEffect(() => {
    if (!onSidebarTelemetryChange) return;

    onSidebarTelemetryChange({
      chainId,
      networkKey: selectedNetworkKey,
      networkLabel: selectedNetwork.label,
      nativeTokenSymbol: mintNativeSymbol,
      isTestnet: chainId === 97,
      walletAddress: address ?? null,
      isWalletConnected: Boolean(isConnected && address),
      assetType,
      unitId: resolvedUnitId,
      totalAmount,
      expiryDays: resolvedExpiryDays,
      canEstimate: canEstimateMintGas,
      isEstimatingGas: gasEstimateState.isEstimatingGas,
      gasEstimateError: gasEstimateState.gasEstimateError,
      estimatedGasUnits: gasEstimateState.estimatedGasUnits,
      gasPriceWei: gasEstimateState.gasPriceWei,
      estimatedCostWei: gasEstimateState.estimatedCostWei,
      lastEstimatedAt: gasEstimateState.lastEstimatedAt,
    });
  }, [
    address,
    assetType,
    canEstimateMintGas,
    chainId,
    gasEstimateState.estimatedCostWei,
    gasEstimateState.estimatedGasUnits,
    gasEstimateState.gasEstimateError,
    gasEstimateState.gasPriceWei,
    gasEstimateState.isEstimatingGas,
    gasEstimateState.lastEstimatedAt,
    isConnected,
    mintNativeSymbol,
    onSidebarTelemetryChange,
    resolvedExpiryDays,
    resolvedUnitId,
    selectedNetwork.label,
    selectedNetworkKey,
    totalAmount,
  ]);

  useEffect(() => {
    if (!canEstimateMintGas || !publicClient || !chainId || !assetAddress || !address) {
      setGasEstimateState((current) => {
        const nextError =
          isConnected && totalAmount.trim() && normalizedMintAmount === null
            ? 'Enter a whole-number amount to estimate gas.'
            : amountError;

        if (
          current.isEstimatingGas === false
          && current.gasEstimateError === nextError
          && current.estimatedGasUnits === null
          && current.gasPriceWei === null
          && current.estimatedCostWei === null
          && current.lastEstimatedAt === null
        ) {
          return current;
        }

        return {
          ...EMPTY_MINTING_GAS_ESTIMATE_STATE,
          gasEstimateError: nextError,
        };
      });
      return;
    }

    const amountToEstimate = normalizedMintAmount;
    if (amountToEstimate == null) {
      return;
    }

    let cancelled = false;
    const estimateTimer = window.setTimeout(async () => {
      setGasEstimateState((current) => ({
        ...current,
        isEstimatingGas: true,
        gasEstimateError: null,
      }));

      try {
        const expiryTimestamp = resolveMintingExpiryTimestamp(resolvedExpiryDays);
        const [estimatedGasUnits, gasPriceWei] = await Promise.all([
          publicClient.estimateContractGas({
            account: address as `0x${string}`,
            address: assetAddress,
            abi: ORINA_RWA_ABI,
            functionName: 'mintAsset',
            args: [
              BigInt(resolvedUnitId),
              amountToEstimate,
              expiryTimestamp,
              assetType === 'RWA' ? AssetType.RWA : AssetType.NFT,
            ],
          }),
          publicClient.getGasPrice(),
        ]);

        if (cancelled) return;

        setGasEstimateState({
          isEstimatingGas: false,
          gasEstimateError: null,
          estimatedGasUnits: estimatedGasUnits.toString(),
          gasPriceWei: gasPriceWei.toString(),
          estimatedCostWei: (estimatedGasUnits * gasPriceWei).toString(),
          lastEstimatedAt: Date.now(),
        });
      } catch (estimateError) {
        if (cancelled) return;
        setGasEstimateState({
          ...EMPTY_MINTING_GAS_ESTIMATE_STATE,
          gasEstimateError: formatGasEstimateError(estimateError),
        });
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(estimateTimer);
    };
  }, [
    address,
    amountError,
    assetAddress,
    assetType,
    canEstimateMintGas,
    chainId,
    isConnected,
    normalizedMintAmount,
    publicClient,
    resolvedExpiryDays,
    resolvedUnitId,
    totalAmount,
  ]);

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
          background: var(--t-surface-5) !important;
          border: 0 !important;
          box-shadow: none !important;
        }
        .minting-form-stack .minting-neutral-select-trigger:hover,
        .minting-form-stack .minting-neutral-select-trigger:focus-visible,
        .minting-form-stack .minting-price-token-trigger:hover,
        .minting-form-stack .minting-price-token-trigger:focus-visible {
          background: var(--t-surface-10) !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger {
          background: var(--t-surface-5) !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:hover,
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:focus-visible {
          background: var(--t-surface-10) !important;
        }
        .minting-price-token-trigger svg {
          width: 14px !important;
          height: 14px !important;
          color: var(--t-text-muted) !important;
        }
        .minting-price-group {
          background: var(--t-surface-5);
          border: 0;
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-semibold text-ui-primary">Asset Creation</h1>
                <p className="text-sm text-ui-muted mt-1">
                  Design, mint and deploy your Web3 assets across multiple chains.
                </p>
                {workspaceMode === 'Create' && (
                  <PillSegmentedToggle
                    options={['RWA', 'NFT']}
                    value={assetType}
                    onChange={(value: string) => handleAssetTypeChange(value as 'RWA' | 'NFT')}
                    className="w-full sm:w-[220px]"
                  />
                )}
              </div>

              <div className="w-full lg:max-w-[560px]">
                <div className="w-full border-b border-[var(--color-panel-border)]">
                  <div className="flex gap-1">
                    {MINTING_WORKSPACE_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setWorkspaceMode(tab)}
                        className={`relative flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                          workspaceMode === tab
                            ? 'text-primary'
                            : 'text-ui-secondary hover:text-ui-primary'
                        }`}
                      >
                        {tab}
                        {workspaceMode === tab && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-custom)] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {workspaceMode === 'Create' && editingDraftId && (
              <div className="mt-4 inline-flex items-center rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
                Editing Draft
              </div>
            )}
          </header>

          {workspaceMode === 'Drafts' ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#2CC295]/20 bg-[#2CC295]/5 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 text-primary" size={18} />
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-semibold text-ui-primary">Saved Drafts</p>
                    <p className="text-xs text-ui-secondary">
                      Resume any in-progress RWA or NFT, or remove drafts you no longer need.
                    </p>
                  </div>
                </div>
              </div>
              <MintingDraftsList
                drafts={mintingDrafts}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
              />
            </div>
          ) : (
            <>
          {/* Transaction Status Banner */}
          {(isPending || isConfirming || lastMintSuccess || error) && (
            <div className={`mb-6 p-4 rounded-xl border ${lastMintSuccess
                ? 'bg-[#2CC295]/10 border-[#2CC295]/30'
                : error
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
              <div className="flex items-center gap-3">
                {isPending || isConfirming ? (
                  <Loader2 className="animate-spin text-blue-400" size={20} />
                ) : lastMintSuccess ? (
                  <Sparkles className="text-primary" size={20} />
                ) : (
                  <AlertCircle className="text-red-400" size={20} />
                )}
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${lastMintSuccess ? 'text-primary' : error ? 'text-red-400' : 'text-blue-400'
                    }`}>
                    {statusMessage}
                  </p>
                  {statusHash && (
                    <p className="text-xs text-ui-muted mt-1 font-mono">
                      Tx: {statusHash.slice(0, 10)}...{statusHash.slice(-8)}
                    </p>
                  )}
                  {lastMintSuccess && (
                    <>
                      <p className="mt-2 text-xs text-ui-secondary">
                        {lastMintSuccess.assetName} (asset #{lastMintSuccess.assetId}) is now available from your wallet assets.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <StudioActionButton
                          type="button"
                          variant="secondary"
                          size="md"
                          className="min-h-10"
                          onClick={() => dispatchAppNavigation({ page: 'assets' })}
                        >
                          <Sparkles size={14} />
                          View Assets
                        </StudioActionButton>
                        {lastMintExplorerUrl && (
                          <StudioActionButton
                            type="button"
                            variant="secondary"
                            size="md"
                            className="min-h-10"
                            onClick={() => window.open(lastMintExplorerUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink size={14} />
                            View Tx
                          </StudioActionButton>
                        )}
                        {lastMintSuccess.category && (
                          <StudioActionButton
                            type="button"
                            variant="secondary"
                            size="md"
                            className="min-h-10"
                            onClick={() =>
                              navigateToMarketplaceCategory({
                                category: lastMintSuccess.category || '',
                                subcategory: lastMintSuccess.subcategory,
                              })
                            }
                          >
                            <Sparkles size={14} />
                            Open {getCategoryDisplayLabel(lastMintSuccess.category, lastMintSuccess.subcategory)}
                          </StudioActionButton>
                        )}
                      </div>
                    </>
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
                <p className="font-semibold text-sm text-ui-primary mb-1">
                  {assetType === 'RWA' ? 'Real World Asset (RWA)' : 'NFT Asset (Digital)'}
                </p>
                <p className="text-xs text-ui-secondary">
                  {assetType === 'RWA'
                    ? 'Minting creates an OrinaRWA asset record. After buyer purchase and finalize, a non-transferable receipt NFT is minted for the buyer.'
                    : 'Minting creates an NFT-type listing in Orina. After buyer purchase and finalize, a transferable NFT is minted for the buyer.'
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
                  <span className="w-7 h-7 bg-[#2CC295]/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold border border-[#2CC295]/20">1</span>
                  <h2 className="text-lg font-semibold text-ui-primary">Media Upload</h2>
                </div>
                {assetType === 'RWA' ? (
                  <MultiImageUpload
                    walletAddress={address}
                    value={uploadedImages}
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
                    walletAddress={address}
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
                  <span className="w-7 h-7 shrink-0 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-semibold border border-ui-border-subtle">2</span>
                  <h2 className="text-lg font-semibold text-ui-primary">Metadata Input</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Asset Name</label>
                    <input
                      className={studioInputClass}
                      placeholder="e.g. Genesis Cyber-Samurai #01"
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      className={`${studioInputClass} h-32 resize-none`}
                      placeholder="Provide a detailed description of your asset..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Category</label>
                      <CustomDropdown
                        defaultValue={selectedMintCategory}
                        onChange={setDraftCategory}
                        options={mintCategoryOptions}
                        variant="compact"
                        className="w-full"
                        placeholder="Select taxonomy category"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Subcategory</label>
                      <input
                        className={studioInputClass}
                        placeholder="Optional subcategory"
                        type="text"
                        value={draftSubcategory}
                        onChange={(e) => setDraftSubcategory(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">Marketplace Route</p>
                      <p className="mt-1 text-sm font-semibold text-ui-primary">{mintCategoryLabel}</p>
                    </div>
                    <StudioActionButton
                      type="button"
                      variant="secondary"
                      size="md"
                      className="min-h-10"
                      onClick={() =>
                        navigateToMarketplaceCategory({
                          category: selectedMintCategory,
                          subcategory: draftSubcategory || undefined,
                        })
                      }
                    >
                      <ExternalLink size={14} />
                      Open In Marketplace
                    </StudioActionButton>
                  </div>
                </div>
              </div>

              {assetType === 'RWA' && (
                <div className={studioCardClass}>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 shrink-0 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-semibold border border-ui-border-subtle">3</span>
                      <div>
                        <h2 className="text-lg font-semibold text-ui-primary">Attributes</h2>
                        <p className="text-xs text-ui-muted mt-1">
                          Add offchain options like size, grade, warehouse or packaging for buyers to choose during checkout.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addConfigurableAttributeGroup}
                      className="h-10 px-4 rounded-full bg-[#2CC295]/10 text-primary text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#2CC295]/15 transition-colors"
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
                              <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">
                                Attribute Group {index + 1}
                              </p>
                              <p className="text-[10px] text-ui-muted mt-1">
                                This metadata stays offchain and is attached to the buyer order snapshot.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeConfigurableAttributeGroup(group.id)}
                              className="shrink-0 w-9 h-9 rounded-full bg-ui-card text-ui-muted hover:text-red-400 transition-colors inline-flex items-center justify-center"
                              aria-label="Remove attribute group"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Label</label>
                              <input
                                className={studioInputClass}
                                type="text"
                                placeholder="e.g. Ring Size"
                                value={group.label}
                                onChange={(e) => updateConfigurableAttributeGroup(group.id, { label: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Help Text</label>
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
                                className={`h-8 px-4 rounded-full text-xs font-semibold transition-colors ${
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
                                className={`h-8 px-4 rounded-full text-xs font-semibold transition-colors ${
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
                              className={`h-8 px-4 rounded-full text-xs font-semibold transition-colors ${
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
                              <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest">
                                Buyer Options
                              </label>
                              <button
                                type="button"
                                onClick={() => addConfigurableAttributeOption(group.id)}
                                className="text-xs font-semibold text-primary inline-flex items-center gap-1.5 hover:opacity-80"
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
                                    className="shrink-0 w-10 h-10 rounded-full bg-ui-card text-ui-muted hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center"
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
                    <span className="w-7 h-7 shrink-0 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-semibold border border-ui-border-subtle">
                      {assetType === 'RWA' ? '4' : '3'}
                    </span>
                    <h2 className="text-lg font-semibold text-ui-primary">Collection Settings</h2>
                  </div>
                  <div className="w-full md:w-[calc(50%-0.5rem)] md:max-w-none shrink-0">
                    <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Blockchain</label>
                    <CustomDropdown
                      variant="compact"
                      defaultValue={selectedNetworkKey}
                      onChange={(value) => {
                        void syncNetworkFromValue(value);
                      }}
                      openOnHover
                      disableDefaultTriggerTone
                      triggerStyle={mintingNeutralTriggerStyle}
                      options={PROTOCOL_NETWORK_OPTIONS.map((network) => ({
                        value: network.key,
                        label: network.label,
                        tag: network.status === 'live' ? 'Live' : 'Coming',
                      }))}
                      className="w-full"
                      triggerClassName={mintingSelectTriggerClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Price</label>
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
                        className="w-full h-[49px] px-4 py-3 pr-[120px] rounded-none text-[14px] leading-[18px] font-semibold text-ui-secondary placeholder:text-ui-muted outline-none transition-none"
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
                          triggerClassName="minting-price-token-trigger !h-full !rounded-none !border-0 !shadow-none !px-4 !text-[15px] !leading-[22px] !font-semibold font-sans !bg-transparent !text-ui-secondary hover:!bg-ui-input-focus"
                          menuClassName="mt-1 rounded-[16px] z-[9999]"
                        />
                      </div>
                    </div>
                  </div>

                  {assetType === 'RWA' && (
                    <div>
                      <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">
                        Unit
                        {isOnChain && (
                          <span className="ml-2 text-[9px] text-[#2CC295] font-normal normal-case tracking-normal">● on-chain</span>
                        )}
                      </label>
                      <CustomDropdown
                        variant="compact"
                        defaultValue={unitId}
                        onChange={handleUnitChange}
                        openOnHover
                        disableDefaultTriggerTone
                        triggerStyle={mintingNeutralTriggerStyle}
                        options={
                          unitsLoading
                            ? [{ value: unitId, label: 'Loading units…' }]
                            : allUnits.map((u) => ({ value: String(u.id), label: u.label }))
                        }
                        className="w-full"
                        triggerClassName={mintingSelectTriggerClass}
                      />
                      {selectedUnit && (
                        <p className="text-[10px] text-ui-muted mt-1">
                          Min: <span className="text-ui-secondary font-mono">{selectedUnit.minAmount.toString()}</span>
                          {' · '}
                          Step: <span className="text-ui-secondary font-mono">{selectedUnit.step.toString()}</span>
                          {' · '}
                          {isOnChain ? 'From UnitRegistry on-chain' : 'Fallback (connect wallet for live data)'}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Total Amount</label>
                    <input
                      className={`${studioInputClass} ${amountError ? 'border-red-400/60 focus:border-red-400' : ''}`}
                      placeholder={selectedUnit ? `Min: ${selectedUnit.minAmount.toString()}, step: ${selectedUnit.step.toString()}` : 'e.g. 1000'}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={totalAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onKeyDown={preventInvalidNumberKeyDown}
                    />
                    {amountError ? (
                      <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {amountError}
                      </p>
                    ) : assetType === 'RWA' ? (
                      <p className="text-[10px] text-ui-muted mt-1">
                        Each unit can be sold to one buyer · must satisfy unit constraints above
                      </p>
                    ) : (
                      <p className="text-[10px] text-ui-muted mt-1">Number of NFT editions to mint</p>
                    )}
                  </div>

                  {/* Expiry Type Toggle - Only for RWA */}
                  {assetType === 'RWA' && (
                    <div>
                      <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">Expiry Type</label>
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
                      <label className="block text-xs font-semibold text-ui-muted uppercase tracking-widest mb-2">
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
                  <span className="w-7 h-7 shrink-0 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-semibold border border-ui-border-subtle">
                    {assetType === 'RWA' ? '5' : '4'}
                  </span>
                  <h2 className="text-lg font-semibold text-ui-primary">Mint Asset</h2>
                </div>
                {assetType === 'RWA' && (
                  <MintingDeliverySection
                    key={`delivery-${deliverySectionVersion}`}
                    walletAddress={address}
                    submitAttempt={deliveryValidationAttempt}
                    initialState={deliveryStateSeed as MintingDeliveryState | null}
                    onChange={setMintingDeliveryState}
                  />
                )}
                <div className={`grid gap-3 ${assetType === 'RWA' ? 'mt-6 md:grid-cols-[220px_minmax(0,1fr)]' : 'md:grid-cols-[220px_minmax(0,1fr)]'}`}>
                  <button
                    type="button"
                    className="h-[45px] rounded-full border border-ui-border-subtle bg-ui-input px-6 text-sm font-semibold text-ui-primary transition-all hover:bg-ui-input-focus disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleSaveDraft}
                    disabled={isPending || isConfirming}
                  >
                    {editingDraftId ? 'Update Draft' : 'Save Draft'}
                  </button>
                  <button
                    className="h-[45px] rounded-full bg-[#2CC295] px-6 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleMint}
                    disabled={isPending || isConfirming}
                  >
                    {isPending || isConfirming ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="mr-2 animate-spin" size={16} />
                        {statusMessage}
                      </div>
                    ) : (
                      'Mint Asset'
                    )}
                  </button>
                </div>
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
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 px-1">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-ui-muted">Live Preview</h3>
                      <p className="mt-1 text-xs leading-5 text-ui-muted">
                        Marketplace card updates from the current mint draft.
                      </p>
                    </div>
                    <span className="rounded-full border border-[#2CC295]/24 bg-[#2CC295]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7CF0CB]">
                      {assetType}
                    </span>
                  </div>
                  <div className="market-card-shell search-result-card-shell overflow-hidden rounded-[32px] bg-ui-card text-left">
                    <div className="relative h-[280px] overflow-hidden bg-[var(--t-surface-10)]">
                      {previewHasMedia ? (
                        <ImageWithFallback
                          src={previewImageUrl}
                          alt={previewTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="relative h-full w-full bg-gradient-to-br from-[var(--t-input-bg)] via-[var(--t-surface-2)] to-[var(--t-input-focus-bg)]">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="px-6 text-center">
                              <ImageIcon className="mx-auto mb-3 text-ui-muted" size={56} />
                              <p className="text-sm font-medium text-ui-muted">Awaiting asset upload</p>
                              <p className="mt-1 text-xs text-ui-muted">
                                {assetType === 'RWA' ? 'Upload 1-5 images' : 'Upload image or video'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-5rem)]">
                        <span
                          className="inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md"
                          style={{
                            background: previewCategoryTone.background,
                            borderColor: previewCategoryTone.borderColor,
                            color: previewCategoryTone.textColor,
                            boxShadow: `0 14px 32px -28px ${previewCategoryTone.shadowColor}`,
                          }}
                        >
                          <span className="truncate">{mintCategoryLabel}</span>
                        </span>
                      </div>

                      <div className="absolute bottom-3 right-3 z-10">
                        <div
                          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-[10px] font-semibold uppercase backdrop-blur-md"
                          style={{ color: previewChainInfo.color }}
                        >
                          {previewChainBadgeLabel}
                          <span
                            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black ${
                              previewChainInfo.status === 'live' ? 'bg-[#2CC295]' : 'bg-zinc-500'
                            }`}
                          />
                        </div>
                      </div>

                      {assetType === 'RWA' && previewMediaCount > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex((prev) => (
                              prev === 0 ? uploadedImages.length - 1 : prev - 1
                            ))}
                            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2 text-white/85 backdrop-blur-md transition-colors hover:bg-black/70"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentImageIndex((prev) => (
                              prev === uploadedImages.length - 1 ? 0 : prev + 1
                            ))}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2 text-white/85 backdrop-blur-md transition-colors hover:bg-black/70"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[11px] font-mono text-white/85 backdrop-blur-md">
                            {currentImageIndex + 1} / {uploadedImages.length}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="market-card-info-area search-result-info-area flex flex-col px-5 pb-5 pt-4">
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-[17px] font-semibold leading-[1.18] text-ui-primary">
                          {previewTitle}
                        </h4>
                        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-ui-secondary">
                          {previewDescription}
                        </p>
                      </div>
                      <div className="card-value-row mt-5">
                        <div className="shrink-0">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Price</p>
                          <p className="card-price-value mt-1 text-[24px] font-semibold leading-none">
                            {previewPriceValue}
                          </p>
                          {previewPriceUsd ? (
                            <p className="mt-1.5 text-[10px] text-ui-muted">{previewPriceUsd}</p>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Ending In</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Clock size={12} className="text-primary" />
                            <p className="text-[13px] font-semibold leading-[1.4] text-primary">{previewEndingIn}</p>
                          </div>
                          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Supply</p>
                          <p className="mt-1 text-[13px] font-semibold text-ui-primary">{previewSupplyValue}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-ui-secondary">
                          <div className="inline-flex items-center gap-1.5">
                            <Eye size={14} />
                            <span>0</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <Heart size={13} />
                            <span>0</span>
                          </div>
                        </div>
                        <span className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-5)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ui-muted">
                          {previewChainInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {assetType === 'RWA' && previewConfigurableAttributes.length > 0 ? (
                    <div className="space-y-2.5 rounded-2xl border border-ui-border-subtle bg-ui-card p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">
                        Preview Attributes
                      </p>
                      {previewConfigurableAttributes.map((group) => (
                        <div key={group.id} className="rounded-xl bg-[var(--t-surface-5)] px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-ui-primary">{group.label}</p>
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-ui-muted">
                              {group.required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                          {group.helpText ? (
                            <p className="mt-1 text-[10px] text-ui-muted">{group.helpText}</p>
                          ) : null}
                          <p className="mt-1.5 text-[10px] text-ui-secondary">
                            {group.options.map((option) => option.label).join(' / ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Contract Info */}
                <div className="bg-ui-card border border-ui-border-subtle rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-ui-muted">Mint Surface</span>
                    <span className="text-ui-primary font-medium text-right">OrinaRWA Asset Registry</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ui-muted">Finalize Output</span>
                    <span className="text-ui-primary font-medium text-right ml-auto">
                      {assetType === 'RWA' ? 'Receipt NFT · Non-Transferable' : 'NFT · Transferable'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ui-muted">Metadata Storage</span>
                    <span className="text-ui-primary font-medium text-right ml-auto">IPFS (Decentralized)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
