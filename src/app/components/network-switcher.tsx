import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Wallet } from 'lucide-react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ACTIVE_CHAIN_ID } from '@/config/contracts';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import {
  LIVE_PROTOCOL_NETWORK,
  PROTOCOL_NETWORK_OPTIONS,
  resolveProtocolNetwork,
  type ProtocolNetworkIcon,
} from '@/utils/protocolNetwork';

interface NetworkSwitcherProps {
  sidebarCollapsed?: boolean;
}

interface PanelPosition {
  left: number;
  top: number;
  width: number;
}

const PANEL_HEIGHT = 360;
const NETWORK_LOGO_SOURCES: Record<ProtocolNetworkIcon, string> = {
  avalanche: '/network-logos/avalanche.png',
  bnb: '/network-logos/bnb.png',
  base: '/network-logos/base.png',
  polygon: '/network-logos/polygon.png',
  solana: '/network-logos/solana.png',
  ethereum: '/network-logos/ethereum.png',
  generic: '',
};

function GenericLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.06)] ${className}`}>
      <Wallet size={13} className="text-[rgba(226,232,240,0.92)]" />
    </div>
  );
}

function NetworkBrandLogo({ icon, className = '' }: { icon: ProtocolNetworkIcon; className?: string }) {
  const source = NETWORK_LOGO_SOURCES[icon];
  const [currentSrc, setCurrentSrc] = useState(source);

  useEffect(() => {
    setCurrentSrc(source);
  }, [source]);

  if (!source) {
    return <GenericLogo className={className} />;
  }

  return (
    <span className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={currentSrc}
        alt=""
        loading="eager"
        decoding="async"
        className="h-full w-full object-contain"
        onError={() => {
          setCurrentSrc('');
        }}
      />
      {!currentSrc && <GenericLogo className="h-full w-full" />}
    </span>
  );
}

export function NetworkSwitcher({ sidebarCollapsed = false }: NetworkSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useWalletModalContext();
  const { switchChain, switchChainAsync, isPending } = useSwitchChain();

  const resolvedChainId = isConnected && chainId ? chainId : ACTIVE_CHAIN_ID;
  const activeNetwork = resolveProtocolNetwork(resolvedChainId);

  useEffect(() => {
    if (!statusMessage) return;

    const timeoutId = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !triggerRef.current) return;

    const updatePanelPosition = () => {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const width = sidebarCollapsed ? 228 : Math.max(196, Math.floor(rect.width));
      const preferredLeft = sidebarCollapsed ? rect.right + 12 : rect.left;
      const preferredTop = sidebarCollapsed ? rect.bottom - PANEL_HEIGHT : rect.top - PANEL_HEIGHT;

      setPanelPosition({
        left: Math.max(16, Math.min(preferredLeft, window.innerWidth - width - 16)),
        top: Math.max(16, Math.min(preferredTop, window.innerHeight - PANEL_HEIGHT - 16)),
        width,
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, sidebarCollapsed]);

  const handleLiveNetworkSelect = async () => {
    if (!isConnected) {
      setStatusMessage('Connect wallet to switch');
      openConnectModal();
      return;
    }

    if (chainId === LIVE_PROTOCOL_NETWORK.chainId) {
      setStatusMessage('BNB Chain Testnet already selected');
      return;
    }

    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: LIVE_PROTOCOL_NETWORK.chainId as number });
      } else {
        switchChain({ chainId: LIVE_PROTOCOL_NETWORK.chainId as number });
      }

      setStatusMessage('Switched to BNB Chain Testnet');
      setIsOpen(false);
    } catch (error) {
      console.debug('[NetworkSwitcher] switch chain error', error);
      setStatusMessage('Approve the switch in your wallet');
    }
  };

  const panel =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className="dropdown-panel fixed z-[120] overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,18,18,1)] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            style={{
              left: panelPosition?.left ?? -9999,
              top: panelPosition?.top ?? -9999,
              width: panelPosition?.width ?? 220,
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            }}
          >
            <div className="space-y-1.5 p-2">
              {PROTOCOL_NETWORK_OPTIONS.map((network) => {
                const isSelected = network.key === activeNetwork.key;
                const isLive = network.status === 'live';
                const badgeLabel = isSelected ? 'Selected' : isLive ? 'Live' : 'Coming';

                return (
                  <button
                    key={network.key}
                    type="button"
                    onClick={isLive ? handleLiveNetworkSelect : undefined}
                    disabled={!isLive || isPending}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-[18px] border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#2CC295]/28 bg-[rgba(44,194,149,0.08)]'
                        : 'border-white/8 bg-[rgba(255,255,255,0.02)]'
                    } ${isLive && !isSelected ? 'hover:border-[#2CC295]/18 hover:bg-[rgba(255,255,255,0.04)]' : ''} ${
                      !isLive ? 'cursor-default' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <NetworkBrandLogo icon={network.icon} className="h-[28px] w-[28px] shrink-0" />
                      <span className="truncate text-[13px] font-semibold text-white">{network.shortLabel}</span>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                        isSelected
                          ? 'bg-[#2CC295]/14 text-[#78E5BF]'
                          : isLive
                            ? 'bg-white/[0.06] text-[rgba(226,232,240,0.92)]'
                            : 'bg-white/[0.04] text-[rgba(148,163,184,0.92)]'
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  </button>
                );
              })}

              {statusMessage && (
                <div className="px-1 pt-0.5 text-[10px] text-[rgba(148,163,184,0.92)]">{statusMessage}</div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`sidebar-btn group relative flex items-center rounded-[16px] border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${
          sidebarCollapsed
            ? 'mx-auto h-11 w-11 justify-center border-white/8 bg-white/[0.03] text-ui-secondary hover:border-white/14 hover:bg-white/[0.06] hover:text-ui-primary'
            : 'w-full justify-between gap-3 border-white/8 bg-white/[0.03] px-3 py-3 text-ui-secondary hover:border-white/14 hover:bg-white/[0.05] hover:text-ui-primary'
        }`}
        title={sidebarCollapsed ? activeNetwork.shortLabel : undefined}
      >
        {sidebarCollapsed ? (
          <NetworkBrandLogo icon={activeNetwork.icon} className="h-[26px] w-[26px] shrink-0" />
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <NetworkBrandLogo icon={activeNetwork.icon} className="h-[28px] w-[28px] shrink-0" />
              <span className="truncate text-[13px] font-semibold text-ui-primary">{activeNetwork.shortLabel}</span>
            </div>
            <ChevronDown size={16} className={`shrink-0 text-[rgba(148,163,184,0.92)] transition-transform ${isOpen ? 'rotate-180 text-white' : ''}`} />
          </>
        )}

        {sidebarCollapsed && (
          <div className="absolute left-full ml-2 rounded-lg bg-ui-dropdown px-2 py-1 text-xs whitespace-nowrap text-ui-primary invisible opacity-0 pointer-events-none transition-opacity group-hover:visible group-hover:opacity-100 z-50 backdrop-blur-md">
            {activeNetwork.shortLabel}
          </div>
        )}
      </button>

      {panel}
    </>
  );
}
