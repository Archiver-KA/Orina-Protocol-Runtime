import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import {
  Home,
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
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { useTheme } from '@/app/contexts/ThemeContext';
import { getWalletSettingsKey, writeWalletThemePreference } from '@/utils/themePreferences';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-4 w-8 items-center rounded-full cursor-pointer transition-colors flex-shrink-0 ${checked ? 'bg-[#2CC295]' : 'bg-ui-border'
        }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
      ></span>
    </button>
  );
}

// Settings interface
interface UserSettings {
  // Delivery Address
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  // Notification Preferences
  newOrders: boolean;
  payments: boolean;
  transfers: boolean;
  messagingAlerts: boolean;

  // Privacy & Security
  twoFactor: boolean;
  emailNotifications: boolean;
  publicProfile: boolean;

  // Display Preferences
  darkMode: boolean;
  compactView: boolean;
  animations: boolean;

  // Language & Region
  language: string;
  timezone: string;
  currency: string;

  // Security Sidebar
  sessionLockout: boolean;
  ipWhitelist: boolean;
}

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  fullName: '',
  phoneNumber: '',
  streetAddress: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',

  newOrders: true,
  payments: true,
  transfers: false,
  messagingAlerts: true,

  twoFactor: false,
  emailNotifications: true,
  publicProfile: true,

  darkMode: true,
  compactView: false,
  animations: true,

  language: 'en-US',
  timezone: 'UTC',
  currency: 'USD',

  sessionLockout: false,
  ipWhitelist: true,
};

export function Settings() {
  const { address } = useAccount();
  const { setTheme: setRuntimeTheme, applyThemeFromWallet } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage when component mounts or address changes
  useEffect(() => {
    if (!address) {
      setSettings(DEFAULT_SETTINGS);
      setRuntimeTheme(DEFAULT_SETTINGS.darkMode ? 'dark' : 'light');
      setHasChanges(false);
      return;
    }

    const settingsKey = getWalletSettingsKey(address);
    if (!settingsKey) {
      setSettings(DEFAULT_SETTINGS);
      setRuntimeTheme(DEFAULT_SETTINGS.darkMode ? 'dark' : 'light');
      setHasChanges(false);
      return;
    }

    const savedSettings = localStorage.getItem(settingsKey);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('[Settings] Error parsing saved settings:', error);
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }

    applyThemeFromWallet(address);

    setHasChanges(false);
  }, [address, applyThemeFromWallet, setRuntimeTheme]);

  // Update a setting field
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'darkMode') {
      setRuntimeTheme(Boolean(value) ? 'dark' : 'light');
    }
    setHasChanges(true);
  };

  // Save all settings
  const handleSaveSettings = () => {
    if (!address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      const settingsKey = getWalletSettingsKey(address);
      if (!settingsKey) {
        toast.error('Invalid wallet address');
        return;
      }

      localStorage.setItem(settingsKey, JSON.stringify(settings));
      writeWalletThemePreference(address, settings.darkMode ? 'dark' : 'light');
      setRuntimeTheme(settings.darkMode ? 'dark' : 'light');
      setHasChanges(false);

      toast.success('Settings saved successfully!', {
        description: 'Your preferences have been updated.',
      });
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (address) {
      const settingsKey = getWalletSettingsKey(address);
      if (!settingsKey) {
        setSettings(DEFAULT_SETTINGS);
        setRuntimeTheme(DEFAULT_SETTINGS.darkMode ? 'dark' : 'light');
      } else {
        const savedSettings = localStorage.getItem(settingsKey);

        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          } catch (error) {
            setSettings(DEFAULT_SETTINGS);
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
        }

        applyThemeFromWallet(address);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
      setRuntimeTheme(DEFAULT_SETTINGS.darkMode ? 'dark' : 'light');
    }
    setHasChanges(false);
    toast.info('Changes discarded');
  };

  const settingsPanelClass = 'bg-[var(--t-surface-2)] rounded-xl p-6';
  const settingsInputClass = 'w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary focus:bg-ui-input-focus focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 text-sm placeholder:text-ui-muted shadow-none';
  const settingsRowClass = 'flex items-center justify-between p-4 bg-[var(--t-surface-5)] rounded-lg';
  const settingsSidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const settingsSidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl space-y-2';

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
              <div className={settingsPanelClass}>
                <div className="flex items-center gap-3 mb-6">
                  <Home className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest">Delivery Address</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alex Thompson"
                        className={settingsInputClass}
                        value={settings.fullName}
                        onChange={(e) => updateSetting('fullName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className={settingsInputClass}
                        value={settings.phoneNumber}
                        onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="123 Main Street, Apt 4B"
                      className={settingsInputClass}
                      value={settings.streetAddress}
                      onChange={(e) => updateSetting('streetAddress', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="San Francisco"
                        className={settingsInputClass}
                        value={settings.city}
                        onChange={(e) => updateSetting('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                        State / Province
                      </label>
                      <input
                        type="text"
                        placeholder="California"
                        className={settingsInputClass}
                        value={settings.state}
                        onChange={(e) => updateSetting('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        placeholder="94102"
                        className={settingsInputClass}
                        value={settings.zipCode}
                        onChange={(e) => updateSetting('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-ui-muted uppercase tracking-widest mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="United States"
                      className={settingsInputClass}
                      value={settings.country}
                      onChange={(e) => updateSetting('country', e.target.value)}
                    />
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="default-address"
                      className="w-4 h-4 rounded bg-[var(--t-surface-5)] text-[#2CC295] focus:ring-[#2CC295]/20"
                    />
                    <label htmlFor="default-address" className="text-xs text-ui-secondary cursor-pointer">
                      Set as default shipping address
                    </label>
                  </div>
                </div>
              </div>

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
                    <ToggleSwitch checked={settings.twoFactor} onChange={() => updateSetting('twoFactor', !settings.twoFactor)} />
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
                    <ToggleSwitch checked={settings.emailNotifications} onChange={() => updateSetting('emailNotifications', !settings.emailNotifications)} />
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
                    <ToggleSwitch checked={settings.publicProfile} onChange={() => updateSetting('publicProfile', !settings.publicProfile)} />
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
                    <ToggleSwitch checked={settings.newOrders} onChange={() => updateSetting('newOrders', !settings.newOrders)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Payments</p>
                      <p className="text-xs text-ui-muted">Success and failure payment alerts</p>
                    </div>
                    <ToggleSwitch checked={settings.payments} onChange={() => updateSetting('payments', !settings.payments)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Transfers</p>
                      <p className="text-xs text-ui-muted">Wallet to wallet activity monitoring</p>
                    </div>
                    <ToggleSwitch checked={settings.transfers} onChange={() => updateSetting('transfers', !settings.transfers)} />
                  </div>
                  <div className={settingsRowClass}>
                    <div>
                      <p className="text-sm font-semibold text-ui-primary">Messaging Alerts</p>
                      <p className="text-xs text-ui-muted">In-platform messaging notifications</p>
                    </div>
                    <ToggleSwitch checked={settings.messagingAlerts} onChange={() => updateSetting('messagingAlerts', !settings.messagingAlerts)} />
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
                    <ToggleSwitch checked={settings.darkMode} onChange={() => updateSetting('darkMode', !settings.darkMode)} />
                  </div>
                  <div className={settingsRowClass}>
                    <span className="text-sm font-semibold text-ui-primary">Compact View</span>
                    <ToggleSwitch checked={settings.compactView} onChange={() => updateSetting('compactView', !settings.compactView)} />
                  </div>
                  <div className={settingsRowClass}>
                    <span className="text-sm font-semibold text-ui-primary">Animations</span>
                    <ToggleSwitch checked={settings.animations} onChange={() => updateSetting('animations', !settings.animations)} />
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
                <ToggleSwitch checked={settings.sessionLockout} onChange={() => updateSetting('sessionLockout', !settings.sessionLockout)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-ui-secondary group-hover:text-ui-primary transition-colors">
                  IP Whitelist
                </span>
                <ToggleSwitch checked={settings.ipWhitelist} onChange={() => updateSetting('ipWhitelist', !settings.ipWhitelist)} />
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
