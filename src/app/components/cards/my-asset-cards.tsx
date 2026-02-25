import React from "react";
import {
  Eye,
  Grid3x3,
  Package,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { StudioPanel } from "@/app/components/ui/studio-panel";

export type MyAssetRwa = {
  id: string;
  name: string;
  type: "RWA";
  category: string;
  image: string;
  status: string;
  availableAmount: string | number;
  totalAmount: string | number;
  minPrice: string;
  mintedDate: string;
};

export type MyAssetReceipt = {
  id: string;
  name: string;
  type: "Receipt";
  category: string;
  orderId: string;
  image: string;
  purchaseValue: string;
  purchaseDate: string;
  seller: string;
  blockchain: string;
};

export type MyAssetNft = {
  id: string;
  name: string;
  type: "NFT";
  category: string;
  image: string;
  currentPrice: string;
  floorPrice: string;
  collection: string;
  transferable: boolean;
};

export function MyAssetRwaCard({
  asset,
  onManage,
}: {
  asset: MyAssetRwa;
  onManage: (asset: MyAssetRwa) => void;
}) {
  return (
    <StudioPanel className="rounded-2xl overflow-hidden transition-all group flex flex-col hover:bg-[#1a1a1d]">
      <div className="relative aspect-square overflow-hidden bg-black">
        <img
          src={asset.image}
          alt={asset.name}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.15) contrast(1.1)", opacity: 1 }}
        />

        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#2CC295] border border-[#2CC295]/30 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={10} />
          RWA MINTED
        </div>

        <div
          className={`absolute top-2 right-2 px-2.5 py-1 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider ${
            asset.status === "Active"
              ? "bg-green-500/40 text-green-300 border border-green-400/30"
              : "bg-red-500/40 text-red-300 border border-red-400/30"
          }`}
        >
          {asset.status}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {asset.category}
          </span>
        </div>

        <h3 className="font-bold text-white mb-3 line-clamp-1">{asset.name}</h3>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Available / Total:
            </span>
            <span className="text-zinc-300 font-medium">
              {asset.availableAmount} / {asset.totalAmount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Min Price:
            </span>
            <span className="text-white font-bold">{asset.minPrice}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Minted:
            </span>
            <span className="text-zinc-400">{asset.mintedDate}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="pt-3 border-t border-[var(--color-panel-border)] mt-auto">
          <button
            onClick={() => onManage(asset)}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[var(--color-panel-border)] rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={14} />
            Manage Asset
          </button>
        </div>
      </div>
    </StudioPanel>
  );
}

export function MyAssetReceiptCard({
  asset,
  onOpen,
}: {
  asset: MyAssetReceipt;
  onOpen: (receiptId: string) => void;
}) {
  return (
    <StudioPanel
      onClick={() => onOpen(asset.id)}
      className="rounded-2xl overflow-hidden hover:border-purple-400/40 transition-all group cursor-pointer flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-black">
        <img
          src={asset.image}
          alt={asset.name}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.15) contrast(1.1)", opacity: 1 }}
        />

        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-purple-300 border border-purple-400/30 uppercase tracking-wider flex items-center gap-1.5">
          <Package size={10} />
          RECEIPT NFT
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-orange-500/20">
          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
          <span className="text-[9px] font-bold text-orange-300 uppercase tracking-wider">
            Non-Transferable
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {asset.category}
          </span>
        </div>

        <h3 className="font-bold text-white mb-3 line-clamp-1">{asset.name}</h3>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Order ID:
            </span>
            <span className="text-zinc-400 font-medium">{asset.orderId}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Purchase Date:
            </span>
            <span className="text-zinc-400">{asset.purchaseDate}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Seller:
            </span>
            <span className="text-zinc-400 font-medium">{asset.seller}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-panel-border)] mt-auto">
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">
              Purchase Value
            </p>
            <p className="text-base font-bold text-white">{asset.purchaseValue}</p>
          </div>
          <div className="px-3 py-1 bg-zinc-900 border border-[var(--color-panel-border)] rounded-lg">
            <span className="text-xs font-bold text-zinc-400">{asset.blockchain}</span>
          </div>
        </div>
      </div>
    </StudioPanel>
  );
}

export function MyAssetNftCard({
  asset,
  onTransfer,
  onListForSale,
}: {
  asset: MyAssetNft;
  onTransfer: (asset: MyAssetNft) => void;
  onListForSale: (asset: MyAssetNft) => void;
}) {
  return (
    <StudioPanel className="rounded-2xl overflow-hidden hover:border-blue-400/40 transition-all group flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-black">
        <img
          src={asset.image}
          alt={asset.name}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(1.15) contrast(1.1)", opacity: 1 }}
        />

        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-300 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
          <ShoppingBag size={10} />
          DIGITAL NFT
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 flex items-center gap-2 border border-[#2CC295]/20">
          <div className="w-1.5 h-1.5 bg-[#2CC295] rounded-full animate-pulse" />
          <span className="text-[9px] font-bold text-[#2CC295] uppercase tracking-wider">
            Transferable
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            {asset.category}
          </span>
        </div>

        <h3 className="font-bold text-white mb-3 line-clamp-1">{asset.name}</h3>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Current Price:
            </span>
            <span className="text-white font-bold">{asset.currentPrice}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
              Floor Price:
            </span>
            <span className="text-zinc-400">{asset.floorPrice}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="pt-3 border-t border-[var(--color-panel-border)] flex gap-2 mt-auto">
          <button
            onClick={() => onTransfer(asset)}
            className="flex-1 py-2.5 bg-[var(--color-primary-custom)] hover:bg-[color:color-mix(in_srgb,var(--color-primary-custom)_90%,black)] text-black rounded-lg text-xs font-bold transition-colors"
          >
            Transfer
          </button>
          <button
            onClick={() => onListForSale(asset)}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-[var(--color-panel-border)] text-white rounded-lg text-xs font-bold transition-colors"
          >
            List for Sale
          </button>
        </div>
      </div>
    </StudioPanel>
  );
}

// Re-export icons used by assets page to keep imports stable if needed.
export const MyAssetCardIcons = {
  Sparkles,
  Package,
  ShoppingBag,
  Grid3x3,
  ShoppingCart,
};
