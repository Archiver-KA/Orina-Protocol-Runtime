import { useState, useEffect } from 'react';
import { resetProfileForAddress } from '@/utils/resetProfile';
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
  Image
} from 'lucide-react';
import { CustomDropdown } from './custom-dropdown';
import { APIKeysSettings } from './api-keys-settings';
import { AIAgentSettings } from './ai-agent-settings';

// 🔍 DEBUG: LocalStorage Inspector
function debugLocalStorage() {
  console.log(`[🔍 LocalStorage Inspector] ══════════════════`);
  console.log(`[🔍 LocalStorage Inspector] Total items: ${localStorage.length}`);
  
  const apiRelated: string[] = [];
  const profileRelated: string[] = [];
  const others: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    const value = localStorage.getItem(key);
    const size = value ? value.length : 0;
    
    if (key.includes('api') || key.includes('API')) {
      apiRelated.push(`${key} (${(size / 1024).toFixed(2)} KB)`);
    } else if (key.includes('user') || key.includes('profile') || key.includes('studio')) {
      profileRelated.push(`${key} (${(size / 1024).toFixed(2)} KB)`);
    } else {
      others.push(`${key} (${(size / 1024).toFixed(2)} KB)`);
    }
  }
  
  console.log(`\n[🔑 API-related keys (${apiRelated.length})]:`);
  apiRelated.forEach(k => console.log(`  - ${k}`));
  
  console.log(`\n[👤 Profile-related keys (${profileRelated.length})]:`);
  profileRelated.forEach(k => console.log(`  - ${k}`));
  
  console.log(`\n[📦 Other keys (${others.length})]:`);
  others.forEach(k => console.log(`  - ${k}`));
  
  console.log(`[🔍 LocalStorage Inspector] ══════════════════\n`);
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-4 w-8 items-center rounded-full cursor-pointer transition-colors flex-shrink-0 ${
        checked ? 'bg-[#2CC295]' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
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

export function Settings({ onNavigateToPage }: { onNavigateToPage?: (page: string) => void }) {
  const { address } = useAccount();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage when component mounts or address changes
  useEffect(() => {
    if (address) {
      // ✅ Use address directly instead of userId
      const settingsKey = `orina_user_settings_${address.toLowerCase()}`;
      const savedSettings = localStorage.getItem(settingsKey);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          console.log(`[Settings] Loaded settings for address ${address}`);
        } catch (error) {
          console.error('[Settings] Error parsing saved settings:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      } else {
        console.log(`[Settings] No saved settings found, using defaults`);
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setHasChanges(false);
  }, [address]);

  // Update a setting field
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save all settings
  const handleSaveSettings = () => {
    if (!address) {
      toast.error('No wallet connected');
      return;
    }

    try {
      // ✅ Use address directly instead of userId
      const settingsKey = `orina_user_settings_${address.toLowerCase()}`;
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      setHasChanges(false);
      
      toast.success('Settings saved successfully!', {
        description: 'Your preferences have been updated.',
      });
      
      console.log(`[Settings] Saved settings for address ${address}`);
    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (address) {
      // ✅ Use address directly instead of userId
      const settingsKey = `orina_user_settings_${address.toLowerCase()}`;
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
    }
    setHasChanges(false);
    toast.info('Changes discarded');
  };

  return (
    <section className="bg-[#0f0f11] h-full flex relative overflow-hidden">
      <style>{`
        .ambient-blob {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient Blobs */}
      <div className="ambient-blob -top-40 -left-40"></div>
      <div className="ambient-blob -bottom-40 -right-40"></div>

      {/* Main Content - with relative positioning for footer */}
      <div className="flex-1 relative flex flex-col">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-32 relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-10">
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-zinc-500 mt-1">Configure your advanced workspace and security preferences</p>
            </header>

            <div className="space-y-8">
              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 1: Delivery Address                    */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Home className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Delivery Address</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alex Thompson"
                        className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                        value={settings.fullName}
                        onChange={(e) => updateSetting('fullName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                        value={settings.phoneNumber}
                        onChange={(e) => updateSetting('phoneNumber', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="123 Main Street, Apt 4B"
                      className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                      value={settings.streetAddress}
                      onChange={(e) => updateSetting('streetAddress', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="San Francisco"
                        className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                        value={settings.city}
                        onChange={(e) => updateSetting('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        State / Province
                      </label>
                      <input
                        type="text"
                        placeholder="California"
                        className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                        value={settings.state}
                        onChange={(e) => updateSetting('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        placeholder="94102"
                        className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                        value={settings.zipCode}
                        onChange={(e) => updateSetting('zipCode', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="United States"
                      className="w-full bg-zinc-900/50 border border-[#27272a] rounded-lg px-4 py-2.5 text-white focus:ring-[#2CC295]/20 focus:border-[#2CC295] text-sm placeholder:text-zinc-600"
                      value={settings.country}
                      onChange={(e) => updateSetting('country', e.target.value)}
                    />
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="default-address"
                      className="w-4 h-4 rounded border-[#27272a] bg-zinc-900/50 text-[#2CC295] focus:ring-[#2CC295]/20" 
                    />
                    <label htmlFor="default-address" className="text-xs text-zinc-400 cursor-pointer">
                      Set as default shipping address
                    </label>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 2: Privacy & Security                   */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Privacy & Security</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Key className="text-zinc-400" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">2FA Authentication</p>
                        <p className="text-xs text-zinc-500">Add an extra layer of security</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.twoFactor} onChange={() => updateSetting('twoFactor', !settings.twoFactor)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Wallet className="text-zinc-400" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Email Notifications</p>
                        <p className="text-xs text-zinc-500">Digest of important account activities</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.emailNotifications} onChange={() => updateSetting('emailNotifications', !settings.emailNotifications)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Eye className="text-zinc-400" size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Public Profile Visibility</p>
                        <p className="text-xs text-zinc-500">Let others see your achievements</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={settings.publicProfile} onChange={() => updateSetting('publicProfile', !settings.publicProfile)} />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 3: Notification Preferences            */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notification Preferences</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div>
                      <p className="text-sm font-semibold text-white">New Orders</p>
                      <p className="text-xs text-zinc-500">Alert when someone buys your assets</p>
                    </div>
                    <ToggleSwitch checked={settings.newOrders} onChange={() => updateSetting('newOrders', !settings.newOrders)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div>
                      <p className="text-sm font-semibold text-white">Payments</p>
                      <p className="text-xs text-zinc-500">Success and failure payment alerts</p>
                    </div>
                    <ToggleSwitch checked={settings.payments} onChange={() => updateSetting('payments', !settings.payments)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div>
                      <p className="text-sm font-semibold text-white">Transfers</p>
                      <p className="text-xs text-zinc-500">Wallet to wallet activity monitoring</p>
                    </div>
                    <ToggleSwitch checked={settings.transfers} onChange={() => updateSetting('transfers', !settings.transfers)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <div>
                      <p className="text-sm font-semibold text-white">Messaging Alerts</p>
                      <p className="text-xs text-zinc-500">In-platform messaging notifications</p>
                    </div>
                    <ToggleSwitch checked={settings.messagingAlerts} onChange={() => updateSetting('messagingAlerts', !settings.messagingAlerts)} />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 4: API Keys (self-managed)             */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                {address ? (
                  <APIKeysSettings walletAddress={address} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-zinc-500">Connect your wallet to manage API keys</p>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 5: AI Agent (self-managed)             */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                {address ? (
                  <AIAgentSettings 
                    walletAddress={address}
                    onNavigateToTest={() => onNavigateToPage?.('ai-agent-test')}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-zinc-500">Connect your wallet to manage AI agent</p>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* SECTION 6: Language & Region                   */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language & Region</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Language</label>
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
                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Timezone</label>
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
                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Currency</label>
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
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Moon className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Display Preferences</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <span className="text-sm font-semibold text-white">Dark Mode</span>
                    <ToggleSwitch checked={settings.darkMode} onChange={() => updateSetting('darkMode', !settings.darkMode)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <span className="text-sm font-semibold text-white">Compact View</span>
                    <ToggleSwitch checked={settings.compactView} onChange={() => updateSetting('compactView', !settings.compactView)} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                    <span className="text-sm font-semibold text-white">Animations</span>
                    <ToggleSwitch checked={settings.animations} onChange={() => updateSetting('animations', !settings.animations)} />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* TOOLS: IPFS Upload System                      */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Image className="text-[#2CC295]" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">IPFS Upload System</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                  Test decentralized image uploads using Pinata and IPFS. Verify configuration and gateway access.
                </p>
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-[#27272a]">
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Test IPFS Upload</p>
                    <p className="text-xs text-zinc-500">Open test page to verify upload functionality</p>
                  </div>
                  <button
                    onClick={() => onNavigateToPage?.('ipfs-test')}
                    className="px-4 py-2 bg-[#2CC295] hover:bg-[#25a578] text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Open Test Page
                  </button>
                </div>
              </div>

              {/* ══════════════════════════════════════════════ */}
              {/* TOOLS: Developer Tools - Profile Reset          */}
              {/* ══════════════════════════════════════════════ */}
              <div className="bg-zinc-900/30 border border-red-900/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 className="text-red-500" size={20} />
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Developer Tools</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                  Reset your profile data to test the app as a new user. This will clear all profile information, activities, and favorites.
                </p>
                
                {/* Debug LocalStorage Button */}
                <div className="flex items-center justify-between p-4 bg-blue-900/5 rounded-lg border border-blue-900/20 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Debug LocalStorage</p>
                    <p className="text-xs text-zinc-500">Inspect all stored data in console (F12)</p>
                  </div>
                  <button
                    onClick={() => {
                      debugLocalStorage();
                      toast.success('LocalStorage data logged to console!', {
                        description: 'Open DevTools (F12) to view detailed breakdown.'
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Inspect Data
                  </button>
                </div>
                
                {/* Reset Profile Button */}
                <div className="flex items-center justify-between p-4 bg-red-900/5 rounded-lg border border-red-900/20">
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Reset Profile</p>
                    <p className="text-xs text-zinc-500">Clear all profile data for current wallet</p>
                  </div>
                  <button
                    onClick={() => {
                      // Debug BEFORE reset
                      console.log('\n🔍 === BEFORE RESET ===');
                      debugLocalStorage();
                      
                      if (confirm('⚠️ Are you sure you want to reset your profile?\n\nThis will permanently delete:\n- Profile information\n- Activities\n- Favorites\n- Watchlist\n- Price alerts\n- Community posts\n- Messages\n- API Keys (all keys will be revoked)\n- Settings (back to defaults)\n- IPFS uploads\n\nThe page will reload automatically.')) {
                        if (address) {
                          console.log('[Settings] Starting profile reset...');
                          resetProfileForAddress(address);
                          
                          // Debug AFTER reset
                          console.log('\n🔍 === AFTER RESET ===');
                          debugLocalStorage();
                          
                          // Add a small delay to ensure localStorage is cleared
                          setTimeout(() => {
                            console.log('[Settings] Performing hard reload...');
                            // Use hard reload to clear all caches
                            window.location.href = window.location.href;
                          }, 100);
                        } else {
                          alert('No wallet connected');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Reset Profile
                  </button>
                </div>
              </div>

              {/* Export & Delete */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6 border-l-4 border-l-[#2CC295]/40">
                  <h4 className="text-white font-bold mb-2">Export Data</h4>
                  <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                    Download a complete archive of your account data, including transaction history and settings.
                  </p>
                  <button className="flex items-center gap-2 text-xs font-bold text-[#2CC295] hover:underline">
                    <Trash2 size={14} />
                    Start Exporting
                  </button>
                </div>
                <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-6">
                  <h4 className="text-white font-bold mb-2">Delete Account</h4>
                  <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                    Permanently delete your account and all associated data. This action is irreversible.
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-zinc-900/50 border border-[#27272a] rounded-lg text-zinc-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 transition-all">
                    <Trash2 size={14} />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Save Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#121212]/80 backdrop-blur-xl border-t border-[#27272a] z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <AlertCircle size={14} />
              <span>Some changes may take up to 24 hours to reflect globally.</span>
            </div>
            <div className="flex gap-4">
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDiscardChanges}
                disabled={!hasChanges}
              >
                Discard
              </button>
              <button
                className="px-10 py-2.5 bg-[#2CC295] rounded-xl text-sm font-bold text-black hover:opacity-90 hover:shadow-lg hover:shadow-[#2CC295]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveSettings}
                disabled={!hasChanges}
              >
                Save All Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Account Security */}
      <aside className="w-[340px] bg-[#141417] flex flex-col border-l border-[#27272a]">
        {/* Header */}
        <div className="p-6 border-b border-[#27272a] bg-gradient-to-b from-white/[0.02] to-transparent">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
            <Lock className="text-zinc-500" size={18} />
            Account Security
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Status and active sessions</p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-5 space-y-8 custom-scrollbar">
          {/* Security Score */}
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 border border-[#27272a] rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Security Score</p>
                <span className="text-xs font-bold text-[#2CC295]">85% - High</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 h-1.5 mb-2">
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-[#2CC295] rounded-full"></div>
                <div className="bg-zinc-800 rounded-full"></div>
              </div>
              <p className="text-[10px] text-zinc-500">
                Enable Hardware Security Key to reach <span className="text-white">100%</span>.
              </p>
            </div>
          </div>

          {/* Recent Logins */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-1">
              Recent Logins
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-zinc-900/40 border border-[#27272a]/50 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Monitor className="text-zinc-400" size={14} />
                    <span className="text-xs font-bold text-white">Chrome on macOS</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#2CC295]/10 text-[#2CC295] rounded border border-[#2CC295]/20">
                    Active
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>London, UK</span>
                  <span>Just now</span>
                </div>
              </div>
              <div className="p-4 bg-zinc-900/20 border border-[#27272a]/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="text-zinc-500" size={14} />
                  <span className="text-xs font-bold text-zinc-300">iPhone 14 Pro</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>London, UK</span>
                  <span>2 hours ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Security */}
          <div className="p-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl">
            <h3 className="text-[11px] uppercase font-bold text-zinc-500 mb-4">Quick Security</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Session Lockout
                </span>
                <ToggleSwitch checked={settings.sessionLockout} onChange={() => updateSetting('sessionLockout', !settings.sessionLockout)} />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  IP Whitelist
                </span>
                <ToggleSwitch checked={settings.ipWhitelist} onChange={() => updateSetting('ipWhitelist', !settings.ipWhitelist)} />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="mt-auto border-t border-[#27272a] p-5 bg-zinc-950/80 backdrop-blur-md">
          <button className="w-full py-3 bg-zinc-900 border border-[#27272a] rounded-xl text-xs font-bold text-white hover:border-red-500/50 hover:text-red-400 transition-all flex items-center justify-center gap-2 group">
            <LogOut className="text-zinc-500 group-hover:text-red-400" size={14} />
            Sign Out Everywhere
          </button>
        </div>
      </aside>
    </section>
  );
}