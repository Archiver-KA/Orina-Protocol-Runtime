import { Sparkles, Upload, AlertCircle, CheckCircle, Eye, Heart, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { PillSegmentedToggle } from '@/app/components/pill-segmented-toggle';
import { StandardToggle } from '@/app/components/standard-toggle';
import { ImageUpload, UploadedImage } from '@/app/components/image-upload';
import { MultiImageUpload } from '@/app/components/multi-image-upload';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMintAsset } from '@/hooks/useAssets';
import { useNextUnitId } from '@/hooks/useUnits';
import { AssetType } from '@/config/contracts';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useTheme } from '@/app/contexts/ThemeContext';

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

  const { address, isConnected } = useAccount();
  const { theme } = useTheme();
  const { data: nextUnitId } = useNextUnitId();
  const { mintAsset, hash, isPending, isConfirming, isConfirmed, error } = useMintAsset();
  const { requireWalletActionAsync } = useRequireWalletAction();

  const handleMint = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!assetName || !totalAmount || (expiryType === 'Expiry' && !expiryDays)) {
      alert('Please fill in all required fields');
      return;
    }

    if (!(await requireWalletActionAsync({
      capability: 'protocol_mint_write',
      actionLabel: 'mint assets',
      fallbackPage: 'minting',
    }))) {
      return;
    }

    try {
      const expiryTimestamp = expiryType === 'Expiry' ? BigInt(Math.floor(Date.now() / 1000) + Number(expiryDays) * 24 * 60 * 60) : BigInt(0);
      await mintAsset(
        BigInt(unitId),
        BigInt(totalAmount),
        expiryTimestamp,
        assetType === 'RWA' ? AssetType.RWA : AssetType.NFT,
      );
    } catch (err) {
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
  const studioInputClass = 'w-full border-0 bg-[var(--t-surface-5)] rounded-lg px-4 py-3 text-[14px] leading-[18px] font-bold text-ui-primary placeholder:text-ui-muted focus:bg-ui-input-focus focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 shadow-none';
  const mintingSelectTriggerClass = 'minting-neutral-select-trigger !h-[49px] !rounded-lg !bg-[var(--t-surface-5)] !border-0 !shadow-none !px-4 !text-[14px] !leading-[18px] !font-bold !text-ui-primary hover:!bg-[var(--t-surface-5)]';
  const mintingNeutralTriggerStyle = theme === 'light' ? { background: '#ECEFF2' } : undefined;

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
          background: var(--t-surface-5) !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger {
          background: #eceff2 !important;
        }
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:hover,
        [data-theme="light"] .minting-form-stack .minting-neutral-select-trigger:focus-visible {
          background: #eceff2 !important;
        }
        .minting-price-token-trigger svg {
          width: 14px !important;
          height: 14px !important;
          color: var(--t-text-muted) !important;
        }
        .minting-price-group {
          background: var(--t-surface-5);
          border-radius: 0.5rem;
        }
        .minting-form-stack input[type="text"],
        .minting-form-stack input[type="number"] {
          font-family: 'Space Grotesk', var(--font-sans) !important;
          font-size: 14px !important;
          line-height: 18px !important;
          font-weight: 700 !important;
          letter-spacing: 0 !important;
          color: var(--t-text-primary) !important;
          -webkit-text-fill-color: var(--t-text-primary) !important;
          font-variant-numeric: tabular-nums !important;
        }
        .minting-form-stack input[type="text"]::placeholder,
        .minting-form-stack input[type="number"]::placeholder {
          color: var(--t-text-muted) !important;
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

              {/* Step 3: Collection Settings */}
              <div className={`${studioCardClass} relative z-[60]`}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">3</span>
                    <h2 className="text-lg font-bold text-ui-primary">Collection Settings</h2>
                  </div>
                  <div className="w-full max-w-[260px]">
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
                        placeholder="0.0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full h-[49px] px-4 py-3 pr-[120px] rounded-none text-[14px] leading-[18px] font-bold text-ui-primary placeholder:text-ui-muted outline-none transition-none"
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
                          triggerClassName="minting-price-token-trigger !h-full !rounded-none !border-0 !shadow-none !px-4 !text-[15px] !leading-[22px] !font-bold font-sans !bg-[var(--t-surface-5)] !text-ui-primary hover:!bg-[var(--t-surface-5)]"
                          menuClassName="mt-1 rounded-[16px] z-[9999]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Unit ID - Dropdown for RWA, Input for NFT */}
                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Unit ID</label>
                    {assetType === 'RWA' ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <input
                          className={studioInputClass}
                          placeholder="Enter unit ID (0 for default)"
                          type="number"
                          value={unitId}
                          onChange={(e) => setUnitId(e.target.value)}
                        />
                        <p className="text-[10px] text-ui-muted mt-1">Next available: {nextUnitId ? Number(nextUnitId) : 'Loading...'}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Total Amount</label>
                    <input
                      className={studioInputClass}
                      placeholder="e.g. 1000"
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
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

                  {/* Expiry Days - Only show if Expiry type selected or NFT */}
                  {(assetType === 'NFT' || expiryType === 'Expiry') && (
                    <div>
                      <label className="block text-xs font-bold text-ui-muted uppercase tracking-widest mb-2">Expiry (Days)</label>
                      <input
                        className={`${studioInputClass} ${assetType === 'RWA' && expiryType === 'Non-Expiry' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        placeholder="e.g. 30"
                        type="number"
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(e.target.value)}
                        disabled={assetType === 'RWA' && expiryType === 'Non-Expiry'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Mint Button */}
              <div className={`${studioCardClass} relative z-[10]`}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-7 h-7 bg-ui-input text-ui-secondary rounded-full flex items-center justify-center text-xs font-bold border border-ui-border-subtle">4</span>
                  <h2 className="text-lg font-bold text-ui-primary">Mint Asset</h2>
                </div>
                <button
                  className="w-full h-[45px] px-6 bg-[#2CC295] text-black rounded-full text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
