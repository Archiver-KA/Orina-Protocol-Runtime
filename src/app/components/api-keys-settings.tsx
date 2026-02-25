import { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Eye, EyeOff, Plus, Check, Shield, Activity, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { APIKey, APIKeyPermission } from '@/app/types/api-key';
import { APIKeyManager } from '@/utils/apiKeyManager';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { copyToClipboard } from '@/utils/clipboard';

interface APIKeysSettingsProps {
  walletAddress: string;
}

export function APIKeysSettings({ walletAddress }: APIKeysSettingsProps) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<APIKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load keys without initializing demo data
    // User starts with 0 keys and creates their own
    loadKeys();
  }, [walletAddress]);

  const loadKeys = () => {
    const keys = APIKeyManager.getKeysForWallet(walletAddress);
    setApiKeys(keys);
  };

  const handleCopyKey = async (key: string, keyId: string) => {
    const success = await copyToClipboard(key);
    if (success) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleRevokeKey = (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      APIKeyManager.revokeKey(walletAddress, keyId);
      loadKeys();
    }
  };

  const maskKey = (key: string) => {
    return `${key.slice(0, 15)}${'•'.repeat(20)}${key.slice(-4)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPermissionBadgeColor = (permission: APIKeyPermission) => {
    const colors = {
      read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      write: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      mint: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      delete: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[permission];
  };

  const totalRequests = apiKeys.reduce((sum, key) => sum + key.usageStats.totalRequests, 0);
  const avgSuccessRate = apiKeys.length > 0
    ? apiKeys.reduce((sum, key) => sum + key.usageStats.successRate, 0) / apiKeys.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="text-[#2CC295]" size={20} />
            API Keys for AI Agents
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Enable AI agents to manage your marketplace listings automatically
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setGeneratedKey(null);
          }}
          className="px-4 py-2 bg-[#2CC295] text-black font-bold text-xs rounded-lg hover:bg-[#2CC295]/90 transition-colors flex items-center gap-2"
        >
          {showCreateForm ? (
            <>
              <ChevronUp size={14} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={14} />
              Generate New Key
            </>
          )}
        </button>
      </div>

      {/* Expandable Create Form */}
      {showCreateForm && (
        <CreateAPIKeyForm
          walletAddress={walletAddress}
          generatedKey={generatedKey}
          onGenerate={(key) => setGeneratedKey(key)}
          onDone={() => {
            loadKeys();
            setShowCreateForm(false);
            setGeneratedKey(null);
          }}
          onCancel={() => {
            setShowCreateForm(false);
            setGeneratedKey(null);
          }}
        />
      )}

      {/* Stats Overview */}
      {apiKeys.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-2">
              <Activity size={12} />
              Total Requests
            </div>
            <div className="text-2xl font-bold text-white">{totalRequests.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Last 30 days</div>
          </div>

          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-2">
              <TrendingUp size={12} />
              Success Rate
            </div>
            <div className="text-2xl font-bold text-white">{avgSuccessRate.toFixed(1)}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">Average across all keys</div>
          </div>

          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-2">
              <Shield size={12} />
              Active Keys
            </div>
            <div className="text-2xl font-bold text-white">{apiKeys.filter(k => k.isActive).length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Out of {apiKeys.length} total</div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="bg-zinc-900/30 border border-[#27272a] rounded-xl p-8 text-center">
            <Key className="mx-auto text-zinc-600 mb-3" size={32} />
            <h4 className="text-white font-bold mb-2">No API Keys Yet</h4>
            <p className="text-sm text-zinc-500 mb-4">
              Generate your first API key to start automating your marketplace management
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-zinc-800 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:border-[#2CC295]/50 transition-colors"
            >
              Create First Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className={`bg-zinc-900/30 border rounded-xl p-5 transition-all ${
                apiKey.isActive 
                  ? 'border-[#27272a] hover:border-[#2CC295]/30' 
                  : 'border-zinc-800 opacity-50'
              }`}
            >
              {/* Key Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white font-bold">{apiKey.name}</h4>
                    {!apiKey.isActive && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold">
                        Revoked
                      </span>
                    )}
                  </div>
                  
                  {/* Key Display */}
                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded border border-[#27272a]">
                      {revealedKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
                      title={revealedKeys.has(apiKey.id) ? 'Hide key' : 'Reveal key'}
                    >
                      {revealedKeys.has(apiKey.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => handleCopyKey(apiKey.key, apiKey.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-[#2CC295]"
                      title="Copy key"
                    >
                      {copiedKey === apiKey.id ? (
                        <Check size={14} className="text-[#2CC295]" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Permissions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {apiKey.permissions.map((permission) => (
                      <span
                        key={permission}
                        className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${getPermissionBadgeColor(permission)}`}
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>

                {apiKey.isActive && (
                  <button
                    onClick={() => handleRevokeKey(apiKey.id)}
                    className="p-2 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-red-400"
                    title="Revoke key"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-[#27272a]">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Created</div>
                  <div className="text-xs text-white font-bold">
                    {new Date(apiKey.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Last Used</div>
                  <div className="text-xs text-white font-bold">{formatDate(apiKey.lastUsedAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Requests</div>
                  <div className="text-xs text-white font-bold">{apiKey.usageStats.totalRequests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Success Rate</div>
                  <div className="text-xs text-white font-bold">{apiKey.usageStats.successRate.toFixed(1)}%</div>
                </div>
              </div>

              {apiKey.expiresAt && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-yellow-400">
                  <Clock size={10} />
                  Expires on {new Date(apiKey.expiresAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Create API Key Form Component
function CreateAPIKeyForm({ 
  walletAddress, 
  generatedKey, 
  onGenerate, 
  onDone,
  onCancel
}: { 
  walletAddress: string;
  generatedKey: APIKey | null;
  onGenerate: (key: APIKey) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [keyName, setKeyName] = useState('');
  const [permissions, setPermissions] = useState<Set<APIKeyPermission>>(new Set(['read']));
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePermission = (permission: APIKeyPermission) => {
    setPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permission)) {
        if (permission !== 'read') { // Always keep read permission
          newSet.delete(permission);
        }
      } else {
        newSet.add(permission);
      }
      return newSet;
    });
  };

  const handleGenerate = () => {
    if (!keyName.trim()) {
      alert('Please enter a key name');
      return;
    }

    const newKey = APIKeyManager.generateKey(walletAddress, {
      name: keyName.trim(),
      permissions: Array.from(permissions),
      expiresInDays: expiresInDays || undefined
    });

    onGenerate(newKey);
  };

  const handleCopy = async () => {
    if (generatedKey) {
      const success = await copyToClipboard(generatedKey.key);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDone = () => {
    onDone();
  };

  return (
    <div className="bg-zinc-900/30 border border-[#27272a] rounded-2xl w-full">
      {!generatedKey ? (
        <>
          {/* Header */}
          <div className="p-6 border-b border-[#27272a] bg-zinc-900/20">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="text-[#2CC295]" size={20} />
              Generate New API Key
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Create a new API key for AI agent integration
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Key Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., ChatGPT Agent, Production Bot"
                className="w-full bg-zinc-900 border border-[#27272a] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2CC295]/50"
              />
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-3">
                Permissions
              </label>
              <div className="space-y-2">
                {(['read', 'write', 'mint', 'delete'] as APIKeyPermission[]).map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-[#27272a] rounded-lg cursor-pointer hover:border-[#2CC295]/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.has(permission)}
                      onChange={() => togglePermission(permission)}
                      disabled={permission === 'read'}
                      className="w-4 h-4 rounded border-[#27272a] bg-zinc-800 checked:bg-[#2CC295] checked:border-[#2CC295] focus:ring-0 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white capitalize">{permission}</div>
                      <div className="text-xs text-zinc-500">
                        {permission === 'read' && 'View assets, orders, and analytics (required)'}
                        {permission === 'write' && 'Update asset details and prices'}
                        {permission === 'mint' && 'Create new asset listings'}
                        {permission === 'delete' && 'Remove assets from marketplace'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Expiration (Optional)
              </label>
              <CustomDropdown
                options={[
                  { label: 'Never expires', value: '' },
                  { label: '7 days', value: '7' },
                  { label: '30 days', value: '30' },
                  { label: '90 days', value: '90' },
                  { label: '1 year', value: '365' }
                ]}
                value={expiresInDays?.toString() || ''}
                onChange={(value) => setExpiresInDays(value ? parseInt(value) : null)}
                placeholder="Select expiration"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#27272a] flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!keyName.trim()}
              className="flex-1 px-4 py-2.5 bg-[#2CC295] text-black rounded-lg text-sm font-bold hover:bg-[#2CC295]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Key
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Success Header */}
          <div className="p-6 border-b border-[#27272a]">
            <div className="w-12 h-12 rounded-full bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center mb-4">
              <Check className="text-[#2CC295]" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">API Key Generated!</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Copy and save this key securely. You won't be able to see it again.
            </p>
          </div>

          {/* Generated Key Display */}
          <div className="p-6 space-y-4">
            <div className="bg-zinc-900 border border-[#27272a] rounded-lg p-4">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-2">Your API Key</div>
              <code className="text-sm text-white font-mono break-all block mb-3">
                {generatedKey.key}
              </code>
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 bg-zinc-800 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:border-[#2CC295]/50 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-[#2CC295]" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex gap-2">
                <Shield className="text-yellow-400 shrink-0" size={16} />
                <div className="text-xs text-yellow-200">
                  <strong className="block mb-1">Important Security Notice:</strong>
                  Store this key securely. Anyone with this key can perform actions on your behalf within the granted permissions.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#27272a]">
            <button
              onClick={handleDone}
              className="w-full px-4 py-2.5 bg-[#2CC295] text-black rounded-lg text-sm font-bold hover:bg-[#2CC295]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}