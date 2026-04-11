import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, Zap, Settings, Check, AlertCircle } from 'lucide-react';
import { AIAgentConfig, AIAgentBehavior } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Checkbox } from '@/app/components/ui/checkbox';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';

interface AIAgentSettingsProps {
  walletAddress: string;
}

export function AIAgentSettings({ walletAddress }: AIAgentSettingsProps) {
  const cachedConfig = AIAgentClient.peekConfig(walletAddress);
  const [config, setConfig] = useState<AIAgentConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(() => !cachedConfig);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(cachedConfig?.enabled ?? false);
  const [agentName, setAgentName] = useState(cachedConfig?.name ?? '');
  const [behavior, setBehavior] = useState<AIAgentBehavior>(cachedConfig?.behavior ?? 'moderate');
  const [autoReply, setAutoReply] = useState(cachedConfig?.autoReplyEnabled ?? true);
  const [greetingMessage, setGreetingMessage] = useState(cachedConfig?.greetingMessage ?? '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const hasRemoteConfig = useMemo(() => Boolean(projectId && publicAnonKey), []);

  const hydrateConfig = (nextConfig: AIAgentConfig | null) => {
    if (!nextConfig) return;
    setConfig(nextConfig);
    setEnabled(nextConfig.enabled);
    setAgentName(nextConfig.name);
    setBehavior(nextConfig.behavior);
    setAutoReply(nextConfig.autoReplyEnabled);
    setGreetingMessage(nextConfig.greetingMessage || '');
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!hasRemoteConfig || !walletAddress) {
        if (!cancelled) {
          setLoading(false);
          setRuntimeError(hasRemoteConfig ? '' : 'AI settings are not available in this environment.');
        }
        return;
      }

      const cached = AIAgentClient.peekConfig(walletAddress);
      if (cached && !cancelled) {
        hydrateConfig(cached);
        setLoading(false);
      }

      await loadConfig(cancelled, Boolean(cached));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, hasRemoteConfig]);

  const loadConfig = async (cancelled = false, background = false) => {
    try {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setRuntimeError('');
      const remoteConfig = await AIAgentClient.getConfig(walletAddress);
      if (cancelled) return;

      hydrateConfig(remoteConfig);
    } catch (error) {
      if (cancelled) return;
      console.error('Error loading AI Agent config:', error);
      setRuntimeError('Unable to load AI settings right now.');
    } finally {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleSave = async () => {
    if (!hasRemoteConfig) {
      setRuntimeError('AI settings are not available in this environment.');
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);
      setRuntimeError('');

      const didSave = await AIAgentClient.saveConfig({
        walletAddress,
        name: agentName,
        behavior,
        enabled,
        autoReplyEnabled: autoReply,
        greetingMessage: greetingMessage || undefined,
      });

      if (didSave) {
        const latestConfig = await AIAgentClient.getConfig(walletAddress);
        if (latestConfig) {
          setConfig(latestConfig);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setRuntimeError('Unable to save AI settings right now.');
      }
    } catch (error) {
      console.error('Error saving AI Agent config:', error);
      setRuntimeError('Unable to save AI settings right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest flex items-center gap-3">
            <Bot className="text-[#2CC295]" size={18} />
            AI Reply Assistant
          </h3>
          <p className="text-sm text-ui-muted mt-2">
            Let AI handle buyer messages automatically in Messages
          </p>
        </div>
      </div>

      {(loading || refreshing) ? (
        <StudioNoticePanel variant="neutral" title={loading ? 'Loading AI agent settings' : 'Refreshing AI agent settings'} compact>
          <div className="flex items-center gap-2">
            <StudioLoadingIndicator size={14} tone="muted" />
            <span>Fetching protected AI configuration from Orina.</span>
          </div>
        </StudioNoticePanel>
      ) : null}

      {runtimeError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-xs text-red-200">
          {runtimeError}
        </div>
      ) : null}

      {/* Enable Toggle */}
      <div className="bg-[var(--t-surface-2)] rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-ui-primary font-semibold">Enable AI Assistant</h4>
              {enabled && (
                <span className="text-xs bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 px-2 py-0.5 rounded uppercase font-semibold">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-ui-muted mt-1">
              AI will reply to buyer messages for you
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            disabled={loading || refreshing}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0 ${
              enabled ? 'bg-[#2CC295]' : 'bg-ui-border'
            } ${loading || refreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Configuration */}
      {enabled && (
        <div className="space-y-4">
          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">
              Assistant Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., Store Assistant, Concierge"
              className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/50"
            />
            <p className="text-xs text-ui-muted mt-1">
              This name appears in Messages when AI replies
            </p>
          </div>

          {/* Behavior */}
          <div>
            <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">
              Reply Style
            </label>
            <div className="space-y-2">
              {(['conservative', 'moderate', 'aggressive'] as AIAgentBehavior[]).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                    behavior === mode
                      ? 'bg-[#2CC295]/10'
                      : 'bg-[var(--t-surface-5)] hover:bg-[var(--t-surface-10)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="behavior"
                    checked={behavior === mode}
                    onChange={() => setBehavior(mode)}
                    className="mt-0.5 w-4 h-4 text-[#2CC295] bg-[var(--t-surface-10)] border-ui-border focus:ring-0 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ui-primary capitalize">{mode}</div>
                    <div className="text-xs text-ui-muted mt-0.5">
                      {mode === 'conservative' && 'Replies only to direct questions.'}
                      {mode === 'moderate' && 'Answers questions and suggests relevant products.'}
                      {mode === 'aggressive' && 'Takes a stronger sales approach and recommends products more often.'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Auto Reply */}
          <div className="bg-[var(--t-surface-5)] rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={autoReply}
                onCheckedChange={(checked) => setAutoReply(checked === true)}
                className="bg-[var(--t-surface-10)]"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-ui-primary">Reply to new messages automatically</div>
                <div className="text-xs text-ui-muted mt-0.5">
                  Send an automatic first reply when a buyer messages you
                </div>
              </div>
            </label>
          </div>

          {/* Greeting Message (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">
              Custom Greeting (Optional)
            </label>
            <textarea
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="Leave empty to use default greeting..."
              rows={3}
              className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/50 resize-none"
            />
            <p className="text-xs text-ui-muted mt-1">
              Custom opening message for the first reply
            </p>
          </div>

          {/* API Key Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="text-yellow-400 shrink-0" size={16} />
              <div className="text-xs text-yellow-200">
                <strong className="block mb-1">API Key Required:</strong>
                Keep an active API key with <strong>read</strong> access so AI can reference your listings.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={loading || refreshing || saving || !enabled || !agentName.trim() || !hasRemoteConfig}
          className="flex-1 px-4 py-2.5 bg-[#2CC295] text-black rounded-full text-sm font-semibold hover:bg-[#25a67d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>

      {/* Info Cards */}
      {enabled && (
        <>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
              <MessageSquare className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-semibold">Response Time</div>
              <div className="text-lg font-semibold text-ui-primary mt-1">Instant</div>
            </div>
            <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
              <Zap className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-semibold">Availability</div>
              <div className="text-lg font-semibold text-ui-primary mt-1">24/7</div>
            </div>
            <div className="bg-[var(--t-surface-2)] rounded-xl p-4">
              <Settings className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-semibold">Mode</div>
              <div className="text-lg font-semibold text-ui-primary mt-1 capitalize">{behavior}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
