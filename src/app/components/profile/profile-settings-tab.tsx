import { useState } from 'react';
import { UserProfile } from '@/types/profile';
import { Bell, Lock, Palette, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSettingsTabProps {
  profile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => void;
}

export function ProfileSettingsTab({ profile, onSave }: ProfileSettingsTabProps) {
  const [settings, setSettings] = useState(profile.settings);

  const handleSave = () => {
    onSave({ settings });
    toast.success('Settings saved successfully');
  };

  const toggleNotification = (key: keyof typeof settings.notifications) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const togglePrivacy = (key: keyof typeof settings.privacy) => {
    setSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: !settings.privacy[key],
      },
    });
  };

  const updateDisplay = (key: keyof typeof settings.display, value: any) => {
    setSettings({
      ...settings,
      display: {
        ...settings.display,
        [key]: value,
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Notifications */}
      <div className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Bell size={20} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            <p className="text-sm text-zinc-500">Manage your notification preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            checked={settings.notifications.email}
            onChange={() => toggleNotification('email')}
          />
          <ToggleRow
            label="Push Notifications"
            description="Receive browser push notifications"
            checked={settings.notifications.push}
            onChange={() => toggleNotification('push')}
          />
          <ToggleRow
            label="Sales Notifications"
            description="Get notified when your items sell"
            checked={settings.notifications.sales}
            onChange={() => toggleNotification('sales')}
          />
          <ToggleRow
            label="Offer Notifications"
            description="Get notified about new offers"
            checked={settings.notifications.offers}
            onChange={() => toggleNotification('offers')}
          />
          <ToggleRow
            label="Follower Notifications"
            description="Get notified when someone follows you"
            checked={settings.notifications.followers}
            onChange={() => toggleNotification('followers')}
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Lock size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Privacy</h3>
            <p className="text-sm text-zinc-500">Control what others can see</p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleRow
            label="Show Activity"
            description="Display your transaction history publicly"
            checked={settings.privacy.showActivity}
            onChange={() => togglePrivacy('showActivity')}
          />
          <ToggleRow
            label="Show Balance"
            description="Display your portfolio value publicly"
            checked={settings.privacy.showBalance}
            onChange={() => togglePrivacy('showBalance')}
          />
          <ToggleRow
            label="Show Followers"
            description="Display your followers and following count"
            checked={settings.privacy.showFollowers}
            onChange={() => togglePrivacy('showFollowers')}
          />
        </div>
      </div>

      {/* Display */}
      <div className="p-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Palette size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Display</h3>
            <p className="text-sm text-zinc-500">Customize your viewing experience</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateDisplay('theme', 'dark')}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${settings.display.theme === 'dark'
                    ? 'bg-zinc-900 border-[#2CC295] text-white'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }
                `}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-black rounded-lg mx-auto mb-2"></div>
                  <p className="text-sm font-bold">Dark</p>
                </div>
              </button>

              <button
                onClick={() => updateDisplay('theme', 'light')}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${settings.display.theme === 'light'
                    ? 'bg-zinc-900 border-[#2CC295] text-white'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }
                `}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-lg mx-auto mb-2"></div>
                  <p className="text-sm font-bold">Light</p>
                </div>
              </button>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">
              Currency
            </label>
            <select
              value={settings.display.currency}
              onChange={(e) => updateDisplay('currency', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              <option value="ETH">ETH (Ethereum)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">
              Language
            </label>
            <select
              value={settings.display.language}
              onChange={(e) => updateDisplay('language', e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#2CC295] transition-colors"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold rounded-lg transition-colors"
        >
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${checked ? 'bg-[#2CC295]' : 'bg-zinc-700'}
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${checked ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
