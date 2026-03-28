import { useEffect, useMemo, useState } from 'react';
import { encodeAbiParameters, formatUnits, keccak256, parseUnits, zeroHash, type Address } from 'viem';
import { useReadContract } from 'wagmi';
import { WalletCards } from 'lucide-react';
import { Checkbox } from '@/app/components/ui/checkbox';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import { StudioNoticePanel } from '@/app/components/ui/studio-notice-panel';
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
import { CONTRACTS, PAYMENT_TOKENS } from '@/config/contracts';
import {
  M2M_ACTION_DESCRIPTIONS,
  M2M_CONTRACTS,
  M2M_DEFAULT_PAYMENT_TOKEN,
  M2M_PROTOCOL_GUARDRAILS,
} from '@/config/m2m';
import {
  useAIM2MWalletOfSession,
  useAIM2MWalletState,
  useCloseExpiredAIM2MWallet,
  useDelegationSession,
  useDelegationSessionPreview,
  useDelegationSessionStatus,
  useDeployAIM2MWallet,
  useM2MReadiness,
  usePredictAIM2MWallet,
  useRevokeAIM2MWallet,
} from '@/hooks/useAIM2M';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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

function getPaymentTokenSymbol(address: string | null | undefined): string | null {
  const entry = Object.entries(PAYMENT_TOKENS).find(([, token]) => sameAddress(token, address));
  return entry?.[0] ?? null;
}

function formatClientError(error: AIM2MClientError, context: 'load' | 'save' | 'generate' | 'invite' | 'accept'): string {
  const prefix = {
    load: 'Unable to load delegated AI wallet settings.',
    save: 'Unable to save delegated AI wallet settings.',
    generate: 'Unable to generate a managed delegate.',
    invite: 'Unable to create a delegate enroll code.',
    accept: 'Unable to accept the delegate enroll code.',
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
      description: 'Choose scope, token, limits, and cycle duration. The managed AI signer is provisioned automatically during deploy.',
      status: configured ? 'complete' : current === 'configure' ? 'current' : 'locked',
    },
    {
      label: 'Deploy AI wallet',
      description: 'Root deploy transaction creates the cycle and wallet together in one immutable step.',
      status: walletReady ? 'complete' : current === 'deploy_ai_wallet' ? 'current' : 'locked',
    },
    {
      id: 'prefund_activate',
      label: 'Optional Fund',
      description: requiresFunding ? 'Optional after deployment. Only fund the wallet when the cycle needs buy-side token spending.' : 'Optional. Seller-side signing and minting flows can stay unfunded.',
      status: walletReady ? 'complete' : 'locked',
    },
    {
      id: 'revoke_close',
      label: 'Revoke / Close',
      description: 'Root can revoke or close the cycle only after idle funds sweep back to the root wallet.',
      status: cycleCanRestart ? 'complete' : walletReady ? 'current' : 'locked',
    },
  ];
}

export function AIM2MWalletSettings({ walletAddress, onSnapshotChange }: AIM2MWalletSettingsProps) {
  const [config, setConfig] = useState<AIM2MWalletConfig | null>(null);
  const [overview, setOverview] = useState<AIM2MWalletOverview | null>(null);
  const [delegates, setDelegates] = useState<AIM2MDelegateRecord[]>([]);
  const [pendingInvites, setPendingInvites] = useState<AIM2MDelegateInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<'generate' | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [selectedDelegateId, setSelectedDelegateId] = useState<string | null>(null);
  const [paymentToken, setPaymentToken] = useState<string>(M2M_DEFAULT_PAYMENT_TOKEN);
  const [allowedActions, setAllowedActions] = useState<AIM2MAction[]>(['buy']);
  const [maxPerOrder, setMaxPerOrder] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [counterpartyText, setCounterpartyText] = useState('');
  const [notes, setNotes] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submittedSessionNonce, setSubmittedSessionNonce] = useState<bigint | undefined>(undefined);
  const [pendingMirrorDelegateId, setPendingMirrorDelegateId] = useState<string | null>(null);
  const hasRemoteConfig = useMemo(() => Boolean(projectId && publicAnonKey), []);
  const m2mReadiness = useM2MReadiness();
  const normalizedActions = useMemo(() => normalizeActions(allowedActions), [allowedActions]);
  const normalizedAllowlist = useMemo(() => normalizeLineList(counterpartyText), [counterpartyText]);
  const requiresFundingVault = normalizedActions.includes('buy');
  const actionMask = useMemo(() => buildActionMask(normalizedActions), [normalizedActions]);
  const paymentTokenAddress = isAddressLike(paymentToken) ? paymentToken : undefined;
  const storedDelegate = useMemo(
    () => delegates.find((item) => item.id === selectedDelegateId) || null,
    [delegates, selectedDelegateId],
  );
  const sessionPreview = useDelegationSessionPreview(walletAddress as Address | undefined);
  const activeSessionNonce = sessionPreview.hasActiveCycle ? sessionPreview.activeSessionNonce : undefined;
  const activeSessionRead = useDelegationSession(walletAddress as Address | undefined, activeSessionNonce);
  const activeSessionStatusRead = useDelegationSessionStatus(walletAddress as Address | undefined, activeSessionNonce);
  const activeSession = activeSessionRead.data as DelegationSessionView | undefined;
  const flowSessionNonce = activeSessionNonce ?? submittedSessionNonce;
  const flowSession = activeSessionNonce !== undefined ? activeSession : undefined;
  const predictedExpiry = useMemo(() => {
    const days = Number(expiryDays || 0);
    if (!Number.isFinite(days) || days <= 0) return undefined;
    return BigInt(Math.floor(Date.now() / 1000) + days * 24 * 60 * 60);
  }, [expiryDays]);
  const walletExpiry = flowSession?.validUntil ?? predictedExpiry;
  const predictedWallet = usePredictAIM2MWallet({
    root: walletAddress as Address | undefined,
    sessionNonce: flowSessionNonce ?? sessionPreview.nextSessionNonce,
  });
  const predictedWalletAddress = normalizeContractAddress(predictedWallet.data);
  const walletOfSession = useAIM2MWalletOfSession(walletAddress as Address | undefined, flowSessionNonce);
  const deployedWalletAddress = normalizeContractAddress(walletOfSession.data);
  const runtimeWalletAddress = deployedWalletAddress ?? predictedWalletAddress;
  const walletState = useAIM2MWalletState(deployedWalletAddress ?? undefined);
  const tokenDecimalsRead = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: Boolean(paymentTokenAddress) },
  });
  const tokenBalanceRead = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: runtimeWalletAddress ? [runtimeWalletAddress] : undefined,
    query: { enabled: Boolean(paymentTokenAddress && runtimeWalletAddress) },
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
    if (!Number.isInteger(expiry) || expiry < 1 || expiry > 30) return false;
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
      label: 'Managed signer',
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
    if (walletState.initialized && !walletState.isActive) return 'Expired / awaiting closeout';
    if (deployWalletMutation.isPending || deployWalletMutation.isConfirming) return 'Deploying';
    if (sessionStatus === 'active') return 'Awaiting wallet materialization';
    if (sessionStatus === 'revoked') return 'Revoked';
    if (cycleCanRestart) return 'Ready for renewal';
    return requiresFundingVault ? 'Awaiting deploy / optional fund' : 'Awaiting deploy';
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
        label: 'Managed AI signer ready',
        detail: `${selectedDelegate.label || 'Managed delegate'} · ${selectedDelegate.delegateAddress}`,
        timestamp: selectedDelegate.verifiedAt,
        status: 'success',
      });
    } else if (enabled && !policyLocked) {
      items.push({
        id: 'delegate-pending',
        label: 'Managed AI signer pending',
        detail: 'The managed signer will be provisioned automatically inside the deploy flow.',
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
        label: 'On-chain session',
        detail: `Nonce ${flowSessionNonce.toString()} · status ${sessionStatus}`,
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
        detail: `${tokenBalanceFormatted || '0'} ${getPaymentTokenSymbol(paymentToken) || 'token'} detected on the runtime wallet.`,
        timestamp: null,
        status: 'success',
      });
    }
    return items;
  }, [selectedDelegate, enabled, policyLocked, config, flowSessionNonce, sessionStatus, flowSession, deployedWalletAddress, tokenBalanceRaw, tokenBalanceFormatted, paymentToken]);

  const hydrateForm = (nextConfig: AIM2MWalletConfig, nextOverview: AIM2MWalletOverview, nextDelegates: AIM2MDelegateRecord[], nextPendingInvites: AIM2MDelegateInvite[]) => {
    setConfig(nextConfig);
    setOverview(nextOverview);
    setDelegates(nextDelegates);
    setPendingInvites(nextPendingInvites);
    setEnabled(nextConfig.enabled);
    setSelectedDelegateId(nextConfig.selectedDelegateId);
    setPaymentToken(nextConfig.paymentToken || M2M_DEFAULT_PAYMENT_TOKEN);
    setAllowedActions(nextConfig.allowedActions.length ? nextConfig.allowedActions : ['buy']);
    setMaxPerOrder(nextConfig.maxPerOrder || '');
    setMaxTotal(nextConfig.maxTotal || '');
    setExpiryDays(String(nextConfig.expiryDays || 7));
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
          setRuntimeError(hasRemoteConfig ? '' : 'AI M2M settings service is not configured in this environment.');
        }
        return;
      }
      const response = await AIM2MWalletClient.getConfig(walletAddress);
      if (cancelled) return;
      if (!response.ok) {
        setRuntimeError(formatClientError(response.error, 'load'));
      } else {
        setRuntimeError('');
        hydrateForm(response.data.config, response.data.overview, response.data.delegates, response.data.pendingInvites);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hasRemoteConfig, walletAddress]);

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
    setStatusMessage(`AI wallet cycle ${submittedSessionNonce.toString()} is active at ${predictedWalletAddress}. Funding stays optional unless buy-side spending is required.`);
  }, [deployWalletMutation.isConfirmed, predictedWalletAddress, submittedSessionNonce]);

  useEffect(() => {
    if (!revokeWalletMutation.isConfirmed || !deployedWalletAddress) return;
    setStatusMessage(`Cycle revoked. Idle funds from ${deployedWalletAddress} were swept to the root wallet before closeout.`);
  }, [revokeWalletMutation.isConfirmed, deployedWalletAddress]);

  useEffect(() => {
    if (!closeExpiredWalletMutation.isConfirmed || !deployedWalletAddress) return;
    setStatusMessage(`Expired cycle closed. Idle funds from ${deployedWalletAddress} were swept back to the root wallet.`);
  }, [closeExpiredWalletMutation.isConfirmed, deployedWalletAddress]);

  useEffect(() => {
    if (!onSnapshotChange || loading) return;
    onSnapshotChange({
      rootWalletAddress: walletAddress,
      enabled,
      rootFallbackEnabled: overview?.rootFallbackEnabled ?? true,
      hasGeneratedDelegate,
      selectedDelegate: showManagedRuntime ? selectedDelegate : null,
      delegates,
      pendingInvites,
      paymentToken,
      paymentTokenSymbol: getPaymentTokenSymbol(paymentToken),
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
    setStatusMessage(`Managed AI signer ${response.data.delegate.delegateAddress} is ready for the next deploy.`);
    return response.data.delegate;
  };

  const handleCreateOnchainSession = async () => {
    if (policyLocked && !sessionReady) {
      setRuntimeError('The current cycle is locked. Revoke or close the active cycle before deploying a new AI wallet.');
      return;
    }
    if (!enabled) {
      setRuntimeError('Enable delegated AI wallet and complete the configuration before deploying.');
      return;
    }
    if (!configReady) {
      setRuntimeError('Complete the required scope, token, cap, and duration fields before deploying the AI wallet cycle.');
      return;
    }
    if (sessionPreview.nextSessionNonce === undefined || walletExpiry === undefined || !paymentTokenAddress) {
      setRuntimeError('Deployment preview is not ready yet. Retry in a moment.');
      return;
    }
    if (deployedWalletAddress) {
      setRuntimeError(`An AI wallet already exists for session nonce ${flowSessionNonce?.toString() || sessionPreview.nextSessionNonce.toString()}: ${deployedWalletAddress}`);
      return;
    }
    if (normalizedAllowlist.length > 1) {
      setRuntimeError('On-chain v1 only supports zero or one counterparty allowlist entry.');
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
        setRuntimeError('Buy-enabled cycles require positive Max Per Order and Max Total.');
        return;
      }

      const counterpartyAllowlistHash = normalizedAllowlist.length === 1
        ? keccak256(encodeAbiParameters([{ type: 'address' }], [normalizedAllowlist[0] as Address]))
        : zeroHash;

      setSubmittedSessionNonce(sessionPreview.nextSessionNonce);
      setPendingMirrorDelegateId(delegate.id);
      await deployWalletMutation.deployWallet({
        root: walletAddress as Address,
        delegate: delegate.delegateAddress as Address,
        allowedToken: paymentTokenAddress,
        expiry: walletExpiry,
        actionMask,
        maxPerOrder: parsedMaxPerOrder,
        maxTotal: parsedMaxTotal,
        counterpartyAllowlistHash,
      });
      setStatusMessage(`Deploy transaction submitted for AI wallet cycle ${sessionPreview.nextSessionNonce.toString()}. This transaction provisions the managed signer, commits the immutable policy, and deploys the wallet in one step.`);
    } catch (error) {
      setSubmittedSessionNonce(undefined);
      setPendingMirrorDelegateId(null);
      setRuntimeError(error instanceof Error ? error.message : 'Unable to deploy the AI wallet cycle.');
    }
  };

  const handleDeployWallet = async () => {
    await handleCreateOnchainSession();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2CC295]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[10px] font-bold text-ui-muted uppercase tracking-widest flex items-center gap-3">
          <WalletCards className="text-[#2CC295]" size={18} />
          AI Wallet M2M
        </h3>
        <p className="text-sm text-ui-muted mt-2">
          Configure one immutable AI wallet cycle, deploy it from the root wallet, optionally prefund it for buy-side spending, and close it only after idle funds sweep back home.
        </p>
      </div>

      {!m2mReadiness.foundationReady ? (
        <StudioNoticePanel variant="warning" title="On-chain M2M deployment is not configured in this environment">
          <div className="space-y-1">
            <p>`DelegationManager`: {M2M_CONTRACTS.DELEGATION_MANAGER ?? 'not configured'}</p>
            <p>`AIWalletFactoryV2`: {M2M_CONTRACTS.AI_WALLET_FACTORY_V2 ?? 'not configured'}</p>
          </div>
        </StudioNoticePanel>
      ) : null}

      {runtimeError ? <StudioNoticePanel variant="error" title="Runtime Error">{runtimeError}</StudioNoticePanel> : null}
      {statusMessage ? <StudioNoticePanel variant="info" title="M2M Status">{statusMessage}</StudioNoticePanel> : null}
      {policyLocked ? (
        <StudioNoticePanel variant="warning" title="Cycle Locked">
          This AI wallet cycle is immutable after deployment. Scope, limits, duration, and the managed AI signer stay locked until root closeout sweeps idle funds back to the root wallet.
        </StudioNoticePanel>
      ) : null}
      {cycleCanRestart ? (
        <StudioNoticePanel variant="info" title="Cycle Ready For Renewal">
          The previous delegate cycle has ended and idle funds are back on the root wallet. You can start a new AI wallet cycle now.
        </StudioNoticePanel>
      ) : null}

      <div className="bg-[var(--t-surface-2)] rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-ui-primary font-bold">Enable delegated AI wallet</h4>
              {enabled ? <span className="text-xs bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 px-2 py-0.5 rounded uppercase font-bold">Active</span> : null}
            </div>
            <p className="text-sm text-ui-muted mt-1">Direct delegate transactions, forced redeploy on expiry, and root fallback preserved.</p>
          </div>
          <button
            onClick={() => {
              if (policyLocked) return;
              setEnabled((value) => !value);
            }}
            disabled={policyLocked}
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
              <h4 className="text-ui-primary font-bold">Configure</h4>
              <p className="text-sm text-ui-muted mt-1">Choose the immutable cycle policy. Deploy commits it on-chain and provisions the internal AI signer automatically in one root transaction.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ui-muted uppercase mb-2">Payment Token</label>
                <CustomDropdown
                  variant="compact"
                  options={Object.entries(PAYMENT_TOKENS).map(([symbol, address]) => ({ value: address, label: `${symbol} · ${address}` }))}
                  defaultValue={paymentToken}
                  onChange={(val) => setPaymentToken(val)}
                  triggerClassName={policyLocked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ui-muted uppercase mb-2">Cycle Duration</label>
                <CustomDropdown
                  variant="compact"
                  options={[
                    ...(![1, 7, 30].includes(Number(expiryDays)) ? [{ value: String(expiryDays), label: `${expiryDays} days` }] : []),
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
              <label className="block text-xs font-bold text-ui-muted uppercase mb-2">Delegated Action Scope</label>
              <div className="space-y-2">
                {ACTION_ORDER.map((action) => {
                  const checked = normalizedActions.includes(action);
                  return (
                    <label key={action} className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer ${checked ? 'bg-[#2CC295]/10' : 'bg-[var(--t-surface-5)] hover:bg-[var(--t-surface-10)]'}`}>
                      <Checkbox checked={checked} onCheckedChange={(value) => handleToggleAction(action, value === true)} disabled={policyLocked} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-ui-primary capitalize">{action.replace('_', ' ')}</div>
                        <div className="text-xs text-ui-muted mt-0.5">{M2M_ACTION_DESCRIPTIONS[action]}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-ui-muted uppercase mb-2">Max Per Order</label><input type="text" value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} placeholder={requiresFundingVault ? '1000' : 'Not used for current scope'} disabled={policyLocked || !requiresFundingVault} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-xs font-bold text-ui-muted uppercase mb-2">Max Total</label><input type="text" value={maxTotal} onChange={(e) => setMaxTotal(e.target.value)} placeholder={requiresFundingVault ? '5000' : 'Not used for current scope'} disabled={policyLocked || !requiresFundingVault} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed" /></div>
            </div>
            <div><label className="block text-xs font-bold text-ui-muted uppercase mb-2">Counterparty Allowlist</label><textarea rows={3} value={counterpartyText} onChange={(e) => setCounterpartyText(e.target.value)} placeholder="One wallet address per line" disabled={policyLocked} className="w-full bg-[var(--t-surface-5)] rounded-lg px-4 py-2.5 text-ui-primary text-sm resize-none disabled:opacity-60 disabled:cursor-not-allowed" /></div>
            <div className="rounded-lg border border-[#2CC295]/20 bg-[#2CC295]/5 px-4 py-3 text-xs text-ui-muted">
              There is no separate Save Policy step. The enforceable policy is committed on-chain only when the root wallet deploys the AI wallet cycle.
            </div>
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-bold">Deploy AI Wallet</h4>
              <p className="text-sm text-ui-muted mt-1">One root transaction provisions the internal AI signer, commits the immutable policy, and deploys the deterministic AI wallet in the same step.</p>
            </div>
            <div className="rounded-lg bg-[var(--t-surface-5)] px-4 py-4 text-sm text-ui-muted space-y-2">
              <p>Next cycle nonce: {sessionPreview.nextSessionNonce !== undefined ? sessionPreview.nextSessionNonce.toString() : 'n/a'}</p>
              <p>Delegated scope: {actionSummary}</p>
              <p>Duration: {expiryDays} day{Number(expiryDays) === 1 ? '' : 's'}</p>
              <p>AI wallet: {cycleWalletAddress || 'n/a'}</p>
            </div>
            <button onClick={handleDeployWallet} disabled={!configReady || !m2mReadiness.foundationReady || saving || busyAction !== null || deployWalletMutation.isPending || deployWalletMutation.isConfirming || Boolean(deployedWalletAddress)} className="w-full px-4 py-2.5 rounded-full bg-[#2CC295] text-black text-sm font-bold disabled:opacity-50">
              {busyAction === 'generate' || saving ? 'Preparing...' : deployWalletMutation.isPending || deployWalletMutation.isConfirming ? 'Deploying...' : deployedWalletAddress ? 'Wallet Deployed' : 'Deploy AI Wallet'}
            </button>
            {(deployWalletMutation.hash || flowSessionNonce !== undefined || cycleWalletAddress) ? <div className="text-xs text-ui-muted space-y-1">{flowSessionNonce !== undefined ? <p>Cycle nonce: {flowSessionNonce.toString()} · Status: {sessionStatus}</p> : null}{cycleWalletAddress ? <p>Wallet: {cycleWalletAddress}</p> : null}{deployWalletMutation.hash ? <p>Tx: {formatHash(deployWalletMutation.hash)}</p> : null}</div> : null}
          </div>
        </div>
      ) : null}

      {showLifecyclePanels ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-bold">Revoke / Close</h4>
              <p className="text-sm text-ui-muted mt-1">Root can end the cycle only by sweeping idle funds first, then revoking or closing the expired wallet.</p>
            </div>
            <div className="rounded-lg bg-[var(--t-surface-5)] px-4 py-4 text-sm text-ui-muted space-y-2">
              <p>AI wallet: {cycleWalletAddress || 'n/a'}</p>
              <p>Cycle status: {runtimeStatusLabel}</p>
              <p>Idle balance: {tokenBalanceFormatted || '0'} {getPaymentTokenSymbol(paymentToken) || ''}</p>
              <p>Wallet expiry: {walletExpiry !== undefined ? new Date(Number(walletExpiry) * 1000).toLocaleString() : 'n/a'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={async () => { try { setRuntimeError(''); setStatusMessage(''); await revokeWalletMutation.revokeWallet(); } catch (error) { setRuntimeError(error instanceof Error ? error.message : 'Unable to revoke the AI wallet cycle.'); } }} disabled={!deployedWalletAddress || sessionStatus !== 'active' || revokeWalletMutation.isPending || revokeWalletMutation.isConfirming} className="w-full px-4 py-2.5 rounded-full bg-[#F5B942] text-black text-sm font-bold disabled:opacity-50">
                {revokeWalletMutation.isPending || revokeWalletMutation.isConfirming ? 'Revoking...' : 'Revoke + Sweep'}
              </button>
              <button onClick={async () => { try { setRuntimeError(''); setStatusMessage(''); await closeExpiredWalletMutation.closeExpiredWallet(); } catch (error) { setRuntimeError(error instanceof Error ? error.message : 'Unable to close the expired AI wallet cycle.'); } }} disabled={!deployedWalletAddress || sessionStatus !== 'expired' || walletState.closed === true || closeExpiredWalletMutation.isPending || closeExpiredWalletMutation.isConfirming} className="w-full px-4 py-2.5 rounded-full border border-ui-border-subtle text-ui-primary text-sm font-bold disabled:opacity-50">
                {closeExpiredWalletMutation.isPending || closeExpiredWalletMutation.isConfirming ? 'Closing...' : 'Close Expired Cycle'}
              </button>
            </div>
            {(revokeWalletMutation.hash || closeExpiredWalletMutation.hash || deployedWalletAddress) ? <div className="text-xs text-ui-muted space-y-1">{deployedWalletAddress ? <p>Wallet runtime: {deployedWalletAddress}</p> : null}{revokeWalletMutation.hash ? <p>Revoke tx: {formatHash(revokeWalletMutation.hash)}</p> : null}{closeExpiredWalletMutation.hash ? <p>Close tx: {formatHash(closeExpiredWalletMutation.hash)}</p> : null}</div> : null}
          </div>

          <div className="bg-[var(--t-surface-2)] rounded-xl p-5 space-y-4">
            <div>
              <h4 className="text-ui-primary font-bold">Optional Fund</h4>
              <p className="text-sm text-ui-muted mt-1">Optional after deployment. Send tokens only when this cycle needs buy-side spending. Setup is already complete once the wallet is deployed.</p>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Fund Address</div><div className="text-sm text-ui-primary break-all">{runtimeWalletAddress || 'Configure the cycle to derive the deterministic wallet'}</div></div>
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Vault Balance</div><div className="text-lg font-bold text-ui-primary">{tokenBalanceFormatted || '0'} {getPaymentTokenSymbol(paymentToken) || ''}</div></div>
                <div className="rounded-lg border border-ui-border-subtle bg-[var(--t-surface-5)] px-4 py-4"><div className="text-xs font-bold uppercase tracking-widest text-ui-muted mb-2">Runtime</div><div className="text-sm text-ui-primary">{runtimeStatusLabel}</div></div>
            </div>
          </div>
        </div>
      ) : null}

      <StudioNoticePanel variant="neutral" title="Protocol Guardrails">
        <ul className="space-y-1">
          {M2M_PROTOCOL_GUARDRAILS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </StudioNoticePanel>
    </div>
  );
}
