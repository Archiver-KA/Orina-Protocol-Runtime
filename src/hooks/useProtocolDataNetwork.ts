import { useMemo } from 'react';
import { useProtocolNetworkRouter } from '@/contexts/ProtocolNetworkContext';

export function useProtocolDataNetwork() {
  const { liveChainId, liveContracts, liveNetwork } = useProtocolNetworkRouter();

  return useMemo(() => {
    const chainId = liveChainId ?? null;
    const contracts = liveContracts ?? null;
    const isSupported = Boolean(
      chainId
      && contracts
      && liveNetwork.status === 'live',
    );

    return {
      chainId,
      contracts,
      isSupported,
      networkKey: liveNetwork.key,
      networkLabel: liveNetwork.label,
      assetAddress: contracts?.ORINA_RWA,
      disputeManagerAddress: contracts?.DISPUTE_MANAGER,
      feeManagerAddress: contracts?.FEE_MANAGER,
      marketplaceAddress: contracts?.MARKETPLACE_ATP,
      paymentGatewayAddress: contracts?.PAYMENT_GATEWAY,
      receiptNftAddress: contracts?.RECEIPT_NFT,
      shippingRegistryAddress: contracts?.SHIPPING_REGISTRY,
      unitRegistryAddress: contracts?.UNIT_REGISTRY,
    };
  }, [liveChainId, liveContracts, liveNetwork.key, liveNetwork.label, liveNetwork.status]);
}
