export type AccessMode = 'guest_forced' | 'guest_disconnected' | 'auth_pending' | 'user_connected';

export type AppPage = string;

export type AccessCapability =
  | 'view_public_home'
  | 'view_marketplace'
  | 'view_search'
  | 'view_community'
  | 'view_asset_details'
  | 'view_profile'
  | 'use_orders'
  | 'use_minting'
  | 'use_assets'
  | 'use_messages'
  | 'use_history'
  | 'use_settings'
  | 'use_favorites'
  | 'favorite_write'
  | 'community_write'
  | 'follow_write'
  | 'protocol_order_write'
  | 'protocol_mint_write'
  | 'protocol_dispute_write'
  | 'protocol_asset_write';

const GUEST_ALLOWED_PAGES = new Set<AppPage>([
  'home',
  'marketplace',
  'search',
  'community',
  'asset-details',
]);

export function isGuestAccessMode(mode: AccessMode) {
  return mode === 'guest_forced' || mode === 'guest_disconnected';
}

export function canAccessPage(mode: AccessMode, page: AppPage): boolean {
  if (mode === 'auth_pending') return true;
  if (!isGuestAccessMode(mode)) return true;
  return GUEST_ALLOWED_PAGES.has(page);
}

export function resolveAccessiblePage(mode: AccessMode, page: AppPage): AppPage {
  if (canAccessPage(mode, page)) return page;
  return isGuestAccessMode(mode) ? 'home' : page;
}

export function pageToCapability(page: AppPage): AccessCapability | null {
  switch (page) {
    case 'home': return 'view_public_home';
    case 'marketplace': return 'view_marketplace';
    case 'search': return 'view_search';
    case 'community': return 'view_community';
    case 'asset-details': return 'view_asset_details';
    case 'profile': return 'view_profile';
    case 'orders': return 'use_orders';
    case 'minting': return 'use_minting';
    case 'assets': return 'use_assets';
    case 'messages': return 'use_messages';
    case 'history': return 'use_history';
    case 'settings': return 'use_settings';
    case 'favorites': return 'use_favorites';
    default:
      return null;
  }
}

export function canUseCapability(mode: AccessMode, capability: AccessCapability): boolean {
  if (mode === 'user_connected') return true;
  if (mode === 'auth_pending') {
    switch (capability) {
      case 'view_public_home':
      case 'view_marketplace':
      case 'view_search':
      case 'view_community':
      case 'view_asset_details':
      case 'view_profile':
      case 'use_assets':
      case 'use_messages':
      case 'use_history':
      case 'use_settings':
      case 'use_favorites':
      case 'favorite_write':
      case 'community_write':
      case 'follow_write':
        return true;
      case 'protocol_order_write':
      case 'protocol_mint_write':
      case 'protocol_dispute_write':
      case 'protocol_asset_write':
        return false;
      default:
        return false;
    }
  }
  if (!isGuestAccessMode(mode)) return true;
  switch (capability) {
    case 'view_public_home':
    case 'view_marketplace':
    case 'view_search':
    case 'view_community':
    case 'view_asset_details':
      return true;
    case 'favorite_write':
    case 'community_write':
    case 'follow_write':
    case 'protocol_order_write':
    case 'protocol_mint_write':
    case 'protocol_dispute_write':
    case 'protocol_asset_write':
      return false;
    default:
      return false;
  }
}

export function isProtocolCapability(capability: AccessCapability): boolean {
  switch (capability) {
    case 'protocol_order_write':
    case 'protocol_mint_write':
    case 'protocol_dispute_write':
    case 'protocol_asset_write':
      return true;
    default:
      return false;
  }
}
