export type MarketplaceCategoryOption = {
  value: string;
  label: string;
};

export const MARKETPLACE_BETA_CATEGORY_OPTIONS: MarketplaceCategoryOption[] = [
  { value: 'digital_assets', label: 'Digital Assets' },
  { value: 'digital_art', label: 'Digital Art' },
  { value: 'digital_media', label: 'Digital Media' },
  { value: 'digital_license', label: 'Digital License' },
  { value: 'service_rights', label: 'Service' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'technical_services', label: 'Technical Services' },
  { value: 'creative_services', label: 'Creative Services' },
  { value: 'logistics_services', label: 'Logistics Services' },
  { value: 'field_services', label: 'Field Services' },
  { value: 'education_training', label: 'Education & Training' },
  { value: 'agent_services', label: 'Agent Service' },
  { value: 'seller_agent', label: 'Seller Agent' },
  { value: 'procurement_agent', label: 'Procurement Agent' },
  { value: 'market_research_agent', label: 'Market Research Agent' },
  { value: 'operations_agent', label: 'Operations Agent' },
  { value: 'content_agent', label: 'Content Agent' },
  { value: 'custom_workflow_agent', label: 'Custom Workflow Agent' },
];

export const MARKETPLACE_STATIC_CATEGORY_VALUES = new Set(
  MARKETPLACE_BETA_CATEGORY_OPTIONS.map((option) => option.value)
);

export const MARKETPLACE_COMING_SOON_CATEGORY_VALUES = new Set([
  'real_estate',
  'residential_property',
  'commercial_property',
  'rental_rights',
]);

export function mergeMarketplaceCategoryOptions<T extends MarketplaceCategoryOption>(options: T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  options.forEach((option) => {
    if (!option.value || seen.has(option.value)) return;
    seen.add(option.value);
    merged.push(option);
  });
  return merged;
}
