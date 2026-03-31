import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { MarketplaceAsset } from '@/app/types/asset';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useBuyerSign1, useSignOrder } from '@/hooks/useEIP712Sign';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { CONTRACTS, PAYMENT_TOKENS, type PaymentTokenSymbol } from '@/config/contracts';
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

function parseAssetPriceToBaseUnits(price: string, currency: MarketplaceAsset['currency']): bigint | null {
  const raw = price.replace(/[^\d.]/g, '');
  if (!raw) return null;
  const decimals = currency === 'USDC' || currency === 'USDT' ? 6 : 18;
  try {
    return parseUnits(raw, decimals);
  } catch {
    return null;
  }
}

function resolveProtocolPaymentToken(currency: MarketplaceAsset['currency']): {
  symbol: PaymentTokenSymbol;
  address: `0x${string}`;
  decimals: number;
} {
  if (currency === 'USDC') {
    return {
      symbol: 'USDC',
      address: PAYMENT_TOKENS.USDC,
      decimals: 6,
    };
  }

  return {
    symbol: 'WBNB',
    address: PAYMENT_TOKENS.WBNB,
    decimals: 18,
  };
}

export function NftBuyDirectSignModal({
  asset,
  transparentBackdrop = false,
  onClose,
}: NftBuyDirectSignModalProps) {
  const { address } = useAccount();
  const protocolChain = useProtocolChain();
  const buyerSig1 = useBuyerSign1();
  const previewSigner = useSignOrder();
  const [signedPayload, setSignedPayload] = useState<{
    signature: `0x${string}`;
    signedAt: number;
    mode: 'preview' | 'predicted-live';
    note: string;
  } | null>(null);

  const sellerAddress = isValidEvmAddress(asset.seller.address) ? asset.seller.address : null;
  const paymentToken = useMemo(() => resolveProtocolPaymentToken(asset.currency), [asset.currency]);
  const canonicalAssetId = useMemo(
    () => parseOnchainBigIntLike(asset.onchainAssetId ?? asset.tokenId),
    [asset.onchainAssetId, asset.tokenId],
  );
  const grossPrice = useMemo(() => parseAssetPriceToBaseUnits(asset.price, asset.currency), [asset.price, asset.currency]);
  const previewOrderId = useMemo(() => BigInt(Date.now()), []);
  const fixedEstDeliverySeconds = 0n;

  const canSign =
    !!address &&
    isValidEvmAddress(address) &&
    !!sellerAddress &&
    canonicalAssetId !== null &&
    grossPrice !== null;

  const canUsePredictedSignature =
    CONTRACTS.MARKETPLACE_ATP !== ZERO_ADDRESS &&
    buyerSig1.predictedOrderId !== undefined &&
    canSign;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSign = async () => {
    if (!address || !isValidEvmAddress(address) || !sellerAddress || canonicalAssetId === null || grossPrice === null) {
      toast.error('Missing wallet or valid NFT order data for signing');
      return;
    }

    if (!(await protocolChain.ensureProtocolChainAsync('sign the NFT buy intent'))) {
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

  const isSigning = buyerSig1.isPending || previewSigner.isPending;
  const signatureError = buyerSig1.error || previewSigner.error;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 ${
          transparentBackdrop ? 'bg-transparent backdrop-blur-[10px]' : 'studio-portal-backdrop bg-black/70 backdrop-blur-[10px]'
        }`}
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="studio-modal-theme studio-glass-modal w-full max-w-[640px] rounded-[2rem] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          <div className="studio-glass-header px-6 md:px-8 py-6 border-b border-[rgba(255,255,255,0.06)] flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">Buy NFT</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Direct-buy flow (OpenSea-style): confirm price and sign. No delivery setup required.
              </p>
            </div>
            <StudioModalCloseButton onClick={onClose} iconSize={18} className="studio-glass-secondary w-10 h-10 rounded-xl" />
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

              <div className="studio-glass-surface rounded-2xl border border-ui-border-subtle bg-[rgba(255,255,255,0.02)] p-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-800 border border-white/5 shrink-0">
                    <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#7DD3FC]/10 text-[#7DD3FC] border border-[#7DD3FC]/20">
                        NFT
                      </span>
                      <span className="studio-glass-chip px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/5 text-zinc-300 border border-white/10">
                        Token #{asset.tokenId}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white mt-2 line-clamp-2">{asset.name}</h4>
                    <p className="text-xs text-zinc-500 mt-1">{getCategoryDisplayLabel(asset.category)}</p>
                    <p className="text-xs text-zinc-400 mt-2">
                      Seller: {asset.seller.ensName || `${asset.seller.address.slice(0, 6)}...${asset.seller.address.slice(-4)}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="studio-glass-surface rounded-2xl border border-[rgba(125,211,252,0.15)] bg-[rgba(125,211,252,0.05)] p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7DD3FC]/15 border border-[#7DD3FC]/20 inline-flex items-center justify-center text-[#7DD3FC] shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Direct NFT Purchase</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      NFT listings skip delivery-time setup. This modal only handles price confirmation and buyer signature.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="studio-glass-surface rounded-2xl border border-ui-border-subtle bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-3">Purchase Summary</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Quantity</span>
                    <span className="font-semibold text-white">1 NFT</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Listing Price</span>
                    <span className="font-semibold text-white">{asset.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Flow</span>
                    <span className="font-semibold text-[#7DD3FC]">Direct Buy</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 font-semibold">Total</span>
                    <span className="text-xl font-bold text-white">{asset.price}</span>
                  </div>
                </div>
              </div>

              {signatureError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {signatureError.message}
                </div>
              )}

              {signedPayload && (
                <div className="rounded-2xl border border-[rgba(44,194,149,0.2)] bg-[rgba(44,194,149,0.04)] p-4">
                  <div className="flex items-center gap-2 text-[#2CC295] mb-2">
                    <ShieldCheck size={16} />
                    <p className="text-sm font-bold">Signature Ready</p>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-2">{signedPayload.note}</p>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-1">Signature</p>
                    <p className="font-mono text-[11px] text-zinc-300 break-all">
                      {signedPayload.signature}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <StudioActionButton
                  onClick={onClose}
                  variant="secondary"
                  className="flex-1 rounded-xl py-3 justify-center"
                >
                  Cancel
                </StudioActionButton>
                <StudioActionButton
                  onClick={handleSign}
                  disabled={!canSign || isSigning}
                  className="flex-[1.15] rounded-xl py-3 justify-center text-sm"
                >
                  {isSigning
                    ? 'Signing...'
                    : !protocolChain.isConnected
                      ? 'Connect Wallet'
                      : !protocolChain.isOnProtocolChain
                        ? 'Switch Network'
                        : 'Sign Buy Intent'}
                </StudioActionButton>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
