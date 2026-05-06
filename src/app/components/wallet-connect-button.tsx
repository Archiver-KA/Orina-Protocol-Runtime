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
    background: 'rgba(18, 18, 18, 1)',
  } as const;

  const dropdownItemClass =
    'wallet-dropdown-item mx-3 my-0.5 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[12px] px-4 py-3 text-sm text-[rgba(203,213,225,0.92)] hover:text-white transition-colors text-left';

  const renderWalletDropdown = (align: 'right' | 'left') => (
    <div
      className={`wallet-dropdown-panel nativebar-dropdown-panel absolute ${align === 'right' ? 'right-0' : 'left-full ml-2'} top-full mt-2 w-[264px] dropdown-panel overflow-hidden rounded-[var(--t-card-radius-lg)] z-50 pb-[5px]`}
      style={dropdownPanelStyle}
    >
      <style>{`@keyframes walletDropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="px-4 py-3">
        <p className="text-[10px] text-[rgba(148,163,184,0.86)] uppercase tracking-[0.8px] font-semibold mb-1">Connected Wallet</p>
        <div className="flex items-start gap-2">
          <p className="text-xs font-mono text-[rgba(226,232,240,0.95)] break-all flex-1 leading-5">{address}</p>
          <button
            onClick={handleCopyAddress}
            className="wallet-dropdown-copy mt-0.5 p-1 rounded-md text-[rgba(148,163,184,0.9)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors shrink-0"
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
          className="wallet-dropdown-item flex h-11 w-full items-center gap-3 rounded-[12px] px-4 text-left text-[rgba(203,213,225,0.92)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
        >
          <Wallet size={18} className="shrink-0 text-[rgba(148,163,184,0.9)]" aria-hidden="true" />
          <span className="text-xs font-semibold">Connect Wallet</span>
        </button>
      );
    }

    // Collapsed: icon only connect button
    if (sidebarCollapsed) {
      return (
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center h-9 text-ui-muted hover:text-ui-primary hover:bg-[rgba(255,255,255,0.06)] rounded-full transition-all"
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
          className="ui-secondary-button flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center gap-2 rounded-full px-0 text-xs font-semibold transition-all sm:w-full sm:px-3 sm:py-2"
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
          className="wallet-dropdown-trigger w-full flex items-center justify-center h-9 rounded-full hover:bg-[rgba(255,255,255,0.06)] transition-all"
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
            ? 'wallet-dropdown-trigger flex h-11 w-full items-center justify-between gap-3 rounded-[12px] px-4 text-left text-[rgba(203,213,225,0.92)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
            : 'wallet-dropdown-trigger flex h-[var(--t-shell-icon-button)] min-w-[132px] max-w-[220px] items-center justify-between gap-2 rounded-full bg-[rgba(18,18,18,0.5)] px-3 shadow-none transition-all hover:bg-[rgba(18,18,18,0.65)] max-sm:w-[var(--t-shell-icon-button)] max-sm:min-w-0 max-sm:justify-center max-sm:px-0'
        }
      >
        <div className={`${dropdownItem ? 'block' : 'hidden sm:block'} min-w-0 flex-1 text-left`}>
          <span className={`${dropdownItem ? 'text-xs' : 'text-[14px]'} leading-none font-semibold text-[rgba(241,245,249,0.96)] block truncate`}>
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
