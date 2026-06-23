import fs from 'node:fs/promises';
import path from 'node:path';

const CAMPAIGN_ROOT = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign';
const PROFILE_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'profiles-index.json');
const PROFILE_PREVIEW_PATH = 'supabase/audit/v3_5_beta_seed_profiles_preview.json';
const OUTPUT_INDEX_PATH = path.join(CAMPAIGN_ROOT, 'seed-assets-index.json');
const AUDIT_DIR = 'supabase/audit';
const PREVIEW_JSON_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_assets_preview.json');
const PREVIEW_CSV_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_assets_preview.csv');
const MEDIA_SOURCE_PLAN_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_asset_media_source_plan.json');

const SEED_BATCH = 'v3.5-beta-seed-assets-001';
const PROFILE_SEED_BATCH = 'v3.5-beta-seed-profiles-001';
const CHAIN_ID = 97;
const ASSET_CONTRACT = '0x3a591ab1ab3a281f999aad1644b020CbEC463C47'.toLowerCase();
const CURRENCY = 'USDT';

const LANE_PRODUCTS = {
  'agri_food/coffee': {
    assetClass: 'physical_goods',
    category: 'agri_food',
    subcategory: 'coffee',
    marketReferenceBrands: ['Blue Bottle', 'Lavazza', 'Illy', 'Nespresso'],
    templates: [
      {
        name: 'Reserve Arabica Whole Bean Lot',
        unitName: 'kg',
        totalAmount: 80,
        price: 14,
        specs: ['single-origin inspired', 'medium roast profile', 'retail-ready bagging'],
        tags: ['coffee', 'whole-bean', 'retail-pack'],
      },
      {
        name: 'Green Coffee Sample Set',
        unitName: 'kg',
        totalAmount: 120,
        price: 9,
        specs: ['sample lot', 'origin-led tasting notes', 'roaster procurement format'],
        tags: ['coffee', 'green-coffee', 'sample-lot'],
      },
    ],
  },
  'fashion_textiles/garments': {
    assetClass: 'physical_goods',
    category: 'fashion_textiles',
    subcategory: 'garments',
    marketReferenceBrands: ['Uniqlo', 'Patagonia', 'Everlane', 'Levi Strauss'],
    templates: [
      {
        name: 'Organic Cotton Core Shirt Pack',
        unitName: 'piece',
        totalAmount: 60,
        price: 28,
        specs: ['organic cotton inspired', 'retail size run', 'neutral seasonal colorway'],
        tags: ['garments', 'cotton', 'shirt'],
      },
      {
        name: 'Linen Blend Resort Set',
        unitName: 'piece',
        totalAmount: 45,
        price: 42,
        specs: ['linen blend', 'travel capsule styling', 'buyer-selectable size'],
        tags: ['garments', 'linen', 'resortwear'],
      },
    ],
  },
  'home_living/furniture': {
    assetClass: 'physical_goods',
    category: 'home_living',
    subcategory: 'furniture',
    marketReferenceBrands: ['IKEA', 'Herman Miller', 'Muji', 'West Elm'],
    templates: [
      {
        name: 'Modular Oak Shelf Unit',
        unitName: 'piece',
        totalAmount: 24,
        price: 180,
        specs: ['modular storage', 'flat-pack logistics', 'room-ready finish'],
        tags: ['furniture', 'shelf', 'home-living'],
      },
      {
        name: 'Compact Lounge Chair',
        unitName: 'piece',
        totalAmount: 18,
        price: 260,
        specs: ['compact footprint', 'upholstered finish', 'showroom presentation'],
        tags: ['furniture', 'chair', 'lounge'],
      },
    ],
  },
  'consumer_electronics/mobile_devices': {
    assetClass: 'physical_goods',
    category: 'consumer_electronics',
    subcategory: 'mobile_devices',
    marketReferenceBrands: ['Apple', 'Samsung', 'Xiaomi', 'Google Pixel'],
    templates: [
      {
        name: 'Renewed Smartphone Lot',
        unitName: 'piece',
        totalAmount: 35,
        price: 220,
        specs: ['renewed device lot', 'battery health checked', 'accessory-ready bundle'],
        tags: ['mobile-devices', 'smartphone', 'renewed'],
      },
      {
        name: 'Tablet Retail Demo Bundle',
        unitName: 'piece',
        totalAmount: 20,
        price: 310,
        specs: ['tablet bundle', 'screen inspection complete', 'retail demo grade'],
        tags: ['mobile-devices', 'tablet', 'electronics'],
      },
    ],
  },
  'industrial_supply/tools_equipment': {
    assetClass: 'physical_goods',
    category: 'industrial_supply',
    subcategory: 'tools_equipment',
    marketReferenceBrands: ['Bosch', 'Makita', 'DeWalt', 'Milwaukee'],
    templates: [
      {
        name: 'Cordless Drill Workshop Kit',
        unitName: 'set',
        totalAmount: 28,
        price: 145,
        specs: ['drill kit format', 'workshop consumables included', 'service-ready case'],
        tags: ['tools', 'drill', 'industrial-supply'],
      },
      {
        name: 'Precision Hand Tool Set',
        unitName: 'set',
        totalAmount: 40,
        price: 78,
        specs: ['multi-tool set', 'repair bench use', 'inventory-friendly packaging'],
        tags: ['tools', 'hand-tools', 'equipment'],
      },
    ],
  },
  'automotive_parts/engine_parts': {
    assetClass: 'physical_goods',
    category: 'automotive_parts',
    subcategory: 'engine_parts',
    marketReferenceBrands: ['Bosch Automotive', 'Brembo', 'Denso', 'NGK'],
    templates: [
      {
        name: 'Engine Filter Service Pack',
        unitName: 'set',
        totalAmount: 50,
        price: 36,
        specs: ['service interval pack', 'fleet maintenance format', 'compatibility metadata ready'],
        tags: ['auto-parts', 'engine-parts', 'filter'],
      },
      {
        name: 'Brake Maintenance Component Kit',
        unitName: 'set',
        totalAmount: 32,
        price: 95,
        specs: ['brake maintenance kit', 'garage-ready packaging', 'fitment notes required'],
        tags: ['auto-parts', 'brake-kit', 'maintenance'],
      },
    ],
  },
  'raw_materials_packaging/metals': {
    assetClass: 'physical_goods',
    category: 'raw_materials_packaging',
    subcategory: 'metals',
    marketReferenceBrands: ['ArcelorMittal', 'Rio Tinto', 'Alcoa', 'Nucor'],
    templates: [
      {
        name: 'Aluminum Sheet Procurement Lot',
        unitName: 'kg',
        totalAmount: 500,
        price: 3.8,
        specs: ['sheet stock', 'procurement lot', 'mill certificate placeholder'],
        tags: ['metals', 'aluminum', 'raw-materials'],
      },
      {
        name: 'Stainless Fastener Box',
        unitName: 'box',
        totalAmount: 90,
        price: 22,
        specs: ['stainless hardware', 'packaging-ready boxes', 'B2B reorder SKU'],
        tags: ['metals', 'fasteners', 'packaging'],
      },
    ],
  },
  'luxury_collectibles/watches': {
    assetClass: 'physical_goods',
    category: 'luxury_collectibles',
    subcategory: 'watches',
    marketReferenceBrands: ['Seiko', 'Tissot', 'Omega', 'Rolex'],
    templates: [
      {
        name: 'Automatic Timepiece Drop',
        unitName: 'piece',
        totalAmount: 12,
        price: 420,
        specs: ['automatic movement inspired', 'display case presentation', 'provenance metadata ready'],
        tags: ['watches', 'timepiece', 'collectible'],
      },
      {
        name: 'Heritage Watch Strap Set',
        unitName: 'set',
        totalAmount: 36,
        price: 58,
        specs: ['strap accessory set', 'premium retail packaging', 'buyer-selectable color'],
        tags: ['watches', 'strap', 'accessory'],
      },
    ],
  },
};

const SERVICE_TEMPLATES = [
  {
    assetClass: 'service_rights',
    category: 'service_rights',
    subcategory: 'logistics_services',
    name: 'Sourcing and Inspection Service Pass',
    unitName: 'package',
    totalAmount: 20,
    price: 120,
    tags: ['service', 'inspection', 'sourcing'],
    specs: ['remote sourcing review', 'supplier note package', 'photo inspection report'],
  },
  {
    assetClass: 'service_rights',
    category: 'service_rights',
    subcategory: 'field_services',
    name: 'Local Setup and Maintenance Visit',
    unitName: 'hour',
    totalAmount: 16,
    price: 65,
    tags: ['service', 'field-service', 'maintenance'],
    specs: ['scheduled service window', 'field visit entitlement', 'buyer confirmation required'],
  },
];

const AGENT_TEMPLATES = [
  {
    assetClass: 'agent_services',
    category: 'agent_services',
    subcategory: 'seller_agent',
    name: 'Seller Listing Agent Monthly Seat',
    unitName: 'seat',
    totalAmount: 10,
    price: 49,
    tags: ['agent-service', 'seller-agent', 'automation'],
    specs: ['listing draft automation', 'catalog QA checklist', 'message triage support'],
  },
  {
    assetClass: 'agent_services',
    category: 'agent_services',
    subcategory: 'procurement_agent',
    name: 'Procurement Agent Research Pack',
    unitName: 'package',
    totalAmount: 12,
    price: 89,
    tags: ['agent-service', 'procurement-agent', 'research'],
    specs: ['supplier shortlist', 'price comparison notes', 'buyer query assistant'],
  },
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    limitProfiles: Number.POSITIVE_INFINITY,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--limit-profiles') args.limitProfiles = Math.max(1, Number.parseInt(argv[++index] || '1', 10) || 1);
  }
  return args;
}

function slugify(value, maxLength = 72) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

function titleCaseSlug(value) {
  return String(value || '')
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function profileFromRows(indexRow, previewById) {
  const preview = previewById.get(indexRow.profileId) || {};
  return {
    profileId: indexRow.profileId,
    walletAddress: String(indexRow.walletAddress || preview.walletAddress || '').toLowerCase(),
    displayName: preview.displayName || indexRow.profileName || indexRow.profileId,
    username: preview.username || indexRow.username || null,
    category: indexRow.category,
    subcategory: indexRow.subcategory,
    lane: indexRow.lane,
    address: preview.address || null,
    city: preview.city || null,
    country: preview.country || null,
    longitude: preview.longitude ?? null,
    latitude: preview.latitude ?? null,
    categoryLabel: preview.categoryLabel || titleCaseSlug(indexRow.category),
    subcategoryLabel: preview.subcategoryLabel || titleCaseSlug(indexRow.subcategory),
  };
}

function seedBrand(profile) {
  return `${profile.displayName.replace(/\s+(Shop|Supply)$/i, '')} Seed`;
}

function money(value) {
  return Number(value).toFixed(Number.isInteger(value) ? 0 : 2);
}

function buildLocationSnapshot(profile) {
  if (profile.longitude === null || profile.latitude === null) return null;
  return {
    label: profile.displayName,
    address: profile.address,
    city: profile.city,
    country: profile.country,
    coordinates: {
      longitude: profile.longitude,
      latitude: profile.latitude,
    },
    source: 'v3_5_seed_profile_location',
  };
}

function buildDeliverySnapshot(profile, template) {
  return {
    fulfillmentType: template.assetClass === 'physical_goods' ? 'ship_or_pickup' : 'service_scheduled',
    originAddress: profile.address,
    originCity: profile.city,
    originCountry: profile.country,
    estimatedDeliverySeconds: template.assetClass === 'physical_goods' ? 7 * 24 * 60 * 60 : 3 * 24 * 60 * 60,
    notes: template.assetClass === 'physical_goods'
      ? 'Synthetic testnet fulfillment snapshot. No real-world delivery obligation.'
      : 'Synthetic testnet service entitlement. No real-world service obligation.',
  };
}

function buildConfigurableAttributes(template) {
  if (template.assetClass === 'service_rights' || template.assetClass === 'agent_services') {
    return [
      {
        id: 'service-window',
        label: 'Service Window',
        required: true,
        selectionMode: 'single',
        options: [
          { id: 'standard', label: 'Standard' },
          { id: 'priority', label: 'Priority' },
        ],
      },
    ];
  }
  return [
    {
      id: 'quality-grade',
      label: 'Quality Grade',
      required: true,
      selectionMode: 'single',
      options: [
        { id: 'standard', label: 'Standard' },
        { id: 'premium', label: 'Premium' },
      ],
    },
  ];
}

function buildAsset(profile, template, profileOrdinal, assetOrdinal) {
  const brand = seedBrand(profile);
  const assetUid = `v35-seed-${profile.profileId.toLowerCase()}-asset-${String(assetOrdinal).padStart(3, '0')}`;
  const title = `${brand} ${template.name}`;
  const relativeDir = `assets/${profile.lane}/${profile.profileId}_${slugify(profile.displayName, 36)}/${assetUid}`;
  const coverFile = `${relativeDir}/media/cover.png`;
  const galleryFiles = [1, 2].map((number) => `${relativeDir}/media/gallery-${number}.png`);
  const totalAmount = template.totalAmount + (profileOrdinal % 5);
  const priceNumber = Number(template.price) + ((profileOrdinal % 4) * Number(template.price) * 0.03);
  const tags = Array.from(new Set([
    ...template.tags,
    profile.category,
    profile.subcategory,
    profile.city,
    'testnet-beta',
  ].filter(Boolean)));

  return {
    assetUid,
    sourceProfileId: profile.profileId,
    sellerWallet: profile.walletAddress,
    sellerDisplayName: profile.displayName,
    assetClass: template.assetClass,
    category: template.category,
    subcategory: template.subcategory,
    title,
    slug: slugify(`${assetUid}-${title}`, 110),
    brand,
    marketReferenceBrands: template.marketReferenceBrands || [],
    condition: template.assetClass === 'physical_goods' ? 'new_seed_sample' : 'service_entitlement',
    unitName: template.unitName,
    unitLabel: titleCaseSlug(template.unitName),
    totalAmount,
    availableAmount: totalAmount,
    minPurchaseSlots: 1,
    maxPurchaseSlots: Math.min(totalAmount, template.assetClass === 'physical_goods' ? 10 : 3),
    price: `${money(priceNumber)} ${CURRENCY}`,
    priceNumber: Number(money(priceNumber)),
    currency: CURRENCY,
    description: `${title} is a v3.5 beta seed listing for marketplace, search, map, and order-flow testing. It is modeled after high-quality market examples, uses synthetic seller branding, and carries no real fulfillment obligation.`,
    tags,
    qualitySpecs: template.specs,
    assetLocationSnapshot: buildLocationSnapshot(profile),
    deliverySnapshot: buildDeliverySnapshot(profile, template),
    configurableAttributes: buildConfigurableAttributes(template),
    media: {
      status: 'pending_verified_license_source',
      coverFile,
      galleryFiles,
      requiredIpfsFlow: 'source image -> campaign media file -> Pinata/IPFS -> assets_catalog only stores IPFS URL',
      sourcePlan: {
        allowedSourceTypes: [
          'official press/media kit with reuse terms',
          'authorized shop/reseller page with explicit image reuse terms',
          'Wikimedia Commons commercial-free license file page',
          'free stock source with trademark/brand clearance checked',
        ],
        disallowedSourceTypes: [
          'ordinary shop product page without reuse license',
          'hotlinked image URL stored directly in database',
          'image with trademark/logo where third-party rights are unclear',
        ],
        searchQueries: [
          `${template.name} product photo free license`,
          `${template.name} press kit product image`,
          `${template.marketReferenceBrands?.[profileOrdinal % (template.marketReferenceBrands?.length || 1)] || brand} product image license`,
        ],
        preferredSource: null,
      },
    },
    metadata: {
      seed_source: 'orina_v3_5_beta_seed_assets',
      seed_batch: SEED_BATCH,
      profile_seed_batch: PROFILE_SEED_BATCH,
      source_profile_id: profile.profileId,
      asset_uid: assetUid,
      assetClass: template.assetClass,
      category: template.category,
      subcategory: template.subcategory,
      name: title,
      brand,
      market_reference_brands: template.marketReferenceBrands || [],
      product_source: null,
      license_gate: {
        required: true,
        status: 'pending_verified_source',
        rule: 'Do not import to DB until media IPFS manifest exists and source license audit is complete.',
      },
      verified: false,
      featured: assetOrdinal === 3,
      currency: CURRENCY,
      price: `${money(priceNumber)} ${CURRENCY}`,
      totalSlots: totalAmount,
      availableSlots: totalAmount,
      minPurchaseSlots: 1,
      maxPurchaseSlots: Math.min(totalAmount, template.assetClass === 'physical_goods' ? 10 : 3),
      blockchain: 'BSC',
      network: 'testnet',
      chainId: CHAIN_ID,
      contractAddress: ASSET_CONTRACT,
      seller_wallet: profile.walletAddress,
      seller: {
        name: profile.displayName,
        address: profile.walletAddress,
        verified: false,
      },
      tags,
      quality_specs: template.specs,
      assetLocationSnapshot: buildLocationSnapshot(profile),
      deliverySnapshot: buildDeliverySnapshot(profile, template),
      configurableAttributes: buildConfigurableAttributes(template),
      compliance_notes: [
        'Synthetic testnet seed listing.',
        'No real-world fulfillment obligation.',
        'Image URLs must be downloaded, audited, and pinned to IPFS before database import.',
      ],
    },
  };
}

function buildAssets(profiles) {
  const assets = [];
  for (const [index, profile] of profiles.entries()) {
    const laneConfig = LANE_PRODUCTS[profile.lane];
    if (!laneConfig) throw new Error(`Missing lane product config for ${profile.lane}`);

    assets.push(buildAsset(profile, { ...laneConfig.templates[0], ...laneConfig }, index + 1, 1));
    assets.push(buildAsset(profile, { ...laneConfig.templates[1], ...laneConfig }, index + 1, 2));
    const thirdTemplate = index % 2 === 0
      ? SERVICE_TEMPLATES[index % SERVICE_TEMPLATES.length]
      : AGENT_TEMPLATES[index % AGENT_TEMPLATES.length];
    assets.push(buildAsset(profile, thirdTemplate, index + 1, 3));
  }
  return assets;
}

function validateAssets(assets) {
  const errors = [];
  const uidSet = new Set();
  const slugSet = new Set();
  for (const asset of assets) {
    if (!/^0x[a-f0-9]{40}$/.test(asset.sellerWallet)) errors.push(`Invalid seller wallet for ${asset.assetUid}`);
    if (uidSet.has(asset.assetUid)) errors.push(`Duplicate assetUid ${asset.assetUid}`);
    if (slugSet.has(asset.slug)) errors.push(`Duplicate slug ${asset.slug}`);
    if (!asset.media.coverFile || asset.media.galleryFiles.length !== 2) errors.push(`Missing media plan for ${asset.assetUid}`);
    if (asset.metadata.license_gate.status !== 'pending_verified_source') {
      errors.push(`Unexpected license gate for ${asset.assetUid}`);
    }
    uidSet.add(asset.assetUid);
    slugSet.add(asset.slug);
  }
  if (assets.length !== 300) errors.push(`Expected 300 seed assets, got ${assets.length}`);
  if (errors.length) throw new Error(errors.join('\n'));
}

function buildCsv(assets) {
  const headers = [
    'assetUid',
    'sourceProfileId',
    'sellerDisplayName',
    'assetClass',
    'category',
    'subcategory',
    'title',
    'brand',
    'marketReferenceBrands',
    'price',
    'totalAmount',
    'mediaStatus',
    'coverFile',
  ];
  const lines = [headers.join(',')];
  for (const asset of assets) {
    lines.push(headers.map((header) => {
      if (header === 'marketReferenceBrands') return csvEscape(asset.marketReferenceBrands.join('|'));
      if (header === 'mediaStatus') return csvEscape(asset.media.status);
      return csvEscape(asset[header]);
    }).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function buildMediaSourcePlan(assets) {
  return {
    generatedAt: new Date().toISOString(),
    seedBatch: SEED_BATCH,
    rule: 'Images can come from free-license brand/shop sources only after license verification. DB import remains blocked until the IPFS media manifest is present.',
    requiredFlow: 'source image -> campaign media file -> Pinata/IPFS -> assets_catalog cover/gallery IPFS URLs',
    assets: assets.map((asset) => ({
      assetUid: asset.assetUid,
      title: asset.title,
      category: asset.category,
      subcategory: asset.subcategory,
      sellerDisplayName: asset.sellerDisplayName,
      coverFile: asset.media.coverFile,
      galleryFiles: asset.media.galleryFiles,
      sourcePlan: asset.media.sourcePlan,
      licenseGate: asset.metadata.license_gate,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const indexRows = JSON.parse(await fs.readFile(PROFILE_INDEX_PATH, 'utf8'));
  const previewRows = await readJsonIfExists(PROFILE_PREVIEW_PATH, []);
  const previewById = new Map(previewRows.map((row) => [row.profileId, row]));
  const selectedRows = indexRows.slice(0, Number.isFinite(args.limitProfiles) ? args.limitProfiles : indexRows.length);
  const profiles = selectedRows.map((row) => profileFromRows(row, previewById));
  const assets = buildAssets(profiles);
  validateAssets(assets);
  const mediaSourcePlan = buildMediaSourcePlan(assets);

  const summary = {
    ok: true,
    dryRun: args.dryRun,
    seedBatch: SEED_BATCH,
    profiles: profiles.length,
    assets: assets.length,
    byAssetClass: assets.reduce((acc, asset) => {
      acc[asset.assetClass] = (acc[asset.assetClass] || 0) + 1;
      return acc;
    }, {}),
    byCategory: assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {}),
    outputs: {
      assetIndex: OUTPUT_INDEX_PATH,
      previewJson: PREVIEW_JSON_PATH,
      previewCsv: PREVIEW_CSV_PATH,
      mediaSourcePlan: MEDIA_SOURCE_PLAN_PATH,
    },
    next: 'Verify/download product images, pin to IPFS, then generate import migration.',
  };

  if (args.dryRun) {
    console.log(JSON.stringify({
      ...summary,
      sample: assets.slice(0, 5).map((asset) => ({
        assetUid: asset.assetUid,
        title: asset.title,
        assetClass: asset.assetClass,
        category: asset.category,
        price: asset.price,
        mediaStatus: asset.media.status,
      })),
    }, null, 2));
    return;
  }

  await fs.mkdir(path.dirname(OUTPUT_INDEX_PATH), { recursive: true });
  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_INDEX_PATH, `${JSON.stringify(assets, null, 2)}\n`, 'utf8');
  await fs.writeFile(PREVIEW_JSON_PATH, `${JSON.stringify(assets, null, 2)}\n`, 'utf8');
  await fs.writeFile(PREVIEW_CSV_PATH, buildCsv(assets), 'utf8');
  await fs.writeFile(MEDIA_SOURCE_PLAN_PATH, `${JSON.stringify(mediaSourcePlan, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
