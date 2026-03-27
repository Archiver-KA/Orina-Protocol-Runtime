import { Copy, ExternalLink, MapPin, Settings2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { StudioStatusBadge } from '@/app/components/ui/studio-status-badge';
import { EmptyStateCard } from '@/app/components/ui/empty-state-card';
import type { MyAssetRwa } from '@/app/components/cards/my-asset-cards';
import type { WarehouseInventoryItem } from '@/utils/warehouseInventory';

interface WarehouseInventoryListProps {
  items: WarehouseInventoryItem[];
  onManage: (asset: MyAssetRwa) => void;
}

function getHealthBadgeVariant(health: WarehouseInventoryItem['health']) {
  switch (health) {
    case 'available':
      return 'success';
    case 'low_stock':
      return 'warning';
    case 'sold_out':
      return 'danger';
    case 'inactive':
    default:
      return 'muted';
  }
}

function getHealthLabel(health: WarehouseInventoryItem['health']) {
  switch (health) {
    case 'available':
      return 'In Stock';
    case 'low_stock':
      return 'Low Stock';
    case 'sold_out':
      return 'Sold Out';
    case 'inactive':
    default:
      return 'Inactive';
  }
}

function formatUpdatedAt(timestamp: number, mintedDate: string) {
  if (!timestamp || timestamp <= 0) return mintedDate;
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyWarehouseIdentifier(item: WarehouseInventoryItem) {
  const payload = item.tokenId
    ? `asset_id=${item.id}\ntoken_id=${item.tokenId}`
    : item.id;

  try {
    await navigator.clipboard.writeText(payload);
    toast.success('Warehouse asset identifier copied');
  } catch {
    toast.error('Unable to copy asset identifier');
  }
}

export function WarehouseInventoryList({
  items,
  onManage,
}: WarehouseInventoryListProps) {
  if (items.length === 0) {
    return (
      <EmptyStateCard
        icon={<Settings2 size={30} className="text-ui-muted" />}
        title="No warehouse inventory yet"
        description="Minted RWA inventory managed by this wallet will appear here once it is indexed."
        className="py-16 px-6 text-center"
      />
    );
  }

  const listedCount = items.filter((item) => item.listedOnMarketplace).length;
  const lowStockCount = items.filter((item) => item.health === 'low_stock').length;
  const soldOutCount = items.filter((item) => item.health === 'sold_out').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StudioPanel className="rounded-[24px] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Tracked Inventory</p>
          <p className="mt-2 text-3xl font-bold text-ui-primary">{items.length}</p>
          <p className="mt-2 text-xs text-ui-secondary">Minted RWA assets available for seller-side inventory management.</p>
        </StudioPanel>
        <StudioPanel className="rounded-[24px] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Active Listings</p>
          <p className="mt-2 text-3xl font-bold text-ui-primary">{listedCount}</p>
          <p className="mt-2 text-xs text-ui-secondary">Inventory rows currently projected as active on the marketplace catalog.</p>
        </StudioPanel>
        <StudioPanel className="rounded-[24px] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Inventory Alerts</p>
          <p className="mt-2 text-3xl font-bold text-ui-primary">{lowStockCount + soldOutCount}</p>
          <p className="mt-2 text-xs text-ui-secondary">Low stock or sold-out inventory requiring attention.</p>
        </StudioPanel>
      </div>

      <div className="hidden xl:grid xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_auto] gap-4 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ui-muted">
        <span>Asset</span>
        <span>Inventory</span>
        <span>Logistics</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <StudioPanel
            key={item.id}
            className="rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]/95 p-4 backdrop-blur-[10px]"
          >
            <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_auto] xl:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] bg-black/40">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StudioStatusBadge variant={getHealthBadgeVariant(item.health)}>
                      {getHealthLabel(item.health)}
                    </StudioStatusBadge>
                    <StudioStatusBadge variant={item.listedOnMarketplace ? 'success' : 'muted'}>
                      {item.listedOnMarketplace ? 'Listed' : 'Not Listed'}
                    </StudioStatusBadge>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ui-muted">
                      {item.category}
                    </p>
                    <h3 className="line-clamp-1 text-lg font-bold text-ui-primary">{item.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ui-secondary">
                    <span>Minted {item.mintedDate}</span>
                    {item.tokenId ? <span>Token #{item.tokenId}</span> : null}
                    {item.blockchain ? <span>{item.blockchain}</span> : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Available / Total</p>
                  <p className="mt-1 text-sm font-bold text-ui-primary">
                    {item.availableAmount} / {item.totalAmount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Sold / Floor</p>
                  <p className="mt-1 text-sm font-bold text-ui-primary">
                    {item.soldAmount} · {item.minPrice}
                  </p>
                </div>
                <div className="col-span-2 xl:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Last Sync</p>
                  <p className="mt-1 text-sm text-ui-secondary">
                    {formatUpdatedAt(item.updatedAt, item.mintedDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-ui-secondary">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Asset Location</p>
                    <p className="mt-1 line-clamp-2">{item.locationLabel || 'No location snapshot captured yet.'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-ui-secondary">
                  <Truck size={14} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ui-muted">Delivery</p>
                    <p className="mt-1 line-clamp-2">
                      {item.deliveryLabel || 'No delivery routing snapshot captured yet.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <StudioActionButton
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => onManage(item.asset)}
                  title="Manage asset"
                  aria-label={`Manage ${item.name}`}
                >
                  <Settings2 size={16} />
                </StudioActionButton>
                <StudioActionButton
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => void copyWarehouseIdentifier(item)}
                  title="Copy identifier"
                  aria-label={`Copy identifier for ${item.name}`}
                >
                  <Copy size={16} />
                </StudioActionButton>
                {item.marketplaceAssetId ? (
                  <StudioActionButton
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => {
                      toast.success(`Marketplace asset ID: ${item.marketplaceAssetId}`);
                    }}
                    title="Show marketplace listing"
                    aria-label={`Show marketplace listing for ${item.name}`}
                  >
                    <ExternalLink size={16} />
                  </StudioActionButton>
                ) : null}
              </div>
            </div>
          </StudioPanel>
        ))}
      </div>
    </div>
  );
}
