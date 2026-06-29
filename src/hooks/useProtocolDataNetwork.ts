import { useMemo } from 'react';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';
import { getPaymentTokens } from '@/config/contracts';
import { getM2MContracts } from '@/config/m2m';

export function useProtocolDataNetwork() {
  const { selectedChainId, selectedContracts, selectedNetwork, selectionStatus } = useProtocolNetworkRouter();

  return useMemo(() => {
    const chainId = selectedChainId ?? null;
    const contracts = selectedContracts ?? null;
    const isSupported = Boolean(
      chainId
      && contracts
      && selectedNetwork.status === 'live',
    );
    const paymentTokens = getPaymentTokens(chainId);
    const m2mContracts = selectedNetwork.status === 'live'
      ? getM2MContracts(chainId)
      : { DELEGATION_MANAGER: null, AI_WALLET_FACTORY_V2: null };

    return {
      chainId,
      contracts,
      isSupported,
      networkKey: selectedNetwork.key,
      networkLabel: selectedNetwork.label,
      networkStatus: selectedNetwork.status,
      networkStatusReason: selectedNetwork.statusReason,
      routerStatus: selectionStatus,
      paymentTokens,
      m2mContracts,
      assetAddress: contracts?.ORINA_RWA,
      delegationManagerAddress: m2mContracts.DELEGATION_MANAGER,
      disputeManagerAddress: contracts?.DISPUTE_MANAGER,
      feeManagerAddress: contracts?.FEE_MANAGER,
      aiWalletFactoryV2Address: m2mContracts.AI_WALLET_FACTORY_V2,
      marketplaceAddress: contracts?.MARKETPLACE_ATP,
      paymentGatewayAddress: contracts?.PAYMENT_GATEWAY,
      receiptNftAddress: contracts?.RECEIPT_NFT,
      shippingRegistryAddress: contracts?.SHIPPING_REGISTRY,
      unitRegistryAddress: contracts?.UNIT_REGISTRY,
    };
  }, [
    selectedChainId,
    selectedContracts,
    selectedNetwork.key,
    selectedNetwork.label,
    selectedNetwork.status,
    selectedNetwork.statusReason,
    selectionStatus,
  ]);
}
