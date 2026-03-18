export type GeoLevelKind =
  | 'admin1'
  | 'admin2'
  | 'admin3'
  | 'admin4'
  | 'admin5'
  | 'locality'
  | 'sublocality';

export type DeliveryAddressValidationStatus =
  | 'unverified'
  | 'format_valid'
  | 'manual_unstructured'
  | 'verified_external'
  | 'invalid';

export type DeliveryAddressSource =
  | 'manual'
  | 'legacy_migrated'
  | 'verified_autocomplete'
  | 'imported';

export interface GeoAddressLevelSchema {
  kind: GeoLevelKind;
  label: string;
  required: boolean;
}

export interface GeoAddressSchema {
  levels: GeoAddressLevelSchema[];
}

export interface GeoCountry {
  code: string;
  iso3: string;
  name: string;
  nativeName?: string | null;
  phoneCode?: string | null;
  postalCodeLabel: string;
  postalCodeRequired: boolean;
  postalCodePattern?: string | null;
  addressSchema: GeoAddressSchema;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface GeoPlace {
  id: string;
  countryCode: string;
  parentId: string | null;
  depth: number;
  placeKind: GeoLevelKind;
  code?: string | null;
  name: string;
  nameAscii?: string | null;
  label?: string | null;
  isSelectable: boolean;
  sortOrder: number;
  lat?: number | null;
  lng?: number | null;
  postalCodePattern?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeliveryGeoSelection {
  placeId: string;
  kind: GeoLevelKind;
  code?: string | null;
  name: string;
  label: string;
}

export interface DeliveryAddressRecord {
  id: string;
  label?: string | null;
  recipientName: string;
  phoneE164?: string | null;
  countryCode: string;
  countryNameSnapshot: string;
  geoPath: DeliveryGeoSelection[];
  leafPlaceId?: string | null;
  postalCode?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  validationStatus: DeliveryAddressValidationStatus;
  source: DeliveryAddressSource;
  createdAt: number;
  updatedAt: number;
}

export interface DeliveryAddressDraft {
  id?: string;
  label?: string;
  recipientName: string;
  phoneE164?: string;
  countryCode: string;
  countryNameSnapshot: string;
  geoPath: DeliveryGeoSelection[];
  leafPlaceId?: string;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  validationStatus: DeliveryAddressValidationStatus;
  source: DeliveryAddressSource;
}

export interface LegacyDeliveryAddressDraft {
  fullName?: string;
  recipientName?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export type DeliveryAddressFieldErrors = Record<string, string>;
