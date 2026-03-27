import { useState, useEffect } from 'react';
import { useEffect, useState } from 'react';
import { Zap, Upload, TrendingUp, Check } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Switch } from '@/app/components/ui/switch';
import { StudioFieldLabel, StudioFieldHint, StudioInputField, StudioNumberField } from '@/app/components/ui/studio-form-fields';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { StudioStatsCard } from '@/app/components/ui/studio-stats-card';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { Checkbox } from '@/app/components/ui/checkbox';
import type { SellerMintingConfig } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface SellerAIMintingSettingsProps {
  walletAddress: string;
  onConfigUpdate?: (config: SellerMintingConfig) => void;
}

export function SellerAIMintingSettings({
  walletAddress,
  onConfigUpdate,
}: SellerAIMintingSettingsProps) {
  const [config, setConfig] = useState<SellerMintingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [category, setCategory] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig();
  }, [walletAddress]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ai/seller/config/${walletAddress}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig(data.config);
          setEnabled(data.config.enabled);
          setAutoAnalyze(data.config.autoAnalyzeEnabled);
          setMinPrice(data.config.minPriceUsd?.toString() ?? '');
          setMaxPrice(data.config.maxPriceUsd?.toString() ?? '');
          setCategory(data.config.category || '');
        }
      } else if (response.status === 404) {
        console.log('Seller minting config not found - will create on first save');
      }
    } catch (err) {
      console.error('Error loading seller minting config:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setError('');

      const minVal = minPrice ? parseFloat(minPrice) : null;
      const maxVal = maxPrice ? parseFloat(maxPrice) : null;

      if (minVal !== null && maxVal !== null && minVal > maxVal) {
        setError('Minimum price cannot be greater than maximum price');
        setSaving(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ai/seller/config`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sellerId: walletAddress,
            enabled,
            autoAnalyzeEnabled: autoAnalyze,
            minPriceUsd: minVal,
            maxPriceUsd: maxVal,
            category: category || null,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.config);
          setSaveSuccess(true);
          onConfigUpdate?.(data.config);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      } else {
        setError('Failed to save configuration');
      }
    } catch (err) {
      console.error('Error saving seller minting config:', err);
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <StudioLoadingIndicator layout="stacked" size={24} label="Loading config..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest flex items-center gap-3">
          <Zap className="text-primary" size={18} />
          AI Asset Auto-Minting
        </h3>
        <p className="text-xs text-ui-muted mt-2">
          Let AI automatically generate and analyze your asset listings
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="bg-[rgba(24,24,27,0.4)] rounded-[24px] p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ui-primary">Enable AI Minting</h4>
              {enabled ? (
                <span className="h-6 px-2.5 inline-flex items-center bg-[#2CC295]/15 rounded-full border border-[#2CC295]/30 text-[9px] font-bold text-[#2CC295] uppercase tracking-widest">
                  Active
                </span>
              ) : null}
            </div>
            <p className="text-xs text-ui-muted mt-1">
              AI will analyze your images and generate asset listings automatically
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Configuration */}
      {enabled ? (
        <div className="space-y-4">
          {/* Auto Analyze */}
          <div className="bg-ui-input border border-ui-border-subtle rounded-[20px] p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={autoAnalyze}
                onCheckedChange={(checked) => setAutoAnalyze(checked === true)}
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-ui-primary">Auto-analyze and create drafts</div>
                <div className="text-xs text-ui-muted mt-0.5">
                  AI will automatically analyze images and generate asset drafts
                </div>
              </div>
            </label>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <StudioFieldLabel>Min Price (USD)</StudioFieldLabel>
              <StudioNumberField
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Optional"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <StudioFieldLabel>Max Price (USD)</StudioFieldLabel>
              <StudioNumberField
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Optional"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <StudioFieldLabel>Default Category (Optional)</StudioFieldLabel>
            <StudioInputField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Electronics, Art, Collectibles"
            />
            <StudioFieldHint>AI will use this category for market analysis if not overridden</StudioFieldHint>
          </div>

          {/* Error */}
          {error ? <StudioNoticePanel variant="error" title="Error">{error}</StudioNoticePanel> : null}

          {/* API Key Warning */}
          <StudioNoticePanel variant="warning" title="API Key Required">
            Make sure you have an active API key to use AI minting features.
          </StudioNoticePanel>
        </div>
      ) : null}

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <StudioActionButton
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={handleSave}
          disabled={saving || !enabled}
          leftIcon={
            saving
              ? <StudioLoadingIndicator size={16} tone="inherit" />
              : saveSuccess
                ? <Check size={16} />
                : undefined
          }
        >
          {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configuration'}
        </StudioActionButton>
      </div>

      {/* Info Cards */}
      {enabled ? (
        <div className="grid grid-cols-3 gap-4 pt-4">
          <StudioStatsCard
            label="Upload"
            value="Images"
            icon={<Upload className="text-primary" size={16} />}
          />
          <StudioStatsCard
            label="AI Creates"
            value="Draft"
            icon={<Zap className="text-primary" size={16} />}
          />
          <StudioStatsCard
            label="Market"
            value="Analysis"
            icon={<TrendingUp className="text-primary" size={16} />}
          />
        </div>
      ) : null}
    </div>
  );
}
