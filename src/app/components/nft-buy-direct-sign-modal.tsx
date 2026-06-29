import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { toast } from 'sonner';
import { MarketplaceAsset } from '@/app/types/asset';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useBuyerSign1, useSignOrder } from '@/hooks/useEIP712Sign';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { resolvePaymentTokenForCurrency } from '@/config/contracts';
import { ERC20_ABI } from '@/config/abis';
import { parseOnchainBigIntLike } from '@/utils/onchainNormalization';
import { getWalletErrorMessage } from '@/utils/walletErrors';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';

interface NftBuyDirectSignModalProps {
  asset: MarketplaceAsset;
  transparentBackdrop?: boolean;
  onClose: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isValidEvmAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parseAssetPriceToBaseUnits(price: string, decimals: number): bigint | null {
  const raw = price.replace(/[^\d.]/g, '');
  if (!raw) return null;
  try {
    return parseUnits(raw, decimals);
  } catch {
    return null;
  }
}

export function NftBuyDirectSignModal({
  asset,
  transparentBackdrop = false,
  onClose,
}: NftBuyDirectSignModalProps) {
  const { address } = useAccount();
  const { chainId, marketplaceAddress } = useProtocolDataNetwork();
  const access = useAccessMode();
  const protocolChain = useProtocolChain();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const buyerSig1 = useBuyerSign1();
  const previewSigner = useSignOrder();
  const [signedPayload, setSignedPayload] = useState<{
    signature: `0x${string}`;
    signedAt: number;
    mode: 'preview' | 'predicted-live';
    note: string;
  } | null>(null);

  const sellerAddress = isValidEvmAddress(asset.seller.address) ? asset.seller.address : null;
  const paymentToken = useMemo(
    () => resolvePaymentTokenForCurrency(asset.currency, chainId),
    [asset.currency, chainId],
  );
  const paymentTokenDecimalsRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentToken.address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: Boolean(chainId) },
  });
  const canonicalAssetId = useMemo(
    () => parseOnchainBigIntLike(asset.onchainAssetId ?? asset.tokenId),
    [asset.onchainAssetId, asset.tokenId],
  );
  const paymentTokenDecimals = paymentTokenDecimalsRead.data !== undefined
    ? Number(paymentTokenDecimalsRead.data)
    : null;
  const grossPrice = useMemo(
    () => (paymentTokenDecimals === null ? null : parseAssetPriceToBaseUnits(asset.price, paymentTokenDecimals)),
    [asset.price, paymentTokenDecimals],
  );
  const previewOrderId = useMemo(() => BigInt(Date.now()), []);
  const fixedEstDeliverySeconds = 0n;

  const hasValidOrderData =
    !!sellerAddress &&
    canonicalAssetId !== null &&
    grossPrice !== null &&
    paymentTokenDecimals !== null;
  const orderDataIssues = [
    canonicalAssetId === null ? 'Missing on-chain asset ID' : null,
    !sellerAddress ? 'Missing seller wallet address' : null,
    grossPrice === null ? 'Missing or invalid price/token amount' : null,
    paymentTokenDecimals === null ? 'Payment token metadata unavailable' : null,
  ].filter((issue): issue is string => Boolean(issue));

  const canUsePredictedSignature =
    marketplaceAddress !== ZERO_ADDRESS &&
    buyerSig1.predictedOrderId !== undefined &&
    !!address &&
    isValidEvmAddress(address) &&
    hasValidOrderData;
  const panelSurfaceClass = 'studio-glass-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)]';
  const insetSurfaceClass = 'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSign = async () => {
    if (!hasValidOrderData) {
      toast.error('Missing valid NFT order data for signing');
      return;
    }

    const continueSign = async () => {
      if (!address || !isValidEvmAddress(address) || !sellerAddress || canonicalAssetId === null || grossPrice === null) {
        toast.error('Wallet address unavailable. Please reconnect and try again.');
        return;
      }

      try {
        let signature: `0x${string}`;
        let mode: 'preview' | 'predicted-live' = 'preview';
        let note = 'NFT direct buy signature created (no delivery setup required). Preview-safe mode.';

        if (canUsePredictedSignature && buyerSig1.predictedOrderId !== undefined) {
          signature = await buyerSig1.sign({
            seller: sellerAddress,
            paymentToken: paymentToken.address,
            assetId: canonicalAssetId,
            grossPrice,
            amount: 1n,
            estDeliverySeconds: fixedEstDeliverySeconds,
          });
          mode = 'predicted-live';
          note = `NFT direct buyer signature created for predicted orderId ${buyerSig1.predictedOrderId.toString()}.`;
        } else {
          signature = await previewSigner.signOrder({
            orderId: previewOrderId,
            buyer: address,
            seller: sellerAddress,
            paymentToken: paymentToken.address,
            assetId: canonicalAssetId,
            grossPrice,
            amount: 1n,
            estDeliverySeconds: fixedEstDeliverySeconds,
          });
        }

        setSignedPayload({
          signature,
          signedAt: Date.now(),
          mode,
          note,
        });
        toast.success('NFT buy signature created');
      } catch (error) {
        console.error('[NFT Buy Modal] Sign failed:', error);
        toast.error(getWalletErrorMessage(error, 'Failed to sign NFT buy intent'));
      }
    };

    if (!(await requireWalletActionAsync({
      capability: 'protocol_order_write',
      actionLabel: 'sign the NFT buy intent',
      fallbackPage: 'marketplace',
      onSecurityCheckConfirmed: continueSign,
    }))) {
      return;
    }

    await continueSign();
  };

  const isSigning = buyerSig1.isPending || previewSigner.isPending;
  const signatureError = buyerSig1.error || previewSigner.error;
  const signButtonLabel = isSigning
    ? 'Signing...'
    : !protocolChain.isConnected
      ? 'Connect Wallet'
      : access.isAuthPending
        ? 'Unlock Wallet'
        : !protocolChain.isOnProtocolChain
          ? 'Switch Network'
          : 'Sign Buy Intent';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 ${
          transparentBackdrop ? 'bg-transparent backdrop-blur-[10px]' : 'studio-portal-backdrop bg-black/85 backdrop-blur-[14px]'
        }`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme studio-glass-modal w-full max-w-[640px] overflow-hidden rounded-[32px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
        >
          <div className="studio-glass-header flex items-start justify-between gap-4 border-b border-ui-border-subtle px-6 py-6 md:px-8">
            <div>
              <h3 className="text-2xl font-semibold text-ui-primary">Buy NFT</h3>
              <p className="mt-1 text-sm text-ui-secondary">
                Direct-buy flow (OpenSea-style): confirm price and sign. No delivery setup required.
              </p>
            </div>
            <StudioModalCloseButton onClick={onClose} iconSize={18} className="studio-glass-secondary rounded-full" />
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
            <div className="space-y-4">
              <ProtocolChainBanner
                isConnected={protocolChain.isConnected}
                isOnProtocolChain={protocolChain.isOnProtocolChain}
                currentChainLabel={protocolChain.currentChainLabel}
                targetChainLabel={protocolChain.targetChainLabel}
                isSwitching={protocolChain.isSwitching}
                onSwitch={() => protocolChain.ensureProtocolChainAsync('sign the NFT buy intent')}
                showWhenMatched={false}
              />

              <div className={`${panelSurfaceClass} p-4`}>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]">
                    <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#7DD3FC]/10 text-[#7DD3FC] border border-[#7DD3FC]/20">
                        NFT
                      </span>
                      <span className="studio-glass-chip rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ui-secondary">
                        Token #{asset.tokenId}
                      </span>
                    </div>
                    <h4 className="mt-2 line-clamp-2 text-lg font-semibold text-ui-primary">{asset.name}</h4>
                    <p className="mt-1 text-xs text-ui-muted">{getCategoryDisplayLabel(asset.category)}</p>
                    <p className="mt-2 text-xs text-ui-secondary">
                      Seller: {asset.seller.ensName || `${asset.seller.address.slice(0, 6)}...${asset.seller.address.slice(-4)}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#7DD3FC]/20 bg-[#7DD3FC]/8 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7DD3FC]/15 border border-[#7DD3FC]/20 inline-flex items-center justify-center text-[#7DD3FC] shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ui-primary">Direct NFT Purchase</p>
                    <p className="mt-1 text-xs leading-relaxed text-ui-secondary">
                      NFT listings skip delivery-time setup. This modal only handles price confirmation and buyer signature.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`${panelSurfaceClass} p-4`}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Purchase Summary</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ui-secondary">Quantity</span>
                    <span className="font-semibold text-ui-primary">1 NFT</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ui-secondary">Listing Price</span>
                    <span className="font-semibold text-ui-primary">{asset.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ui-secondary">Flow</span>
                    <span className="font-semibold text-[#7DD3FC]">Direct Buy</span>
                  </div>
                  <div className="h-px bg-ui-border-subtle" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ui-primary">Total</span>
                    <span className="text-xl font-semibold text-ui-primary">{asset.price}</span>
                  </div>
                </div>
              </div>

              {signatureError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {signatureError.message}
                </div>
              )}

              {!hasValidOrderData && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  This listing cannot be signed yet: {orderDataIssues.join(', ')}.
                </div>
              )}

              {signedPayload && (
                <div className="rounded-[28px] border border-[#2CC295]/20 bg-[#2CC295]/8 p-4">
                  <div className="flex items-center gap-2 text-[#2CC295] mb-2">
                    <ShieldCheck size={16} />
                    <p className="text-sm font-semibold">Signature Ready</p>
                  </div>
                  <p className="mb-2 text-[11px] text-ui-secondary">{signedPayload.note}</p>
                  <div className={`${insetSurfaceClass} p-3`}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ui-muted">Signature</p>
                    <p className="break-all font-mono text-[11px] text-ui-secondary">
                      {signedPayload.signature}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <StudioActionButton
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="flex-1 justify-center"
                >
                  Cancel
                </StudioActionButton>
                <StudioActionButton
                  disabled={isSigning}
                  onClick={handleSign}
                  className="flex-1 h-[45px] rounded-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!hasValidOrderData ? 'Listing Data Required' : signButtonLabel}
                </StudioActionButton>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
