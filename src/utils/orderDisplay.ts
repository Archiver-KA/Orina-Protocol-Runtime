import { formatUnits } from 'viem';
import type { OrderShippingAddressSnapshot } from '@/types/order';

const DEFAULT_PAYMENT_SYMBOL = 'ERC20';
const DEFAULT_PAYMENT_DECIMALS = 18;

export function getOrderPaymentSymbol(symbol?: string | null) {
  const normalized = symbol?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_PAYMENT_SYMBOL;
}

export function getOrderPaymentDecimals(decimals?: number | null) {
  return Number.isFinite(decimals) ? Number(decimals) : DEFAULT_PAYMENT_DECIMALS;
}

export function formatOrderGrossPrice(
  grossPrice: bigint,
  paymentTokenSymbol?: string | null,
  paymentTokenDecimals?: number | null,
) {
  return `${formatUnits(grossPrice, getOrderPaymentDecimals(paymentTokenDecimals))} ${getOrderPaymentSymbol(paymentTokenSymbol)}`;
}

export function getOrderGrossPriceNumber(grossPrice: bigint, paymentTokenDecimals?: number | null) {
  return Number(formatUnits(grossPrice, getOrderPaymentDecimals(paymentTokenDecimals)));
}

export function getOrderUnitLabel(unitLabel?: string | null, unitName?: string | null) {
  const normalizedUnitLabel = unitLabel?.trim();
  if (normalizedUnitLabel && normalizedUnitLabel.length > 0) {
    return normalizedUnitLabel;
  }

  const normalizedUnitName = unitName?.trim();
  if (normalizedUnitName && normalizedUnitName.length > 0) {
    return normalizedUnitName;
  }

  return null;
}

export function formatOrderQuantity(
  amount: bigint,
  unitLabel?: string | null,
  unitName?: string | null,
) {
  const normalizedUnit = getOrderUnitLabel(unitLabel, unitName);
  if (normalizedUnit && normalizedUnit.length > 0) {
    return `${amount.toString()} ${normalizedUnit}`;
  }
  return `${amount.toString()} ${amount === 1n ? 'unit' : 'units'}`;
}

export interface OrderShippingDetails {
  methodLabel?: string;
  recipientName?: string;
  address?: string;
  phone?: string;
  instructions?: string;
}

export function getOrderShippingDetails(
  snapshot?: OrderShippingAddressSnapshot | null,
  shippingMethodLabel?: string | null,
): OrderShippingDetails {
  const formatted = snapshot?.formatted?.trim();
  const address = formatted && formatted.length > 0
    ? formatted
    : [
        snapshot?.addressLine1?.trim(),
        snapshot?.addressLine2?.trim(),
        snapshot?.geoPath?.trim(),
        snapshot?.postalCode?.trim(),
        snapshot?.countryNameSnapshot?.trim(),
      ]
        .filter((value): value is string => Boolean(value && value.length > 0))
        .join(', ');

  return {
    methodLabel: shippingMethodLabel?.trim() || undefined,
    recipientName: snapshot?.recipientName?.trim() || undefined,
    address: address || undefined,
    phone: snapshot?.phoneE164?.trim() || undefined,
    instructions: snapshot?.deliveryInstructions?.trim() || undefined,
  };
}

export function hasOrderShippingDetails(details: OrderShippingDetails) {
  return Boolean(
    details.methodLabel
      || details.recipientName
      || details.address
      || details.phone
      || details.instructions,
  );
}
