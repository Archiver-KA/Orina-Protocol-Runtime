import { useMemo } from 'react';
import { encodeAbiParameters, encodeFunctionData, keccak256, type Address, type Hex } from 'viem';
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { AssetType } from '@/config/contracts';
import { M2M_CONTRACTS, getM2MContracts } from '@/config/m2m';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { LIVE_PROTOCOL_CHAIN_ID, LIVE_PROTOCOL_CONTRACTS, getProtocolContracts } from '@/utils/protocolNetwork';
import {
  MARKETPLACE_ABI,
  AI_WALLET_FACTORY_V2_ABI,
  AI_WALLET_V2_ABI,
  DELEGATION_MANAGER_ABI,
  MARKETPLACE_M2M_ABI,
  PAYMENT_GATEWAY_M2M_ABI,
} from '@/config/abis';

export interface DeployAIM2MWalletInput {
  root: Address;
  delegate: Address;
  allowedToken: Address;
  expiry: bigint;
  actionMask: bigint;
  maxPerOrder: bigint;
  maxTotal: bigint;
  counterpartyAllowlistHash: Hex;
  restrictAssetId?: boolean;
  assetId?: bigint;
  maxAmount?: bigint;
  minGrossPrice?: bigint;
  maxGrossPrice?: bigint;
  maxDeliverySeconds?: bigint;
}

export interface PreparedContractCall {
  to: Address;
  data: Hex;
  value: bigint;
}

const LIVE_M2M_REFETCH_MS = 4000;
const DEFAULT_LIVE_PROTOCOL_CHAIN_ID = LIVE_PROTOCOL_CHAIN_ID;
const DEFAULT_LIVE_MARKETPLACE_ADDRESS = LIVE_PROTOCOL_CONTRACTS.MARKETPLACE_ATP;
const DEFAULT_LIVE_PAYMENT_GATEWAY_ADDRESS = LIVE_PROTOCOL_CONTRACTS.PAYMENT_GATEWAY;

function resolvePreparedM2MScope(chainId?: number | null) {
  const contracts = chainId ? getProtocolContracts(chainId) : LIVE_PROTOCOL_CONTRACTS;
  const m2mContracts = chainId ? getM2MContracts(chainId) : M2M_CONTRACTS;

  return {
    marketplaceAddress: (contracts?.MARKETPLACE_ATP ?? DEFAULT_LIVE_MARKETPLACE_ADDRESS) as Address,
    paymentGatewayAddress: (contracts?.PAYMENT_GATEWAY ?? DEFAULT_LIVE_PAYMENT_GATEWAY_ADDRESS) as Address,
    aiWalletFactoryAddress: m2mContracts.AI_WALLET_FACTORY_V2 ?? undefined,
  };
}

function assertAddressField(name: string, value: Address | undefined): asserts value is Address {
  if (!value) throw new Error(`AI wallet deploy field is missing: ${name}`);
}

function assertBigIntField(name: string, value: bigint | undefined): asserts value is bigint {
  if (typeof value !== 'bigint') throw new Error(`AI wallet deploy field is missing: ${name}`);
}

function assertBooleanField(name: string, value: boolean | undefined): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(`AI wallet deploy field is missing: ${name}`);
}

function buildDeployWalletConfigTuple(
  input: DeployAIM2MWalletInput,
  marketplaceAddress: Address,
  paymentGatewayAddress: Address,
) {
  const restrictAssetId = input.restrictAssetId ?? false;
  const assetId = input.assetId ?? 0n;
  const maxAmount = input.maxAmount ?? 0n;
  const minGrossPrice = input.minGrossPrice ?? 0n;
  const maxGrossPrice = input.maxGrossPrice ?? 0n;
  const maxDeliverySeconds = input.maxDeliverySeconds ?? 0n;
  assertAddressField('root', input.root);
  assertAddressField('delegate', input.delegate);
  assertAddressField('allowedTarget', marketplaceAddress);
  assertAddressField('allowedSpender', paymentGatewayAddress);
  assertAddressField('allowedToken', input.allowedToken);
  assertBigIntField('expiry', input.expiry);
  assertBigIntField('actionMask', input.actionMask);
  assertBigIntField('maxPerOrder', input.maxPerOrder);
  assertBigIntField('maxTotal', input.maxTotal);
  assertBooleanField('restrictAssetId', restrictAssetId);
  assertBigIntField('assetId', assetId);
  assertBigIntField('maxAmount', maxAmount);
  assertBigIntField('minGrossPrice', minGrossPrice);
  assertBigIntField('maxGrossPrice', maxGrossPrice);
  assertBigIntField('maxDeliverySeconds', maxDeliverySeconds);
  return [
    input.root,
    input.delegate,
    marketplaceAddress,
    paymentGatewayAddress,
    input.allowedToken,
    input.expiry,
    input.actionMask,
    input.maxPerOrder,
    input.maxTotal,
    input.counterpartyAllowlistHash,
    restrictAssetId,
    assetId,
    maxAmount,
    minGrossPrice,
    maxGrossPrice,
    maxDeliverySeconds,
  ] as const;
}

function useLiveM2MScope() {
  const { chainId, marketplaceAddress, paymentGatewayAddress, m2mContracts } = useProtocolDataNetwork();

  return {
    chainId: chainId ?? DEFAULT_LIVE_PROTOCOL_CHAIN_ID,
    marketplaceAddress: marketplaceAddress ?? DEFAULT_LIVE_MARKETPLACE_ADDRESS,
    paymentGatewayAddress: paymentGatewayAddress ?? DEFAULT_LIVE_PAYMENT_GATEWAY_ADDRESS,
    m2mContracts,
  };
}

export function useM2MOnchainReady() {
  const { m2mContracts } = useLiveM2MScope();
  return Boolean(m2mContracts.DELEGATION_MANAGER && m2mContracts.AI_WALLET_FACTORY_V2);
}

export function useM2MReadiness() {
  const { chainId, marketplaceAddress, paymentGatewayAddress, m2mContracts } = useLiveM2MScope();
  const foundationReady = Boolean(m2mContracts.DELEGATION_MANAGER && m2mContracts.AI_WALLET_FACTORY_V2);
  const marketplaceSupport = useReadContract({
    chainId,
    address: marketplaceAddress,
    abi: MARKETPLACE_M2M_ABI,
    functionName: 'delegationManager',
    query: { enabled: foundationReady, retry: false },
  });
  const paymentGatewaySupport = useReadContract({
    chainId,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_M2M_ABI,
    functionName: 'escrowRouting',
    args: [0n],
    query: { enabled: foundationReady, retry: false },
  });

  const marketplaceReady = !foundationReady || marketplaceSupport.error ? false : marketplaceSupport.data !== undefined;
  const paymentGatewayReady = !foundationReady || paymentGatewaySupport.error ? false : paymentGatewaySupport.data !== undefined;
  const coreReady = foundationReady && marketplaceReady && paymentGatewayReady;

  return {
    foundationReady,
    marketplaceReady,
    paymentGatewayReady,
    coreReady,
    isReady: coreReady,
    isLoading: foundationReady && (marketplaceSupport.isLoading || paymentGatewaySupport.isLoading),
    marketplaceError: marketplaceSupport.error,
    paymentGatewayError: paymentGatewaySupport.error,
  };
}

export function useDelegationRootEpoch(root: Address | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'rootEpoch',
    args: root ? [root] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root) },
  });
}

export function useDelegationNextSessionNonce(root: Address | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'nextSessionNonce',
    args: root ? [root] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useDelegationHasActiveCycle(root: Address | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'hasActiveCycle',
    args: root ? [root] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useDelegationActiveSessionNonce(root: Address | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'activeSessionNonce',
    args: root ? [root] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useDelegationSession(root: Address | undefined, sessionNonce: bigint | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'getSession',
    args: root !== undefined && sessionNonce !== undefined ? [root, sessionNonce] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root !== undefined && sessionNonce !== undefined), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useDelegationSessionStatus(root: Address | undefined, sessionNonce: bigint | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.DELEGATION_MANAGER ?? undefined,
    abi: DELEGATION_MANAGER_ABI,
    functionName: 'sessionStatus',
    args: root !== undefined && sessionNonce !== undefined ? [root, sessionNonce] : undefined,
    query: { enabled: Boolean(m2mContracts.DELEGATION_MANAGER && root !== undefined && sessionNonce !== undefined), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useDelegationSessionPreview(root: Address | undefined, sessionNonce?: bigint) {
  const rootEpoch = useDelegationRootEpoch(root);
  const nextSessionNonce = useDelegationNextSessionNonce(root);
  const hasActiveCycle = useDelegationHasActiveCycle(root);
  const activeSessionNonce = useDelegationActiveSessionNonce(root);
  const resolvedNonce = sessionNonce ?? (nextSessionNonce.data as bigint | undefined);
  const session = useDelegationSession(root, resolvedNonce);
  const status = useDelegationSessionStatus(root, resolvedNonce);

  const sessionId = useMemo(() => {
    if (!root || resolvedNonce === undefined) return undefined;
    return keccak256(
      encodeAbiParameters(
        [{ type: 'address' }, { type: 'uint256' }],
        [root, resolvedNonce]
      )
    );
  }, [root, resolvedNonce]);

  return {
    rootEpoch: rootEpoch.data as bigint | undefined,
    nextSessionNonce: nextSessionNonce.data as bigint | undefined,
    hasActiveCycle: Boolean(hasActiveCycle.data),
    activeSessionNonce: activeSessionNonce.data as bigint | undefined,
    session: session.data,
    sessionStatus: status.data as number | undefined,
    sessionId,
    isLoading:
      rootEpoch.isLoading ||
      nextSessionNonce.isLoading ||
      hasActiveCycle.isLoading ||
      activeSessionNonce.isLoading ||
      session.isLoading ||
      status.isLoading,
  };
}

export function useDelegationCyclePreview(root: Address | undefined) {
  const nextSessionNonce = useDelegationNextSessionNonce(root);
  const hasActiveCycle = useDelegationHasActiveCycle(root);
  const activeSessionNonce = useDelegationActiveSessionNonce(root);

  return {
    nextSessionNonce: nextSessionNonce.data as bigint | undefined,
    hasActiveCycle: Boolean(hasActiveCycle.data),
    activeSessionNonce: activeSessionNonce.data as bigint | undefined,
    isLoading:
      nextSessionNonce.isLoading ||
      hasActiveCycle.isLoading ||
      activeSessionNonce.isLoading,
  };
}

export function usePredictAIM2MWallet(params: {
  root?: Address;
  sessionNonce?: bigint;
}) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  const { root, sessionNonce } = params;
  return useReadContract({
    chainId,
    address: m2mContracts.AI_WALLET_FACTORY_V2 ?? undefined,
    abi: AI_WALLET_FACTORY_V2_ABI,
    functionName: 'predictWallet',
    args: root && sessionNonce !== undefined ? [root, sessionNonce] : undefined,
    query: {
      enabled: Boolean(m2mContracts.AI_WALLET_FACTORY_V2 && root && sessionNonce !== undefined),
      refetchInterval: LIVE_M2M_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  });
}

export function usePredictNextAIM2MWallet(root: Address | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.AI_WALLET_FACTORY_V2 ?? undefined,
    abi: AI_WALLET_FACTORY_V2_ABI,
    functionName: 'predictNextWallet',
    args: root ? [root] : undefined,
    query: { enabled: Boolean(m2mContracts.AI_WALLET_FACTORY_V2 && root) },
  });
}

export function useAIM2MWalletOfSession(root: Address | undefined, sessionNonce: bigint | undefined) {
  const { chainId, m2mContracts } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: m2mContracts.AI_WALLET_FACTORY_V2 ?? undefined,
    abi: AI_WALLET_FACTORY_V2_ABI,
    functionName: 'walletOfSession',
    args: root !== undefined && sessionNonce !== undefined ? [root, sessionNonce] : undefined,
    query: { enabled: Boolean(m2mContracts.AI_WALLET_FACTORY_V2 && root !== undefined && sessionNonce !== undefined), refetchInterval: LIVE_M2M_REFETCH_MS, refetchOnWindowFocus: true, staleTime: 0 },
  });
}

export function useAIM2MWalletState(walletAddress: Address | undefined) {
  const { chainId } = useLiveM2MScope();
  const parent = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'parent',
    query: { enabled: Boolean(walletAddress) },
  });
  const delegate = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'delegate',
    query: { enabled: Boolean(walletAddress) },
  });
  const delegationManager = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'delegationManager',
    query: { enabled: Boolean(walletAddress) },
  });
  const allowedToken = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'allowedToken',
    query: { enabled: Boolean(walletAddress) },
  });
  const allowedTarget = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'allowedTarget',
    query: { enabled: Boolean(walletAddress) },
  });
  const allowedSpender = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'allowedSpender',
    query: { enabled: Boolean(walletAddress) },
  });
  const expiry = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'expiry',
    query: { enabled: Boolean(walletAddress) },
  });
  const sessionNonce = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'sessionNonce',
    query: { enabled: Boolean(walletAddress) },
  });
  const actionMask = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'actionMask',
    query: { enabled: Boolean(walletAddress) },
  });
  const initialized = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'initialized',
    query: { enabled: Boolean(walletAddress) },
  });
  const closed = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'closed',
    query: { enabled: Boolean(walletAddress) },
  });
  const isActive = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'isActive',
    query: { enabled: Boolean(walletAddress) },
  });

  return {
    parent: parent.data as Address | undefined,
    delegate: delegate.data as Address | undefined,
    delegationManager: delegationManager.data as Address | undefined,
    allowedToken: allowedToken.data as Address | undefined,
    allowedTarget: allowedTarget.data as Address | undefined,
    allowedSpender: allowedSpender.data as Address | undefined,
    expiry: expiry.data as bigint | undefined,
    sessionNonce: sessionNonce.data as bigint | undefined,
    actionMask: actionMask.data as bigint | undefined,
    initialized: initialized.data as boolean | undefined,
    closed: closed.data as boolean | undefined,
    isActive: isActive.data as boolean | undefined,
    isLoading:
      parent.isLoading ||
      delegate.isLoading ||
      delegationManager.isLoading ||
      allowedToken.isLoading ||
      allowedTarget.isLoading ||
      allowedSpender.isLoading ||
      expiry.isLoading ||
      sessionNonce.isLoading ||
      actionMask.isLoading ||
      initialized.isLoading ||
      closed.isLoading ||
      isActive.isLoading,
  };
}

export function useAIM2MWalletLifecycleState(walletAddress: Address | undefined) {
  const { chainId } = useLiveM2MScope();
  const initialized = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'initialized',
    query: { enabled: Boolean(walletAddress) },
  });
  const closed = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'closed',
    query: { enabled: Boolean(walletAddress) },
  });
  const isActive = useReadContract({
    chainId,
    address: walletAddress,
    abi: AI_WALLET_V2_ABI,
    functionName: 'isActive',
    query: { enabled: Boolean(walletAddress) },
  });

  return {
    initialized: initialized.data as boolean | undefined,
    closed: closed.data as boolean | undefined,
    isActive: isActive.data as boolean | undefined,
    isLoading:
      initialized.isLoading ||
      closed.isLoading ||
      isActive.isLoading,
  };
}

export function useOrderFundingM2M(orderId: bigint | undefined) {
  const { chainId, marketplaceAddress } = useLiveM2MScope();
  const order = useReadContract({
    chainId,
    address: marketplaceAddress,
    abi: MARKETPLACE_ABI,
    functionName: 'orders',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });

  const data = useMemo(() => {
    const value = order.data as
      | {
          buyer: Address;
          payer: Address;
          refundRecipient: Address;
        }
      | undefined;

    if (!value) return undefined;

    return {
      buyer: value.buyer,
      payer: value.payer,
      refundRecipient: value.refundRecipient,
    };
  }, [order.data]);

  return {
    ...order,
    data,
  };
}

export function useEscrowRouting(orderId: bigint | undefined) {
  const { chainId, paymentGatewayAddress } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_M2M_ABI,
    functionName: 'escrowRouting',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useEscrowAmount(orderId: bigint | undefined) {
  const { chainId, paymentGatewayAddress } = useLiveM2MScope();
  return useReadContract({
    chainId,
    address: paymentGatewayAddress,
    abi: PAYMENT_GATEWAY_M2M_ABI,
    functionName: 'escrowAmount',
    args: orderId !== undefined ? [orderId] : undefined,
    query: { enabled: orderId !== undefined },
  });
}

export function useDeployAIM2MWallet() {
  const { chainId, marketplaceAddress, paymentGatewayAddress, m2mContracts } = useLiveM2MScope();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash, chainId });

  const DEPLOY_AI_WALLET_GAS_LIMIT = 700000n;

  const deployWallet = async (input: DeployAIM2MWalletInput) => {
    if (!m2mContracts.AI_WALLET_FACTORY_V2) throw new Error('AI wallet factory address is not configured');
    const resolvedMarketplaceAddress = marketplaceAddress ?? DEFAULT_LIVE_MARKETPLACE_ADDRESS;
    const resolvedPaymentGatewayAddress = paymentGatewayAddress ?? DEFAULT_LIVE_PAYMENT_GATEWAY_ADDRESS;
    if (!resolvedMarketplaceAddress || !resolvedPaymentGatewayAddress) {
      throw new Error('AI wallet core contract addresses are not configured');
    }
    return writeContractAsync({
      chainId,
      address: m2mContracts.AI_WALLET_FACTORY_V2,
      abi: AI_WALLET_FACTORY_V2_ABI,
      functionName: 'deployWallet',
      gas: DEPLOY_AI_WALLET_GAS_LIMIT,
      value: 0n,
      args: [buildDeployWalletConfigTuple(input, resolvedMarketplaceAddress, resolvedPaymentGatewayAddress)],
    });
  };

  return { deployWallet, hash, isPending, isConfirming, isConfirmed, error, reset };
}

export function useRevokeAIM2MWallet(walletAddress: Address | undefined) {
  const { chainId } = useLiveM2MScope();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash, chainId });

  const revokeWallet = async () => {
    if (!walletAddress) throw new Error('Wallet address is required');
    return writeContractAsync({
      chainId,
      address: walletAddress,
      abi: AI_WALLET_V2_ABI,
      functionName: 'revokeAndSweep',
      args: [],
    });
  };

  return { revokeWallet, hash, isPending, isConfirming, isConfirmed, error, reset };
}

export function useCloseExpiredAIM2MWallet(walletAddress: Address | undefined) {
  const { chainId } = useLiveM2MScope();
  const { data: hash, writeContractAsync, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash, chainId });

  const closeExpiredWallet = async () => {
    if (!walletAddress) throw new Error('Wallet address is required');
    return writeContractAsync({
      chainId,
      address: walletAddress,
      abi: AI_WALLET_V2_ABI,
      functionName: 'closeExpiredAndSweep',
      args: [],
    });
  };

  return { closeExpiredWallet, hash, isPending, isConfirming, isConfirmed, error, reset };
}

export function prepareDeployAIM2MWalletTx(input: DeployAIM2MWalletInput, chainId?: number | null): PreparedContractCall {
  const { marketplaceAddress, paymentGatewayAddress, aiWalletFactoryAddress } = resolvePreparedM2MScope(chainId);
  if (!aiWalletFactoryAddress) throw new Error('AI wallet factory address is not configured');
  return {
    to: aiWalletFactoryAddress,
    data: encodeFunctionData({
      abi: AI_WALLET_FACTORY_V2_ABI,
      functionName: 'deployWallet',
      args: [buildDeployWalletConfigTuple(input, marketplaceAddress, paymentGatewayAddress)],
    }),
    value: 0n,
  };
}

export function prepareDelegatedCreateOrderCallData(args: {
  rootBuyer: Address;
  seller: Address;
  payerVault: Address;
  paymentToken: Address;
  assetId: bigint;
  amount: bigint;
  grossPriceProposed: bigint;
  proposedEstDeliverySeconds: bigint;
  sessionNonce: bigint;
}): Hex {
  return encodeFunctionData({
    abi: MARKETPLACE_M2M_ABI,
    functionName: 'createOrderFor',
    args: [
      args.rootBuyer,
      args.seller,
      args.payerVault,
      args.paymentToken,
      args.assetId,
      args.amount,
      args.grossPriceProposed,
      args.proposedEstDeliverySeconds,
      args.sessionNonce,
    ],
  });
}

export function prepareDelegatedCreateOrderTx(args: {
  chainId?: number | null;
  walletAddress: Address;
  rootBuyer: Address;
  seller: Address;
  payerVault: Address;
  paymentToken: Address;
  assetId: bigint;
  amount: bigint;
  grossPriceProposed: bigint;
  proposedEstDeliverySeconds: bigint;
  sessionNonce: bigint;
}): PreparedContractCall {
  const { marketplaceAddress } = resolvePreparedM2MScope(args.chainId);
  const innerData = prepareDelegatedCreateOrderCallData(args);
  return {
    to: args.walletAddress,
    data: encodeFunctionData({
      abi: AI_WALLET_V2_ABI,
      functionName: 'callWithExactApproval',
      args: [marketplaceAddress, innerData, args.grossPriceProposed],
    }),
    value: 0n,
  };
}

export function prepareDelegatedPayOrderTx(args: {
  chainId?: number | null;
  orderId: bigint;
  rootBuyer: Address;
  payerVault: Address;
  sessionNonce: bigint;
}): PreparedContractCall {
  const { marketplaceAddress } = resolvePreparedM2MScope(args.chainId);
  return {
    to: marketplaceAddress,
    data: encodeFunctionData({
      abi: MARKETPLACE_M2M_ABI,
      functionName: 'payOrderFor',
      args: [args.orderId, args.rootBuyer, args.payerVault, args.sessionNonce],
    }),
    value: 0n,
  };
}

export function prepareDelegatedMintAssetTx(args: {
  chainId?: number | null;
  rootSeller: Address;
  unitId: bigint;
  totalAmount: bigint;
  expiryAt: bigint;
  assetType?: AssetType;
  sessionNonce: bigint;
}): PreparedContractCall {
  const { marketplaceAddress } = resolvePreparedM2MScope(args.chainId);
  return {
    to: marketplaceAddress,
    data: encodeFunctionData({
      abi: MARKETPLACE_M2M_ABI,
      functionName: 'mintAssetFor',
      args: [
        args.rootSeller,
        args.unitId,
        args.totalAmount,
        args.expiryAt,
        args.assetType ?? AssetType.RWA,
        args.sessionNonce,
      ],
    }),
    value: 0n,
  };
}

export function prepareDelegatedSellerConfirmTx(args: {
  chainId?: number | null;
  orderId: bigint;
  rootSeller: Address;
  estDeliverySeconds: bigint;
  sessionNonce: bigint;
}): PreparedContractCall {
  const { marketplaceAddress } = resolvePreparedM2MScope(args.chainId);
  return {
    to: marketplaceAddress,
    data: encodeFunctionData({
      abi: MARKETPLACE_M2M_ABI,
      functionName: 'sellerConfirmFor',
      args: [args.orderId, args.rootSeller, args.estDeliverySeconds, args.sessionNonce],
    }),
    value: 0n,
  };
}
