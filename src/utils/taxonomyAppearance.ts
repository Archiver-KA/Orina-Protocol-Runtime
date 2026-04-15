export type TaxonomyBadgeTone = {
  background: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
  shadowColor: string;
};

type TaxonomyToneKey =
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'cyan'
  | 'rose'
  | 'orange'
  | 'violet'
  | 'indigo'
  | 'slate';

const TAXONOMY_TONES: Record<TaxonomyToneKey, TaxonomyBadgeTone> = {
  emerald: {
    background: 'linear-gradient(135deg, rgba(44,194,149,0.22) 0%, rgba(44,194,149,0.08) 100%)',
    borderColor: 'rgba(44,194,149,0.34)',
    textColor: '#7CF0CB',
    dotColor: '#2CC295',
    shadowColor: 'rgba(44,194,149,0.22)',
  },
  amber: {
    background: 'linear-gradient(135deg, rgba(247,220,127,0.22) 0%, rgba(247,220,127,0.08) 100%)',
    borderColor: 'rgba(247,220,127,0.34)',
    textColor: '#F7DC7F',
    dotColor: '#F7DC7F',
    shadowColor: 'rgba(247,220,127,0.22)',
  },
  sky: {
    background: 'linear-gradient(135deg, rgba(96,165,250,0.2) 0%, rgba(96,165,250,0.07) 100%)',
    borderColor: 'rgba(96,165,250,0.34)',
    textColor: '#93C5FD',
    dotColor: '#60A5FA',
    shadowColor: 'rgba(96,165,250,0.2)',
  },
  cyan: {
    background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(34,211,238,0.07) 100%)',
    borderColor: 'rgba(34,211,238,0.34)',
    textColor: '#67E8F9',
    dotColor: '#22D3EE',
    shadowColor: 'rgba(34,211,238,0.2)',
  },
  rose: {
    background: 'linear-gradient(135deg, rgba(244,114,182,0.2) 0%, rgba(244,114,182,0.07) 100%)',
    borderColor: 'rgba(244,114,182,0.34)',
    textColor: '#F9A8D4',
    dotColor: '#F472B6',
    shadowColor: 'rgba(244,114,182,0.2)',
  },
  orange: {
    background: 'linear-gradient(135deg, rgba(251,146,60,0.2) 0%, rgba(251,146,60,0.07) 100%)',
    borderColor: 'rgba(251,146,60,0.34)',
    textColor: '#FDBA74',
    dotColor: '#FB923C',
    shadowColor: 'rgba(251,146,60,0.2)',
  },
  violet: {
    background: 'linear-gradient(135deg, rgba(196,181,253,0.22) 0%, rgba(196,181,253,0.08) 100%)',
    borderColor: 'rgba(196,181,253,0.34)',
    textColor: '#DDD6FE',
    dotColor: '#C4B5FD',
    shadowColor: 'rgba(196,181,253,0.2)',
  },
  indigo: {
    background: 'linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(129,140,248,0.07) 100%)',
    borderColor: 'rgba(129,140,248,0.34)',
    textColor: '#C7D2FE',
    dotColor: '#818CF8',
    shadowColor: 'rgba(129,140,248,0.2)',
  },
  slate: {
    background: 'linear-gradient(135deg, rgba(148,163,184,0.18) 0%, rgba(148,163,184,0.06) 100%)',
    borderColor: 'rgba(148,163,184,0.3)',
    textColor: '#CBD5E1',
    dotColor: '#94A3B8',
    shadowColor: 'rgba(148,163,184,0.16)',
  },
};

const CATEGORY_TONE_MAP: Record<string, TaxonomyToneKey> = {
  agri_food: 'emerald',
  fashion_textiles: 'rose',
  home_living: 'amber',
  consumer_electronics: 'sky',
  industrial_supply: 'cyan',
  automotive_parts: 'orange',
  raw_materials_packaging: 'slate',
  luxury_collectibles: 'violet',
  physical_goods: 'emerald',
  digital_assets: 'indigo',
  real_estate: 'amber',
  service_rights: 'cyan',
  uncategorized: 'slate',
};

const FALLBACK_TONE_SEQUENCE: TaxonomyToneKey[] = [
  'emerald',
  'amber',
  'sky',
  'cyan',
  'rose',
  'orange',
  'violet',
  'indigo',
  'slate',
];

function normalizeCategoryKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function hashCategoryKey(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getTaxonomyBadgeTone(category: string | null | undefined): TaxonomyBadgeTone {
  const normalizedCategory = normalizeCategoryKey(category) || 'uncategorized';
  const mappedTone = CATEGORY_TONE_MAP[normalizedCategory];

  if (mappedTone) {
    return TAXONOMY_TONES[mappedTone];
  }

  const fallbackTone = FALLBACK_TONE_SEQUENCE[
    hashCategoryKey(normalizedCategory) % FALLBACK_TONE_SEQUENCE.length
  ];

  return TAXONOMY_TONES[fallbackTone];
}
