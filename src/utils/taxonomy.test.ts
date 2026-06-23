import { describe, expect, it } from 'vitest';
import {
  getCategoryDisplayLabel,
  normalizeTaxonomySelection,
} from '@/utils/taxonomy';

describe('taxonomy beta marketplace categories', () => {
  it('normalizes service labels to the beta service asset class', () => {
    const normalized = normalizeTaxonomySelection('Service');

    expect(normalized.categorySlug).toBe('service_rights');
    expect(normalized.categoryLabel).toBe('Service');
    expect(normalized.matchedBy).toBe('asset_class');
  });

  it('promotes agent subcategories to the agent service category', () => {
    const normalized = normalizeTaxonomySelection('Seller Agent');

    expect(normalized.categorySlug).toBe('agent_services');
    expect(normalized.categoryLabel).toBe('Agent Service');
    expect(normalized.subcategorySlug).toBe('seller_agent');
    expect(normalized.subcategoryLabel).toBe('Seller Agent');
  });

  it('keeps digital asset subcategories under digital assets', () => {
    const normalized = normalizeTaxonomySelection('digital_assets', 'digital license');

    expect(normalized.categorySlug).toBe('digital_assets');
    expect(normalized.categoryLabel).toBe('Digital Assets');
    expect(normalized.subcategorySlug).toBe('digital_license');
  });

  it('keeps real estate canonical while still marked outside current protocol', () => {
    expect(getCategoryDisplayLabel('real_estate')).toBe('Real Estate');
  });
});
