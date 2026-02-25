import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getAvatarTypeForAddress, getDefaultUsername } from '@/utils/avatarUtils';
import type { AvatarType } from '@/utils/avatarUtils';
import { loadUserProfile, shortenUserDisplayName } from '@/utils/profileUtils';

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

const UserContext = createContext<UserContextType | undefined>(undefined);

function normalizeUserDataShape(raw: any): UserData {
  if (!raw || typeof raw !== 'object') return {};
  const address = typeof raw.address === 'string' && raw.address ? raw.address : undefined;
  const avatarUrl = raw.avatarUrl || raw.avatar;
  const bannerUrl = raw.bannerUrl || raw.banner;
  const username = typeof raw.username === 'string' && raw.username.trim()
    ? raw.username
    : (address ? getDefaultUsername(address) : undefined);
  const displayName = typeof raw.displayName === 'string' && raw.displayName.trim()
    ? raw.displayName
    : (address ? shortenUserDisplayName(address) : undefined);

  return {
    ...raw,
    address,
    avatarUrl,
    bannerUrl,
    username,
    displayName,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('orina_user_data');
      if (stored) {
        try {
          return normalizeUserDataShape(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orina_user_data', JSON.stringify(normalizeUserDataShape(userData)));
    }
  }, [userData]);

  useEffect(() => {
    if (!userData.address) return;

    const syncFromProfile = () => {
      const profile = loadUserProfile(userData.address!);
      if (!profile) return;

      const merged = normalizeUserDataShape({
        ...userData,
        address: profile.address,
        username: profile.username || userData.username,
        displayName: profile.displayName || userData.displayName,
        bio: profile.bio ?? userData.bio,
        avatarUrl: profile.avatarUrl || profile.avatar || userData.avatarUrl,
        bannerUrl: profile.bannerUrl || profile.banner || userData.bannerUrl,
        avatarType: userData.avatarType || (profile.address ? getAvatarTypeForAddress(profile.address) : undefined),
      });

      const current = normalizeUserDataShape(userData);
      if (JSON.stringify(merged) !== JSON.stringify(current)) {
        setUserData(merged);
      }
    };

    syncFromProfile();
    window.addEventListener('orina:profile-changed', syncFromProfile as EventListener);
    window.addEventListener('storage', syncFromProfile as EventListener);
    return () => {
      window.removeEventListener('orina:profile-changed', syncFromProfile as EventListener);
      window.removeEventListener('storage', syncFromProfile as EventListener);
    };
  }, [userData.address, userData]);

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orina_user_data');
    }
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
