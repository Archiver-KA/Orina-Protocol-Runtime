import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, Copy, LogOut, CheckCircle, User, Heart, Settings } from 'lucide-react';
import { formatAddress } from '@/utils/format';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { useUser } from '@/contexts/UserContext';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { copyToClipboard } from '@/utils/clipboard';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useAccessMode } from '@/hooks/useAccessMode';
import { clearWalletAuthSession } from '@/utils/walletAuthSession';

interface WalletConnectButtonProps {
  onNavigate?: (page: string) => void;
  sidebarCollapsed?: boolean;
}

export function WalletConnectButton({ onNavigate, sidebarCollapsed = false }: WalletConnectButtonProps) {
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

  const resolvedLabel = (userData?.displayName || userData?.username || '').trim();
  const navLabel = resolvedLabel
    ? resolvedLabel.slice(0, 3).toUpperCase()
    : (address ? address.slice(2, 5).toUpperCase() : 'USR');

  const dropdownPanelStyle = {
    animation: 'walletDropdownIn 0.15s ease',
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
    background: 'rgba(18, 18, 18, 1)',
  } as const;

  const dropdownItemClass =
    'w-full flex items-center gap-3 px-4 py-3 text-sm text-ui-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-ui-primary transition-colors text-left';

  const renderWalletDropdown = (align: 'right' | 'left') => (
    <div
      className={`absolute ${align === 'right' ? 'right-0' : 'left-full ml-2'} top-full mt-2 w-[264px] dropdown-panel overflow-hidden rounded-[24px] z-50`}
      style={dropdownPanelStyle}
    >
      <style>{`@keyframes walletDropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="px-4 py-3">
        <p className="text-[10px] text-ui-muted uppercase tracking-[0.8px] font-bold mb-1">Connected Wallet</p>
        <div className="flex items-start gap-2">
          <p className="text-xs font-mono text-ui-primary break-all flex-1 leading-5">{address}</p>
          <button
            onClick={handleCopyAddress}
            className="mt-0.5 p-1 rounded-md text-ui-muted hover:text-ui-primary hover:bg-[var(--t-surface-5)] transition-colors shrink-0"
            title="Copy wallet address"
          >
            {copied ? <CheckCircle size={14} className="text-[#2CC295]" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <button
        onClick={() => handleNavigation('profile')}
        className={dropdownItemClass}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--t-surface-5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <User size={18} className="text-ui-muted" />
        <span className="text-xs font-semibold">Profile</span>
      </button>

      <button
        onClick={() => handleNavigation('favorites')}
        className={dropdownItemClass}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--t-surface-5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Heart size={18} className="text-ui-muted" />
        <span className="text-xs font-semibold">Favorites</span>
      </button>

      <button
        onClick={() => handleNavigation('settings')}
        className={dropdownItemClass}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--t-surface-5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Settings size={18} className="text-ui-muted" />
        <span className="text-xs font-semibold">Settings</span>
      </button>

      <button
        onClick={handleDisconnect}
        className={`${dropdownItemClass} text-ui-muted hover:text-red-400`}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--t-surface-5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <LogOut size={18} />
        <span className="text-xs font-semibold">Disconnect</span>
      </button>
    </div>
  );

  if (!isConnected || forceGuestMode || access.isGuest) {
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
          className="flex items-center gap-2 w-full px-3 py-2 bg-ui-input hover:bg-ui-input-focus text-ui-primary border border-ui-border-subtle font-semibold text-xs rounded-full transition-all justify-center"
        >
          <span>Connect Wallet</span>
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
          className="w-full flex items-center justify-center h-9 rounded-full hover:bg-[rgba(255,255,255,0.06)] transition-all"
          title={userData?.displayName || userData?.username || formatAddress(address)}
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
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onMouseEnter={handleMouseEnter}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-between gap-2 min-w-[104px] h-[43px] px-3 bg-[rgba(18,18,18,0.5)] hover:bg-[rgba(18,18,18,0.65)] rounded-[50px] transition-all shadow-none"
      >
        <div className="min-w-0 flex-1 text-left">
          <span className="text-[14px] leading-none font-bold text-ui-strong block truncate">
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
