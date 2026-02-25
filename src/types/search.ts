export type SortOption = 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc' | 'popularity' | 'name-asc' | 'name-desc';

export interface SearchFilters {
  query: string;
  categories: string[];
  priceRange: {
    min: number | null;
    max: number | null;
  };
  blockchains: string[];
  verifiedOnly: boolean;
  sortBy: SortOption;
}

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  blockchain: string;
  price: string;
  priceUsd: string;
  priceNumeric: number;
  image: string;
  verified: boolean;
  views: number;
  favorites: number;
  mintDate: number;
  location?: string; // Location for RWA assets (e.g., "Phuket", "Dubai")
  holders?: number; // Number of holders/supply
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  filters?: Partial<SearchFilters>;
}

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}