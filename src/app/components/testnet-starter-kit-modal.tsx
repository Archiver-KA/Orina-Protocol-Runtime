import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Coins,
  ExternalLink,
  Fuel,
  Info,
  RefreshCw,
  Trophy,
  Wallet,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useAccount, useBalance, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { toast } from 'sonner';
import {
  TESTNET_STARTER_KIT,
  TESTNET_TOKEN_FAUCET_ABI,
  isTestnetStarterKitConfigured,
} from '@/config/testnetFaucet';
import { ERC20_ABI } from '@/config/abis';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import {
  StudioModalBackdrop,
  StudioModalBody,
  StudioModalCloseButton,
  StudioModalHeader,
  StudioModalPanel,
  StudioModalShell,
} from '@/app/components/ui/studio-modal';
import { cn } from '@/app/components/ui/utils';
import { loadRuntimeMintedAssets } from '@/utils/runtimeMintedAssets';
import { loadRuntimeOrders } from '@/utils/runtimeOrders';

type StarterTab = 'guide' | 'tbnb' | 'usdt' | 'usdc' | 'rankings';
type ClaimSymbol = 'USDT' | 'USDC';

interface TestnetStarterKitModalProps {
  onClose: () => void;
}

const STARTER_TABS: Array<{ id: StarterTab; label: string; Icon: typeof Info }> = [
  { id: 'guide', label: 'Guide', Icon: Info },
  { id: 'tbnb', label: 'Claim tBNB', Icon: Fuel },
  { id: 'usdt', label: 'Claim USDT.t', Icon: Coins },
  { id: 'usdc', label: 'Claim USDC.t', Icon: Coins },
  { id: 'rankings', label: 'Rankings', Icon: Trophy },
];

function formatTokenAmount(amount: bigint | undefined, decimals: number) {
  if (amount === undefined) return '...';
  const formatted = formatUnits(amount, decimals);
  const numeric = Number(formatted);
  if (!Number.isFinite(numeric)) return formatted;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 4),
  });
}

function formatCooldown(seconds: bigint | undefined) {
  if (seconds === undefined) return '...';
  const value = Number(seconds);
  if (!Number.isFinite(value)) return '...';
  if (value >= 86_400) return `${Math.round(value / 86_400)}d`;
  if (value >= 3_600) return `${Math.round(value / 3_600)}h`;
  if (value >= 60) return `${Math.round(value / 60)}m`;
  return `${value}s`;
}

function formatNextClaim(nextClaimAt: bigint | undefined) {
  if (nextClaimAt === undefined || nextClaimAt === 0n) return 'Ready now';
  const timestamp = Number(nextClaimAt) * 1000;
  if (!Number.isFinite(timestamp)) return 'Configured';
  if (Date.now() >= timestamp) return 'Ready now';
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isClaimable(nextClaimAt: bigint | undefined) {
  if (nextClaimAt === undefined || nextClaimAt === 0n) return true;
  return BigInt(Math.floor(Date.now() / 1000)) >= nextClaimAt;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ui-primary">{value}</p>
    </div>
  );
}

export function TestnetStarterKitModal({ onClose }: TestnetStarterKitModalProps) {
  const { address, chainId, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<StarterTab>('guide');
  const [lastClaimSymbol, setLastClaimSymbol] = useState<ClaimSymbol | null>(null);
  const handledReceiptHashRef = useRef<string | null>(null);

  const isOnTestnet = chainId === TESTNET_STARTER_KIT.chainId;
  const faucetConfigured = isTestnetStarterKitConfigured();
  const faucetAddress = TESTNET_STARTER_KIT.faucetAddress ?? undefined;
  const usdtAddress = TESTNET_STARTER_KIT.tokens.USDT.address ?? undefined;
  const usdcAddress = TESTNET_STARTER_KIT.tokens.USDC.address ?? undefined;
  const canReadFaucet = TESTNET_STARTER_KIT.enabled && isOnTestnet && Boolean(faucetAddress);
  const canReadWallet = TESTNET_STARTER_KIT.enabled && isOnTestnet && Boolean(address);

  const nativeBalance = useBalance({
    address,
    chainId: TESTNET_STARTER_KIT.chainId,
    query: { enabled: canReadWallet },
  });

  const usdtBalance = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: usdtAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: canReadWallet && Boolean(usdtAddress) },
  });

  const usdcBalance = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: canReadWallet && Boolean(usdcAddress) },
  });

  const usdtClaimAmount = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: faucetAddress,
    abi: TESTNET_TOKEN_FAUCET_ABI,
    functionName: 'usdtClaimAmount',
    query: { enabled: canReadFaucet },
  });

  const usdcClaimAmount = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: faucetAddress,
    abi: TESTNET_TOKEN_FAUCET_ABI,
    functionName: 'usdcClaimAmount',
    query: { enabled: canReadFaucet },
  });

  const claimCooldown = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: faucetAddress,
    abi: TESTNET_TOKEN_FAUCET_ABI,
    functionName: 'claimCooldown',
    query: { enabled: canReadFaucet },
  });

  const usdtNextClaimAt = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: faucetAddress,
    abi: TESTNET_TOKEN_FAUCET_ABI,
    functionName: 'nextClaimAt',
    args: usdtAddress && address ? [usdtAddress, address] : undefined,
    query: { enabled: canReadWallet && Boolean(faucetAddress && usdtAddress) },
  });

  const usdcNextClaimAt = useReadContract({
    chainId: TESTNET_STARTER_KIT.chainId,
    address: faucetAddress,
    abi: TESTNET_TOKEN_FAUCET_ABI,
    functionName: 'nextClaimAt',
    args: usdcAddress && address ? [usdcAddress, address] : undefined,
    query: { enabled: canReadWallet && Boolean(faucetAddress && usdcAddress) },
  });

  const {
    data: claimHash,
    writeContractAsync,
    isPending: claimPending,
    error: claimError,
  } = useWriteContract();
  const claimReceipt = useWaitForTransactionReceipt({
    chainId: TESTNET_STARTER_KIT.chainId,
    hash: claimHash,
  });

  const activity = useMemo(() => {
    if (!address || typeof window === 'undefined') {
      return {
        totalOrders: 0,
        finalizedOrders: 0,
        disputes: 0,
        mintedAssets: 0,
        nftMints: 0,
      };
    }

    const orders = loadRuntimeOrders(address);
    const mintedAssets = loadRuntimeMintedAssets(address);

    return {
      totalOrders: orders.length,
      finalizedOrders: orders.filter((order) => order.finalized).length,
      disputes: orders.filter((order) => order.disputed || order.state === 2).length,
      mintedAssets: mintedAssets.length,
      nftMints: mintedAssets.filter((asset) => asset.assetType === 'NFT').length,
    };
  }, [address]);

  useEffect(() => {
    if (!claimError) return;
    toast.error('Claim transaction failed', {
      description: claimError.message || 'Wallet rejected or faucet transaction failed.',
    });
  }, [claimError]);

  useEffect(() => {
    if (!claimReceipt.isSuccess || !claimHash || handledReceiptHashRef.current === claimHash) return;
    handledReceiptHashRef.current = claimHash;
    toast.success(`${lastClaimSymbol ? `${lastClaimSymbol}.t` : 'Test token'} claim confirmed`);
    void Promise.all([
      nativeBalance.refetch(),
      usdtBalance.refetch(),
      usdcBalance.refetch(),
      usdtNextClaimAt.refetch(),
      usdcNextClaimAt.refetch(),
    ]);
  }, [
    claimHash,
    claimReceipt.isSuccess,
    lastClaimSymbol,
    nativeBalance,
    usdcBalance,
    usdcNextClaimAt,
    usdtBalance,
    usdtNextClaimAt,
  ]);

  const handleClaim = async (symbol: ClaimSymbol) => {
    if (!isConnected || !address) {
      toast.error('Connect wallet first');
      return;
    }
    if (!isOnTestnet) {
      toast.error('Switch to BSC Testnet');
      return;
    }
    if (!faucetConfigured || !faucetAddress) {
      toast.error('Testnet faucet is not configured');
      return;
    }

    setLastClaimSymbol(symbol);
    const functionName = symbol === 'USDT' ? 'claimUSDT' : 'claimUSDC';
    const hash = await writeContractAsync({
      chainId: TESTNET_STARTER_KIT.chainId,
      address: faucetAddress,
      abi: TESTNET_TOKEN_FAUCET_ABI,
      functionName,
    });

    toast.info(`${symbol}.t claim submitted`, {
      description: hash,
    });
  };

  const tokenPanels = {
    USDT: {
      label: TESTNET_STARTER_KIT.tokens.USDT.label,
      balance: usdtBalance.data as bigint | undefined,
      claimAmount: usdtClaimAmount.data as bigint | undefined,
      nextClaimAt: usdtNextClaimAt.data as bigint | undefined,
      configured: Boolean(faucetConfigured && usdtAddress),
    },
    USDC: {
      label: TESTNET_STARTER_KIT.tokens.USDC.label,
      balance: usdcBalance.data as bigint | undefined,
      claimAmount: usdcClaimAmount.data as bigint | undefined,
      nextClaimAt: usdcNextClaimAt.data as bigint | undefined,
      configured: Boolean(faucetConfigured && usdcAddress),
    },
  } as const;

  const renderClaimPanel = (symbol: ClaimSymbol) => {
    const panel = tokenPanels[symbol];
    const ready = isClaimable(panel.nextClaimAt);
    const disabled =
      !isConnected
      || !isOnTestnet
      || !panel.configured
      || !ready
      || claimPending
      || claimReceipt.isLoading;

    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Testnet token</p>
              <h3 className="mt-2 text-xl font-semibold text-ui-primary">{panel.label}</h3>
              <p className="mt-2 text-sm leading-6 text-ui-secondary">
                Testnet-only ERC20 for ATP beta payments. It is not USDT/USDC mainnet value.
              </p>
            </div>
            <Coins size={28} className="shrink-0 text-[#2CC295]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Balance" value={`${formatTokenAmount(panel.balance, 6)} ${panel.label}`} />
            <MetricCard label="Claim amount" value={`${formatTokenAmount(panel.claimAmount, 6)} ${panel.label}`} />
            <MetricCard label="Next claim" value={formatNextClaim(panel.nextClaimAt)} />
          </div>

          {!panel.configured && (
            <div className="mt-4 rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Faucet address and {panel.label} address are not configured yet.
            </div>
          )}

          {!isOnTestnet && (
            <div className="mt-4 rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              Claims are hard-blocked outside BSC Testnet.
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <StudioActionButton
              type="button"
              variant="primary"
              leftIcon={claimPending || claimReceipt.isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Coins size={16} />}
              disabled={disabled}
              onClick={() => void handleClaim(symbol)}
            >
              Claim {panel.label}
            </StudioActionButton>
            <span className="text-xs text-ui-muted">
              Cooldown: {formatCooldown(claimCooldown.data as bigint | undefined)}
            </span>
          </div>
        </div>

        <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Boundary</p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-ui-secondary">
            <li>Only BSC Testnet can claim.</li>
            <li>Production must remove mock token allowlists.</li>
            <li>Mainnet ORI fee quotes require oracle pricing.</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <StudioModalShell>
      <StudioModalBackdrop onBackdropClick={onClose} />
      <StudioModalPanel className="relative z-10 max-w-[960px] rounded-[18px]">
        <StudioModalHeader className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2CC295]">BSC Testnet only</p>
            <h2 className="mt-2 text-2xl font-semibold text-ui-primary">Testnet Starter Kit</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-secondary">
              Claim gas and test payment tokens for ATP beta flows. Testnet rankings track QA activity only.
            </p>
          </div>
          <StudioModalCloseButton onClick={onClose} />
        </StudioModalHeader>

        <div className="border-b border-ui-border-subtle px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STARTER_TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-[#2CC295] text-black'
                      : 'bg-[var(--t-surface-2)] text-ui-secondary hover:bg-[var(--t-surface-3)] hover:text-ui-primary',
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <StudioModalBody className="space-y-5">
          {activeTab === 'guide' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <div className="flex items-start gap-3">
                  <Info size={22} className="mt-1 shrink-0 text-[#2CC295]" />
                  <div>
                    <h3 className="text-lg font-semibold text-ui-primary">Beta setup sequence</h3>
                    <ol className="mt-4 space-y-3 text-sm leading-6 text-ui-secondary">
                      <li>1. Connect wallet and switch to BSC Testnet.</li>
                      <li>2. Claim tBNB for gas from a configured external faucet.</li>
                      <li>3. Claim USDT.t or USDC.t for ATP payment tests.</li>
                      <li>4. Run marketplace buy, sell, dispute, NFT, and M2M flows.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Network status</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-secondary">Wallet</span>
                    <span className={isConnected ? 'text-[#2CC295]' : 'text-ui-muted'}>{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-secondary">Chain</span>
                    <span className={isOnTestnet ? 'text-[#2CC295]' : 'text-amber-200'}>
                      {isOnTestnet ? 'BSC Testnet' : 'Not testnet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ui-secondary">Faucet</span>
                    <span className={faucetConfigured ? 'text-[#2CC295]' : 'text-amber-200'}>
                      {faucetConfigured ? 'Configured' : 'Pending deploy'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tbnb' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Gas token</p>
                    <h3 className="mt-2 text-xl font-semibold text-ui-primary">tBNB</h3>
                    <p className="mt-2 text-sm leading-6 text-ui-secondary">
                      tBNB pays gas for BSC Testnet transactions. Orina does not mint native gas token.
                    </p>
                  </div>
                  <Fuel size={28} className="shrink-0 text-[#2CC295]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Wallet balance" value={`${nativeBalance.data?.formatted ?? '...'} tBNB`} />
                  <MetricCard label="Chain" value={isOnTestnet ? 'BSC Testnet' : 'Switch required'} />
                </div>
                <div className="mt-5">
                  <StudioActionButton
                    type="button"
                    variant="primary"
                    leftIcon={<ExternalLink size={16} />}
                    disabled={!TESTNET_STARTER_KIT.tbnbFaucetUrl}
                    onClick={() => {
                      if (!TESTNET_STARTER_KIT.tbnbFaucetUrl) return;
                      window.open(TESTNET_STARTER_KIT.tbnbFaucetUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Open tBNB faucet
                  </StudioActionButton>
                </div>
              </div>
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Notice</p>
                <p className="mt-3 text-sm leading-6 text-ui-secondary">
                  External gas faucets can rate-limit or change availability. Keep this URL configured by environment, not by core protocol code.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usdt' && renderClaimPanel('USDT')}
          {activeTab === 'usdc' && renderClaimPanel('USDC')}

          {activeTab === 'rankings' && (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Wallet activity</p>
                    <h3 className="mt-2 text-xl font-semibold text-ui-primary">Testnet QA ranking</h3>
                    <p className="mt-2 text-sm leading-6 text-ui-secondary">
                      Local wallet activity for beta testing. This does not create mainnet rewards or financial entitlement.
                    </p>
                  </div>
                  <Trophy size={28} className="shrink-0 text-[#2CC295]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label="Orders" value={String(activity.totalOrders)} />
                  <MetricCard label="Finalized" value={String(activity.finalizedOrders)} />
                  <MetricCard label="Disputes" value={String(activity.disputes)} />
                  <MetricCard label="Minted assets" value={String(activity.mintedAssets)} />
                  <MetricCard label="NFT mints" value={String(activity.nftMints)} />
                  <MetricCard label="Score" value={String(activity.finalizedOrders * 5 + activity.mintedAssets * 2 + activity.disputes)} />
                </div>
              </div>
              <div className="rounded-[8px] border border-ui-border-subtle bg-[var(--t-surface-2)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Scope</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-ui-secondary">
                  <li>QA ranking is testnet-only.</li>
                  <li>Backend leaderboard can be added after projection policy is finalized.</li>
                  <li>Mainnet docs must not describe testnet score as reward eligibility.</li>
                </ul>
              </div>
            </div>
          )}
        </StudioModalBody>

        <div className="border-t border-ui-border-subtle px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ui-muted">
            <span className="inline-flex items-center gap-2">
              <Wallet size={14} />
              Testnet only. USDT.t and USDC.t are mock tokens.
            </span>
            <span>Chain id {TESTNET_STARTER_KIT.chainId}</span>
          </div>
        </div>
      </StudioModalPanel>
    </StudioModalShell>
  );
}
