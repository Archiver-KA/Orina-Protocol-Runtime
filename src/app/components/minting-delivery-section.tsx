import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Globe, Loader2, MapPin } from 'lucide-react';
import type {
  DeliveryAddressDraft,
  DeliveryAddressFieldErrors,
  DeliveryAddressRecord,
  GeoCountry,
  GeoPlace,
} from '@/types/address';
import {
  buildAssetLocationSnapshot,
  clearGeoAddressCaches,
  createEmptyDeliveryAddressDraft,
  draftSignature,
  draftFromDeliveryAddress,
  formatDeliveryAddressPreview,
  getDeliveryAddressSyncEventName,
  getGeoLabelAtIndex,
  getPreferredDeliveryAddress,
  loadGeoCountries,
  loadGeoPlacesForLevel,
  loadUserDeliveryAddresses,
  resolveCountryByCode,
} from '@/utils/deliveryAddressUtils';
import { StudioFieldError, StudioFieldHint, StudioFieldLabel } from '@/app/components/ui/studio-form-fields';
import { DeliveryAddressSelect, type DeliveryAddressSelectOption } from '@/app/components/settings/delivery-address-select';
import { StandardToggle } from '@/app/components/standard-toggle';
import type { AssetLocationSnapshot } from '@/types/asset';

type MintDeliveryMode = 'Default Address' | 'Other Address';

export interface MintingDeliveryState {
  mode: 'default' | 'other';
  defaultAddress: DeliveryAddressRecord | null;
  otherDraft: DeliveryAddressDraft;
  effectiveDraft: DeliveryAddressDraft | null;
  preview: string;
  locationSnapshot: AssetLocationSnapshot | null;
  isValid: boolean;
}

interface MintingDeliverySectionProps {
  walletAddress?: string;
  submitAttempt: number;
  initialState?: MintingDeliveryState | null;
  onChange?: (state: MintingDeliveryState) => void;
}

const inputClassName =
  'w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary focus:bg-ui-input-focus focus:outline-none focus:ring-2 focus:ring-[#2CC295]/20 text-sm placeholder:text-ui-muted shadow-none';

function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function createMintOverrideDraft(address?: DeliveryAddressRecord | null): DeliveryAddressDraft {
  if (!address) {
    return {
      ...createEmptyDeliveryAddressDraft(),
      isDefault: false,
      source: 'manual',
    };
  }

  const next = draftFromDeliveryAddress(address);
  return {
    ...next,
    id: undefined,
    label: '',
    recipientName: '',
    phoneE164: '',
    isDefault: false,
    source: 'manual',
    validationStatus: 'unverified',
  };
}

function validateMintOverrideDraft(
  draft: DeliveryAddressDraft,
  country: GeoCountry | null | undefined
): DeliveryAddressFieldErrors {
  const errors: DeliveryAddressFieldErrors = {};

  if (!draft.countryCode.trim()) {
    errors.countryCode = 'Country is required';
  }

  if (!draft.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required';
  }

  const levels = country?.addressSchema.levels || [];
  levels.forEach((level, index) => {
    if (level.required && !draft.geoPath[index]) {
      errors[`geo-${index}`] = `${level.label} is required`;
    }
  });

  return errors;
}

export function MintingDeliverySection({
  walletAddress,
  submitAttempt,
  initialState,
  onChange,
}: MintingDeliverySectionProps) {
  const [mode, setMode] = useState<MintDeliveryMode>(
    initialState?.mode === 'other' ? 'Other Address' : 'Default Address'
  );
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<DeliveryAddressRecord | null>(
    initialState?.defaultAddress ?? null
  );
  const [otherDraft, setOtherDraft] = useState<DeliveryAddressDraft>(
    initialState?.otherDraft ?? createMintOverrideDraft(initialState?.defaultAddress)
  );
  const [fieldErrors, setFieldErrors] = useState<DeliveryAddressFieldErrors>({});
  const [levelOptions, setLevelOptions] = useState<Record<number, GeoPlace[]>>({});
  const [levelLoading, setLevelLoading] = useState<Record<number, boolean>>({});
  const [levelErrors, setLevelErrors] = useState<Record<number, string>>({});
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationSnapshot, setLocationSnapshot] = useState<AssetLocationSnapshot | null>(
    initialState?.locationSnapshot ?? null
  );
  const hasSeededOverrideDraftRef = useRef(Boolean(initialState));

  const selectedCountry = useMemo(
    () => resolveCountryByCode(countries, otherDraft.countryCode),
    [countries, otherDraft.countryCode]
  );

  const geoPathSignature = useMemo(
    () => otherDraft.geoPath.map((item) => item.placeId).join('|'),
    [otherDraft.geoPath]
  );

  const defaultPreview = useMemo(
    () => (defaultAddress ? formatDeliveryAddressPreview(defaultAddress) : ''),
    [defaultAddress]
  );

  const otherPreview = useMemo(
    () => formatDeliveryAddressPreview(otherDraft, selectedCountry),
    [otherDraft, selectedCountry]
  );

  const otherDraftErrors = useMemo(
    () => validateMintOverrideDraft(otherDraft, selectedCountry),
    [otherDraft, selectedCountry]
  );

  const isDefaultMode = mode === 'Default Address';
  const isValid = isDefaultMode ? Boolean(defaultAddress) : Object.keys(otherDraftErrors).length === 0;
  const effectiveDraft = useMemo(() => {
    if (isDefaultMode) {
      return defaultAddress ? draftFromDeliveryAddress(defaultAddress) : null;
    }
    return otherDraft;
  }, [defaultAddress, isDefaultMode, otherDraft]);
  const effectiveDraftSignature = useMemo(
    () => (effectiveDraft ? draftSignature(effectiveDraft) : ''),
    [effectiveDraft]
  );
  const effectiveCountry = useMemo(
    () => resolveCountryByCode(countries, effectiveDraft?.countryCode || ''),
    [countries, effectiveDraft]
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
    hasSeededOverrideDraftRef.current = Boolean(initialState);
    setMode(initialState?.mode === 'other' ? 'Other Address' : 'Default Address');
    setDefaultAddress(initialState?.defaultAddress ?? null);
    setOtherDraft(initialState?.otherDraft ?? createMintOverrideDraft(initialState?.defaultAddress));
    setLocationSnapshot(initialState?.locationSnapshot ?? null);
    setFieldErrors({});
  }, [initialState, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setCountriesError(null);

      try {
        const [nextCountries, addresses] = await Promise.all([
          loadGeoCountries(),
          walletAddress ? loadUserDeliveryAddresses(walletAddress) : Promise.resolve([]),
        ]);
        if (cancelled) return;

        const preferred = getPreferredDeliveryAddress(addresses);
        setCountries(nextCountries);
        if (!initialState) {
          setDefaultAddress(preferred);
        }

        if (!hasSeededOverrideDraftRef.current) {
          setOtherDraft(createMintOverrideDraft(preferred));
          hasSeededOverrideDraftRef.current = true;
        }

        if (!preferred && !initialState) {
          setMode('Other Address');
        }
      } catch (error) {
        if (cancelled) return;
        setCountries([]);
        setDefaultAddress(null);
        setCountriesError(toUserMessage(error, 'Failed to load delivery address data.'));
        setMode('Other Address');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [initialState, walletAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const eventName = getDeliveryAddressSyncEventName();
    const handleSync = () => {
      if (!walletAddress) return;
      void loadUserDeliveryAddresses(walletAddress).then((addresses) => {
        const preferred = getPreferredDeliveryAddress(addresses);
        setDefaultAddress(preferred);
      });
    };

    window.addEventListener(eventName, handleSync);
    return () => window.removeEventListener(eventName, handleSync);
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
        const parentId = index === 0 ? null : otherDraft.geoPath[index - 1]?.placeId || null;
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
  }, [geoPathSignature, otherDraft.countryCode, selectedCountry]);

  useEffect(() => {
    if (submitAttempt <= 0 || isDefaultMode) return;
    setFieldErrors(otherDraftErrors);
  }, [isDefaultMode, otherDraftErrors, submitAttempt]);

  useEffect(() => {
    let cancelled = false;

    async function syncLocationSnapshot() {
      if (!effectiveDraft || !isValid) {
        setLocationSnapshot(null);
        return;
      }

      const nextSnapshot = await buildAssetLocationSnapshot({
        draft: effectiveDraft,
        country: effectiveCountry,
        sourceMode: isDefaultMode ? 'default' : 'other',
      });

      if (!cancelled) {
        setLocationSnapshot(nextSnapshot);
      }
    }

    void syncLocationSnapshot();

    return () => {
      cancelled = true;
    };
  }, [effectiveCountry, effectiveDraft, effectiveDraftSignature, isDefaultMode, isValid]);

  useEffect(() => {
    onChange?.({
      mode: isDefaultMode ? 'default' : 'other',
      defaultAddress,
      otherDraft,
      effectiveDraft,
      preview: isDefaultMode ? defaultPreview : otherPreview,
      locationSnapshot,
      isValid,
    });
  }, [defaultAddress, defaultPreview, effectiveDraft, isDefaultMode, isValid, locationSnapshot, onChange, otherDraft, otherPreview]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateDraft<K extends keyof DeliveryAddressDraft>(key: K, value: DeliveryAddressDraft[K]) {
    setOtherDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
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
      const parentId = index === 0 ? null : otherDraft.geoPath[index - 1]?.placeId || null;
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
    setOtherDraft((prev) => ({
      ...prev,
      countryCode: option.id,
      countryNameSnapshot: country?.name || option.label,
      geoPath: [],
      leafPlaceId: '',
      validationStatus: 'unverified',
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.countryCode;
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

    setOtherDraft((prev) => {
      const nextPath = prev.geoPath.slice(0, index);
      nextPath[index] = nextSelection;
      return {
        ...prev,
        geoPath: nextPath,
        leafPlaceId: place.id,
        validationStatus: 'unverified',
      };
    });
    clearFieldError(`geo-${index}`);
  }

  const geoLevels = selectedCountry?.addressSchema.levels || [];
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
    <div className="rounded-[20px] bg-[var(--t-surface-5)] p-5 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-ui-primary">Delivery Address</h3>
          <p className="text-xs text-ui-muted mt-1">
            Use the saved shipping address from Settings or provide a one-time override for this mint.
          </p>
        </div>
        <div className="w-full lg:w-[340px]">
          <StandardToggle
            options={['Default Address', 'Other Address']}
            value={mode}
            onChange={(value) => setMode(value as MintDeliveryMode)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--t-surface-2)] px-4 py-4 text-sm text-ui-muted">
          <Loader2 size={16} className="animate-spin text-[#2CC295]" />
          Loading delivery address...
        </div>
      ) : isDefaultMode ? (
        <div className="space-y-4">
          {defaultAddress ? (
            <>
              <div className="rounded-2xl bg-[var(--t-surface-2)] px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ui-muted mb-2">
                  <MapPin size={14} className="text-[#2CC295]" />
                  Normalized Preview
                </div>
                <p className="text-sm text-ui-primary leading-relaxed">{defaultPreview}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[rgba(255,255,255,0.02)] px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-ui-muted">
                  <CheckCircle2 size={14} className="text-[#2CC295]" />
                  <span>Address draft is in sync</span>
                </div>
                <span className="text-xs text-ui-muted">Synced from Settings delivery address.</span>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-[var(--t-surface-2)] px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 text-[#f5c451]" />
                <div>
                  <p className="text-sm font-semibold text-ui-primary">No default shipping address found</p>
                  <p className="text-xs text-ui-muted mt-1">
                    Save a default address in Settings or switch to Other Address for this mint.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--t-surface-2)] px-4 py-3 text-xs text-ui-muted">
            This override is used only for the current mint and does not overwrite the default address in Settings.
          </div>

          <div className="space-y-4">
            <div className={`grid ${selectedCountry ? geoGridColumnsClass : 'grid-cols-1'} gap-4 items-start min-w-0`}>
              <div>
                <StudioFieldLabel>Country</StudioFieldLabel>
                <DeliveryAddressSelect
                  options={countryOptions}
                  selectedId={otherDraft.countryCode}
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
                    const isDisabled = index > 0 && !otherDraft.geoPath[index - 1];

                    return (
                      <div key={`${level.kind}-${index}`} className="min-w-0">
                        <StudioFieldLabel>{level.label}</StudioFieldLabel>
                        <DeliveryAddressSelect
                          options={options}
                          selectedId={otherDraft.geoPath[index]?.placeId}
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
              <div className="rounded-2xl bg-[var(--t-surface-2)] px-4 py-3 text-xs text-ui-muted flex items-center gap-2 min-h-[43px]">
                <Globe size={14} />
                Select a country to unlock the region hierarchy.
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <StudioFieldLabel>Address Line 1</StudioFieldLabel>
                <input
                  type="text"
                  placeholder="123 Main Street, Apt 4B"
                  className={inputClassName}
                  value={otherDraft.addressLine1}
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
              <div>
                <StudioFieldLabel>Address Line 2</StudioFieldLabel>
                <input
                  type="text"
                  placeholder="Suite, unit, floor"
                  className={inputClassName}
                  value={otherDraft.addressLine2 || ''}
                  onChange={(event) => updateDraft('addressLine2', event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--t-surface-2)] px-4 py-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ui-muted mb-2">
              <MapPin size={14} className="text-[#2CC295]" />
              Normalized Preview
            </div>
            <p className="text-sm text-ui-primary leading-relaxed">
              {otherPreview || 'Complete the required fields to generate a normalized address preview.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[rgba(255,255,255,0.02)] px-4 py-3">
            {isValid ? (
              <div className="flex items-center gap-2 text-xs text-ui-muted">
                <CheckCircle2 size={14} className="text-[#2CC295]" />
                <span>Override address is ready for this mint</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-ui-muted">
                <AlertCircle size={14} className="text-[#f5c451]" />
                <span>Complete the required delivery fields to continue</span>
              </div>
            )}
            <StudioFieldHint className="mt-0">This address is not saved back to Settings.</StudioFieldHint>
          </div>
        </div>
      )}
    </div>
  );
}
