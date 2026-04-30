import type { Dispatch, SetStateAction } from 'react';
import type { OrderNavigationRequest } from '@/types/orderNavigation';
import type { ProfileTab } from '@/types/profile';

export type CategoryNavigationRequest = {
  query?: string;
  category: string;
  subcategory?: string;
  requestKey: string;
};

export interface RuntimeAppProps {
  activePage: string;
  setActivePage: (page: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  selectedAssetId: string | null;
  searchQuery: string;
  previousPage: string;
  selectedConversationId: string | null;
  selectedProfileAddress: string | null;
  selectedProfileTab: ProfileTab | null;
  selectedCollectionId: string | null;
  marketplaceNavigationRequest: CategoryNavigationRequest | null;
  searchNavigationRequest: CategoryNavigationRequest | null;
  ordersNavigationRequest: OrderNavigationRequest | null;
  onConsumeMarketplaceNavigationRequest: (requestKey: string) => void;
  onConsumeSearchNavigationRequest: (requestKey: string) => void;
  onConsumeOrderNavigationRequest: (requestKey: string) => void;
  onOpenInsightsOrder: (request: Omit<OrderNavigationRequest, 'requestKey'>) => void;
  handleNavigateToAsset: (assetId: string, fromPage?: string) => void;
  handleNavigateToCollection: (collectionId: string, fromPage?: string) => void;
  handleBackFromAssetDetails: () => void;
  handleBackFromCollectionDetails: () => void;
  handleBackFromProfile: () => void;
  handleSearch: (query: string) => void;
  handleNavigateToUserProfile: (walletAddress: string, initialTab?: ProfileTab) => void;
  handleNavigateToMessages: (walletAddress: string) => void;
  connectRequestKey: number;
}
