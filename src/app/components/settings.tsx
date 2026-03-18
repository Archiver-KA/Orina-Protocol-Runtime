import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  Bell,
  Shield,
  Key,
  Wallet,
  Eye,
  Globe,
  Moon,
  Trash2,
  AlertCircle,
  Lock,
  Monitor,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { CustomDropdown } from './custom-dropdown';
import { APIKeysSettings } from './api-keys-settings';
import { AIAgentSettings } from './ai-agent-settings';
import {
  DeliveryAddressBlock,
  type DeliveryAddressBlockHandle,
} from '@/app/components/settings/delivery-address-block';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { useTheme } from '@/app/contexts/ThemeContext';
import type { UserAppSettings } from '@/types/user-settings';
import {
  DEFAULT_USER_APP_SETTINGS,
  hydrateUserAppSettingsFromSupabase,
  readLocalUserAppSettings,
  saveUserAppSettings,
  settingsRecordToAppSettings,
  USER_SETTINGS_SYNC_EVENT,
} from '@/utils/userSettingsUtils';

export function Settings() {
  const { address } = useAccount();
  const { theme, setTheme: setRuntimeTheme } = useTheme();
  const [settings, setSettings] = useState<UserAppSettings>(DEFAULT_USER_APP_SETTINGS);
  const [settingsHasChanges, setSettingsHasChanges] = useState(false);
  const [addressHasChanges, setAddressHasChanges] = useState(false);
  const deliveryAddressRef = useRef<DeliveryAddressBlockHandle>(null);
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

  // Update a setting field
  const updateSetting = <K extends keyof UserAppSettings>(key: K, value: UserAppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'darkMode') {
      setRuntimeTheme(Boolean(value) ? 'dark' : 'light');
    }
    setSettingsHasChanges(true);
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
    } else {
      setSettings(DEFAULT_USER_APP_SETTINGS);
      setRuntimeTheme(DEFAULT_USER_APP_SETTINGS.darkMode ? 'dark' : 'light');
    }
    deliveryAddressRef.current?.discard();
    setSettingsHasChanges(false);
    setAddressHasChanges(false);
    toast.info('Changes discarded');
  };

  const settingsPanelClass = 'bg-[var(--t-surface-2)] rounded-xl p-6';
  const settingsRowClass = 'flex items-center justify-between p-4 bg-[var(--t-surface-5)] rounded-lg';
  const settingsSidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const settingsSidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl space-y-2';
  const hasChanges = settingsHasChanges || addressHasChanges;

  return (
    <section className="settings-borderless-theme h-full bg-ui-page overflow-hidden">
      <div className="h-full flex overflow-hidden">


      {/* Main Content - with relative positioning for footer */}
      <div className="flex-1 min-w-0 p-2.5 pr-0 overflow-hidden">
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] relative flex flex-col overflow-hidden">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-32 relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-10">
              <h1 className="text-2xl font-bold text-ui-strong">Settings</h1>
              <p className="text-sm text-ui-muted mt-1">Configure your advanced workspace and security preferences</p>
            </header>

            <div className="space-y-8">
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
                  <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Privacy & Security</h3>
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
                  <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Notification Preferences</h3>
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
              {/* SECTION 4: API Keys (self-managed)             */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-6">
                {address ? (
                  <APIKeysSettings walletAddress={address} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-ui-muted">Connect your wallet to manage API keys</p>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 5: AI Agent (self-managed)             */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-6">
                {address ? (
                  <AIAgentSettings walletAddress={address} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-ui-muted">Connect your wallet to manage AI agent</p>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 6: Language & Region                   */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Language & Region</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-ui-muted uppercase tracking-widest">Language</label>
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
                    <label className="text-[9px] font-bold text-ui-muted uppercase tracking-widest">Timezone</label>
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
                    <label className="text-[9px] font-bold text-ui-muted uppercase tracking-widest">Currency</label>
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
              {/* SECTION 7: Display Preferences                 */}
              {/* ══════════════════════════════════════════════ */}
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <Moon className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Display Preferences</h3>
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
                  <h4 className="text-ui-primary font-bold mb-2">Export Data</h4>
                  <p className="text-xs text-ui-muted mb-6 leading-relaxed">
                    Download a complete archive of your account data, including transaction history and settings.
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] rounded-full text-xs font-bold text-[#2CC295] transition-colors">
                    <Trash2 size={14} />
                    Start Exporting
                  </button>
                </div>
                <div className={settingsPanelClass}>
                  <h4 className="text-ui-primary font-bold mb-2">Delete Account</h4>
                  <p className="text-xs text-ui-muted mb-6 leading-relaxed">
                    Permanently delete your account and all associated data. This action is irreversible.
                  </p>
                  <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[rgba(255,255,255,0.05)] hover:bg-red-500/15 rounded-full text-ui-secondary hover:text-red-300 transition-colors">
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
                className="px-6 py-2.5 rounded-full text-sm font-bold text-ui-muted hover:text-ui-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDiscardChanges}
                disabled={!hasChanges}
              >
                Discard
              </button>
              <button
                className="px-10 py-2.5 bg-[#2CC295] rounded-full text-sm font-bold text-black hover:opacity-90 hover:shadow-lg hover:shadow-[#2CC295]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      <StudioSidebarShell widthClassName="w-[344px]" className="bg-ui-page border-l-0 p-2.5">
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
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
                <p className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Security Score</p>
                <span className="text-xs font-bold text-[#2CC295]">85% - High</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 h-1.5 mb-2">
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[var(--t-surface-10)] rounded-full"></div>
              </div>
              <p className="text-[10px] text-ui-muted">
                Enable Hardware Security Key to reach <span className="text-ui-primary">100%</span>.
              </p>
            </div>
          </div>

          {/* Recent Logins */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">
              Recent Logins
            </h3>
            <div className="space-y-3">
              <div className={`${settingsSidebarCardClass} space-y-2`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Monitor className="text-ui-secondary" size={14} />
                    <span className="text-xs font-bold text-ui-primary">Chrome on macOS</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#2CC295]/10 text-[#2CC295] rounded">
                    Active
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-ui-muted">
                  <span>London, UK</span>
                  <span>Just now</span>
                </div>
              </div>
              <div className={settingsSidebarMutedCardClass}>
                <div className="flex items-center gap-2">
                  <Smartphone className="text-ui-muted" size={14} />
                  <span className="text-xs font-bold text-ui-secondary">iPhone 14 Pro</span>
                </div>
                <div className="flex justify-between text-[10px] text-ui-muted">
                  <span>London, UK</span>
                  <span>2 hours ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Security */}
          <div className="p-5 bg-[var(--t-surface-2)] backdrop-blur-[10px] rounded-2xl">
            <h3 className="text-[11px] uppercase font-bold text-ui-muted mb-4">Quick Security</h3>
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
            className="w-full py-3 bg-[var(--t-surface-2)] rounded-xl text-xs font-bold text-ui-primary hover:text-red-400 transition-all flex items-center justify-center gap-2 group"
          >
            <LogOut className="text-ui-muted group-hover:text-red-400" size={14} />
            Sign Out Everywhere
          </button>
        </div>
        </div>
      </StudioSidebarShell>
      </div>
    </section>
  );
}
