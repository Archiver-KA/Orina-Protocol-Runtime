import { useState, useEffect } from 'react';
import { Bot, MessageSquare, Zap, Settings, Check, AlertCircle } from 'lucide-react';
import { AIAgentConfig, AIAgentBehavior } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface AIAgentSettingsProps {
  walletAddress: string;
}

export function AIAgentSettings({ walletAddress }: AIAgentSettingsProps) {
  const [config, setConfig] = useState<AIAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [behavior, setBehavior] = useState<AIAgentBehavior>('moderate');
  const [autoReply, setAutoReply] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [walletAddress]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ai/config/${walletAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(data.config);
          setEnabled(data.config.enabled);
          setAgentName(data.config.name);
          setBehavior(data.config.behavior);
          setAutoReply(data.config.autoReplyEnabled);
          setGreetingMessage(data.config.greetingMessage || '');
        }
      } else if (response.status === 404) {
        // Config doesn't exist yet - this is normal for first-time users
        console.log('AI Agent config not found - will create on first save');
      }
    } catch (error) {
      console.error('Error loading AI Agent config:', error);
      // Don't show error to user - config might just not exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ai/config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            walletAddress,
            name: agentName,
            behavior,
            enabled,
            autoReplyEnabled: autoReply,
            greetingMessage: greetingMessage || undefined
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.config);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      }
    } catch (error) {
      console.error('Error saving AI Agent config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CC295]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest flex items-center gap-3">
            <Bot className="text-[#2CC295]" size={18} />
            AI Agent for Messages
          </h3>
          <p className="text-sm text-ui-muted mt-2">
            Let AI handle customer inquiries automatically in Messages
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-ui-primary font-bold">Enable AI Agent</h4>
              {enabled && (
                <span className="text-xs bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 px-2 py-0.5 rounded uppercase font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-ui-muted mt-1">
              AI will automatically respond to customer messages on your behalf
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0 ${
              enabled ? 'bg-[#2CC295]' : 'bg-ui-border'
            }`}
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
            <label className="block text-xs font-bold text-ui-muted uppercase mb-2">
              AI Agent Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., Tesla Sales Assistant, Property Bot"
              className="w-full bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg px-4 py-2.5 text-ui-primary text-sm placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/50"
            />
            <p className="text-xs text-ui-muted mt-1">
              This name will be shown to customers in Messages
            </p>
          </div>

          {/* Behavior */}
          <div>
            <label className="block text-xs font-bold text-ui-muted uppercase mb-2">
              AI Behavior
            </label>
            <div className="space-y-2">
              {(['conservative', 'moderate', 'aggressive'] as AIAgentBehavior[]).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    behavior === mode
                      ? 'bg-[#2CC295]/10 border-[#2CC295]/30'
                      : 'bg-[var(--t-surface-5)] border-ui-border-subtle hover:border-[#2CC295]/20'
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
                    <div className="text-sm font-bold text-ui-primary capitalize">{mode}</div>
                    <div className="text-xs text-ui-muted mt-0.5">
                      {mode === 'conservative' && 'Only answer direct questions. Minimal engagement.'}
                      {mode === 'moderate' && 'Answer questions and suggest related products. Balanced approach.'}
                      {mode === 'aggressive' && 'Proactive selling. Suggest products and create urgency.'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Auto Reply */}
          <div className="bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoReply}
                onChange={(e) => setAutoReply(e.target.checked)}
                className="w-4 h-4 rounded border-ui-border bg-[var(--t-surface-10)] checked:bg-[#2CC295] checked:border-[#2CC295] focus:ring-0 focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-ui-primary">Auto-reply to new messages</div>
                <div className="text-xs text-ui-muted mt-0.5">
                  Automatically respond when customers send messages
                </div>
              </div>
            </label>
          </div>

          {/* Greeting Message (Optional) */}
          <div>
            <label className="block text-xs font-bold text-ui-muted uppercase mb-2">
              Custom Greeting (Optional)
            </label>
            <textarea
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="Leave empty to use default greeting..."
              rows={3}
              className="w-full bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-lg px-4 py-2.5 text-ui-primary text-sm placeholder:text-ui-muted focus:outline-none focus:border-[#2CC295]/50 resize-none"
            />
            <p className="text-xs text-ui-muted mt-1">
              Custom message when AI first greets customers
            </p>
          </div>

          {/* API Key Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="text-yellow-400 shrink-0" size={16} />
              <div className="text-xs text-yellow-200">
                <strong className="block mb-1">API Key Required:</strong>
                Make sure you have an active API key with <strong>read</strong> permission for AI Agent to access your asset data.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !enabled || !agentName.trim()}
          className="flex-1 px-4 py-2.5 bg-[#2CC295] text-black rounded-full text-sm font-bold hover:bg-[#25a67d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-4">
              <MessageSquare className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-bold">Response Time</div>
              <div className="text-lg font-bold text-ui-primary mt-1">Instant</div>
            </div>
            <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-4">
              <Zap className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-bold">Availability</div>
              <div className="text-lg font-bold text-ui-primary mt-1">24/7</div>
            </div>
            <div className="bg-[var(--t-surface-2)] border border-ui-border-subtle rounded-xl p-4">
              <Settings className="text-[#2CC295] mb-2" size={16} />
              <div className="text-xs text-ui-secondary uppercase font-bold">Mode</div>
              <div className="text-lg font-bold text-ui-primary mt-1 capitalize">{behavior}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
