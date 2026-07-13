import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, Copy, LogOut, CheckCircle, User, Heart, Settings, Bot } from 'lucide-react';
import { formatAddress } from '@/utils/format';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { useUser } from '@/contexts/UserContext';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { copyToClipboard } from '@/utils/clipboard';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useAccessMode } from '@/hooks/useAccessMode';
import { clearWalletAuthSession } from '@/utils/walletAuthSession';
import { clearSupabaseBridgeSession } from '@/utils/supabaseAuthClaimBridge';
import { purgeWalletScopedSensitiveStorage } from '@/utils/walletSensitiveStorage';
import { formatUserDisplayName } from '@/utils/profileUtils';

interface WalletConnectButtonProps {
  onNavigate?: (page: string) => void;
  sidebarCollapsed?: boolean;
  dropdownItem?: boolean;
}

export function WalletConnectButton({ onNavigate, sidebarCollapsed = false, dropdownItem = false }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useWalletModalContext();
  const { userData, clearUserSession } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { forceGuestMode, enableGuestMode } = useGuestMode();
  const access = useAccessMode();

  const handleCopyAddress = async () => {
    if (address) {
      const success = await copyToClipboard(address);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleConnect = () => {
    openConnectModal();
  };

  const handleDisconnect = async () => {
    enableGuestMode();
    purgeWalletScopedSensitiveStorage(address);
    clearSupabaseBridgeSession();
    clearWalletAuthSession();
    clearUserSession();
    disconnect();
    setIsDropdownOpen(false);
    onNavigate?.('home');
  };

  const handleNavigation = (page: string) => {
    onNavigate?.(page);
    setIsDropdownOpen(false);
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const resolvedLabel = formatUserDisplayName(userData?.displayName, address);
  const navLabel = resolvedLabel || (address ? formatAddress(address) : 'User');

  const dropdownPanelStyle = {
    animation: 'walletDropdownIn 0.15s ease',
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  } as const;

  const dropdownItemClass =
    'wallet-dropdown-item mx-3 my-0.5 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[12px] px-4 py-3 text-left text-sm text-ui-secondary transition-colors hover:text-ui-primary';

  const renderWalletDropdown = (align: 'right' | 'left') => (
    <div
      className={`wallet-dropdown-panel nativebar-dropdown-panel absolute ${align === 'right' ? 'right-0' : 'left-full ml-2'} top-full z-50 mt-2 w-[264px] overflow-hidden rounded-[var(--t-card-radius-lg)] border border-ui-border-subtle bg-ui-dropdown pb-[5px] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.46)]`}
      style={dropdownPanelStyle}
    >
      <style>{`@keyframes walletDropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-ui-muted">Connected Wallet</p>
        <div className="flex items-start gap-2">
          <p className="flex-1 break-all font-mono text-xs leading-5 text-ui-primary">{address}</p>
          <button
            onClick={handleCopyAddress}
            className="wallet-dropdown-copy mt-0.5 shrink-0 rounded-md p-1 text-ui-muted transition-colors hover:bg-[var(--t-surface-5)] hover:text-ui-primary"
            title="Copy wallet address"
          >
            {copied ? <CheckCircle size={14} className="text-[#2CC295]" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <button
        onClick={() => handleNavigation('profile')}
        className={dropdownItemClass}
      >
        <User size={18} className="text-[rgba(148,163,184,0.9)]" />
        <span className="text-xs font-semibold">Profile</span>
      </button>

      <button
        onClick={() => handleNavigation('favorites')}
        className={dropdownItemClass}
      >
        <Heart size={18} className="text-[rgba(148,163,184,0.9)]" />
        <span className="text-xs font-semibold">Favorites</span>
      </button>

      <button
        onClick={() => handleNavigation('agent-settings')}
        className={dropdownItemClass}
      >
        <Bot size={18} className="text-[rgba(148,163,184,0.9)]" />
        <span className="text-xs font-semibold">Agent Setting</span>
      </button>

      <button
        onClick={() => handleNavigation('settings')}
        className={dropdownItemClass}
      >
        <Settings size={18} className="text-[rgba(148,163,184,0.9)]" />
        <span className="text-xs font-semibold">Settings</span>
      </button>

      <button
        onClick={handleDisconnect}
        className={`${dropdownItemClass} text-[rgba(148,163,184,0.9)] hover:text-red-400`}
      >
        <LogOut size={18} />
        <span className="text-xs font-semibold">Disconnect</span>
      </button>
    </div>
  );

  if (!isConnected || forceGuestMode || access.isGuest) {
    if (dropdownItem) {
      return (
        <button
          onClick={handleConnect}
          aria-label="Connect Wallet"
          title="Connect Wallet"
          className="wallet-dropdown-item flex h-11 w-full items-center gap-3 rounded-[12px] px-4 text-left text-ui-secondary transition-colors hover:bg-[var(--t-surface-5)] hover:text-ui-primary"
        >
          <Wallet size={18} className="shrink-0 text-ui-muted" aria-hidden="true" />
          <span className="text-xs font-semibold">Connect Wallet</span>
        </button>
      );
    }

    // Collapsed: icon only connect button
    if (sidebarCollapsed) {
      return (
        <button
          onClick={handleConnect}
          className="ui-control-surface flex h-9 w-full items-center justify-center rounded-full"
          title="Connect Wallet"
        >
          <Wallet size={16} />
        </button>
      );
    }
      return (
        <button
          onClick={handleConnect}
          aria-label="Connect Wallet"
          title="Connect Wallet"
          className="ui-secondary-button flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center gap-2 rounded-full px-0 text-xs font-semibold sm:w-auto sm:px-3 sm:py-2"
        >
          <Wallet size={16} className="shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </button>
      );
  }

  // Collapsed state: avatar only
  if (sidebarCollapsed) {
    return (
      <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <button
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="wallet-dropdown-trigger ui-control-surface flex h-9 w-full items-center justify-center rounded-full"
          title={resolvedLabel || formatAddress(address)}
        >
          {userData?.avatarUrl ? (
            <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover border-0" />
          ) : (() => {
            const AvatarComponent = getAvatarByUserId(address || '');
            return <div className="w-7 h-7 rounded-full overflow-hidden border-0 bg-ui-input"><AvatarComponent className="w-full h-full" /></div>;
          })()}
        </button>

        {isDropdownOpen && renderWalletDropdown('left')}
      </div>
    );
  }

  // Expanded state: name + avatar
  return (
    <div className={dropdownItem ? 'relative w-full' : 'relative'} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onMouseEnter={handleMouseEnter}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={
          dropdownItem
            ? 'wallet-dropdown-trigger flex h-11 w-full items-center justify-between gap-3 rounded-[12px] px-4 text-left text-ui-secondary transition-colors hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
            : 'wallet-dropdown-trigger ui-control-surface flex h-[var(--t-shell-icon-button)] min-w-[132px] max-w-[220px] items-center justify-between gap-2 rounded-full px-3 max-sm:w-[var(--t-shell-icon-button)] max-sm:min-w-0 max-sm:justify-center max-sm:px-0'
        }
      >
        <div className={`${dropdownItem ? 'block' : 'hidden sm:block'} min-w-0 flex-1 text-left`}>
          <span className={`${dropdownItem ? 'text-xs' : 'text-[14px]'} block truncate font-semibold leading-none text-ui-primary`}>
            {navLabel}
          </span>
        </div>
        {userData?.avatarUrl ? (
          <img src={userData.avatarUrl} alt="Profile" className="w-7 h-7 rounded-full object-cover border-0 shrink-0" />
        ) : (() => {
          const AvatarComponent = getAvatarByUserId(address || '');
          return (
            <div className="w-7 h-7 rounded-full overflow-hidden border-0 shrink-0 bg-ui-input">
              <AvatarComponent className="w-full h-full" />
            </div>
          );
        })()}
      </button>

      {isDropdownOpen && renderWalletDropdown('right')}
    </div>
  );
}
