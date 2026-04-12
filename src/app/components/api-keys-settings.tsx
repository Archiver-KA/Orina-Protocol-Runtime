import { useCallback, useEffect, useState } from 'react';
import { Key, Copy, Trash2, Plus, Check, Shield, Activity, Clock, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { APIKey, APIKeyGenerateOptions, APIKeyPermission } from '@/app/types/api-key';
import { APIKeysClient } from '@/utils/apiKeysClient';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { copyToClipboard } from '@/utils/clipboard';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useAccessMode } from '@/hooks/useAccessMode';
import {
  dispatchBridgeSecurityCheckRequest,
  getSupabaseBridgeSessionEventName,
} from '@/utils/supabaseAuthClaimBridge';

interface APIKeysSettingsProps {
  walletAddress: string;
}

export function APIKeysSettings({ walletAddress }: APIKeysSettingsProps) {
  const { isAuthPending } = useAccessMode();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<APIKey | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const requiresSecurityCheck = Boolean(walletAddress && isAuthPending);

  const requestUnlock = useCallback(() => {
    dispatchBridgeSecurityCheckRequest(
      {
        title: 'Unlock API Keys',
        description: 'Confirm a one-time wallet security check before Orina loads or updates your API keys.',
        surfaceLabel: 'API keys',
        confirmLabel: 'Unlock API Keys',
        helpText: 'This only unlocks protected API key controls in Orina. No gas fee, transaction, or token approval is involved.',
        successMessage: 'API key controls unlocked.',
        successDescription: 'Your API keys are ready to load.',
      },
      walletAddress,
    );
  }, [walletAddress]);

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const keys = await APIKeysClient.list(walletAddress);
      setApiKeys(keys);
      setRuntimeError('');
    } catch (error) {
      console.error('[APIKeysSettings] Failed to load keys:', error);
      setApiKeys([]);
      setRuntimeError(
        error instanceof Error
          ? error.message
          : 'Unable to load your saved API keys right now.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress || requiresSecurityCheck) {
      setApiKeys([]);
      setRuntimeError('');
      setIsLoading(false);
      return;
    }
    void loadKeys();
  }, [walletAddress, requiresSecurityCheck, loadKeys]);

  useEffect(() => {
    if (!requiresSecurityCheck) return;
    setShowCreateForm(false);
    setGeneratedKey(null);
  }, [requiresSecurityCheck]);

  useEffect(() => {
    if (typeof window === 'undefined' || !walletAddress) return;
    const handleBridgeSessionChange = () => {
      if (requiresSecurityCheck) return;
      void loadKeys();
    };

    window.addEventListener(getSupabaseBridgeSessionEventName(), handleBridgeSessionChange as EventListener);
    return () => {
      window.removeEventListener(getSupabaseBridgeSessionEventName(), handleBridgeSessionChange as EventListener);
    };
  }, [walletAddress, requiresSecurityCheck, loadKeys]);

  const handleRevokeKey = async (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      setRevokingKeyId(keyId);
      try {
        await APIKeysClient.revoke(walletAddress, keyId);
        toast.success('API key revoked');
        await loadKeys();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to revoke the API key');
      } finally {
        setRevokingKeyId(null);
      }
    }
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
    const colors: Record<APIKeyPermission, string> = {
      read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      write: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      mint: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      delete: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[permission];
  };

  const totalRequests = apiKeys.reduce((sum, key) => sum + key.usageStats.totalRequests, 0);
  const activeKeysCount = apiKeys.filter((key) => key.isActive).length;
  const revokedKeysCount = apiKeys.filter((key) => !key.isActive).length;

  const handleGenerateKey = async (options: APIKeyGenerateOptions) => {
    setIsSubmitting(true);
    try {
      const nextKey = await APIKeysClient.generate(walletAddress, options);
      setGeneratedKey(nextKey);
      toast.success('API key created');
      await loadKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest flex items-center gap-3">
            <Key className="text-[#2CC295]" size={18} />
            API Keys
          </h3>
          <p className="text-sm text-ui-muted mt-2">
            Create keys for apps and automations that need access to your marketplace tools.
          </p>
        </div>
        <button
          onClick={() => {
            if (requiresSecurityCheck) {
              requestUnlock();
              return;
            }
            setShowCreateForm(!showCreateForm);
            setGeneratedKey(null);
          }}
          className="px-4 py-2 bg-[#2CC295] hover:bg-[#25a67d] text-black font-semibold text-xs rounded-full transition-colors flex items-center gap-2"
        >
          {requiresSecurityCheck ? (
            <>
              <Shield size={14} />
              Unlock API Keys
            </>
          ) : showCreateForm ? (
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

      {requiresSecurityCheck ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 text-yellow-400" size={16} />
            <div className="space-y-3">
              <p className="text-xs text-yellow-100">
                API keys are protected. Confirm a one-time wallet security check before Orina loads or updates this workspace.
              </p>
              <button
                type="button"
                onClick={requestUnlock}
                className="rounded-full bg-[#2CC295] px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#25a67d]"
              >
                Unlock API Keys
              </button>
            </div>
          </div>
        </div>
      ) : runtimeError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-xs text-red-200">
          {runtimeError}
        </div>
      ) : null}

      {/* Expandable Create Form */}
      {!requiresSecurityCheck && showCreateForm && (
        <CreateAPIKeyForm
          generatedKey={generatedKey}
          isSubmitting={isSubmitting}
          onGenerate={handleGenerateKey}
          onDone={() => {
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
      {!requiresSecurityCheck && apiKeys.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
            <div className="flex items-center gap-2 text-ui-secondary text-xs font-semibold uppercase mb-2">
              <Activity size={12} />
              Total Requests
            </div>
            <div className="text-2xl font-semibold text-ui-primary">{totalRequests.toLocaleString()}</div>
            <div className="text-[10px] text-ui-muted mt-1">Last 30 days</div>
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
            <div className="flex items-center gap-2 text-ui-secondary text-xs font-semibold uppercase mb-2">
              <Shield size={12} />
              Active Keys
            </div>
            <div className="text-2xl font-semibold text-ui-primary">{activeKeysCount}</div>
            <div className="text-[10px] text-ui-muted mt-1">Ready for use</div>
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
            <div className="flex items-center gap-2 text-ui-secondary text-xs font-semibold uppercase mb-2">
              <Clock size={12} />
              Revoked
            </div>
            <div className="text-2xl font-semibold text-ui-primary">{revokedKeysCount}</div>
            <div className="text-[10px] text-ui-muted mt-1">Shown for history</div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {!requiresSecurityCheck ? (
      <div className="space-y-4">
        {isLoading && apiKeys.length === 0 ? (
          <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-8 text-center">
            <div className="w-8 h-8 border-4 border-ui-border-subtle border-t-[#2CC295] rounded-full animate-spin mx-auto mb-3" />
            <h4 className="text-ui-primary font-semibold mb-2">Loading API Keys</h4>
            <p className="text-sm text-ui-muted">Fetching your latest API keys and activity.</p>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-8 text-center">
            <Key className="mx-auto text-ui-muted mb-3" size={32} />
            <h4 className="text-ui-primary font-semibold mb-2">No API Keys Yet</h4>
            <p className="text-sm text-ui-muted mb-4">
              Create your first API key to connect apps and automations to Orina.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="ui-secondary-button px-4 py-2 rounded-full text-xs font-semibold transition-colors"
            >
              Create First Key
            </button>
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className={`rounded-xl border p-5 transition-all ${
                apiKey.isActive 
                  ? 'border-ui-border-subtle bg-[var(--t-surface-2)] hover:border-[#2CC295]/30' 
                  : 'border-ui-border-subtle bg-[var(--t-surface-2)] opacity-70'
              }`}
            >
              {/* Key Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-ui-primary font-semibold">{apiKey.name}</h4>
                    {!apiKey.isActive && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-semibold">
                        Revoked
                      </span>
                    )}
                  </div>
                  
                  {/* Key Display */}
                  <div className="mb-3">
                    <code className="block text-xs text-ui-secondary font-mono bg-[var(--t-surface-5)] px-3 py-1.5 rounded border border-ui-border-subtle">
                      {apiKey.keyPreview || 'Hidden after creation'}
                    </code>
                    <p className="mt-2 text-[10px] text-ui-muted">
                      The full key is only shown once when it is created.
                    </p>
                  </div>

                  {/* Permissions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {apiKey.permissions.map((permission: APIKeyPermission) => (
                      <span
                        key={permission}
                        className={`text-[10px] font-semibold px-2 py-1 rounded border uppercase ${getPermissionBadgeColor(permission)}`}
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>

                {apiKey.isActive && (
                  <button
                    onClick={() => void handleRevokeKey(apiKey.id)}
                    disabled={revokingKeyId === apiKey.id}
                    className="p-2 hover:bg-[var(--t-surface-5)] rounded transition-colors text-ui-muted hover:text-red-400 disabled:opacity-50"
                    title="Revoke key"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-ui-border-subtle">
                <div>
                  <div className="text-[10px] text-ui-muted uppercase font-semibold mb-1">Created</div>
                  <div className="text-xs text-ui-primary font-semibold">
                    {new Date(apiKey.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-ui-muted uppercase font-semibold mb-1">Last Used</div>
                  <div className="text-xs text-ui-primary font-semibold">{formatDate(apiKey.lastUsedAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ui-muted uppercase font-semibold mb-1">Requests</div>
                  <div className="text-xs text-ui-primary font-semibold">{apiKey.usageStats.totalRequests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ui-muted uppercase font-semibold mb-1">Status</div>
                  <div className="text-xs text-ui-primary font-semibold">
                    {apiKey.isActive ? 'Active' : 'Revoked'}
                  </div>
                </div>
              </div>

              {apiKey.expiresAt && apiKey.isActive && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-yellow-400">
                  <Clock size={10} />
                  Expires on {new Date(apiKey.expiresAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              )}

              {!apiKey.isActive && apiKey.revokedAt ? (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-ui-muted">
                  <Clock size={10} />
                  Revoked {formatDate(apiKey.revokedAt)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      ) : null}
    </div>
  );
}

// Create API Key Form Component
function CreateAPIKeyForm({ 
  generatedKey, 
  isSubmitting,
  onGenerate, 
  onDone,
  onCancel
}: { 
  generatedKey: APIKey | null;
  isSubmitting: boolean;
  onGenerate: (options: APIKeyGenerateOptions) => Promise<void>;
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

  const handleGenerate = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    await onGenerate({
      name: keyName.trim(),
      permissions: Array.from(permissions),
      expiresInDays: expiresInDays || undefined,
    });
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
    <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-2xl w-full">
      {!generatedKey ? (
        <>
          {/* Header */}
          <div className="p-6 border-b border-[var(--t-border-subtle)] bg-[var(--t-surface-2)]">
            <h3 className="text-xl font-semibold text-ui-primary flex items-center gap-2">
              <Key className="text-[#2CC295]" size={20} />
              Generate New API Key
            </h3>
            <p className="text-sm text-ui-muted mt-1">
              Create a new API key for apps and automations
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Key Name */}
            <div>
              <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., ChatGPT Agent, Production Bot"
                className="w-full bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg px-4 py-2.5 text-ui-primary text-sm placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/50"
              />
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-xs font-semibold text-ui-muted uppercase mb-3">
                Permissions
              </label>
              <div className="space-y-2">
                {(['read', 'write', 'mint', 'delete'] as APIKeyPermission[]).map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-3 p-3 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg cursor-pointer hover:border-[#2CC295]/30 transition-colors"
                  >
                    <Checkbox
                      checked={permissions.has(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                      disabled={permission === 'read'}
                      className="bg-[var(--t-surface-10)]"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ui-primary capitalize">{permission}</div>
                      <div className="text-xs text-ui-muted">
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
              <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">
                Expiration (Optional)
              </label>
              <CustomDropdown
                variant="compact"
                className="w-full"
                options={[
                  { label: 'Never expires', value: '' },
                  { label: '7 days', value: '7' },
                  { label: '30 days', value: '30' },
                  { label: '90 days', value: '90' },
                  { label: '1 year', value: '365' }
                ]}
                value={expiresInDays?.toString() || ''}
                onChange={(value: string) => setExpiresInDays(value ? parseInt(value, 10) : null)}
                placeholder="Select expiration"
                triggerClassName="h-[42px] rounded-lg bg-[var(--t-surface-5)] border border-ui-border-subtle hover:bg-[var(--t-surface-10)]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--t-border-subtle)] flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[var(--t-surface-2)] border border-ui-border-subtle text-ui-primary rounded-lg text-sm font-semibold hover:bg-[var(--t-surface-5)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleGenerate()}
              disabled={!keyName.trim() || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[#2CC295] text-black rounded-lg text-sm font-semibold hover:bg-[#2CC295]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Success Header */}
          <div className="p-6 border-b border-[var(--t-border-subtle)]">
            <div className="w-12 h-12 rounded-full bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center mb-4">
              <Check className="text-[#2CC295]" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-ui-primary">API Key Generated!</h3>
            <p className="text-sm text-ui-muted mt-1">
              Copy and store this key now. After you close this panel, it will stay hidden.
            </p>
          </div>

          {/* Generated Key Display */}
          <div className="p-6 space-y-4">
            <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-lg p-4">
              <div className="text-xs font-semibold text-ui-muted uppercase mb-2">Your API Key</div>
              <code className="text-sm text-ui-primary font-mono break-all block mb-3">
                {generatedKey.key}
              </code>
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 bg-[var(--t-surface-5)] border border-ui-border-subtle text-ui-primary rounded-lg text-xs font-semibold hover:border-[#2CC295]/50 transition-colors flex items-center justify-center gap-2"
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
          <div className="p-6 border-t border-[var(--t-border-subtle)]">
            <button
              onClick={handleDone}
              className="w-full px-4 py-2.5 bg-[#2CC295] text-black rounded-lg text-sm font-semibold hover:bg-[#2CC295]/90 transition-colors"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
