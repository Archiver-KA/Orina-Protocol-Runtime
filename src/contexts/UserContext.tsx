import { createContext, useContext, useState, useEffect, useCallback, ReactNode, type Context } from 'react';
import { getAvatarTypeForAddress, getDefaultUsername } from '@/utils/avatarUtils';
import type { AvatarType } from '@/utils/avatarUtils';
import { loadUserProfile, isDefaultWalletDisplayName, PROFILE_SYNC_EVENT, shortenUserDisplayName } from '@/utils/profileUtils';

declare global {
  interface Window {
    __userContextWarned?: boolean;
  }
}

interface UserData {
  address?: string;
  avatarUrl?: string;
  avatarType?: AvatarType;
  username?: string;
  displayName?: string;
  email?: string;
  bio?: string;
  bannerUrl?: string;
  twitter?: string;
  website?: string;
}

interface UserContextType {
  userData: UserData;
  displayName: string;
  updateUserData: (data: Partial<UserData>) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateBanner: (bannerUrl: string) => void;
  clearUserSession: () => void;
}

declare global {
  var __orinaUserContext: Context<UserContextType | undefined> | undefined;
}

const UserContext = globalThis.__orinaUserContext
  ?? createContext<UserContextType | undefined>(undefined);

if (!globalThis.__orinaUserContext) {
  UserContext.displayName = 'UserContext';
  globalThis.__orinaUserContext = UserContext;
}

function normalizeUserDataShape(raw: any): UserData {
  if (!raw || typeof raw !== 'object') return {};
  const address = typeof raw.address === 'string' && raw.address ? raw.address : undefined;
  const avatarUrl = raw.avatarUrl || raw.avatar;
  const bannerUrl = raw.bannerUrl || raw.banner;
  const email = typeof raw.email === 'string' && raw.email.trim()
    ? raw.email.trim().toLowerCase()
    : undefined;
  const username = typeof raw.username === 'string' && raw.username.trim()
    ? raw.username
    : (address ? getDefaultUsername(address) : undefined);
  const rawDisplayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
  const displayName = rawDisplayName
    ? (address && isDefaultWalletDisplayName(rawDisplayName, address)
      ? shortenUserDisplayName(address)
      : rawDisplayName)
    : (address ? shortenUserDisplayName(address) : undefined);

  return {
    ...raw,
    address,
    avatarUrl,
    bannerUrl,
    email,
    username,
    displayName,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>({});


  useEffect(() => {
    if (!userData.address) return;

    const address = userData.address;
    const syncFromProfile = () => {
      const profile = loadUserProfile(address);
      if (!profile) return;

      setUserData((prev) => {
        const current = normalizeUserDataShape(prev);
        const merged = normalizeUserDataShape({
          ...prev,
          address: profile.address,
          username: profile.username || prev.username,
          displayName: profile.displayName || prev.displayName,
          email: profile.email,
          bio: profile.bio ?? prev.bio,
          avatarUrl: profile.avatarUrl || profile.avatar || prev.avatarUrl,
          bannerUrl: profile.bannerUrl || profile.banner || prev.bannerUrl,
          avatarType: prev.avatarType || (profile.address ? getAvatarTypeForAddress(profile.address) : undefined),
        });

        return JSON.stringify(merged) !== JSON.stringify(current) ? merged : prev;
      });
    };

    syncFromProfile();
    window.addEventListener(PROFILE_SYNC_EVENT, syncFromProfile as EventListener);
    window.addEventListener('storage', syncFromProfile as EventListener);
    return () => {
      window.removeEventListener(PROFILE_SYNC_EVENT, syncFromProfile as EventListener);
      window.removeEventListener('storage', syncFromProfile as EventListener);
    };
  }, [userData.address]);

  const updateUserData = useCallback((data: Partial<UserData>) => {
    setUserData(prev => normalizeUserDataShape({
      ...prev,
      ...data,
    }));
  }, []);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setUserData(prev => normalizeUserDataShape({
      ...prev,
      avatarUrl,
    }));
  }, []);

  const updateBanner = useCallback((bannerUrl: string) => {
    setUserData(prev => normalizeUserDataShape({
      ...prev,
      bannerUrl,
    }));
  }, []);

  const clearUserSession = useCallback(() => {
    setUserData({});
  }, []);

  return (
    <UserContext.Provider value={{ userData, displayName: userData.displayName || '', updateUserData, updateAvatar, updateBanner, clearUserSession }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      userData: {},
      displayName: '',
      updateUserData: () => {},
      updateAvatar: () => {},
      updateBanner: () => {},
      clearUserSession: () => {},
    };
  }
  return context;
}
