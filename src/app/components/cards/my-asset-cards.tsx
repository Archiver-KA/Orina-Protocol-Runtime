import type { MouseEvent, ReactNode } from "react";
import {
  ArrowRightLeft,
  Eye,
  Grid3x3,
  Package,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { StudioActionButton } from "@/app/components/ui/studio-action-button";
import { getCategoryDisplayLabel } from "@/utils/taxonomy";

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
  linkedAssetId?: string;
  mintTxHash?: string;
  chainId?: number;
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
  "market-card-shell card-hover-shell card-hover-grid my-asset-card-shell group flex h-full flex-col overflow-hidden rounded-[32px] text-left";
const infoAreaClass =
  "market-card-info-area my-asset-info-area flex flex-1 flex-col px-5 pb-5 pt-4";
const metricLabelClass =
  "text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted";
const detailValueClass = "mt-1 text-[13px] font-semibold leading-[1.35] text-ui-primary";

function coerceText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function formatDisplayDate(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

function getRwaStatusTone(statusLabel: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = statusLabel.trim().toLowerCase();

  if (normalized === "active") return "success";
  if (normalized === "pending indexing" || normalized === "minting" || normalized === "processing") {
    return "warning";
  }
  if (normalized === "paused" || normalized === "delisted" || normalized === "inactive") {
    return "danger";
  }
  return "neutral";
}

function AssetTypeBadge({
  label,
  tone,
}: {
  label: string;
  tone: "rwa" | "receipt" | "nft";
}) {
  const className =
    tone === "rwa"
      ? "bg-[#2CC295]/10 text-[#2CC295]"
      : tone === "receipt"
        ? "bg-violet-500/14 text-violet-300"
        : "bg-fuchsia-500/14 text-fuchsia-300";

  return (
    <div
      className={`absolute left-3 top-3 inline-flex items-center rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md ${className}`}
    >
      {label}
    </div>
  );
}

function AssetStateBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-[#2CC295]/14 text-[#7ae6c5]"
      : tone === "warning"
        ? "bg-orange-500/14 text-orange-300"
        : tone === "danger"
          ? "bg-red-500/14 text-red-300"
          : "bg-black/35 text-white/80";

  return (
    <div
      className={`absolute right-3 top-3 inline-flex items-center rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md ${className}`}
    >
      {label}
    </div>
  );
}

function AssetCardMedia({
  image,
  alt,
  children,
}: {
  image: string;
  alt: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative h-[240px] overflow-hidden bg-[var(--t-surface-10)]">
      <ImageWithFallback
        src={image}
        alt={alt}
        className="card-hover-media h-full w-full object-cover"
      />
      <div className="card-hover-overlay absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[132px] bg-[linear-gradient(180deg,rgba(6,8,11,0)_0%,rgba(6,8,11,0.08)_28%,rgba(6,8,11,0.46)_100%)]" />
      {children}
    </div>
  );
}

function AssetValuePanel({
  label,
  value,
  subValue,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="shrink-0">
      <p className={metricLabelClass}>{label}</p>
      <p
        className={`card-price-value mt-1 text-[24px] font-semibold leading-none ${
          accent ? "card-price-value-accent" : ""
        }`}
      >
        {value}
      </p>
      {subValue ? <p className="mt-1.5 text-[10px] text-ui-muted">{subValue}</p> : null}
    </div>
  );
}

function AssetDetailStack({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode; accent?: boolean }>;
}) {
  return (
    <div className="min-w-0">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className={metricLabelClass}>{row.label}</p>
            <p
              className={`${detailValueClass} truncate ${
                row.accent ? "text-primary" : "text-ui-primary"
              }`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetContent({
  title,
  subtitle,
  valuePanel,
  detailRows,
  footer,
}: {
  title: string;
  subtitle?: string;
  valuePanel: ReactNode;
  detailRows: Array<{ label: string; value: ReactNode; accent?: boolean }>;
  footer: ReactNode;
}) {
  return (
    <div className={infoAreaClass}>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.18] text-ui-primary">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-2 line-clamp-1 text-[12px] text-ui-secondary">{subtitle}</p>
        ) : null}
      </div>

      <div className="card-value-row mt-auto">
        {valuePanel}
        <AssetDetailStack rows={detailRows} />
      </div>

      <div className="mt-4 flex items-center gap-3">{footer}</div>
    </div>
  );
}

function AssetActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <StudioActionButton
      type="button"
      variant={variant}
      size="md"
      onClick={onClick}
      className="min-h-12 flex-1 text-[13px]"
    >
      {children}
    </StudioActionButton>
  );
}

export function MyAssetRwaCard({
  asset,
  onManage,
}: {
  asset: MyAssetRwa;
  onManage: (asset: MyAssetRwa) => void;
}) {
  const statusLabel = coerceText(asset.status, "Unknown");
  const mintedDate = formatDisplayDate(asset.mintedDate);
  const availabilityValue = `${asset.availableAmount} / ${asset.totalAmount}`;

  return (
    <div className={cardShellClass}>
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <AssetTypeBadge label="RWA" tone="rwa" />
        <AssetStateBadge
          label={statusLabel}
          tone={getRwaStatusTone(statusLabel)}
        />
      </AssetCardMedia>

      <AssetContent
        title={asset.name}
        subtitle={getCategoryDisplayLabel(asset.category)}
        valuePanel={
          <AssetValuePanel label="Min Price" value={asset.minPrice} />
        }
        detailRows={[
          { label: "Minted", value: mintedDate },
          { label: "Available", value: availabilityValue },
        ]}
        footer={
          <AssetActionButton onClick={() => onManage(asset)}>
            <Eye size={14} />
            Manage Asset
          </AssetActionButton>
        }
      />
    </div>
  );
}

export function MyAssetReceiptCard({
  asset,
  onOpen,
}: {
  asset: MyAssetReceipt;
  onOpen: (receiptId: string) => void;
}) {
  const handleCardClick = () => onOpen(asset.id);

  return (
    <div onClick={handleCardClick} className={`${cardShellClass} cursor-pointer`}>
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <AssetTypeBadge label="Receipt" tone="receipt" />
        <AssetStateBadge label="Non-Transferable" tone="warning" />
      </AssetCardMedia>

      <AssetContent
        title={asset.name}
        valuePanel={
          <AssetValuePanel
            label="Purchase Value"
            value={asset.purchaseValue}
            subValue={`Receipt #${asset.orderId}`}
          />
        }
        detailRows={[
          { label: "Order ID", value: asset.orderId },
          { label: "Purchase Date", value: formatDisplayDate(asset.purchaseDate) },
        ]}
        footer={
          <AssetActionButton
            onClick={(event) => {
              event.stopPropagation();
              handleCardClick();
            }}
            variant="secondary"
          >
            <Eye size={14} />
            View Receipt
          </AssetActionButton>
        }
      />
    </div>
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
    <div className={cardShellClass}>
      <AssetCardMedia image={asset.image} alt={asset.name}>
        <AssetTypeBadge label="NFT" tone="nft" />
        <AssetStateBadge
          label={asset.transferable ? "Transferable" : "Non-Transferable"}
          tone={asset.transferable ? "success" : "warning"}
        />
      </AssetCardMedia>

      <AssetContent
        title={asset.name}
        subtitle={asset.collection}
        valuePanel={
          <AssetValuePanel label="Current Price" value={asset.currentPrice} />
        }
        detailRows={[
          { label: "Floor Price", value: asset.floorPrice },
          {
            label: "Transfer",
            value: asset.transferable ? "Allowed" : "Locked",
          },
        ]}
        footer={
          <>
            <AssetActionButton variant="primary" onClick={() => onTransfer(asset)}>
              <ArrowRightLeft size={14} />
              Transfer
            </AssetActionButton>
            <AssetActionButton onClick={() => onListForSale(asset)}>
              <ShoppingCart size={14} />
              List for Sale
            </AssetActionButton>
          </>
        }
      />
    </div>
  );
}

export const MyAssetCardIcons = {
  Sparkles,
  Package,
  ShoppingBag,
  Grid3x3,
  ShoppingCart,
};
