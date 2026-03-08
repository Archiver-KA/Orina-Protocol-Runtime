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

const cardShellClass =
  "my-asset-card-shell group flex h-full flex-col overflow-hidden rounded-[24px] bg-[var(--t-surface-2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.16)]";
const mediaChipClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] backdrop-blur-md";
const metricLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-ui-muted";
const metricValueClass = "text-[13px] font-semibold text-ui-primary";
const metricAccentValueClass = "text-[13px] font-semibold text-primary";

function AssetCardMedia({
  image,
  alt,
  children,
}: {
  image: string;
  alt: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative h-[200px] overflow-hidden bg-black">
      <img
        src={image}
        alt={alt}
        className="h-full w-full object-cover"
        style={{ filter: "brightness(1.08) contrast(1.06)", opacity: 1 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      {children}
    </div>
  );
}

function AssetMetricRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className={metricLabelClass}>{label}</span>
      <span className={accent ? metricAccentValueClass : metricValueClass}>{value}</span>
    </div>
  );
}

function AssetActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "secondary" | "primary";
}) {
  const className =
    variant === "primary"
      ? "h-12 flex-1 rounded-full border border-[#2CC295] bg-[#2CC295]/10 px-4 text-sm font-bold text-primary transition-colors hover:bg-[#2CC295]/16"
      : "h-12 flex-1 rounded-full border border-ui-border-subtle bg-white/[0.03] px-4 text-sm font-bold text-ui-primary transition-colors hover:bg-white/[0.06]";

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function MyAssetRwaCard({
  asset,
  onManage,
}: {
  asset: MyAssetRwa;
  onManage: (asset: MyAssetRwa) => void;
}) {
  const isActive = asset.status.toLowerCase() === "active";

  return (
    <StudioPanel className={cardShellClass}>
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <div
          className={`${mediaChipClass} absolute left-3 top-3 border-[#2CC295]/20 bg-[#2CC295]/18 text-primary`}
        >
          <Sparkles size={10} />
          RWA Minted
        </div>
        <div
          className={`${mediaChipClass} absolute right-3 top-3 ${
            isActive
              ? "border-[#2CC295]/20 bg-[#2CC295]/22 text-primary"
              : "border-red-400/20 bg-red-500/18 text-red-300"
          }`}
        >
          {asset.status}
        </div>
      </AssetCardMedia>

      <div className="my-asset-info-area flex flex-1 flex-col px-5 pb-5 pt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ui-muted">
          {asset.category}
        </p>
        <h3 className="mb-4 line-clamp-2 text-[16px] leading-[1.35] font-bold text-ui-primary md:text-[18px] md:leading-[1.3]">
          {asset.name}
        </h3>

        <div className="space-y-0.5">
          <AssetMetricRow
            label="Available / Total"
            value={`${asset.availableAmount} / ${asset.totalAmount}`}
          />
          <AssetMetricRow label="Min Price" value={asset.minPrice} accent />
          <AssetMetricRow label="Minted" value={asset.mintedDate} />
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={() => onManage(asset)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ui-border-subtle bg-white/[0.03] px-5 text-sm font-bold text-ui-primary transition-colors hover:bg-white/[0.06]"
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
      className={`${cardShellClass} cursor-pointer`}
    >
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <div
          className={`${mediaChipClass} absolute left-3 top-3 border-violet-400/20 bg-violet-500/18 text-violet-300`}
        >
          <Package size={10} />
          Receipt NFT
        </div>
        <div className="absolute bottom-3 left-4 right-4 inline-flex items-center gap-2 bg-black/65 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-orange-300">
            Non-Transferable
          </span>
        </div>
      </AssetCardMedia>

      <div className="my-asset-info-area flex flex-1 flex-col px-5 pb-5 pt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ui-muted">
          {asset.category}
        </p>
        <h3 className="mb-4 line-clamp-2 text-[16px] leading-[1.35] font-bold text-ui-primary md:text-[18px] md:leading-[1.3]">
          {asset.name}
        </h3>

        <div className="space-y-0.5">
          <AssetMetricRow label="Order ID" value={asset.orderId} />
          <AssetMetricRow label="Purchase Date" value={asset.purchaseDate} />
          <AssetMetricRow label="Seller" value={asset.seller} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            <p className={`${metricLabelClass} mb-1`}>Purchase Value</p>
            <p className="text-[22px] font-bold leading-[1.2] text-ui-primary">
              {asset.purchaseValue}
            </p>
          </div>
          <div className="rounded-[10px] border border-ui-border-subtle bg-white/[0.06] px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ui-secondary">
              {asset.blockchain}
            </span>
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
    <StudioPanel className={cardShellClass}>
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <div
          className={`${mediaChipClass} absolute left-3 top-3 border-fuchsia-400/20 bg-fuchsia-500/18 text-fuchsia-300`}
        >
          <ShoppingBag size={10} />
          Digital NFT
        </div>
        <div className="absolute bottom-3 left-4 right-4 inline-flex items-center gap-2 bg-black/65 px-3 py-2">
          <span className={`h-2 w-2 rounded-full ${asset.transferable ? "bg-[#2CC295]" : "bg-orange-400"}`} />
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
              asset.transferable ? "text-primary" : "text-orange-300"
            }`}
          >
            {asset.transferable ? "Transferable" : "Non-Transferable"}
          </span>
        </div>
      </AssetCardMedia>

      <div className="my-asset-info-area flex flex-1 flex-col px-5 pb-5 pt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ui-muted">
          {asset.category}
        </p>
        <h3 className="mb-4 line-clamp-2 text-[16px] leading-[1.35] font-bold text-ui-primary md:text-[18px] md:leading-[1.3]">
          {asset.name}
        </h3>

        <div className="space-y-0.5">
          <AssetMetricRow label="Current Price" value={asset.currentPrice} accent />
          <AssetMetricRow label="Floor Price" value={asset.floorPrice} />
        </div>

        <div className="mt-auto flex gap-3 pt-6">
          <AssetActionButton variant="primary" onClick={() => onTransfer(asset)}>
            Transfer
          </AssetActionButton>
          <AssetActionButton onClick={() => onListForSale(asset)}>
            List for Sale
          </AssetActionButton>
        </div>
      </div>
    </StudioPanel>
  );
}

export const MyAssetCardIcons = {
  Sparkles,
  Package,
  ShoppingBag,
  Grid3x3,
  ShoppingCart,
};
