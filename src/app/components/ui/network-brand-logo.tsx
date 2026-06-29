import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import type { ProtocolNetworkIcon } from '@/utils/protocolNetwork';

const NETWORK_LOGO_SOURCES: Record<ProtocolNetworkIcon, string> = {
  avalanche: '/network-logos/avalanche.png',
  bnb: '/network-logos/bnb.png',
  base: '/network-logos/base.png',
  arbitrum: '/network-logos/arbitrum.png',
  polygon: '/network-logos/polygon.png',
  solana: '/network-logos/solana.png',
  ethereum: '/network-logos/ethereum.png',
  generic: '',
};

interface NetworkBrandLogoProps {
  icon: ProtocolNetworkIcon;
  className?: string;
  label?: string;
}

function GenericNetworkLogo({ className = '' }: Pick<NetworkBrandLogoProps, 'className'>) {
  return (
    <span className={`flex items-center justify-center rounded-full bg-[var(--t-surface-5)] ${className}`}>
      <Wallet size={13} className="text-ui-secondary" />
    </span>
  );
}

export function NetworkBrandLogo({ icon, className = '', label = '' }: NetworkBrandLogoProps) {
  const source = NETWORK_LOGO_SOURCES[icon];
  const [currentSrc, setCurrentSrc] = useState(source);

  useEffect(() => {
    setCurrentSrc(source);
  }, [source]);

  if (!source || !currentSrc) {
    return <GenericNetworkLogo className={className} />;
  }

  return (
    <span className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={currentSrc}
        alt={label}
        loading="eager"
        decoding="async"
        className="h-full w-full object-contain"
        draggable={false}
        onError={() => setCurrentSrc('')}
      />
    </span>
  );
}
