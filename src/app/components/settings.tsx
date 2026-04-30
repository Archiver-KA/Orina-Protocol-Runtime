import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bell,
  Shield,
  Key,
  Wallet,
  User,
  Eye,
  Globe,
  Moon,
  Trash2,
  AlertCircle,
  Lock,
  Monitor,
  Smartphone,
  LogOut,
  Mail,
  Twitter,
  MessageCircle,
  Send,
} from 'lucide-react';
import { CustomDropdown } from './custom-dropdown';
import {
  DeliveryAddressBlock,
  type DeliveryAddressBlockHandle,
} from '@/app/components/settings/delivery-address-block';
import { ImageUpload, type UploadedImage } from '@/app/components/image-upload';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { InlineAIRightRail } from '@/app/components/ui/inline-ai-right-rail';
import { StudioFieldHint, StudioFieldLabel, StudioInputField, StudioTextareaField } from '@/app/components/ui/studio-form-fields';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import { useWalletModalContext } from '@/contexts/WalletModalContext';
import { type AccountSecuritySidebarStatus, useAccountSecuritySidebar } from '@/hooks/useAccountSecuritySidebar';
import type { UserProfile } from '@/types/profile';
import type { UserAppSettings } from '@/types/user-settings';
import {
  DEFAULT_USER_APP_SETTINGS,
  hydrateUserAppSettingsFromSupabase,
  readLocalUserAppSettings,
  saveUserAppSettings,
  settingsRecordToAppSettings,
  USER_SETTINGS_SYNC_EVENT,
} from '@/utils/userSettingsUtils';
import {
  createDefaultProfile,
  loadUserProfile,
  PROFILE_SYNC_EVENT,
  saveUserProfile,
} from '@/utils/profileUtils';
import { clearWalletAuthSession, hasWalletAuthSession } from '@/utils/walletAuthSession';
import { revokeAllSupabaseBridgeWalletSessions } from '@/utils/supabaseAuthClaimBridge';
import type { BridgeWalletSessionSummary } from '@/utils/supabaseAuthClaimBridge';

function formatRelativeTimestamp(timestamp?: string | null): string {
  if (!timestamp) return 'Unavailable';
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return 'Unavailable';

  const diffMs = ms - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return 'Just now';
  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return `${minutes}m ${diffMs < 0 ? 'ago' : 'from now'}`;
  }
  if (absMs < day) {
    const hours = Math.max(1, Math.round(absMs / hour));
    return `${hours}h ${diffMs < 0 ? 'ago' : 'from now'}`;
  }
  const days = Math.max(1, Math.round(absMs / day));
  return `${days}d ${diffMs < 0 ? 'ago' : 'from now'}`;
}

function formatSessionDeviceLabel(deviceLabel?: string | null): string {
  const raw = String(deviceLabel || '').trim();
  if (!raw || raw === 'claim_bridge') {
    return 'Orina web session';
  }

  const normalized = raw.startsWith('claim_bridge:')
    ? raw.slice('claim_bridge:'.length).trim()
    : raw;

  if (!normalized) {
    return 'Orina web session';
  }

  if (normalized.toUpperCase() === 'ATP2') {
    return 'Orina web app';
  }

  return normalized;
}

function sessionStatusLabel(session: { isCurrent: boolean; status: 'active' | 'expired' | 'revoked' }): string {
  if (session.isCurrent) return 'Current';
  if (session.status === 'revoked') return 'Revoked';
  if (session.status === 'expired') return 'Expired';
  return 'Active';
}

function sessionStatusMeta(session: { isCurrent: boolean; status: 'active' | 'expired' | 'revoked' }): string {
  if (session.isCurrent) return 'This browser session';
  if (session.status === 'revoked') return 'Revoked wallet session';
  if (session.status === 'expired') return 'Expired wallet session';
  return 'Authenticated wallet session';
}

function isMobileSessionLabel(deviceLabel?: string | null): boolean {
  const value = String(deviceLabel || '').toLowerCase();
  return /iphone|android|mobile|phone|tablet|ipad/.test(value);
}

type SecurityScoreCheck = {
  label: string;
  passed: boolean;
};

type SecurityScoreSnapshot = {
  score: number;
  label: string;
  toneClass: string;
  filledSegments: number;
  summary: string;
  detail: string;
  checks: SecurityScoreCheck[];
};

function buildSecurityScoreSnapshot(params: {
  walletAddress?: string | null;
  sidebarStatus: AccountSecuritySidebarStatus;
  sessions: BridgeWalletSessionSummary[];
}): SecurityScoreSnapshot {
  const hasSignedWallet = params.walletAddress ? hasWalletAuthSession(params.walletAddress) : false;
  const activeSessions = params.sessions.filter((session) => session.status === 'active');
  const currentSecureSession = activeSessions.find((session) => session.isCurrent) || null;
  const hasSessionInventory = params.sidebarStatus === 'ready';
  const canRemoteRevoke = hasSessionInventory && Boolean(currentSecureSession);
  const hasHealthySessionHygiene = Boolean(currentSecureSession) && activeSessions.length <= 1;

  const checks: SecurityScoreCheck[] = [
    { label: 'Signed wallet session', passed: hasSignedWallet },
    { label: 'Server-verified secure session', passed: Boolean(currentSecureSession) },
    { label: 'Session inventory synced', passed: hasSessionInventory },
    { label: 'Remote revoke available', passed: canRemoteRevoke },
    { label: 'Single active secure session', passed: hasHealthySessionHygiene },
  ];

  const score =
    (hasSignedWallet ? 35 : 0) +
    (currentSecureSession ? 25 : 0) +
    (hasSessionInventory ? 15 : 0) +
    (canRemoteRevoke ? 10 : 0) +
    (hasHealthySessionHygiene ? 15 : 0);

  let label = 'Locked';
  let toneClass = 'text-ui-muted';
  if (score >= 85) {
    label = 'High';
    toneClass = 'text-[#2CC295]';
  } else if (score >= 65) {
    label = 'Guarded';
    toneClass = 'text-[#7DE2C4]';
  } else if (score >= 40) {
    label = 'Partial';
    toneClass = 'text-amber-300';
  } else if (score > 0) {
    label = 'Low';
    toneClass = 'text-amber-400';
  }

  let summary = 'Unlock account security to start building a verified Orina session.';
  let detail = 'This score only reflects live wallet-session evidence. Unenforced toggles like 2FA and IP whitelist are not counted yet.';

  if (params.sidebarStatus === 'error') {
    summary = 'Secure session state could not be verified from the server.';
    detail = 'Retry session sync before relying on this score.';
  } else if (!hasSignedWallet) {
    summary = 'No signed wallet session is active for this browser.';
  } else if (!currentSecureSession) {
    summary = 'A signed wallet session exists, but the server-backed secure session is not active yet.';
  } else if (activeSessions.length > 1) {
    summary = `${activeSessions.length} active secure sessions detected across Orina.`;
    detail = `Use Sign Out Everywhere if the extra ${activeSessions.length - 1} session${activeSessions.length - 1 > 1 ? 's are' : ' is'} not expected.`;
  } else if (hasSessionInventory) {
    summary = 'Signed wallet auth, secure session sync, and remote revoke are all active.';
  }

  return {
    score,
    label,
    toneClass,
    filledSegments: Math.min(5, Math.max(0, Math.ceil(score / 20))),
    summary,
    detail,
    checks,
  };
}

interface SettingsProps {
  showAISidebar?: boolean;
  onCloseAISidebar?: () => void;
}

export function Settings({
  showAISidebar = false,
  onCloseAISidebar = () => undefined,
}: SettingsProps) {
  const { address } = useEffectiveViewer();
  const { theme, setTheme: setRuntimeTheme } = useTheme();
  const { openSecurityCheckModal } = useWalletModalContext();
  const [settings, setSettings] = useState<UserAppSettings>(DEFAULT_USER_APP_SETTINGS);
  const [profileDraft, setProfileDraft] = useState<UserProfile | null>(null);
  const [profileHasChanges, setProfileHasChanges] = useState(false);
  const [profileAvatarImage, setProfileAvatarImage] = useState<UploadedImage | null>(null);
  const [profileBannerImage, setProfileBannerImage] = useState<UploadedImage | null>(null);
  const [settingsHasChanges, setSettingsHasChanges] = useState(false);
  const [addressHasChanges, setAddressHasChanges] = useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  const {
    status: accountSecurityStatus,
    sessions: recentSessions,
    error: accountSecurityError,
    refresh: refreshAccountSecurity,
    needsSecurityCheck,
  } = useAccountSecuritySidebar(address);
  const deliveryAddressRef = useRef<DeliveryAddressBlockHandle>(null);
  const profileDirtyRef = useRef(false);
  const settingsDirtyRef = useRef(false);
  const runtimeThemeRef = useRef(theme);
  const visibleSettingsKeys: Array<keyof UserAppSettings> = [
    'newOrders',
    'payments',
    'transfers',
    'messagingAlerts',
    'twoFactor',
    'emailNotifications',
    'publicProfile',
    'darkMode',
    'compactView',
    'animations',
    'language',
    'timezone',
    'currency',
    'sessionLockout',
    'ipWhitelist',
  ];

  useEffect(() => {
    profileDirtyRef.current = profileHasChanges;
  }, [profileHasChanges]);

  useEffect(() => {
    settingsDirtyRef.current = settingsHasChanges;
  }, [settingsHasChanges]);

  useEffect(() => {
    runtimeThemeRef.current = theme;
    setSettings((prev) => {
      const nextDarkMode = theme === 'dark';
      return prev.darkMode === nextDarkMode ? prev : { ...prev, darkMode: nextDarkMode };
    });
  }, [theme]);

  const syncSettingsWithThemePreference = (nextSettings: UserAppSettings) => {
    return {
      ...nextSettings,
      darkMode: runtimeThemeRef.current === 'dark',
    };
  };

  useEffect(() => {
    let cancelled = false;

    if (!address) {
      setSettings(DEFAULT_USER_APP_SETTINGS);
      setRuntimeTheme(DEFAULT_USER_APP_SETTINGS.darkMode ? 'dark' : 'light');
      setSettingsHasChanges(false);
      setAddressHasChanges(false);
      return () => {
        cancelled = true;
      };
    }

    const localSettings = syncSettingsWithThemePreference(
      settingsRecordToAppSettings(readLocalUserAppSettings(address))
    );
    setSettings(localSettings);
    setSettingsHasChanges(false);
    setAddressHasChanges(false);

    void hydrateUserAppSettingsFromSupabase(address)
      .then((hydrated) => {
        if (cancelled) return;
        const nextSettings = syncSettingsWithThemePreference(
          settingsRecordToAppSettings(hydrated)
        );
        setSettings(nextSettings);
      })
      .catch((error) => {
        if (cancelled) return;
        console.debug('[Settings] Remote hydrate skipped:', error);
      });

    const handleSettingsSync = () => {
      if (cancelled) return;
      const next = syncSettingsWithThemePreference(
        settingsRecordToAppSettings(readLocalUserAppSettings(address))
      );
      setSettings((prev) => {
        if (!settingsDirtyRef.current) return next;
        const merged = { ...prev };
        for (const key of Object.keys(next) as Array<keyof UserAppSettings>) {
          if (visibleSettingsKeys.includes(key)) continue;
          merged[key] = next[key];
        }
        return merged;
      });
    };

    window.addEventListener(USER_SETTINGS_SYNC_EVENT, handleSettingsSync as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener(USER_SETTINGS_SYNC_EVENT, handleSettingsSync as EventListener);
    };
  }, [address, setRuntimeTheme]);

  useEffect(() => {
    let cancelled = false;

    if (!address) {
      setProfileDraft(null);
      setProfileAvatarImage(null);
      setProfileBannerImage(null);
      setProfileHasChanges(false);
      return () => {
        cancelled = true;
      };
    }

    const syncProfile = () => {
      if (cancelled) return;
      const nextProfile = loadUserProfile(address) || createDefaultProfile(address);
      if (!profileDirtyRef.current) {
        setProfileDraft(nextProfile);
        setProfileAvatarImage(null);
        setProfileBannerImage(null);
        setProfileHasChanges(false);
      } else {
        setProfileDraft((prev) => prev ?? nextProfile);
      }
    };

    syncProfile();
    window.addEventListener(PROFILE_SYNC_EVENT, syncProfile as EventListener);
    window.addEventListener('storage', syncProfile as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_SYNC_EVENT, syncProfile as EventListener);
      window.removeEventListener('storage', syncProfile as EventListener);
    };
  }, [address]);

  // Update a setting field
  const updateSetting = <K extends keyof UserAppSettings>(key: K, value: UserAppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'darkMode') {
      setRuntimeTheme(Boolean(value) ? 'dark' : 'light');
    }
    setSettingsHasChanges(true);
  };

  const updateProfileField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfileDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setProfileHasChanges(true);
  };

  const updateProfileSocialLink = (
    key: keyof NonNullable<UserProfile['socialLinks']>,
    value: string,
  ) => {
    setProfileDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        socialLinks: {
          ...(prev.socialLinks || {}),
          [key]: value,
        },
      };
    });
    setProfileHasChanges(true);
  };

  const prepareProfileForSave = (draft: UserProfile): UserProfile => {
    const nextAvatarUrl = profileAvatarImage?.url || draft.avatarUrl || draft.avatar;
    const nextBannerUrl = profileBannerImage?.url || draft.bannerUrl || draft.banner;
    const fallbackProfile = createDefaultProfile(draft.address);

    return {
      ...draft,
      username: draft.username.trim() || fallbackProfile.username,
      displayName: draft.displayName?.trim() || undefined,
      email: draft.email?.trim().toLowerCase() || undefined,
      bio: draft.bio?.trim() || undefined,
      avatar: nextAvatarUrl || undefined,
      banner: nextBannerUrl || undefined,
      avatarUrl: nextAvatarUrl || undefined,
      bannerUrl: nextBannerUrl || undefined,
      socialLinks: {
        twitter: draft.socialLinks?.twitter?.trim() || undefined,
        discord: draft.socialLinks?.discord?.trim() || undefined,
        telegram: draft.socialLinks?.telegram?.trim() || undefined,
        website: draft.socialLinks?.website?.trim() || undefined,
      },
    };
  };

  // Save all settings
  const handleSaveSettings = async () => {
    if (!address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      if (deliveryAddressRef.current?.hasChanges()) {
        const addressSaved = await deliveryAddressRef.current.save();
        if (!addressSaved) return;
      }

      if (profileHasChanges && profileDraft) {
        const nextProfile = prepareProfileForSave(profileDraft);
        saveUserProfile(nextProfile);
        setProfileDraft(nextProfile);
        setProfileAvatarImage(null);
        setProfileBannerImage(null);
        setProfileHasChanges(false);
      }

      const current = settingsRecordToAppSettings(readLocalUserAppSettings(address));
      const nextSettings = { ...current };
      for (const key of visibleSettingsKeys) {
        nextSettings[key] = settings[key];
      }

      const { remoteSynced } = await saveUserAppSettings(address, nextSettings);
      setRuntimeTheme(settings.darkMode ? 'dark' : 'light');
      setSettingsHasChanges(false);
      setAddressHasChanges(false);

      if (remoteSynced) {
        toast.success('Settings saved successfully!', {
          description: 'Your preferences are synced to your wallet profile.',
        });
      } else {
        toast.success('Settings saved locally.', {
          description: 'Remote sync is not available yet for this session.',
        });
      }
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (address) {
      const localSettings = syncSettingsWithThemePreference(
        settingsRecordToAppSettings(readLocalUserAppSettings(address))
      );
      setSettings(localSettings);
      setProfileDraft(loadUserProfile(address) || createDefaultProfile(address));
    } else {
      setSettings(DEFAULT_USER_APP_SETTINGS);
      setRuntimeTheme(DEFAULT_USER_APP_SETTINGS.darkMode ? 'dark' : 'light');
      setProfileDraft(null);
    }
    setProfileAvatarImage(null);
    setProfileBannerImage(null);
    setProfileHasChanges(false);
    deliveryAddressRef.current?.discard();
    setSettingsHasChanges(false);
    setAddressHasChanges(false);
    toast.info('Changes discarded');
  };

  const settingsPanelClass = 'bg-[var(--t-surface-2)] rounded-xl p-6';
  const settingsRowClass = 'flex items-center justify-between p-4 bg-[var(--t-surface-5)] rounded-lg';
  const settingsSidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const settingsSidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl space-y-2';
  const hasChanges = settingsHasChanges || addressHasChanges || profileHasChanges;
  const securityScore = buildSecurityScoreSnapshot({
    walletAddress: address,
    sidebarStatus: accountSecurityStatus,
    sessions: recentSessions,
  });

  const handleUnlockSessionHistory = () => {
    if (!address) {
      toast.error('Connect your wallet first.');
      return;
    }

    openSecurityCheckModal(
      {
        title: 'Unlock Account Security',
        description: 'Confirm a one-time wallet signature so Orina can load your secure session history.',
        surfaceLabel: 'Account security',
        confirmLabel: 'Unlock Sessions',
        helpText: 'This only authenticates your wallet session in Orina. No gas fee, transaction, or token approval is involved.',
        successMessage: 'Account security unlocked.',
        successDescription: 'Recent login sessions are ready to load.',
      },
      async () => {
        await refreshAccountSecurity();
      },
    );
  };

  const performSignOutEverywhere = async () => {
    if (!address) {
      toast.error('Connect your wallet first.');
      return;
    }

    setIsSigningOutEverywhere(true);
    try {
      const result = await revokeAllSupabaseBridgeWalletSessions({ walletAddress: address });
      clearWalletAuthSession();
      toast.success('Signed out everywhere.', {
        description:
          result.revokedCount > 0
            ? `Revoked ${result.revokedCount} secure session${result.revokedCount > 1 ? 's' : ''} across Orina.`
            : 'No active secure sessions remained to revoke.',
      });
    } catch (error) {
      console.error('[Settings] Sign out everywhere failed:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to sign out everywhere.');
    } finally {
      setIsSigningOutEverywhere(false);
    }
  };

  const handleSignOutEverywhere = () => {
    if (!address) {
      toast.error('Connect your wallet first.');
      return;
    }

    if (needsSecurityCheck) {
      openSecurityCheckModal(
        {
          title: 'Unlock Account Security',
          description: 'Confirm a one-time wallet signature so Orina can revoke all active secure sessions for this wallet.',
          surfaceLabel: 'Sign out everywhere',
          confirmLabel: 'Unlock And Revoke',
          helpText: 'This signature only authenticates your session in Orina. After that, Orina will revoke every secure session tied to this wallet.',
          successMessage: 'Account security unlocked.',
          successDescription: 'Revoking secure sessions now.',
        },
        async () => {
          await performSignOutEverywhere();
        },
      );
      return;
    }

    void performSignOutEverywhere();
  };

  return (
    <section className="settings-borderless-theme h-full bg-ui-page overflow-hidden">
      <div className="h-full flex overflow-hidden">


      {/* Main Content - with relative positioning for footer */}
      <div className="flex-1 min-w-0 p-2.5 pr-0 overflow-hidden">
        <div className="surface-primary-shell h-full rounded-[var(--t-card-radius-lg)] relative flex flex-col overflow-hidden">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-32 relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-10">
              <h1 className="text-2xl font-semibold text-ui-strong">Settings</h1>
              <p className="text-sm text-ui-muted mt-1">Configure account, privacy, notification, and runtime preferences</p>
            </header>

            <div className="space-y-8">
              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 0: Profile                            */}
              {/* ══════════════════════════════════════════════ */}
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <User className="text-[#2CC295]" size={20} />
                  <div>
                    <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Profile</h3>
                    <p className="text-xs text-ui-muted mt-1">Shared profile details used by both Profile and Settings.</p>
                  </div>
                </div>

                {profileDraft ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)] gap-6">
                      <div className="rounded-[20px] bg-[var(--t-surface-5)] p-4">
                        <ImageUpload
                          walletAddress={address}
                          variant="banner"
                          hidePlaceholderIcon
                          onUploadSuccess={(image) => {
                            setProfileBannerImage(image);
                            setProfileHasChanges(true);
                          }}
                          onUploadError={(error) => {
                            toast.error(error);
                          }}
                          currentImageUrl={profileBannerImage?.url || profileDraft.bannerUrl || profileDraft.banner}
                          label="Profile Banner"
                          description="Recommended: 1500x500px"
                          showPreview
                        />
                      </div>

                      <div className="flex h-full items-center justify-center rounded-[20px] bg-[var(--t-surface-5)] p-4">
                        <ImageUpload
                          className="flex w-full max-w-[220px] flex-col items-center"
                          walletAddress={address}
                          variant="avatar"
                          hidePlaceholderIcon
                          onUploadSuccess={(image) => {
                            setProfileAvatarImage(image);
                            setProfileHasChanges(true);
                          }}
                          onUploadError={(error) => {
                            toast.error(error);
                          }}
                          currentImageUrl={profileAvatarImage?.url || profileDraft.avatarUrl || profileDraft.avatar}
                          label="Profile Picture"
                          description="Recommended: 400x400px"
                          showPreview
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div>
                        <StudioFieldLabel>Display Name</StudioFieldLabel>
                        <StudioInputField
                          type="text"
                          value={profileDraft.displayName || ''}
                          onChange={(e) => updateProfileField('displayName', e.target.value)}
                          placeholder="Your display name"
                          maxLength={50}
                        />
                        <StudioFieldHint>{(profileDraft.displayName || '').length}/50 characters</StudioFieldHint>
                      </div>

                      <div>
                        <StudioFieldLabel>Username</StudioFieldLabel>
                        <StudioInputField
                          type="text"
                          value={profileDraft.username || ''}
                          onChange={(e) => updateProfileField('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          placeholder="username"
                          maxLength={30}
                          leftSlot={<span>@</span>}
                        />
                        <StudioFieldHint>Letters, numbers, and underscores only</StudioFieldHint>
                      </div>

                      <div>
                        <StudioFieldLabel>Email</StudioFieldLabel>
                        <StudioInputField
                          type="email"
                          value={profileDraft.email || ''}
                          onChange={(e) => updateProfileField('email', e.target.value)}
                          placeholder="name@example.com"
                          maxLength={120}
                          leftSlot={<Mail size={16} className="text-ui-secondary" />}
                        />
                        <StudioFieldHint>Synced to Supabase profile preferences and reused by Profile.</StudioFieldHint>
                      </div>
                    </div>

                    <div>
                      <StudioFieldLabel>Bio</StudioFieldLabel>
                      <StudioTextareaField
                        value={profileDraft.bio || ''}
                        onChange={(e) => updateProfileField('bio', e.target.value)}
                        placeholder="Tell people what you do on Orina..."
                        maxLength={200}
                        rows={4}
                      />
                      <StudioFieldHint>{(profileDraft.bio || '').length}/200 characters</StudioFieldHint>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <StudioFieldLabel>Twitter</StudioFieldLabel>
                        <StudioInputField
                          type="text"
                          value={profileDraft.socialLinks?.twitter || ''}
                          onChange={(e) => updateProfileSocialLink('twitter', e.target.value)}
                          placeholder="twitter_handle"
                          leftSlot={<Twitter size={16} className="text-ui-secondary" />}
                        />
                      </div>

                      <div>
                        <StudioFieldLabel>Discord</StudioFieldLabel>
                        <StudioInputField
                          type="text"
                          value={profileDraft.socialLinks?.discord || ''}
                          onChange={(e) => updateProfileSocialLink('discord', e.target.value)}
                          placeholder="https://discord.gg/..."
                          leftSlot={<MessageCircle size={16} className="text-ui-secondary" />}
                        />
                      </div>

                      <div>
                        <StudioFieldLabel>Telegram</StudioFieldLabel>
                        <StudioInputField
                          type="text"
                          value={profileDraft.socialLinks?.telegram || ''}
                          onChange={(e) => updateProfileSocialLink('telegram', e.target.value)}
                          placeholder="https://t.me/..."
                          leftSlot={<Send size={16} className="text-ui-secondary" />}
                        />
                      </div>

                      <div>
                        <StudioFieldLabel>Website</StudioFieldLabel>
                        <StudioInputField
                          type="url"
                          value={profileDraft.socialLinks?.website || ''}
                          onChange={(e) => updateProfileSocialLink('website', e.target.value)}
                          placeholder="https://..."
                          leftSlot={<Globe size={16} className="text-ui-secondary" />}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[var(--t-surface-5)] px-5 py-8 text-sm text-ui-muted">
                    Connect your wallet to load profile settings.
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 1: Delivery Address                    */}
              {/* ══════════════════════════════════════════════ */}
              <DeliveryAddressBlock
                ref={deliveryAddressRef}
                walletAddress={address}
                onDirtyChange={setAddressHasChanges}
              />

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 2: Privacy & Security                   */}
              {/* ══════════════════════════════════════════════ */}
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Privacy & Security</h3>
                </div>
                <div className="space-y-4">
                  <div className={settingsRowClass}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[var(--t-surface-10)] rounded-lg flex items-center justify-center">
                        <Key className="text-ui-muted" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ui-primary">2FA Authentication</p>
                        <p className="text-xs text-ui-muted">Add an extra layer of security</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.twoFactor} onChange={(checked) => updateSetting('twoFactor', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[var(--t-surface-10)] rounded-lg flex items-center justify-center">
                        <Wallet className="text-ui-muted" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ui-primary">Email Notifications</p>
                        <p className="text-xs text-ui-muted">Digest of important account activities</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.emailNotifications} onChange={(checked) => updateSetting('emailNotifications', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[var(--t-surface-10)] rounded-lg flex items-center justify-center">
                        <Eye className="text-ui-muted" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ui-primary">Public Profile Visibility</p>
                        <p className="text-xs text-ui-muted">Let others see your achievements</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.publicProfile} onChange={(checked) => updateSetting('publicProfile', checked)} />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 3: Notification Preferences            */}
              {/* ══════════════════════════════════════════════ */}
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Notification Preferences</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">New Orders</p>
                      <p className="text-xs text-ui-muted">Alert when someone buys your assets</p>
                    </div>
                    <ToggleSwitch checked={settings.newOrders} onChange={(checked) => updateSetting('newOrders', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Payments</p>
                      <p className="text-xs text-ui-muted">Success and failure payment alerts</p>
                    </div>
                    <ToggleSwitch checked={settings.payments} onChange={(checked) => updateSetting('payments', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Transfers</p>
                      <p className="text-xs text-ui-muted">Wallet to wallet activity monitoring</p>
                    </div>
                    <ToggleSwitch checked={settings.transfers} onChange={(checked) => updateSetting('transfers', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Messaging Alerts</p>
                      <p className="text-xs text-ui-muted">In-platform messaging notifications</p>
                    </div>
                    <ToggleSwitch checked={settings.messagingAlerts} onChange={(checked) => updateSetting('messagingAlerts', checked)} />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 7: Language & Region                   */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Language & Region</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-semibold text-ui-muted uppercase tracking-widest">Language</label>
                    <CustomDropdown
                      variant="compact"
                      defaultValue={settings.language}
                      onChange={(value) => updateSetting('language', value)}
                      options={[
                        { value: 'en-US', label: 'English (US)' },
                        { value: 'vi', label: 'Vietnamese' },
                        { value: 'ja', label: 'Japanese' },
                        { value: 'fr', label: 'French' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-semibold text-ui-muted uppercase tracking-widest">Timezone</label>
                    <CustomDropdown
                      variant="compact"
                      defaultValue={settings.timezone}
                      onChange={(value) => updateSetting('timezone', value)}
                      options={[
                        { value: 'UTC', label: '(GMT+00:00) UTC' },
                        { value: 'ICT', label: '(GMT+07:00) ICT' },
                        { value: 'EST', label: '(GMT-05:00) EST' },
                        { value: 'JST', label: '(GMT+09:00) JST' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-semibold text-ui-muted uppercase tracking-widest">Currency</label>
                    <CustomDropdown
                      variant="compact"
                      defaultValue={settings.currency}
                      onChange={(value) => updateSetting('currency', value)}
                      options={[
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'ETH', label: 'ETH (Ξ)' },
                        { value: 'EUR', label: 'EUR (€)' },
                        { value: 'VND', label: 'VND (₫)' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 8: Display Preferences                 */}
              {/* ══════════════════════════════════════════════ */}
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <Moon className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Display Preferences</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={settingsRowClass}>
                    <span className="text-sm font-semibold text-ui-primary">Dark Mode</span>
                    <ToggleSwitch checked={settings.darkMode} onChange={(checked) => updateSetting('darkMode', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <span className="text-sm font-semibold text-ui-primary">Compact View</span>
                    <ToggleSwitch checked={settings.compactView} onChange={(checked) => updateSetting('compactView', checked)} />
                  </div>
                  <div className={settingsRowClass}>
                    <span className="text-sm font-semibold text-ui-primary">Animations</span>
                    <ToggleSwitch checked={settings.animations} onChange={(checked) => updateSetting('animations', checked)} />
                  </div>
                </div>
              </div>
              {/* Export & Delete */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={settingsPanelClass}>
                  <h4 className="text-ui-primary font-semibold mb-2">Export Data</h4>
                  <p className="text-xs text-ui-muted mb-6 leading-relaxed">
                    Download a complete archive of your account data, including transaction history and settings.
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] rounded-full text-xs font-semibold text-[#2CC295] transition-colors">
                    <Trash2 size={14} />
                    Start Exporting
                  </button>
                </div>
                <div className={settingsPanelClass}>
                  <h4 className="text-ui-primary font-semibold mb-2">Delete Account</h4>
                  <p className="text-xs text-ui-muted mb-6 leading-relaxed">
                    Permanently delete your account and all associated data. This action is irreversible.
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[rgba(255,255,255,0.05)] hover:bg-red-500/15 rounded-full text-ui-secondary hover:text-red-300 transition-colors">
                    <Trash2 size={14} />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Save Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[var(--t-nav-bg)] backdrop-blur-xl z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-ui-muted">
              <AlertCircle size={14} />
              <span>Some changes may take up to 24 hours to reflect globally.</span>
            </div>
            <div className="flex gap-4">
              <button
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-ui-muted hover:text-ui-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDiscardChanges}
                disabled={!hasChanges}
              >
                Discard
              </button>
              <button
                className="px-10 py-2.5 bg-[#2CC295] rounded-full text-sm font-semibold text-black hover:opacity-90 hover:shadow-lg hover:shadow-[#2CC295]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveSettings}
                disabled={!hasChanges}
              >
                Save All Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Right Sidebar - Account Security */}
      <InlineAIRightRail
        activePage="settings"
        showAI={showAISidebar}
        onCloseAI={onCloseAISidebar}
        widthClassName="w-[var(--t-shell-right-rail-w)]"
        shellClassName="bg-ui-page border-l-0 p-2.5"
      >
      <StudioSidebarShell widthClassName="w-[var(--t-shell-right-rail-w)]" className="bg-ui-page border-l-0 p-2.5">
        <div className="surface-primary-shell h-full rounded-[var(--t-card-radius-lg)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-[var(--t-surface-2)] to-transparent">
          <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Lock className="text-ui-muted" size={18} />
            Account Security
          </h2>
          <p className="text-xs text-ui-muted mt-1">Status and active sessions</p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-8 custom-scrollbar">
          {/* Security Score */}
          <div className="space-y-4">
            <div className={settingsSidebarCardClass}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Security Score</p>
                <span className={`text-xs font-semibold ${securityScore.toneClass}`}>
                  {securityScore.score}% - {securityScore.label}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 h-1.5 mb-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-full ${
                      index < securityScore.filledSegments
                        ? 'bg-[#2CC295]'
                        : 'bg-[var(--t-surface-10)]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-ui-primary leading-relaxed">
                {securityScore.summary}
              </p>
              <p className="mt-2 text-[10px] text-ui-muted leading-relaxed">
                {securityScore.detail}
              </p>
              <div className="mt-4 space-y-2">
                {securityScore.checks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between gap-3 text-[10px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          check.passed ? 'bg-[#2CC295]' : 'bg-[var(--t-surface-10)]'
                        }`}
                      />
                      <span className="truncate text-ui-secondary">{check.label}</span>
                    </div>
                    <span className={`shrink-0 font-semibold ${check.passed ? 'text-[#2CC295]' : 'text-ui-muted'}`}>
                      {check.passed ? 'Live' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Logins */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-ui-muted px-1">
              Recent Logins
            </h3>
            {accountSecurityStatus === 'loading' ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className={`${settingsSidebarMutedCardClass} animate-pulse`}>
                    <div className="h-3 rounded bg-[var(--t-surface-10)]" />
                    <div className="h-2 rounded bg-[var(--t-surface-10)]/80" />
                  </div>
                ))}
              </div>
            ) : needsSecurityCheck ? (
              <div className={settingsSidebarMutedCardClass}>
                <p className="text-xs font-semibold text-ui-primary">Wallet security check required</p>
                <p className="text-[10px] text-ui-muted leading-relaxed">
                  Unlock one secure wallet session to load your real login history from Orina.
                </p>
                <button
                  type="button"
                  onClick={handleUnlockSessionHistory}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2CC295] px-3 py-1.5 text-[10px] font-semibold text-black transition-opacity hover:opacity-90"
                >
                  <Lock size={12} />
                  Unlock Session History
                </button>
              </div>
            ) : accountSecurityStatus === 'error' ? (
              <div className={settingsSidebarMutedCardClass}>
                <p className="text-xs font-semibold text-ui-primary">Unable to load recent sessions</p>
                <p className="text-[10px] text-ui-muted leading-relaxed">
                  {accountSecurityError || 'The secure session history is temporarily unavailable.'}
                </p>
                <button
                  type="button"
                  onClick={() => void refreshAccountSecurity()}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--t-surface-5)] px-3 py-1.5 text-[10px] font-semibold text-ui-primary transition-colors hover:bg-[var(--t-surface-10)]"
                >
                  Retry
                </button>
              </div>
            ) : recentSessions.length === 0 ? (
              <div className={settingsSidebarMutedCardClass}>
                <p className="text-xs font-semibold text-ui-primary">No secure sessions yet</p>
                <p className="text-[10px] text-ui-muted leading-relaxed">
                  Your wallet session history will appear here after the first authenticated Orina session is created.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => {
                  const Icon = isMobileSessionLabel(session.deviceLabel) ? Smartphone : Monitor;
                  const cardClass = session.isCurrent ? settingsSidebarCardClass : settingsSidebarMutedCardClass;
                  const badgeClass = session.isCurrent || session.status === 'active'
                    ? 'bg-[#2CC295]/10 text-[#2CC295]'
                    : session.status === 'revoked'
                      ? 'bg-red-500/10 text-red-300'
                      : 'bg-[var(--t-surface-10)] text-ui-muted';

                  return (
                    <div key={session.id} className={`${cardClass} space-y-2`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={session.isCurrent ? 'text-ui-secondary' : 'text-ui-muted'} size={14} />
                          <span className={`text-xs font-semibold truncate ${session.isCurrent ? 'text-ui-primary' : 'text-ui-secondary'}`}>
                            {formatSessionDeviceLabel(session.deviceLabel)}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${badgeClass}`}>
                          {sessionStatusLabel(session)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 text-[10px] text-ui-muted">
                        <span>{sessionStatusMeta(session)}</span>
                        <span>{formatRelativeTimestamp(session.lastSeenAt || session.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Security */}
          <div className="p-5 bg-[var(--t-surface-2)] backdrop-blur-[10px] rounded-2xl">
            <h3 className="text-[11px] uppercase font-semibold text-ui-muted mb-4">Quick Security</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-ui-secondary group-hover:text-ui-primary transition-colors">
                  Session Lockout
                </span>
                <ToggleSwitch checked={settings.sessionLockout} onChange={(checked) => updateSetting('sessionLockout', checked)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-ui-secondary group-hover:text-ui-primary transition-colors">
                  IP Whitelist
                </span>
                <ToggleSwitch checked={settings.ipWhitelist} onChange={(checked) => updateSetting('ipWhitelist', checked)} />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="mt-auto p-5 bg-[var(--t-nav-bg)] backdrop-blur-md">
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={isSigningOutEverywhere || !address || accountSecurityStatus === 'loading'}
            className="w-full py-3 bg-[var(--t-surface-2)] rounded-xl text-xs font-semibold text-ui-primary hover:text-red-400 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="text-ui-muted group-hover:text-red-400" size={14} />
            {isSigningOutEverywhere ? 'Revoking Sessions...' : 'Sign Out Everywhere'}
          </button>
        </div>
        </div>
      </StudioSidebarShell>
      </InlineAIRightRail>
      </div>
    </section>
  );
}
