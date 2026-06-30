import { useEffect, useMemo, useState } from 'react';
import { encodeAbiParameters, formatUnits, keccak256, parseUnits, zeroHash, type Address } from 'viem';
import { useReadContract } from 'wagmi';
import { WalletCards } from 'lucide-react';
import { Checkbox } from '@/app/components/ui/checkbox';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
import { CopyAddressButton } from '@/app/components/ui/copy-address-button';
import type {
  AIM2MAction,
  AIM2MActivityItem,
  AIM2MClientError,
  AIM2MDelegateInvite,
  AIM2MDelegateRecord,
  AIM2MStepSnapshot,
  AIM2MWalletConfig,
  AIM2MWalletOverview,
  AIM2MWalletRuntimeSnapshot,
} from '@/app/types/ai-m2m-wallet';
import { AIM2MWalletClient } from '@/utils/aiM2MWalletClient';
import { ERC20_ABI } from '@/config/abis';
import type { PaymentTokenMap } from '@/config/contracts';
import {
  M2M_ACTION_DESCRIPTIONS,
  M2M_PROTOCOL_GUARDRAILS,
  getM2MDefaultPaymentToken,
} from '@/config/m2m';
import {
  useAIM2MWalletLifecycleState,
  useAIM2MWalletOfSession,
  useCloseExpiredAIM2MWallet,
  useDelegationCyclePreview,
  useDelegationSession,
  useDelegationSessionStatus,
  useDeployAIM2MWallet,
  useM2MOnchainReady,
  usePredictAIM2MWallet,
  useRevokeAIM2MWallet,
} from '@/hooks/useAIM2M';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { dispatchBridgeSecurityCheckRequest } from '@/utils/supabaseAuthClaimBridge';

interface AIM2MWalletSettingsProps {
  walletAddress: string;
  onSnapshotChange?: (snapshot: AIM2MWalletRuntimeSnapshot | null) => void;
}

interface DelegationSessionView {
  delegate: Address;
  paymentToken: Address;
  validFrom: bigint;
  validUntil: bigint;
  actionMask: bigint;
  status: number;
  exists: boolean;
}

const ACTION_ORDER: AIM2MAction[] = ['buy', 'mint', 'sign_order'];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const NO_EXPIRY_UINT64 = (2n ** 64n) - 1n;
const M2M_DEFAULT_MAX_DELIVERY_SECONDS = 10n * 24n * 60n * 60n;

function normalizeLineList(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalizeActions(actions: AIM2MAction[]): AIM2MAction[] {
  return ACTION_ORDER.filter((action) => actions.includes(action));
}

function sameAddress(left: string | null | undefined, right: string | null | undefined): boolean {
  return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

function isAddressLike(value: string | null | undefined): value is Address {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function normalizeContractAddress(value: unknown): Address | null {
  if (typeof value !== 'string' || !isAddressLike(value)) return null;
  return value.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? null : value;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return 'n/a';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

function formatHash(value: string | undefined): string {
  if (!value || value.length < 12) return value || 'n/a';
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatExpiryDaysLabel(value: string | number | null | undefined) {
  const days = Number(value || 0);
  if (days === 0) return 'No expiry';
  return `${days} day${days === 1 ? '' : 's'}`;
}

function isValidAmountString(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function buildActionMask(actions: AIM2MAction[]): bigint {
  let mask = 0n;
  if (actions.includes('buy')) mask |= (1n << 0n) | (1n << 1n);
  if (actions.includes('mint')) mask |= 1n << 2n;
  if (actions.includes('sign_order')) mask |= 1n << 3n;
  return mask;
}

function getPaymentTokenSymbol(address: string | null | undefined, paymentTokens: PaymentTokenMap): string | null {
  const entry = Object.entries(paymentTokens).find(([, token]) => sameAddress(token, address));
  return entry?.[0] ?? null;
}

function formatClientError(error: AIM2MClientError, context: 'load' | 'save' | 'generate' | 'invite' | 'accept'): string {
  const prefix = {
    load: 'Unable to load AI wallet settings.',
    save: 'Unable to save AI wallet settings.',
    generate: 'Unable to prepare the AI signer.',
    invite: 'Unable to create an invite code.',
    accept: 'Unable to accept the invite code.',
  }[context];
  const suffix = error.requestPath ? ` (${error.requestPath}${error.status ? ` · HTTP ${error.status}` : ''})` : '';
  return `${prefix} ${error.message}${suffix}`;
}

function mapSessionStatus(status: number | undefined, exists: boolean | undefined): AIM2MWalletRuntimeSnapshot['sessionStatus'] {
  if (!exists) return 'none';
  if (status === 1) return 'active';
  if (status === 2) return 'revoked';
  if (status === 3) return 'expired';
  return 'none';
}

function buildSteps(configured: boolean, walletReady: boolean, cycleCanRestart: boolean, requiresFunding: boolean): AIM2MStepSnapshot[] {
  const current = !configured
    ? 'configure'
    : !walletReady
      ? 'deploy_ai_wallet'
      : cycleCanRestart
        ? 'revoke_close'
        : 'revoke_close';
  return [
    {
      id: 'configure',
      label: 'Configure',
      description: 'Choose the rules, token, limits, and duration for this setup.',
      status: configured ? 'complete' : current === 'configure' ? 'current' : 'locked',
    },
    {
      label: 'Deploy AI wallet',
      description: 'Create the AI wallet and lock in the current rules in one step.',
      status: walletReady ? 'complete' : current === 'deploy_ai_wallet' ? 'current' : 'locked',
    },
    {
      id: 'prefund_activate',
      label: 'Optional Fund',
      description: requiresFunding ? 'Optional after setup. Add funds only when this wallet needs buying power.' : 'Optional. Minting and signing can run without adding funds.',
      status: walletReady ? 'complete' : 'locked',
    },
    {
      id: 'revoke_close',
      label: 'Revoke / Close',
      description: 'End this setup after unused balance returns to your main wallet.',
      status: cycleCanRestart ? 'complete' : walletReady ? 'current' : 'locked',
    },
  ];
}

export function AIM2MWalletSettings({ walletAddress, onSnapshotChange }: AIM2MWalletSettingsProps) {
  const { chainId, networkKey, networkLabel, paymentTokens, m2mContracts } = useProtocolDataNetwork();
  const defaultPaymentToken = useMemo(
    () => getM2MDefaultPaymentToken(chainId, paymentTokens),
    [chainId, paymentTokens],
  );
  const cachedConfigResponse = AIM2MWalletClient.peekConfig(walletAddress);
  const [config, setConfig] = useState<AIM2MWalletConfig | null>(cachedConfigResponse?.config ?? null);
  const [overview, setOverview] = useState<AIM2MWalletOverview | null>(cachedConfigResponse?.overview ?? null);
  const [delegates, setDelegates] = useState<AIM2MDelegateRecord[]>(cachedConfigResponse?.delegates ?? []);
  const [pendingInvites, setPendingInvites] = useState<AIM2MDelegateInvite[]>(cachedConfigResponse?.pendingInvites ?? []);
  const [loading, setLoading] = useState(() => !cachedConfigResponse);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<'generate' | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [requiresSecurityCheck, setRequiresSecurityCheck] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [enabled, setEnabled] = useState(cachedConfigResponse?.config.enabled ?? false);
  const [selectedDelegateId, setSelectedDelegateId] = useState<string | null>(cachedConfigResponse?.config.selectedDelegateId ?? null);
  const [paymentToken, setPaymentToken] = useState<string>(cachedConfigResponse?.config.paymentToken || defaultPaymentToken);
  const [allowedActions, setAllowedActions] = useState<AIM2MAction[]>(cachedConfigResponse?.config.allowedActions.length ? cachedConfigResponse.config.allowedActions : ['buy']);
  const [maxPerOrder, setMaxPerOrder] = useState(cachedConfigResponse?.config.maxPerOrder ?? '');
  const [maxTotal, setMaxTotal] = useState(cachedConfigResponse?.config.maxTotal ?? '');
  const [expiryDays, setExpiryDays] = useState(String(cachedConfigResponse?.config.expiryDays ?? 7));
  const [counterpartyText, setCounterpartyText] = useState(cachedConfigResponse?.config.counterpartyAllowlist.join('\n') ?? '');
  const [notes, setNotes] = useState(cachedConfigResponse?.config.notes || '');
  const [inviteCode, setInviteCode] = useState('');
  const [submittedSessionNonce, setSubmittedSessionNonce] = useState<bigint | undefined>(undefined);
  const [pendingMirrorDelegateId, setPendingMirrorDelegateId] = useState<string | null>(null);
  const { isAuthPending } = useAccessMode();
  const hasRemoteConfig = useMemo(() => Boolean(projectId && publicAnonKey), []);
  const m2mOnchainReady = useM2MOnchainReady();
  const normalizedActions = useMemo(() => normalizeActions(allowedActions), [allowedActions]);
  const normalizedAllowlist = useMemo(() => normalizeLineList(counterpartyText), [counterpartyText]);
  const requiresFundingVault = normalizedActions.includes('buy');
  const actionMask = useMemo(() => buildActionMask(normalizedActions), [normalizedActions]);
  const paymentTokenAddress = isAddressLike(paymentToken) ? paymentToken : undefined;
  useEffect(() => {
    const tokenExistsOnNetwork = Object.values(paymentTokens).some((tokenAddress) => sameAddress(tokenAddress, paymentToken));
    if (!tokenExistsOnNetwork) {
      setPaymentToken(defaultPaymentToken);
    }
  }, [defaultPaymentToken, paymentToken, paymentTokens]);
  const onchainRootAddress = !loading ? (walletAddress as Address | undefined) : undefined;
  const storedDelegate = useMemo(
    () => delegates.find((item) => item.id === selectedDelegateId) || null,
    [delegates, selectedDelegateId],
  );
  const sessionPreview = useDelegationCyclePreview(onchainRootAddress);
  const activeSessionNonce = sessionPreview.hasActiveCycle ? sessionPreview.activeSessionNonce : undefined;
  const activeSessionRead = useDelegationSession(onchainRootAddress, activeSessionNonce);
  const activeSessionStatusRead = useDelegationSessionStatus(onchainRootAddress, activeSessionNonce);
  const activeSession = activeSessionRead.data as DelegationSessionView | undefined;
  const flowSessionNonce = activeSessionNonce ?? submittedSessionNonce;
  const flowSession = activeSessionNonce !== undefined ? activeSession : undefined;
  const predictedExpiry = useMemo(() => {
    const days = Number(expiryDays || 0);
    if (days === 0) return NO_EXPIRY_UINT64;
    if (!Number.isFinite(days) || days <= 0) return undefined;
    return BigInt(Math.floor(Date.now() / 1000) + days * 24 * 60 * 60);
  }, [expiryDays]);
  const walletExpiry = flowSession?.validUntil ?? predictedExpiry;
  const predictedWallet = usePredictAIM2MWallet({
    root: onchainRootAddress,
    sessionNonce: flowSessionNonce ?? sessionPreview.nextSessionNonce,
  });
  const predictedWalletAddress = normalizeContractAddress(predictedWallet.data);
  const walletOfSession = useAIM2MWalletOfSession(onchainRootAddress, flowSessionNonce);
  const deployedWalletAddress = normalizeContractAddress(walletOfSession.data);
  const runtimeWalletAddress = deployedWalletAddress ?? predictedWalletAddress;
  const walletState = useAIM2MWalletLifecycleState(deployedWalletAddress ?? undefined);
  const tokenDecimalsRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: Boolean(!loading && paymentTokenAddress) },
  });
  const tokenBalanceRead = useReadContract({
    chainId: chainId ?? undefined,
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: runtimeWalletAddress ? [runtimeWalletAddress] : undefined,
    query: { enabled: Boolean(!loading && paymentTokenAddress && runtimeWalletAddress) },
  });
  const tokenDecimals = tokenDecimalsRead.data !== undefined ? Number(tokenDecimalsRead.data) : undefined;
  const tokenBalanceRaw = tokenBalanceRead.data !== undefined ? (tokenBalanceRead.data as bigint) : undefined;
  const tokenBalanceFormatted = tokenBalanceRaw !== undefined && tokenDecimals !== undefined ? formatUnits(tokenBalanceRaw, tokenDecimals) : null;
  const deployWalletMutation = useDeployAIM2MWallet();
  const revokeWalletMutation = useRevokeAIM2MWallet(deployedWalletAddress ?? undefined);
  const closeExpiredWalletMutation = useCloseExpiredAIM2MWallet(deployedWalletAddress ?? undefined);
  const submittedCyclePendingRefresh = submittedSessionNonce !== undefined && deployWalletMutation.isConfirmed && !sessionPreview.hasActiveCycle;

  const hasGeneratedDelegate = useMemo(() => delegates.some((item) => item.mode === 'generated' && item.status === 'verified'), [delegates]);
  const configReady = useMemo(() => {
    if (!enabled) return false;
    const expiry = Number(expiryDays || 0);
    if (!normalizedActions.length) return false;
    if (!Number.isInteger(expiry) || expiry < 0 || expiry > 30) return false;
    if (!requiresFundingVault) return true;
    if (!paymentTokenAddress) return false;
    if (!isValidAmountString(maxPerOrder) || !isValidAmountString(maxTotal)) return false;
    if (Number(maxPerOrder) <= 0 || Number(maxTotal) <= 0) return false;
    if (Number(maxTotal) < Number(maxPerOrder)) return false;
    return true;
  }, [enabled, expiryDays, normalizedActions, requiresFundingVault, paymentTokenAddress, maxPerOrder, maxTotal]);
  const activeSessionStatus = mapSessionStatus(
    activeSessionStatusRead.data as number | undefined,
    activeSessionNonce !== undefined && (Boolean(activeSession?.exists) || sessionPreview.hasActiveCycle),
  );
  const sessionStatus = activeSessionNonce !== undefined
    ? activeSessionStatus
    : submittedCyclePendingRefresh
      ? 'active'
      : 'none';
  const sessionMaterialized = activeSessionNonce !== undefined || submittedCyclePendingRefresh;
  const sessionReady = sessionStatus === 'active';
  const walletReady = Boolean(deployedWalletAddress);
  const walletMaterialized = Boolean(deployedWalletAddress || submittedCyclePendingRefresh);
  const funded = !requiresFundingVault || Boolean(tokenBalanceRaw && tokenBalanceRaw > 0n);
  const cycleCanRestart = !sessionPreview.hasActiveCycle && !submittedCyclePendingRefresh && walletState.closed === true;
  const policyLocked = (sessionPreview.hasActiveCycle || submittedCyclePendingRefresh || (deployedWalletAddress !== null && walletState.closed !== true)) && !cycleCanRestart;
  const deployInFlight = busyAction === 'generate' || saving || deployWalletMutation.isPending || deployWalletMutation.isConfirming || Boolean(deployWalletMutation.hash);
  const activeDelegate = useMemo<AIM2MDelegateRecord | null>(() => {
    if (!activeSession?.delegate) return null;
    const matched = delegates.find((item) => sameAddress(item.delegateAddress, activeSession.delegate));
    if (matched) return matched;
    return {
      id: `active_${walletAddress}_${activeSessionNonce?.toString() || '0'}`,
      rootWalletAddress: walletAddress,
      delegateAddress: activeSession.delegate,
      mode: 'generated',
      status: 'verified',
      label: 'AI signer',
      managedByServer: true,
      createdAt: activeSession.validFrom ? new Date(Number(activeSession.validFrom) * 1000).toISOString() : new Date().toISOString(),
      verifiedAt: activeSession.validFrom ? new Date(Number(activeSession.validFrom) * 1000).toISOString() : new Date().toISOString(),
    };
  }, [activeSession, delegates, walletAddress, activeSessionNonce]);
  const selectedDelegate = useMemo(
    () => (policyLocked || deployInFlight ? (activeDelegate ?? storedDelegate) : null),
    [policyLocked, deployInFlight, activeDelegate, storedDelegate],
  );
  const cycleWalletAddress = deployedWalletAddress ?? predictedWalletAddress;
  const actionSummary = useMemo(
    () => normalizedActions.length ? normalizedActions.map((action) => action.replace('_', ' ')).join(', ') : 'None selected',
    [normalizedActions],
  );
  const runtimeStatusLabel = useMemo(() => {
    if (walletState.closed) return 'Closed';
    if (walletState.initialized && walletState.isActive) return 'Active';
    if (walletState.initialized && !walletState.isActive) return 'Expired / ready to close';
    if (deployWalletMutation.isPending || deployWalletMutation.isConfirming) return 'Creating';
    if (sessionStatus === 'active') return 'Preparing wallet';
    if (sessionStatus === 'revoked') return 'Revoked';
    if (cycleCanRestart) return 'Ready to start again';
    return requiresFundingVault ? 'Ready to create / optional funding' : 'Ready to create';
  }, [walletState.closed, walletState.initialized, walletState.isActive, deployWalletMutation.isPending, deployWalletMutation.isConfirming, sessionStatus, cycleCanRestart, requiresFundingVault]);
  const steps = useMemo(() => buildSteps(configReady, walletReady, cycleCanRestart, requiresFundingVault), [configReady, walletReady, cycleCanRestart, requiresFundingVault]);
  const showConfigurePanels = enabled && !policyLocked;
  const showLifecyclePanels = enabled && (policyLocked || sessionMaterialized || walletReady || cycleCanRestart);
  const showManagedRuntime = policyLocked || deployInFlight || sessionMaterialized || walletReady;

  const activity = useMemo<AIM2MActivityItem[]>(() => {
    const items: AIM2MActivityItem[] = [];
    if (selectedDelegate) {
      items.push({
        id: 'delegate',
        label: 'AI signer ready',
        detail: `${selectedDelegate.label || 'AI signer'} · ${selectedDelegate.delegateAddress}`,
        timestamp: selectedDelegate.verifiedAt,
        status: 'success',
      });
    } else if (enabled && !policyLocked) {
      items.push({
        id: 'delegate-pending',
        label: 'AI signer pending',
        detail: 'The AI signer will be prepared automatically when you create the wallet.',
        timestamp: null,
        status: 'pending',
      });
    }
    if (config?.updatedAt) {
      items.push({
        id: 'policy',
        label: 'Mirror config',
        detail: 'The latest off-chain mirror tracks the active or most recent AI wallet cycle.',
        timestamp: config.updatedAt,
        status: 'neutral',
      });
    }
    if (flowSessionNonce !== undefined) {
      items.push({
        id: `session-${flowSessionNonce.toString()}`,
        label: 'Current setup',
        detail: `Setup ${flowSessionNonce.toString()} · status ${sessionStatus}`,
        timestamp: flowSession ? new Date(Number(flowSession.validFrom) * 1000).toISOString() : null,
        status: sessionStatus === 'active' ? 'success' : 'pending',
      });
    }
    if (deployedWalletAddress) {
      items.push({
        id: 'wallet',
        label: 'AI wallet deployed',
        detail: deployedWalletAddress,
        timestamp: null,
        status: 'success',
      });
    }
    if (tokenBalanceRaw && tokenBalanceRaw > 0n) {
      items.push({
        id: 'funded',
        label: 'Vault funded',
        detail: `${tokenBalanceFormatted || '0'} ${getPaymentTokenSymbol(paymentToken, paymentTokens) || 'token'} detected on the runtime wallet.`,
        timestamp: null,
        status: 'success',
      });
    }
    return items;
  }, [selectedDelegate, enabled, policyLocked, config, flowSessionNonce, sessionStatus, flowSession, deployedWalletAddress, tokenBalanceRaw, tokenBalanceFormatted, paymentToken, paymentTokens]);

  const hydrateForm = (nextConfig: AIM2MWalletConfig, nextOverview: AIM2MWalletOverview, nextDelegates: AIM2MDelegateRecord[], nextPendingInvites: AIM2MDelegateInvite[]) => {
    setConfig(nextConfig);
    setOverview(nextOverview);
    setDelegates(nextDelegates);
    setPendingInvites(nextPendingInvites);
    setEnabled(nextConfig.enabled);
    setSelectedDelegateId(nextConfig.selectedDelegateId);
    setPaymentToken(nextConfig.paymentToken || defaultPaymentToken);
    setAllowedActions(nextConfig.allowedActions.length ? nextConfig.allowedActions : ['buy']);
    setMaxPerOrder(nextConfig.maxPerOrder || '');
    setMaxTotal(nextConfig.maxTotal || '');
    setExpiryDays(String(nextConfig.expiryDays ?? 7));
    setCounterpartyText(nextConfig.counterpartyAllowlist.join('\n'));
    setNotes(nextConfig.notes || '');
  };

  useEffect(() => {
    if (policyLocked || deployInFlight) return;
    if (!sessionMaterialized && !walletMaterialized && selectedDelegateId) {
      setSelectedDelegateId(null);
    }
  }, [policyLocked, deployInFlight, sessionMaterialized, walletMaterialized, selectedDelegateId]);

  const handleToggleAction = (action: AIM2MAction, checked: boolean) => {
    if (policyLocked) return;
    setAllowedActions((prev) => normalizeActions(checked ? [...new Set([...prev, action])] : prev.filter((item) => item !== action)));
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!hasRemoteConfig || !walletAddress) {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          setRuntimeError(hasRemoteConfig ? '' : 'AI wallet settings are not available in this environment.');
        }
        return;
      }
      const cached = AIM2MWalletClient.peekConfig(walletAddress);
      if (cached && !cancelled) {
        hydrateForm(cached.config, cached.overview, cached.delegates, cached.pendingInvites);
        setRequiresSecurityCheck(false);
        setRuntimeError('');
        setLoading(false);
        setRefreshing(true);
      } else if (!cancelled) {
        setLoading(true);
      }
      const response = await AIM2MWalletClient.getConfig(walletAddress);
      if (cancelled) return;
      if (!response.ok) {
        if (response.error.code === 'wallet_session_required') {
          setRequiresSecurityCheck(true);
          setRuntimeError('');
        } else {
          setRequiresSecurityCheck(false);
          setRuntimeError(formatClientError(response.error, 'load'));
        }
      } else {
        setRequiresSecurityCheck(false);
        setRuntimeError('');
        hydrateForm(response.data.config, response.data.overview, response.data.delegates, response.data.pendingInvites);
      }
      setLoading(false);
      setRefreshing(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hasRemoteConfig, walletAddress, isAuthPending]);

  useEffect(() => {
    if (!deployWalletMutation.error) return;
    setPendingMirrorDelegateId(null);
    setRuntimeError(deployWalletMutation.error.message);
  }, [deployWalletMutation.error]);

  useEffect(() => {
    if (!revokeWalletMutation.error) return;
    setRuntimeError(revokeWalletMutation.error.message);
  }, [revokeWalletMutation.error]);

  useEffect(() => {
    if (!closeExpiredWalletMutation.error) return;
    setRuntimeError(closeExpiredWalletMutation.error.message);
  }, [closeExpiredWalletMutation.error]);

  useEffect(() => {
    if (!deployWalletMutation.isConfirmed || submittedSessionNonce === undefined || !predictedWalletAddress) return;
    setStatusMessage(`AI wallet ${submittedSessionNonce.toString()} is live. Add funds only if this setup needs buying power.`);
  }, [deployWalletMutation.isConfirmed, predictedWalletAddress, submittedSessionNonce]);

  useEffect(() => {
    if (!revokeWalletMutation.isConfirmed || !deployedWalletAddress) return;
    setStatusMessage('AI wallet ended. Any unused balance was returned to your main wallet.');
  }, [revokeWalletMutation.isConfirmed, deployedWalletAddress]);

  useEffect(() => {
    if (!closeExpiredWalletMutation.isConfirmed || !deployedWalletAddress) return;
    setStatusMessage('Expired AI wallet closed. Any unused balance was returned to your main wallet.');
  }, [closeExpiredWalletMutation.isConfirmed, deployedWalletAddress]);

  useEffect(() => {
    if (!onSnapshotChange || loading) return;
    onSnapshotChange({
      rootWalletAddress: walletAddress,
      chainId,
      networkKey,
      networkLabel,
      enabled,
      rootFallbackEnabled: overview?.rootFallbackEnabled ?? true,
      hasGeneratedDelegate,
      selectedDelegate: showManagedRuntime ? selectedDelegate : null,
      delegates,
      pendingInvites,
      paymentToken,
      paymentTokenSymbol: getPaymentTokenSymbol(paymentToken, paymentTokens),
      allowedActions: normalizedActions,
      maxPerOrder,
      maxTotal,
      expiryDays: Number(expiryDays || 0),
      configUpdatedAt: config?.updatedAt ?? null,
      predictedWalletAddress,
      deployedWalletAddress,
      walletBalanceRaw: tokenBalanceRaw !== undefined ? tokenBalanceRaw.toString() : null,
      walletBalanceFormatted: tokenBalanceFormatted,
      tokenDecimals: tokenDecimals ?? null,
      latestSessionNonce: flowSessionNonce !== undefined ? flowSessionNonce.toString() : null,
      sessionStatus,
      sessionExists: Boolean(flowSession?.exists),
      walletInitialized: walletState.initialized ?? null,
      walletIsActive: walletState.isActive ?? null,
      steps,
      activity,
    });
  }, [
    onSnapshotChange,
    loading,
    walletAddress,
    chainId,
    networkKey,
    networkLabel,
    enabled,
    overview,
    hasGeneratedDelegate,
    selectedDelegate,
    delegates,
    pendingInvites,
    paymentToken,
    normalizedActions,
    maxPerOrder,
    maxTotal,
    expiryDays,
    config,
    predictedWalletAddress,
    deployedWalletAddress,
    tokenBalanceRaw,
    tokenBalanceFormatted,
    tokenDecimals,
    flowSessionNonce,
    sessionStatus,
    flowSession,
    walletState.initialized,
    walletState.isActive,
    showManagedRuntime,
    steps,
    activity,
  ]);

  useEffect(() => {
    return () => onSnapshotChange?.(null);
  }, [onSnapshotChange]);

  const persistConfigMirror = async (delegateId: string): Promise<boolean> => {
    setSaving(true);
    const response = await AIM2MWalletClient.saveConfig({
      walletAddress,
      enabled,
      selectedDelegateId: delegateId,
      paymentToken: requiresFundingVault ? paymentToken : null,
      allowedActions: normalizedActions,
      maxPerOrder: maxPerOrder.trim(),
      maxTotal: maxTotal.trim(),
      expiryDays: Number(expiryDays),
      counterpartyAllowlist: normalizedAllowlist,
      notes: notes.trim(),
    });
    setSaving(false);

    if (!response.ok) {
      setRuntimeError(formatClientError(response.error, 'save'));
      return false;
    }

    hydrateForm(response.data.config, response.data.overview, response.data.delegates, response.data.pendingInvites);
    return true;
  };

  useEffect(() => {
    if (!deployWalletMutation.isConfirmed || !pendingMirrorDelegateId) return;
    let cancelled = false;

    const run = async () => {
      const synced = await persistConfigMirror(pendingMirrorDelegateId);
      if (cancelled) return;
      if (synced) {
        setPendingMirrorDelegateId(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [deployWalletMutation.isConfirmed, pendingMirrorDelegateId]);

  const ensureManagedDelegate = async (): Promise<AIM2MDelegateRecord | null> => {
    if (storedDelegate?.mode === 'generated' && storedDelegate.status === 'verified') {
      return storedDelegate;
    }

    setBusyAction('generate');
    const response = await AIM2MWalletClient.generateDelegate(walletAddress);
    setBusyAction(null);

    if (!response.ok) {
      setRuntimeError(formatClientError(response.error, 'generate'));
      return null;
    }

    const nextDelegates = response.data.delegates || [response.data.delegate];
    if (response.data.pendingInvites) {
      setPendingInvites(response.data.pendingInvites);
    }
    setDelegates(nextDelegates);
    setSelectedDelegateId(response.data.delegate.id);
    setStatusMessage('AI signer is ready for setup.');
    return response.data.delegate;
  };

  const handleCreateOnchainSession = async () => {
    if (policyLocked && !sessionReady) {
      setRuntimeError('This setup is locked. End the current AI wallet before starting a new one.');
      return;
    }
    if (!enabled) {
      setRuntimeError('Turn on AI wallet automation and finish setup before creating the wallet.');
      return;
    }
    if (!configReady) {
      setRuntimeError('Complete the required actions, token, limits, and duration before continuing.');
      return;
    }
    if (sessionPreview.nextSessionNonce === undefined || walletExpiry === undefined || !paymentTokenAddress) {
      setRuntimeError('The wallet preview is still loading. Try again in a moment.');
      return;
    }
    if (deployedWalletAddress) {
      setRuntimeError(`An AI wallet is already active for this setup: ${deployedWalletAddress}`);
      return;
    }
    if (normalizedAllowlist.length > 1) {
      setRuntimeError('You can add only one allowed wallet right now.');
      return;
    }

    try {
      setRuntimeError('');
      setStatusMessage('');

      const delegate = await ensureManagedDelegate();
      if (!delegate) {
        setSubmittedSessionNonce(undefined);
        return;
      }

      const decimals = tokenDecimals ?? 18;
      const parsedMaxPerOrder = requiresFundingVault ? parseUnits(maxPerOrder.trim(), decimals) : 0n;
      const parsedMaxTotal = requiresFundingVault ? parseUnits(maxTotal.trim(), decimals) : 0n;
      if (requiresFundingVault && (parsedMaxPerOrder <= 0n || parsedMaxTotal <= 0n)) {
        setRuntimeError('Buying access needs positive per-order and total limits.');
        return;
      }

      const counterpartyAllowlistHash = normalizedAllowlist.length === 1
        ? keccak256(encodeAbiParameters([{ type: 'address' }], [normalizedAllowlist[0] as Address]))
        : zeroHash;

      setSubmittedSessionNonce(sessionPreview.nextSessionNonce);
      setPendingMirrorDelegateId(delegate.id);
      const includesBuyPay = (actionMask & (1n << 1n)) !== 0n;
      const includesMint = (actionMask & (1n << 2n)) !== 0n;
      const includesSellerConfirm = (actionMask & (1n << 3n)) !== 0n;
      const requiresDeliveryTerm = (actionMask & ((1n << 0n) | (1n << 1n) | (1n << 3n))) !== 0n;
      await deployWalletMutation.deployWallet({
        root: walletAddress as Address,
        delegate: delegate.delegateAddress as Address,
        allowedToken: paymentTokenAddress,
        expiry: walletExpiry,
        actionMask,
        maxPerOrder: parsedMaxPerOrder,
        maxTotal: parsedMaxTotal,
        counterpartyAllowlistHash,
        maxAmount: includesMint ? 1_000n : 0n,
        minGrossPrice: includesSellerConfirm ? 1n : 0n,
        maxGrossPrice: includesBuyPay ? parsedMaxPerOrder : 0n,
        maxDeliverySeconds: requiresDeliveryTerm ? M2M_DEFAULT_MAX_DELIVERY_SECONDS : 0n,
      });
      setStatusMessage('Setup submitted. This creates your AI wallet and locks in the current rules in one step.');
    } catch (error) {
      setSubmittedSessionNonce(undefined);
      setPendingMirrorDelegateId(null);
      setRuntimeError(error instanceof Error ? error.message : 'Unable to create the AI wallet right now.');
    }
  };

  const handleDeployWallet = async () => {
    await handleCreateOnchainSession();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-semibold text-ui-muted uppercase tracking-widest flex items-center gap-3">
          <WalletCards className="text-[#2CC295]" size={18} />
          AI Wallet Automation
        </h3>
        <p className="text-sm text-ui-muted mt-2">
          Set up one protected AI wallet, create it from your main wallet, add funds only if needed, and end it after unused balance comes back home.
        </p>
      </div>

      {(loading || refreshing) ? (
        <StudioNoticePanel variant="neutral" title={loading ? 'Loading AI wallet settings' : 'Refreshing AI wallet settings'} compact>
          <div className="flex items-center gap-2">
            <StudioLoadingIndicator size={14} tone="muted" />
            <span>Loading your protected AI wallet settings and current status.</span>
          </div>
        </StudioNoticePanel>
      ) : null}

      {!m2mOnchainReady ? (
        <StudioNoticePanel variant="warning" title="AI wallet setup is not available in this environment yet">
          <div className="space-y-1">
            <p>Setup contract: {m2mContracts.DELEGATION_MANAGER ?? 'not configured'}</p>
            <p>Wallet factory: {m2mContracts.AI_WALLET_FACTORY_V2 ?? 'not configured'}</p>
          </div>
        </StudioNoticePanel>
      ) : null}

      {requiresSecurityCheck ? (
        <StudioNoticePanel variant="warning" title="Security Check Required">
          <div className="space-y-3">
            <p>
              AI wallet settings are protected. Confirm a one-time wallet signature before Orina can load or update this workspace.
            </p>
            <button
              type="button"
              onClick={() => {
                dispatchBridgeSecurityCheckRequest({
                  title: 'Unlock AI Wallet Settings',
                  description: 'AI wallet settings need a one-time wallet security check before Orina can load or update them.',
                  surfaceLabel: 'AI wallet settings',
                  confirmLabel: 'Unlock AI Wallet',
                  helpText: 'This signature unlocks protected AI wallet controls in Orina. No gas fee, transaction, or token approval is involved.',
                  successMessage: 'AI wallet settings unlocked.',
                  successDescription: 'Retry the AI wallet action to continue.',
                }, walletAddress);
              }}
              className="rounded-full bg-[#2CC295] px-4 py-2 text-sm font-semibold text-black"
            >
              Unlock AI Wallet
            </button>
          </div>
        </StudioNoticePanel>
      ) : null}

      {runtimeError ? <StudioNoticePanel variant="error" title="Runtime Error">{runtimeError}</StudioNoticePanel> : null}
      {statusMessage ? <StudioNoticePanel variant="info" title="AI Wallet Update">{statusMessage}</StudioNoticePanel> : null}
      {policyLocked ? (
        <StudioNoticePanel variant="success" title="Setup Locked">
          This AI wallet setup stays fixed after it goes live. The rules remain locked until the setup ends and unused balance returns to your main wallet.
        </StudioNoticePanel>
      ) : null}
      {cycleCanRestart ? (
        <StudioNoticePanel variant="info" title="Ready To Start Again">
          The previous AI wallet has ended and unused balance is back on your main wallet. You can start a new setup now.
        </StudioNoticePanel>
      ) : null}

      <div className="bg-[var(--t-surface-2)] rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-ui-primary font-semibold">Enable AI wallet automation</h4>
              {enabled ? <span className="text-xs bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 px-2 py-0.5 rounded uppercase font-semibold">Active</span> : null}
            </div>
            <p className="text-sm text-ui-muted mt-1">Let AI use a protected wallet flow while your main wallet stays in control.</p>
          </div>
          <button
            onClick={() => {
              if (policyLocked || loading || refreshing) return;
              setEnabled((value) => !value);
            }}
            disabled={policyLocked || loading || refreshing}
            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-[#2CC295]' : 'bg-ui-border'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[1.125rem]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {showConfigurePanels ? (
        <div className="space-y-4">
          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-5">
            <div>
              <h4 className="text-ui-primary font-semibold">Set Rules</h4>
              <p className="text-sm text-ui-muted mt-1">Choose the rules for this setup. Your AI wallet is created and locked in when you deploy it.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Payment Token</label>
                <CustomDropdown
                  variant="compact"
                  options={Object.entries(paymentTokens)
                    .filter(([, address]) => address !== '0x0000000000000000000000000000000000000000')
                    .map(([symbol, address]) => ({ value: address, label: `${symbol} · ${address}` }))}
                  defaultValue={paymentToken}
                  onChange={(val) => setPaymentToken(val)}
                  triggerClassName={policyLocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Cycle Duration</label>
                <CustomDropdown
                  variant="compact"
                  options={[
                    ...(![0, 1, 7, 30].includes(Number(expiryDays)) ? [{ value: String(expiryDays), label: formatExpiryDaysLabel(expiryDays) }] : []),
                    { value: "0", label: "No expiry" },
                    { value: "1", label: "1 day" },
                    { value: "7", label: "7 days" },
                    { value: "30", label: "30 days" }
                  ]}
                  defaultValue={expiryDays}
                  onChange={(val) => setExpiryDays(val)}
                  triggerClassName={policyLocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Allowed Actions</label>
              <div className="space-y-2">
                {ACTION_ORDER.map((action) => {
                  const checked = normalizedActions.includes(action);
                  return (
                    <label key={action} className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer ${checked ? 'bg-[#2CC295]/10' : 'bg-[var(--t-surface-5)] hover:bg-[var(--t-surface-10)]'}`}>
                      <Checkbox checked={checked} onCheckedChange={(value) => handleToggleAction(action, value === true)} disabled={policyLocked} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-ui-primary capitalize">{action.replace('_', ' ')}</div>
                        <div className="text-xs text-ui-muted mt-0.5">{M2M_ACTION_DESCRIPTIONS[action]}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Max Per Order</label><input type="text" value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} placeholder={requiresFundingVault ? '1000' : 'Not used for current scope'} disabled={policyLocked || !requiresFundingVault} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Max Total</label><input type="text" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} placeholder={requiresFundingVault ? '5000' : 'Not used for current scope'} disabled={policyLocked || !requiresFundingVault} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-ui-muted uppercase mb-2">Allowed Wallet</label><textarea rows={3} value={counterpartyText} onChange={(e) => setCounterpartyText(e.target.value)} placeholder="Add one wallet address per line" disabled={policyLocked} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm resize-none disabled:opacity-60 disabled:cursor-not-allowed" /></div>
            <div className="rounded-lg border border-[#2CC295]/20 bg-[#2CC295]/5 px-4 py-3 text-xs text-ui-muted">
              There is no separate save step. Your current rules are locked in when you create the AI wallet.
            </div>
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-semibold">Create AI Wallet</h4>
              <p className="text-sm text-ui-muted mt-1">Create the wallet and lock in the current rules in one action from your main wallet.</p>
            </div>
            <div className="rounded-lg bg-[var(--t-surface-5)] px-4 py-4 text-sm text-ui-muted space-y-2">
              <p>Next setup number: {sessionPreview.nextSessionNonce !== undefined ? sessionPreview.nextSessionNonce.toString() : 'n/a'}</p>
              <p>Allowed actions: {actionSummary}</p>
              <p>Duration: {formatExpiryDaysLabel(expiryDays)}</p>
              <p>Wallet: {cycleWalletAddress || 'n/a'}</p>
            </div>
            <button onClick={handleDeployWallet} disabled={!configReady || !m2mOnchainReady || saving || busyAction !== null || deployWalletMutation.isPending || deployWalletMutation.isConfirming || Boolean(deployedWalletAddress)} className="w-full px-4 py-2.5 rounded-full bg-[#2CC295] text-black text-sm font-semibold disabled:opacity-50">
              {busyAction === 'generate' || saving ? 'Preparing...' : deployWalletMutation.isPending || deployWalletMutation.isConfirming ? 'Creating...' : deployedWalletAddress ? 'AI Wallet Ready' : 'Create AI Wallet'}
            </button>
            {(deployWalletMutation.hash || flowSessionNonce !== undefined || cycleWalletAddress) ? <div className="text-xs text-ui-muted space-y-1">{flowSessionNonce !== undefined ? <p>Setup number: {flowSessionNonce.toString()} · Status: {sessionStatus}</p> : null}{cycleWalletAddress ? <p>Wallet: {cycleWalletAddress}</p> : null}{deployWalletMutation.hash ? <p>Transaction: {formatHash(deployWalletMutation.hash)}</p> : null}</div> : null}
          </div>
        </div>
      ) : null}

      {showLifecyclePanels ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-semibold">End Or Reset</h4>
              <p className="text-sm text-ui-muted mt-1">You can end this setup after unused balance returns to your main wallet.</p>
            </div>
            <div className="rounded-lg bg-[var(--t-surface-5)] px-4 py-4 text-sm text-ui-muted space-y-2">
              <p>Wallet: {cycleWalletAddress || 'n/a'}</p>
              <p>Status: {runtimeStatusLabel}</p>
              <p>Unused balance: {tokenBalanceFormatted || '0'} {getPaymentTokenSymbol(paymentToken, paymentTokens) || ''}</p>
              <p>Ends: {walletExpiry === NO_EXPIRY_UINT64 ? 'No expiry' : walletExpiry !== undefined ? new Date(Number(walletExpiry) * 1000).toLocaleString() : 'n/a'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={async () => { try { setRuntimeError(''); setStatusMessage(''); await revokeWalletMutation.revokeWallet(); } catch (error) { setRuntimeError(error instanceof Error ? error.message : 'Unable to revoke the AI wallet cycle.'); } }} disabled={!deployedWalletAddress || sessionStatus !== 'active' || revokeWalletMutation.isPending || revokeWalletMutation.isConfirming} className="w-full px-4 py-2.5 rounded-full bg-[var(--t-warning-orange-solid)] text-black text-sm font-semibold disabled:opacity-50">
                {revokeWalletMutation.isPending || revokeWalletMutation.isConfirming ? 'Ending...' : 'End And Return Balance'}
              </button>
              <button onClick={async () => { try { setRuntimeError(''); setStatusMessage(''); await closeExpiredWalletMutation.closeExpiredWallet(); } catch (error) { setRuntimeError(error instanceof Error ? error.message : 'Unable to close the expired AI wallet cycle.'); } }} disabled={!deployedWalletAddress || sessionStatus !== 'expired' || walletState.closed === true || closeExpiredWalletMutation.isPending || closeExpiredWalletMutation.isConfirming} className="w-full px-4 py-2.5 rounded-full border border-ui-border-subtle text-ui-primary text-sm font-semibold disabled:opacity-50">
                {closeExpiredWalletMutation.isPending || closeExpiredWalletMutation.isConfirming ? 'Closing...' : 'Close Expired Wallet'}
              </button>
            </div>
            {(revokeWalletMutation.hash || closeExpiredWalletMutation.hash || deployedWalletAddress) ? <div className="text-xs text-ui-muted space-y-1">{deployedWalletAddress ? <p>Wallet: {deployedWalletAddress}</p> : null}{revokeWalletMutation.hash ? <p>End transaction: {formatHash(revokeWalletMutation.hash)}</p> : null}{closeExpiredWalletMutation.hash ? <p>Close transaction: {formatHash(closeExpiredWalletMutation.hash)}</p> : null}</div> : null}
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-semibold">Optional Funding</h4>
              <p className="text-sm text-ui-muted mt-1">Send funds only if this setup needs buying power. Minting and signing can work without a balance.</p>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-semibold uppercase tracking-widest text-ui-muted mb-2">Send Funds To</div><div className="flex items-start gap-1"><div className="min-w-0 flex-1 break-all text-sm text-ui-primary">{runtimeWalletAddress || 'Finish setup to see the wallet address'}</div><CopyAddressButton address={runtimeWalletAddress} className="-mr-1 -mt-1" /></div></div>
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-semibold uppercase tracking-widest text-ui-muted mb-2">Current Balance</div><div className="text-lg font-semibold text-ui-primary">{tokenBalanceFormatted || '0'} {getPaymentTokenSymbol(paymentToken, paymentTokens) || ''}</div></div>
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-semibold uppercase tracking-widest text-ui-muted mb-2">Status</div><div className="text-sm text-ui-primary">{runtimeStatusLabel}</div></div>
            </div>
          </div>
        </div>
      ) : null}

      <StudioNoticePanel variant="neutral" title="Important Rules">
        <ul className="space-y-1">
          {M2M_PROTOCOL_GUARDRAILS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </StudioNoticePanel>
    </div>
  );
}
