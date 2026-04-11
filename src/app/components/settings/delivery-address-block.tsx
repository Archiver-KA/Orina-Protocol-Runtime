import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Globe, Home, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  createDeliveryDraftFromLegacyAddress,
  createEmptyDeliveryAddressDraft,
  draftFromDeliveryAddress,
  draftSignature,
  extractLegacyDeliveryAddressFromWalletSettings,
  formatDeliveryAddressPreview,
  getActivePostalPattern,
  getGeoLabelAtIndex,
  getPreferredDeliveryAddress,
  loadGeoCountries,
  loadGeoPlacesForLevel,
  loadUserDeliveryAddresses,
  resolveCountryByCode,
  saveUserDeliveryAddress,
  validateDeliveryAddressDraft,
  clearGeoAddressCaches,
} from '@/utils/deliveryAddressUtils';
import type { DeliveryAddressDraft, DeliveryAddressFieldErrors, GeoCountry, GeoPlace } from '@/types/address';
import {
  StudioFieldError,
  StudioFieldHint,
  StudioFieldLabel,
  StudioTextareaField,
} from '@/app/components/ui/studio-form-fields';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  DeliveryAddressSelect,
  type DeliveryAddressSelectOption,
} from '@/app/components/settings/delivery-address-select';

export interface DeliveryAddressBlockHandle {
  save: () => Promise<boolean>;
  discard: () => void;
  hasChanges: () => boolean;
  isSaving: () => boolean;
}

interface DeliveryAddressBlockProps {
  walletAddress?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

const inputClassName =
  'w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary focus:bg-ui-input-focus focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 text-sm placeholder:text-ui-muted shadow-none';

function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function getLegacyReviewNote(draft: DeliveryAddressDraft): string | null {
  return draft.source === 'legacy_migrated'
    ? 'Prefilled from legacy settings. Review the region hierarchy before saving.'
    : null;
}

export const DeliveryAddressBlock = forwardRef<DeliveryAddressBlockHandle, DeliveryAddressBlockProps>(
  function DeliveryAddressBlock({ walletAddress, onDirtyChange }, ref) {
    const [countries, setCountries] = useState<GeoCountry[]>([]);
    const [draft, setDraft] = useState<DeliveryAddressDraft>(createEmptyDeliveryAddressDraft());
    const [initialDraft, setInitialDraft] = useState<DeliveryAddressDraft>(createEmptyDeliveryAddressDraft());
    const [levelOptions, setLevelOptions] = useState<Record<number, GeoPlace[]>>({});
    const [levelLoading, setLevelLoading] = useState<Record<number, boolean>>({});
    const [levelErrors, setLevelErrors] = useState<Record<number, string>>({});
    const [fieldErrors, setFieldErrors] = useState<DeliveryAddressFieldErrors>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [countriesError, setCountriesError] = useState<string | null>(null);
    const [dataSourceNote, setDataSourceNote] = useState<string | null>(null);

    const selectedCountry = useMemo(
      () => resolveCountryByCode(countries, draft.countryCode),
      [countries, draft.countryCode]
    );

    const geoPathSignature = useMemo(
      () => draft.geoPath.map((item) => item.placeId).join('|'),
      [draft.geoPath]
    );

    const hasChanges = useMemo(
      () => draftSignature(draft) !== draftSignature(initialDraft),
      [draft, initialDraft]
    );

    const leafPlace = useMemo(() => {
      const lastSelection = draft.geoPath[draft.geoPath.length - 1];
      if (!lastSelection) return null;
      const allOptions = Object.values(levelOptions).flat();
      return allOptions.find((item) => item.id === lastSelection.placeId) || null;
    }, [draft.geoPath, levelOptions]);

    const preview = useMemo(
      () => formatDeliveryAddressPreview(draft, selectedCountry),
      [draft, selectedCountry]
    );

    const countryOptions = useMemo<DeliveryAddressSelectOption[]>(
      () =>
        countries.map((country) => ({
          id: country.code,
          label: country.name,
          meta: [country.phoneCode, country.postalCodeLabel].filter(Boolean).join(' · '),
        })),
      [countries]
    );

    useEffect(() => {
      onDirtyChange?.(hasChanges);
    }, [hasChanges, onDirtyChange]);

    useEffect(() => {
      let cancelled = false;

      async function loadInitialState() {
        setIsLoading(true);
        setCountriesError(null);
        setDataSourceNote(null);

        try {
          const nextCountries = await loadGeoCountries();
          if (cancelled) return;
          setCountries(nextCountries);

          let nextDraft = createEmptyDeliveryAddressDraft();
          let note: string | null = null;

          if (walletAddress) {
            const addresses = await loadUserDeliveryAddresses(walletAddress);
            if (cancelled) return;

            const preferred = getPreferredDeliveryAddress(addresses);
            if (preferred) {
              nextDraft = draftFromDeliveryAddress(preferred);
            } else {
              const legacy = extractLegacyDeliveryAddressFromWalletSettings(walletAddress);
              if (legacy) {
                nextDraft = createDeliveryDraftFromLegacyAddress(legacy, nextCountries);
                note = getLegacyReviewNote(nextDraft);
              }
            }
          }

          setDraft(nextDraft);
          setInitialDraft(nextDraft);
          setFieldErrors({});
          setDataSourceNote(note);
        } catch (error) {
          if (cancelled) return;
          setCountries([]);
          setCountriesError(toUserMessage(error, 'Failed to load delivery address data.'));
          setDraft(createEmptyDeliveryAddressDraft());
          setInitialDraft(createEmptyDeliveryAddressDraft());
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }

      void loadInitialState();
      return () => {
        cancelled = true;
      };
    }, [walletAddress]);

    useEffect(() => {
      let cancelled = false;

      async function hydrateGeoOptions() {
        if (!selectedCountry) {
          setLevelOptions({});
          setLevelLoading({});
          setLevelErrors({});
          return;
        }

        const levelCount = selectedCountry.addressSchema.levels.length;
        const nextLoading: Record<number, boolean> = {};
        for (let index = 0; index < levelCount; index += 1) {
          nextLoading[index] = true;
        }
        setLevelLoading(nextLoading);

        const nextOptions: Record<number, GeoPlace[]> = {};
        const nextErrors: Record<number, string> = {};

        for (let index = 0; index < levelCount; index += 1) {
          const parentId = index === 0 ? null : draft.geoPath[index - 1]?.placeId || null;
          if (index > 0 && !parentId) break;

          try {
            nextOptions[index] = await loadGeoPlacesForLevel(selectedCountry, index, parentId);
          } catch (error) {
            nextOptions[index] = [];
            nextErrors[index] = toUserMessage(error, 'Failed to load regions for this level.');
          }

          if (cancelled) return;
        }

        setLevelOptions(nextOptions);
        setLevelErrors(nextErrors);
        setLevelLoading({});
      }

      void hydrateGeoOptions();
      return () => {
        cancelled = true;
      };
    }, [selectedCountry?.code, geoPathSignature]);

    function clearFieldError(key: string) {
      setFieldErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

    function updateDraft<K extends keyof DeliveryAddressDraft>(key: K, value: DeliveryAddressDraft[K]) {
      setDraft((prev) => ({ ...prev, [key]: value }));
      clearFieldError(String(key));
    }

    async function reloadCountries() {
      clearGeoAddressCaches();
      setCountriesError(null);
      try {
        const nextCountries = await loadGeoCountries();
        setCountries(nextCountries);
      } catch (error) {
        setCountriesError(toUserMessage(error, 'Failed to reload country data.'));
      }
    }

    async function reloadLevel(index: number) {
      if (!selectedCountry) return;
      clearGeoAddressCaches();
      try {
        const parentId = index === 0 ? null : draft.geoPath[index - 1]?.placeId || null;
        const next = await loadGeoPlacesForLevel(selectedCountry, index, parentId);
        setLevelOptions((prev) => ({ ...prev, [index]: next }));
        setLevelErrors((prev) => {
          const updated = { ...prev };
          delete updated[index];
          return updated;
        });
      } catch (error) {
        setLevelErrors((prev) => ({
          ...prev,
          [index]: toUserMessage(error, 'Failed to reload options.'),
        }));
      }
    }

    function handleCountrySelect(option: DeliveryAddressSelectOption) {
      const country = countries.find((item) => item.code === option.id);
      setDraft((prev) => ({
        ...prev,
        countryCode: option.id,
        countryNameSnapshot: country?.name || option.label,
        geoPath: [],
        leafPlaceId: '',
        postalCode: '',
        validationStatus: 'unverified',
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.countryCode;
        delete next.postalCode;
        Object.keys(next)
          .filter((key) => key.startsWith('geo-'))
          .forEach((key) => {
            delete next[key];
          });
        return next;
      });
    }

    function handleGeoSelect(index: number, option: DeliveryAddressSelectOption) {
      if (!selectedCountry) return;
      const place = (levelOptions[index] || []).find((item) => item.id === option.id);
      if (!place) return;

      const nextSelection = {
        placeId: place.id,
        kind: place.placeKind,
        code: place.code || undefined,
        name: place.name,
        label: getGeoLabelAtIndex(selectedCountry, index),
      };

      setDraft((prev) => {
        const nextPath = prev.geoPath.slice(0, index);
        nextPath[index] = nextSelection;
        return {
          ...prev,
          geoPath: nextPath,
          leafPlaceId: place.id,
          postalCode: '',
          validationStatus: 'unverified',
        };
      });
      clearFieldError(`geo-${index}`);
      clearFieldError('postalCode');
    }

    async function handleSave() {
      if (!walletAddress) {
        toast.error('Connect a wallet before saving your delivery address.');
        return false;
      }

      const validationErrors = validateDeliveryAddressDraft(draft, selectedCountry, leafPlace);
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        toast.error('Delivery address is incomplete.', {
          description: 'Review the highlighted fields before saving.',
        });
        return false;
      }

      setIsSaving(true);
      try {
        const saved = await saveUserDeliveryAddress(
          walletAddress,
          { ...draft, validationStatus: 'format_valid' },
          selectedCountry
        );
        const nextDraft = draftFromDeliveryAddress(saved);
        setDraft(nextDraft);
        setInitialDraft(nextDraft);
        setFieldErrors({});
        setDataSourceNote(null);
        return true;
      } catch (error) {
        toast.error('Failed to save delivery address.', {
          description: toUserMessage(error, 'Please try again.'),
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    }

    function handleDiscard() {
      setDraft(initialDraft);
      setFieldErrors({});
      setDataSourceNote(getLegacyReviewNote(initialDraft));
    }

    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        discard: handleDiscard,
        hasChanges: () => hasChanges,
        isSaving: () => isSaving,
      }),
      [handleSave, hasChanges, initialDraft, isSaving]
    );

    const postalCodeLabel = selectedCountry?.postalCodeLabel || 'Postal code';
    const geoLevels = selectedCountry?.addressSchema.levels || [];
    const activePostalPattern = getActivePostalPattern(selectedCountry, leafPlace);
    const geoGridColumnsClass =
      geoLevels.length >= 4
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-5'
        : geoLevels.length === 3
          ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          : geoLevels.length === 2
            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            : geoLevels.length === 1
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2'
              : 'grid-cols-1';

    return (
      <div className="bg-[var(--t-surface-2)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Home className="text-[#2CC295]" size={20} />
          <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest">Delivery Address</h3>
        </div>
        <p className="text-xs text-ui-muted mb-6">
          Choose your country first. Region fields update automatically based on the selected destination.
        </p>

        {dataSourceNote ? (
          <div className="mb-5 rounded-2xl border border-[rgba(44,194,149,0.18)] bg-[rgba(44,194,149,0.08)] px-4 py-3 text-xs text-ui-secondary">
            {dataSourceNote}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--t-surface-5)] px-4 py-4 text-sm text-ui-muted">
            <Loader2 size={16} className="animate-spin text-[#2CC295]" />
            Loading delivery address...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <StudioFieldLabel>Recipient Name</StudioFieldLabel>
                  <input
                    type="text"
                    placeholder="Alex Thompson"
                    className={inputClassName}
                    value={draft.recipientName}
                    onChange={(event) => updateDraft('recipientName', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.recipientName)}
                  />
                  {fieldErrors.recipientName ? (
                    <StudioFieldError>
                      <AlertCircle size={14} />
                      <span className="text-xs">{fieldErrors.recipientName}</span>
                    </StudioFieldError>
                  ) : null}
                </div>
                <div>
                  <StudioFieldLabel>Phone Number</StudioFieldLabel>
                  <input
                    type="tel"
                    placeholder={selectedCountry?.phoneCode ? `${selectedCountry.phoneCode} 555 123 4567` : '+1 555 123 4567'}
                    className={inputClassName}
                    value={draft.phoneE164 || ''}
                    onChange={(event) => updateDraft('phoneE164', event.target.value)}
                  />
                  <StudioFieldHint>Stored in E.164 format when possible.</StudioFieldHint>
                </div>
              </div>

              <div className="space-y-3 min-w-0">
                <div className={`grid ${selectedCountry ? geoGridColumnsClass : 'grid-cols-1'} gap-4 items-start min-w-0`}>
                  <div>
                    <StudioFieldLabel>Country</StudioFieldLabel>
                    <DeliveryAddressSelect
                      options={countryOptions}
                      selectedId={draft.countryCode}
                      placeholder="Select country"
                      searchPlaceholder="Search countries..."
                      emptyText="No countries available."
                      loading={false}
                      invalid={Boolean(fieldErrors.countryCode)}
                      onSelect={handleCountrySelect}
                      onRetry={reloadCountries}
                    />
                    {countriesError ? (
                      <StudioFieldError>
                        <AlertCircle size={14} />
                        <span className="text-xs">{countriesError}</span>
                      </StudioFieldError>
                    ) : null}
                    {fieldErrors.countryCode ? (
                      <StudioFieldError>
                        <AlertCircle size={14} />
                        <span className="text-xs">{fieldErrors.countryCode}</span>
                      </StudioFieldError>
                    ) : null}
                  </div>

                  {selectedCountry
                    ? geoLevels.map((level, index) => {
                        const options = (levelOptions[index] || [])
                          .map((place) => ({
                            id: place.id,
                            label: place.name,
                            meta: place.code || place.placeKind.toUpperCase(),
                          }));
                        const isDisabled = index > 0 && !draft.geoPath[index - 1];

                        return (
                          <div key={`${level.kind}-${index}`} className="min-w-0">
                            <StudioFieldLabel>{level.label}</StudioFieldLabel>
                            <DeliveryAddressSelect
                              options={options}
                              selectedId={draft.geoPath[index]?.placeId}
                              placeholder={`Select ${level.label.toLowerCase()}`}
                              searchPlaceholder={`Search ${level.label.toLowerCase()}...`}
                              emptyText="No regions found for this selection."
                              disabled={isDisabled}
                              loading={Boolean(levelLoading[index])}
                              invalid={Boolean(fieldErrors[`geo-${index}`])}
                              onSelect={(option) => handleGeoSelect(index, option)}
                              onRetry={() => {
                                void reloadLevel(index);
                              }}
                            />
                            {levelErrors[index] ? (
                              <StudioFieldError>
                                <AlertCircle size={14} />
                                <span className="text-xs">{levelErrors[index]}</span>
                              </StudioFieldError>
                            ) : null}
                            {fieldErrors[`geo-${index}`] ? (
                              <StudioFieldError>
                                <AlertCircle size={14} />
                                <span className="text-xs">{fieldErrors[`geo-${index}`]}</span>
                              </StudioFieldError>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>

                {!selectedCountry ? (
                  <div className="rounded-2xl bg-[var(--t-surface-5)] px-4 py-3 text-xs text-ui-muted flex items-center gap-2 min-h-[43px]">
                    <Globe size={14} />
                    Select a country to unlock region-specific address fields.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <StudioFieldLabel>{postalCodeLabel}</StudioFieldLabel>
                <input
                  type="text"
                  placeholder={selectedCountry?.code === 'US' ? '94102' : 'Enter postal code'}
                  className={inputClassName}
                  value={draft.postalCode || ''}
                  onChange={(event) => updateDraft('postalCode', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.postalCode)}
                />
                {fieldErrors.postalCode ? (
                  <StudioFieldError>
                    <AlertCircle size={14} />
                    <span className="text-xs">{fieldErrors.postalCode}</span>
                  </StudioFieldError>
                ) : activePostalPattern ? (
                  <StudioFieldHint>Validated against the active country format.</StudioFieldHint>
                ) : null}
              </div>
              <div>
                <StudioFieldLabel>Address Line 1</StudioFieldLabel>
                <input
                  type="text"
                  placeholder="123 Main Street, Apt 4B"
                  className={inputClassName}
                  value={draft.addressLine1}
                  onChange={(event) => updateDraft('addressLine1', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.addressLine1)}
                />
                {fieldErrors.addressLine1 ? (
                  <StudioFieldError>
                    <AlertCircle size={14} />
                    <span className="text-xs">{fieldErrors.addressLine1}</span>
                  </StudioFieldError>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <StudioFieldLabel>Address Line 2</StudioFieldLabel>
                <input
                  type="text"
                  placeholder="Suite, unit, floor"
                  className={inputClassName}
                  value={draft.addressLine2 || ''}
                  onChange={(event) => updateDraft('addressLine2', event.target.value)}
                />
              </div>
              <div>
                <StudioFieldLabel>Delivery Instructions</StudioFieldLabel>
                <StudioTextareaField
                  rows={3}
                  placeholder="Gate code, contact at arrival, preferred delivery window..."
                  className="min-h-[44px] bg-[var(--t-surface-5)] border-0 rounded-lg px-4 py-2.5"
                  value={draft.deliveryInstructions || ''}
                  onChange={(event) => updateDraft('deliveryInstructions', event.target.value)}
                />
              </div>
            </div>

            <label className="pt-2 flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={draft.isDefault}
                onCheckedChange={(checked) => updateDraft('isDefault', checked === true)}
                className="bg-[var(--t-surface-5)]"
              />
              <span className="text-xs text-ui-secondary">Set as default shipping address</span>
            </label>

            <div className="rounded-2xl bg-[var(--t-surface-5)] px-4 py-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ui-muted mb-2">
                <MapPin size={14} className="text-[#2CC295]" />
                Normalized Preview
              </div>
              <p className="text-sm text-ui-primary leading-relaxed">
                {preview || 'Complete the required fields to generate a normalized address preview.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-ui-muted">
                {hasChanges ? (
                  <>
                    <AlertCircle size={14} className="text-[#f5c451]" />
                    <span>Unsaved address changes</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="text-[#2CC295]" />
                    <span>Address draft is in sync</span>
                  </>
                )}
              </div>
              {!walletAddress ? (
                <span className="text-xs text-ui-muted">Connect a wallet to save this address.</span>
              ) : isSaving ? (
                <span className="inline-flex items-center gap-2 text-xs text-ui-muted">
                  <Loader2 size={14} className="animate-spin text-[#2CC295]" />
                  Saving delivery address...
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }
);
