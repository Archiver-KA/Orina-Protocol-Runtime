import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet, Copy, LogOut, CheckCircle, ChevronDown, User, Heart, Settings } from 'lucide-react';
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
}

export function WalletConnectButton({ onNavigate }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useWalletModalContext();
  const { userData, clearUserSession } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  if (!isConnected || forceGuestMode || access.isGuest) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-zinc-100 text-black font-semibold text-sm rounded-lg transition-all"
      >
        <span>Connect</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/50 rounded-lg transition-all"
      >
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold text-white">
            {userData?.displayName || userData?.username || formatAddress(address)}
          </span>
          <span className="text-[10px] text-[#2CC295]">Pro Member</span>
        </div>
        {userData?.avatarUrl ? (
          <img 
            src={userData.avatarUrl} 
            alt="Profile" 
            className="w-8 h-8 rounded-full object-cover border-2 border-[#27272a] shrink-0"
          />
        ) : (() => {
          // Use SVG avatar system for default avatars
          const AvatarComponent = getAvatarByUserId(address || '');
          return (
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#27272a] shrink-0 bg-zinc-900">
              <AvatarComponent className="w-full h-full" />
            </div>
          );
        })()}
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          ></div>

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-[#141417] border border-[#27272a] rounded-lg shadow-lg overflow-hidden z-50">
            {/* Connected Address */}
            <div className="px-4 py-3 border-b border-[#27272a]">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                Connected Wallet
              </p>
              <p className="text-xs font-mono text-white break-all">{address}</p>
            </div>

            {/* Actions */}
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle size={18} className="text-[#2CC295]" />
                  <span className="text-xs font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span className="text-xs font-medium">Copy Address</span>
                </>
              )}
            </button>

            <div className="border-t border-[#27272a]"></div>

            {/* Navigation Items */}
            <button
              onClick={() => handleNavigation('profile')}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all"
            >
              <User size={18} />
              <span className="text-xs font-medium">Profile</span>
            </button>

            <button
              onClick={() => handleNavigation('favorites')}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all"
            >
              <Heart size={18} />
              <span className="text-xs font-medium">Favorites</span>
            </button>

            <button
              onClick={() => handleNavigation('settings')}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all"
            >
              <Settings size={18} />
              <span className="text-xs font-medium">Settings</span>
            </button>

            <div className="border-t border-[#27272a]"></div>

            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all"
            >
              <LogOut size={18} />
              <span className="text-xs font-medium">Disconnect</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
