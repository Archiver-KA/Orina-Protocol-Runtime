import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Check, Coins, FolderPlus, Fuel, TrendingUp } from 'lucide-react';
import { StudioSidebarShell } from '@/app/components/ui/studio-sidebar';
import { CustomDropdown } from '@/app/components/custom-dropdown';
import type { CollectionSummary } from '@/types/collection';
import { COLLECTIONS_SYNC_EVENT, loadCollectionsByOwner } from '@/utils/collectionsUtils';

export function MintingRightSidebar() {
  const { address } = useAccount();
  const [ownedCollections, setOwnedCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [protocolNetwork, setProtocolNetwork] = useState('Mainnet-V3');
  const sidebarCardClass = 'p-4 bg-[var(--t-surface-5)] rounded-xl';
  const sidebarMutedCardClass = 'p-4 bg-[var(--t-surface-2)] rounded-xl';
  const selectedCollectionsCount = selectedCollectionIds.length;

  useEffect(() => {
    const syncCollections = () => {
      if (!address) {
        setOwnedCollections([]);
        return;
      }
      setOwnedCollections(loadCollectionsByOwner(address));
    };

    syncCollections();
    window.addEventListener(COLLECTIONS_SYNC_EVENT, syncCollections);
    return () => window.removeEventListener(COLLECTIONS_SYNC_EVENT, syncCollections);
  }, [address]);

  useEffect(() => {
    setSelectedCollectionIds((current) =>
      current.filter((collectionId) => ownedCollections.some((collection) => collection.id === collectionId))
    );
  }, [ownedCollections]);

  const selectedIdSet = useMemo(() => new Set(selectedCollectionIds), [selectedCollectionIds]);

  const handleToggleCollection = (collectionId: string) => {
    setSelectedCollectionIds((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId]
    );
  };

  return (
    <StudioSidebarShell widthClassName="w-full" className="minting-borderless-theme bg-ui-page border-l-0 p-2.5">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">

      {/* Header - Fixed */}
      <div className="p-6 bg-gradient-to-b from-[var(--t-surface-2)] to-transparent">
        <h2 className="text-ui-primary font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
          <Coins className="text-primary" size={18} />
          Minting Studio
        </h2>
        <p className="text-xs text-ui-muted mt-1">Asset Creation Metrics</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-grow overflow-y-auto hidden-scrollbar p-5 space-y-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Engine Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-ui-muted uppercase">ATP Protocol</span>
            <span className="text-[10px] font-bold text-primary">Online</span>
          </div>
          <div className={`${sidebarCardClass} flex items-center gap-3 min-h-[52px] transition-colors`}>
            <div className="w-2.5 h-2.5 rounded-full bg-[#2CC295] shadow-[0_0_8px_rgba(44,194,149,0.4)]"></div>
            <div className="flex-grow min-w-0">
              <CustomDropdown
                variant="compact"
                defaultValue={protocolNetwork}
                onChange={(value) => setProtocolNetwork(value)}
                openOnHover
                options={[
                  { value: 'Mainnet-V3', label: 'Mainnet-V3' },
                  { value: 'BSC Testnet', label: 'BSC Testnet' },
                ]}
                className="w-full"
                triggerClassName="!h-[40px] !w-full !justify-between !rounded-xl !border !border-ui-border-subtle !bg-ui-input !px-4 !text-[11px] !font-bold !uppercase !tracking-tight !text-ui-secondary hover:!bg-ui-input-focus"
                menuClassName="mt-2 rounded-[16px] z-[9999]"
              />
            </div>
          </div>
        </div>

        {/* Gas Estimator */}
        <div className="p-5 bg-[var(--t-surface-2)] backdrop-blur-[10px] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase font-bold text-ui-muted">Estimated Gas</h3>
            <Fuel className="text-primary" size={14} />
          </div>
          <div className="space-y-3">
            <div className={`${sidebarCardClass} flex justify-between items-center`}>
              <span className="text-xs text-ui-secondary">Creation Fee</span>
              <span className="text-sm font-bold text-ui-primary">0.005 ETH</span>
            </div>
            <div className="p-3 bg-[#2CC295]/10 rounded-xl flex justify-between items-center">
              <span className="text-xs text-primary">Priority Gas</span>
              <span className="text-sm font-bold text-primary">~ $14.20</span>
            </div>
          </div>
        </div>

        {/* Network Activity */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-ui-muted px-1">Network Activity</h3>
          <div className="space-y-3">
            <div className={sidebarCardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ui-primary">Daily Mints</span>
                <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                  <TrendingUp size={10} />
                  +12%
                </span>
              </div>
              <div className="text-lg font-bold text-ui-primary">12,402</div>
            </div>
            <div className={sidebarMutedCardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ui-primary">Success Rate</span>
                <span className="text-[10px] text-primary font-bold">99.9%</span>
              </div>
              <div className="w-full bg-ui-border-subtle h-1 rounded-full overflow-hidden">
                <div className="bg-[#2CC295] h-full w-[99.9%]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Add to Collection */}
        <div className="bg-[var(--t-surface-2)] rounded-[24px] p-5 backdrop-blur-[10px]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[11px] uppercase font-bold text-ui-muted">Add to Collection</h3>
              <p className="text-[10px] text-ui-muted mt-1">Choose collections created by this wallet.</p>
            </div>
            {selectedCollectionsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#2CC295]/10 text-primary text-[10px] font-bold">
                {selectedCollectionsCount} selected
              </span>
            )}
          </div>
          {!address ? (
            <div className={`${sidebarMutedCardClass} text-center`}>
              <p className="text-xs font-medium text-ui-primary">Connect wallet to manage collections</p>
            </div>
          ) : ownedCollections.length === 0 ? (
            <div className={`${sidebarMutedCardClass} text-center`}>
              <FolderPlus className="mx-auto mb-3 text-ui-muted" size={18} />
              <p className="text-xs font-medium text-ui-primary">No collections created yet</p>
              <p className="text-[10px] text-ui-muted mt-1">Create collections from My Collections in Profile or My Asset.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownedCollections.map((collection) => {
                const isSelected = selectedIdSet.has(collection.id);

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => handleToggleCollection(collection.id)}
                    className={`${sidebarCardClass} w-full text-left transition-colors hover:bg-ui-input-focus ${
                      isSelected ? 'ring-1 ring-[#2CC295]/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-ui-input overflow-hidden flex-shrink-0">
                        <img
                          alt={collection.name}
                          className="w-full h-full object-cover"
                          src={collection.coverImage}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ui-primary truncate">{collection.name}</p>
                        <p className="text-[10px] text-ui-muted mt-1">
                          {collection.itemCount} items . Floor {collection.floorPrice}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'border-0 bg-[#2CC295] text-black'
                            : 'border-0 bg-ui-card text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </StudioSidebarShell>
  );
}
