import { useMemo } from 'react';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';

export function useProtocolDataNetwork() {
  const { selectedChainId, selectedContracts, selectedNetwork } = useProtocolNetworkRouter();

  return useMemo(() => {
    const chainId = selectedChainId ?? null;
    const contracts = selectedContracts ?? null;
    const isSupported = Boolean(
      chainId
      && contracts
      && selectedNetwork.status === 'live',
    );

    return {
      chainId,
      contracts,
      isSupported,
      networkKey: selectedNetwork.key,
      networkLabel: selectedNetwork.label,
      assetAddress: contracts?.ORINA_RWA,
      disputeManagerAddress: contracts?.DISPUTE_MANAGER,
      feeManagerAddress: contracts?.FEE_MANAGER,
      marketplaceAddress: contracts?.MARKETPLACE_ATP,
      paymentGatewayAddress: contracts?.PAYMENT_GATEWAY,
      receiptNftAddress: contracts?.RECEIPT_NFT,
      shippingRegistryAddress: contracts?.SHIPPING_REGISTRY,
      unitRegistryAddress: contracts?.UNIT_REGISTRY,
    };
  }, [selectedChainId, selectedContracts, selectedNetwork.key, selectedNetwork.label, selectedNetwork.status]);
}
