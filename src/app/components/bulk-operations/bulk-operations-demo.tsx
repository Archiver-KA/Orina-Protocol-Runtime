import { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkToolbar } from './bulk-toolbar';
import { BulkSelectCheckbox } from './bulk-select-checkbox';
import { BulkAction } from '@/types/bulk';
import { generateMockAsset } from '@/utils/mockAssetData';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export function BulkOperationsDemo() {
  const assets = Array.from({ length: 12 }, (_, i) => generateMockAsset(`${i + 1}`));
  const allIds = assets.map(a => a.id);

  const bulk = useBulkSelection(assets.length);
  const { executeBulkAction } = useBulkActions();

  const handleBulkAction = async (action: BulkAction) => {
    await executeBulkAction(action, bulk.selectedIds);
    bulk.clearSelection();
    bulk.toggleSelectMode();
  };

  return (
    <div className="h-full overflow-y-auto bg-[#121212] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Bulk Operations Demo</h1>
            <p className="text-sm text-zinc-500 mt-1">Select multiple items and perform batch actions</p>
          </div>

          {/* Select Mode Toggle */}
          <button
            onClick={bulk.toggleSelectMode}
            className={`px-4 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 ${
              bulk.selectMode
                ? 'bg-[#2CC295] text-black hover:bg-[#25a37d]'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {bulk.selectMode ? <CheckSquare size={18} /> : <Square size={18} />}
            {bulk.selectMode ? 'Exit Select Mode' : 'Select Mode'}
          </button>
        </div>

        {/* Select All (when in select mode) */}
        {bulk.selectMode && (
          <div className="mb-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BulkSelectCheckbox
                checked={bulk.isAllSelected}
                indeterminate={bulk.isSomeSelected}
                onChange={() => {
                  if (bulk.isAllSelected) {
                    bulk.deselectAll();
                  } else {
                    bulk.selectAll(allIds);
                  }
                }}
              />
              <span className="text-sm text-zinc-400">
                {bulk.isAllSelected
                  ? 'All items selected'
                  : bulk.isSomeSelected
                  ? `${bulk.selectedCount} of ${assets.length} selected`
                  : 'Select all items'}
              </span>
            </div>

            {bulk.hasSelection && (
              <button
                onClick={bulk.clearSelection}
                className="text-sm text-zinc-500 hover:text-white transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {/* Bulk Toolbar */}
        <BulkToolbar
          selectedCount={bulk.selectedCount}
          onAction={handleBulkAction}
          onCancel={() => {
            bulk.clearSelection();
            bulk.toggleSelectMode();
          }}
        />

        {/* Asset Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map(asset => (
            <div
              key={asset.id}
              className={`group relative bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),#141417] border rounded-xl overflow-hidden transition-all ${
                bulk.isSelected(asset.id)
                  ? 'border-[#2CC295] ring-2 ring-[#2CC295]/20'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={() => {
                if (bulk.selectMode) {
                  bulk.toggleItem(asset.id);
                }
              }}
            >
              {/* Selection Checkbox */}
              {bulk.selectMode && (
                <div className="absolute top-3 right-3 z-10">
                  <BulkSelectCheckbox
                    checked={bulk.isSelected(asset.id)}
                    onChange={() => bulk.toggleItem(asset.id)}
                  />
                </div>
              )}

              {/* Asset Image */}
              <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                <ImageWithFallback
                  src={`https://source.unsplash.com/400x400/?${encodeURIComponent(asset.category)},luxury`}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                {bulk.isSelected(asset.id) && (
                  <div className="absolute inset-0 bg-[#2CC295]/10 backdrop-blur-[1px]" />
                )}
              </div>

              {/* Asset Info */}
              <div className="p-4">
                <h3 className="text-white font-bold text-sm mb-1 truncate">
                  {asset.name}
                </h3>
                <p className="text-zinc-500 text-xs mb-3">{asset.category}</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-600">Price</p>
                    <p className="text-white font-bold">{asset.currentPrice}</p>
                  </div>
                  {asset.verified && (
                    <div className="px-2 py-1 bg-[#2CC295]/10 text-[#2CC295] text-xs rounded">
                      Verified
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <h3 className="text-lg font-bold text-white mb-3">How to use Bulk Operations:</h3>
          <ol className="space-y-2 text-sm text-zinc-400">
            <li>1. Click <strong className="text-white">"Select Mode"</strong> to enable multi-select</li>
            <li>2. Click on items to select/deselect (or use "Select all")</li>
            <li>3. Choose an action from the floating toolbar</li>
            <li>4. Click <strong className="text-white">"Exit Select Mode"</strong> when done</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-bold text-white mb-2">Available Actions:</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">Add to Favorites</span>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">Add to Watchlist</span>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">Export</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}