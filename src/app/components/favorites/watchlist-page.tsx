import { useState, useEffect, useMemo } from 'react';
import { Eye, Bell, TrendingUp, TrendingDown, MoreVertical, Plus, Edit, Trash2 } from 'lucide-react';
import { AssetDetails } from '@/types/asset';
import { WatchlistItem, WatchlistAlert } from '@/types/favorites';
import { SetPriceAlertModal } from './set-price-alert-modal';
import {
  loadWatchlist,
  removeFromWatchlist,
  loadWatchlistAlerts,
  markAlertAsRead,
  calculateWatchlistStats,
  updateWatchlistItem,
} from '@/utils/favoritesUtils';
import { generateMockAsset } from '@/utils/mockAssetData';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AssetThumb } from '@/app/components/asset-thumb';

interface WatchlistPageProps {
  currentUserId?: string;
  onAssetClick?: (assetId: string) => void;
}

export function WatchlistPage({
  currentUserId = 'user_current',
  onAssetClick,
}: WatchlistPageProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistAssets, setWatchlistAssets] = useState<AssetDetails[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [showActionsId, setShowActionsId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Load watchlist on mount
  useEffect(() => {
    loadWatchlistData();
  }, [currentUserId]);

  useEffect(() => {
    const refresh = () => loadWatchlistData();
    window.addEventListener('orina:favorites-changed', refresh as EventListener);
    window.addEventListener('storage', refresh as EventListener);
    return () => {
      window.removeEventListener('orina:favorites-changed', refresh as EventListener);
      window.removeEventListener('storage', refresh as EventListener);
    };
  }, [currentUserId]);

  const loadWatchlistData = () => {
    const items = loadWatchlist(currentUserId);
    setWatchlist(items);
    
    // Load asset details
    const assets = items.map((item) => generateMockAsset(item.assetId));
    setWatchlistAssets(assets);
    
    // Load alerts
    const userAlerts = loadWatchlistAlerts(currentUserId);
    setAlerts(userAlerts);
  };

  // Calculate stats
  const stats = useMemo(() => 
    calculateWatchlistStats(watchlist, alerts, watchlistAssets),
    [watchlist, alerts, watchlistAssets]
  );

  const handleRemove = (assetId: string) => {
    if (confirm('Remove this asset from your watchlist?')) {
      removeFromWatchlist(currentUserId, assetId);
      loadWatchlistData();
      toast.success('Removed from watchlist');
    }
  };

  const handleEditAlert = (item: WatchlistItem) => {
    setEditingItem(item);
    setIsAlertModalOpen(true);
    setShowActionsId(null);
  };

  const handleSetAlert = (item: WatchlistItem, targetPrice: number, condition: 'above' | 'below') => {
    const updatedItem = {
      ...item,
      priceAlert: {
        targetPrice,
        condition,
        isActive: true,
      },
    };
    updateWatchlistItem(currentUserId, updatedItem);
    loadWatchlistData();
    setIsAlertModalOpen(false);
    setEditingItem(null);
    toast.success('Price alert set successfully');
  };

  const handleToggleAlert = (item: WatchlistItem) => {
    if (!item.priceAlert) {
      handleEditAlert(item);
      return;
    }

    const updatedItem = {
      ...item,
      priceAlert: {
        ...item.priceAlert,
        isActive: !item.priceAlert.isActive,
      },
    };
    updateWatchlistItem(currentUserId, updatedItem);
    loadWatchlistData();
    toast.success(
      updatedItem.priceAlert.isActive 
        ? 'Price alert activated' 
        : 'Price alert paused'
    );
  };

  const getAssetForItem = (item: WatchlistItem): AssetDetails | undefined => {
    return watchlistAssets.find((asset) => asset.id === item.assetId);
  };

  const getPriceChangeColor = (change?: number) => {
    if (!change) return 'text-zinc-500';
    return change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-zinc-500';
  };

  const getPriceChangeIcon = (change?: number) => {
    if (!change || Math.abs(change) < 0.01) return null;
    return change > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-[#2CC295]/10 rounded-xl">
              <Eye size={28} className="text-[#2CC295]" />
            </div>
            My Watchlist
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {watchlist.length} {watchlist.length === 1 ? 'asset' : 'assets'} being tracked
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Watching</span>
              <Eye size={16} className="text-[#2CC295]" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalWatching}</p>
          </div>

          <div className="p-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Active Alerts</span>
              <Bell size={16} className="text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeAlerts}</p>
          </div>

          <div className="p-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Price Up</span>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.priceChanges.up}</p>
          </div>

          <div className="p-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-500">Price Down</span>
              <TrendingDown size={16} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.priceChanges.down}</p>
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Eye size={40} className="text-zinc-700" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No assets in watchlist</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Add assets to your watchlist to track prices and set alerts
          </p>
        </div>
      ) : (
        <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    24h Change
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Alert
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <AnimatePresence mode="popLayout">
                  {watchlist.map((item) => {
                    const asset = getAssetForItem(item);
                    if (!asset) return null;

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-zinc-900/30 transition-colors"
                      >
                        {/* Asset */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => onAssetClick?.(asset.id)}
                            className="flex items-center gap-3 group"
                          >
                            <AssetThumb
                              src={asset.image}
                              alt={asset.name}
                              className="w-12 h-12 rounded-lg"
                            />
                            <div className="text-left">
                              <p className="font-bold text-white group-hover:text-[#2CC295] transition-colors">
                                {asset.name}
                              </p>
                              <p className="text-xs text-zinc-500">{asset.category}</p>
                            </div>
                          </button>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">
                            {asset.price.toFixed(4)} ETH
                          </p>
                        </td>

                        {/* 24h Change */}
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1 font-bold ${getPriceChangeColor(asset.priceChange24h)}`}>
                            {getPriceChangeIcon(asset.priceChange24h)}
                            <span>{asset.priceChange24h?.toFixed(2) || '0.00'}%</span>
                          </div>
                        </td>

                        {/* Alert */}
                        <td className="px-6 py-4">
                          {item.priceAlert ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleAlert(item)}
                                  className={`
                                    p-1.5 rounded transition-colors
                                    ${item.priceAlert.isActive
                                      ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                      : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                    }
                                  `}
                                >
                                  <Bell size={14} />
                                </button>
                                <div className="text-xs">
                                  <p className="text-white font-bold">
                                    {item.priceAlert.condition === 'above' ? '≥' : '≤'} {item.priceAlert.targetPrice.toFixed(4)} ETH
                                  </p>
                                  <p className="text-zinc-500">
                                    {item.priceAlert.isActive ? 'Active' : 'Paused'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditAlert(item)}
                              className="text-xs text-[#2CC295] hover:underline font-bold"
                            >
                              Set Alert
                            </button>
                          )}
                        </td>

                        {/* Added */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-500">
                            {formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsId(showActionsId === item.id ? null : item.id)}
                              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} className="text-zinc-500" />
                            </button>

                            {showActionsId === item.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-[#141417] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-10">
                                <button
                                  onClick={() => handleEditAlert(item)}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                                >
                                  <Edit size={16} />
                                  Edit Alert
                                </button>
                                <button
                                  onClick={() => {
                                    handleRemove(item.assetId);
                                    setShowActionsId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Trash2 size={16} />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Set Price Alert Modal */}
      {editingItem && (
        <SetPriceAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => {
            setIsAlertModalOpen(false);
            setEditingItem(null);
          }}
          item={editingItem}
          asset={getAssetForItem(editingItem)}
          onSetAlert={handleSetAlert}
        />
      )}
    </div>
  );
}
