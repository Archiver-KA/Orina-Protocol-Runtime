import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_INDEX_PATH = 'C:/ORINA/ATPProtocol2/ATP2/data/bsc-testnet-100-wallet-campaign/profiles-index.json';
const AUDIT_DIR = 'supabase/audit';
const PREVIEW_JSON_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_profiles_preview.json');
const PREVIEW_CSV_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_profiles_preview.csv');
const MIGRATION_PATH = 'supabase/migrations/000077_v3_5_beta_seed_profiles.sql';
const MEDIA_IPFS_MANIFEST_PATH = path.join(AUDIT_DIR, 'v3_5_beta_seed_profile_media_ipfs_manifest.json');
const SEED_BATCH = 'v3.5-beta-seed-profiles-001';

const laneConfigs = {
  'agri_food/coffee': {
    assetClass: 'physical_goods',
    categoryLabel: 'Agriculture & Food',
    subcategoryLabel: 'Coffee',
    suffix: 'Coffee Shop',
    businessType: 'specialty coffee storefront',
    bio: 'Specialty coffee storefront curating origin-led lots, roast-ready selections, and retail packs for cafes, roasters, and premium shelves.',
    bannerQuery: 'coffee-shop',
    locations: [
      ['Saigon', 'Saigon Coffee Shop', '14 Nguyen Hue Street, District 1, Ho Chi Minh City', 'Ho Chi Minh City', 'Vietnam', 106.7038, 10.7758],
      ['Ethiopia', 'Ethiopia Coffee Shop', 'Bole Road, Addis Ababa', 'Addis Ababa', 'Ethiopia', 38.7890, 8.9806],
      ['Nairobi', 'Nairobi Coffee Shop', 'Mama Ngina Street, Nairobi', 'Nairobi', 'Kenya', 36.8172, -1.2864],
      ['Bogota', 'Bogota Coffee Shop', 'Carrera 7, Chapinero, Bogota', 'Bogota', 'Colombia', -74.0636, 4.6483],
      ['Singapore', 'Singapore Coffee Shop', '18 Cross Street, Singapore', 'Singapore', 'Singapore', 103.8489, 1.2847],
      ['Rotterdam', 'Rotterdam Coffee Shop', 'Westblaak 92, Rotterdam', 'Rotterdam', 'Netherlands', 4.4777, 51.9194],
      ['Dubai', 'Dubai Coffee Shop', 'Al Mustaqbal Street, Dubai', 'Dubai', 'United Arab Emirates', 55.2772, 25.2048],
      ['Istanbul', 'Istanbul Coffee Shop', 'Istiklal Avenue, Beyoglu, Istanbul', 'Istanbul', 'Turkey', 28.9784, 41.0369],
      ['Melbourne', 'Melbourne Coffee Shop', 'Collins Street, Melbourne', 'Melbourne', 'Australia', 144.9631, -37.8136],
      ['Seattle', 'Seattle Coffee Shop', '1st Avenue, Seattle', 'Seattle', 'United States', -122.3405, 47.6080],
      ['Cape Town', 'Cape Town Coffee Shop', 'Long Street, Cape Town', 'Cape Town', 'South Africa', 18.4174, -33.9249],
      ['Lisbon', 'Lisbon Coffee Shop', 'Rua Augusta, Lisbon', 'Lisbon', 'Portugal', -9.1376, 38.7109],
      ['Seoul', 'Seoul Coffee Shop', 'Teheran-ro, Gangnam, Seoul', 'Seoul', 'South Korea', 127.0276, 37.4979],
    ],
  },
  'fashion_textiles/garments': {
    assetClass: 'physical_goods',
    categoryLabel: 'Fashion & Textiles',
    subcategoryLabel: 'Garments',
    suffix: 'Apparel Shop',
    businessType: 'private-label apparel storefront',
    bio: 'Apparel storefront presenting private-label garments, core wardrobe lines, and retail-ready fashion drops with clean fit and fabric context.',
    bannerQuery: 'apparel-shop',
    locations: [
      ['Milan', 'Milan Apparel Shop', 'Via Torino 21, Milan', 'Milan', 'Italy', 9.1878, 45.4637],
      ['Paris', 'Paris Apparel Shop', 'Rue Saint-Honore, Paris', 'Paris', 'France', 2.3316, 48.8663],
      ['London', 'London Apparel Shop', 'Carnaby Street, London', 'London', 'United Kingdom', -0.1397, 51.5136],
      ['Barcelona', 'Barcelona Apparel Shop', 'Passeig de Gracia, Barcelona', 'Barcelona', 'Spain', 2.1650, 41.3917],
      ['Tokyo', 'Tokyo Apparel Shop', 'Cat Street, Shibuya, Tokyo', 'Tokyo', 'Japan', 139.7041, 35.6672],
      ['Seoul', 'Seoul Apparel Shop', 'Garosu-gil, Seoul', 'Seoul', 'South Korea', 127.0229, 37.5219],
      ['Los Angeles', 'Los Angeles Apparel Shop', 'Melrose Avenue, Los Angeles', 'Los Angeles', 'United States', -118.3440, 34.0837],
      ['New York', 'New York Apparel Shop', 'Broadway, SoHo, New York', 'New York', 'United States', -74.0007, 40.7243],
      ['Mexico City', 'Mexico City Apparel Shop', 'Avenida Presidente Masaryk, Mexico City', 'Mexico City', 'Mexico', -99.1941, 19.4336],
      ['Bangkok', 'Bangkok Apparel Shop', 'Sukhumvit Road, Bangkok', 'Bangkok', 'Thailand', 100.5680, 13.7378],
      ['Jakarta', 'Jakarta Apparel Shop', 'Jalan Sudirman, Jakarta', 'Jakarta', 'Indonesia', 106.8227, -6.2088],
      ['Mumbai', 'Mumbai Apparel Shop', 'Linking Road, Bandra, Mumbai', 'Mumbai', 'India', 72.8347, 19.0632],
      ['Istanbul', 'Istanbul Apparel Shop', 'Nisantasi, Istanbul', 'Istanbul', 'Turkey', 28.9894, 41.0520],
    ],
  },
  'home_living/furniture': {
    assetClass: 'physical_goods',
    categoryLabel: 'Home & Living',
    subcategoryLabel: 'Furniture',
    suffix: 'Living Shop',
    businessType: 'home and modular furniture storefront',
    bio: 'Home and living storefront focused on modular furniture, storage-led collections, and room-styled retail presentation.',
    bannerQuery: 'furniture-showroom',
    locations: [
      ['Copenhagen', 'Copenhagen Living Shop', 'Bredgade 33, Copenhagen', 'Copenhagen', 'Denmark', 12.5897, 55.6848],
      ['Stockholm', 'Stockholm Living Shop', 'Birger Jarlsgatan, Stockholm', 'Stockholm', 'Sweden', 18.0711, 59.3358],
      ['Berlin', 'Berlin Living Shop', 'Torstrasse 72, Berlin', 'Berlin', 'Germany', 13.4067, 52.5290],
      ['Amsterdam', 'Amsterdam Living Shop', 'Prinsengracht, Amsterdam', 'Amsterdam', 'Netherlands', 4.8830, 52.3711],
      ['Singapore', 'Singapore Living Shop', 'Orchard Road, Singapore', 'Singapore', 'Singapore', 103.8318, 1.3048],
      ['Sydney', 'Sydney Living Shop', 'George Street, Sydney', 'Sydney', 'Australia', 151.2073, -33.8675],
      ['Toronto', 'Toronto Living Shop', 'Queen Street West, Toronto', 'Toronto', 'Canada', -79.4000, 43.6487],
      ['Vancouver', 'Vancouver Living Shop', 'Granville Street, Vancouver', 'Vancouver', 'Canada', -123.1207, 49.2827],
      ['Dubai', 'Dubai Living Shop', 'Sheikh Zayed Road, Dubai', 'Dubai', 'United Arab Emirates', 55.2708, 25.2048],
      ['Hong Kong', 'Hong Kong Living Shop', 'Queens Road Central, Hong Kong', 'Hong Kong', 'Hong Kong', 114.1577, 22.2820],
      ['Osaka', 'Osaka Living Shop', 'Midosuji Avenue, Osaka', 'Osaka', 'Japan', 135.5019, 34.6937],
      ['Sao Paulo', 'Sao Paulo Living Shop', 'Avenida Paulista, Sao Paulo', 'Sao Paulo', 'Brazil', -46.6544, -23.5614],
      ['Cape Town', 'Cape Town Living Shop', 'Bree Street, Cape Town', 'Cape Town', 'South Africa', 18.4181, -33.9217],
    ],
  },
  'consumer_electronics/mobile_devices': {
    assetClass: 'physical_goods',
    categoryLabel: 'Consumer Electronics',
    subcategoryLabel: 'Mobile Devices',
    suffix: 'Device Shop',
    businessType: 'mobile device storefront',
    bio: 'Consumer electronics storefront focused on smartphones, renewed device drops, and clean spec-led comparison for marketplace shoppers.',
    bannerQuery: 'mobile-device-store',
    locations: [
      ['Seoul', 'Seoul Device Shop', 'Yongsan Electronics Market, Seoul', 'Seoul', 'South Korea', 126.9707, 37.5326],
      ['Shenzhen', 'Shenzhen Device Shop', 'Huaqiangbei Road, Shenzhen', 'Shenzhen', 'China', 114.0859, 22.5431],
      ['Tokyo', 'Tokyo Device Shop', 'Akihabara, Tokyo', 'Tokyo', 'Japan', 139.7713, 35.6984],
      ['Singapore', 'Singapore Device Shop', 'Sim Lim Square, Singapore', 'Singapore', 'Singapore', 103.8527, 1.3039],
      ['Taipei', 'Taipei Device Shop', 'Guanghua Digital Plaza, Taipei', 'Taipei', 'Taiwan', 121.5320, 25.0443],
      ['Dubai', 'Dubai Device Shop', 'Deira Electronics Market, Dubai', 'Dubai', 'United Arab Emirates', 55.3062, 25.2697],
      ['London', 'London Device Shop', 'Tottenham Court Road, London', 'London', 'United Kingdom', -0.1336, 51.5208],
      ['New York', 'New York Device Shop', 'Canal Street, New York', 'New York', 'United States', -73.9973, 40.7196],
      ['Berlin', 'Berlin Device Shop', 'Alexanderplatz, Berlin', 'Berlin', 'Germany', 13.4132, 52.5219],
      ['Bangalore', 'Bangalore Device Shop', 'MG Road, Bengaluru', 'Bengaluru', 'India', 77.6033, 12.9756],
      ['Bangkok', 'Bangkok Device Shop', 'MBK Center, Bangkok', 'Bangkok', 'Thailand', 100.5298, 13.7444],
      ['Sao Paulo', 'Sao Paulo Device Shop', 'Santa Ifigenia, Sao Paulo', 'Sao Paulo', 'Brazil', -46.6388, -23.5388],
      ['Mexico City', 'Mexico City Device Shop', 'Eje Central, Mexico City', 'Mexico City', 'Mexico', -99.1407, 19.4328],
    ],
  },
  'industrial_supply/tools_equipment': {
    assetClass: 'physical_goods',
    categoryLabel: 'Industrial Supply',
    subcategoryLabel: 'Tools & Equipment',
    suffix: 'Tool Supply',
    businessType: 'industrial tools and equipment supplier',
    bio: 'Industrial supply profile for tools, equipment sets, and hardware collections that need clear specs, utility messaging, and shelf-ready presentation.',
    bannerQuery: 'industrial-tools',
    locations: [
      ['Rotterdam', 'Rotterdam Tool Supply', 'Waalhaven, Rotterdam', 'Rotterdam', 'Netherlands', 4.4384, 51.8876],
      ['Hamburg', 'Hamburg Tool Supply', 'Speicherstadt, Hamburg', 'Hamburg', 'Germany', 9.9916, 53.5439],
      ['Houston', 'Houston Tool Supply', 'Commerce Street, Houston', 'Houston', 'United States', -95.3598, 29.7604],
      ['Chicago', 'Chicago Tool Supply', 'Fulton Market, Chicago', 'Chicago', 'United States', -87.6500, 41.8864],
      ['Dubai', 'Dubai Tool Supply', 'Jebel Ali Free Zone, Dubai', 'Dubai', 'United Arab Emirates', 55.0678, 24.9857],
      ['Singapore', 'Singapore Tool Supply', 'Jurong Port Road, Singapore', 'Singapore', 'Singapore', 103.7217, 1.3135],
      ['Shanghai', 'Shanghai Tool Supply', 'Pudong Avenue, Shanghai', 'Shanghai', 'China', 121.5444, 31.2389],
      ['Ho Chi Minh', 'Ho Chi Minh Tool Supply', 'Vo Van Kiet Boulevard, Ho Chi Minh City', 'Ho Chi Minh City', 'Vietnam', 106.7050, 10.7556],
      ['Bangkok', 'Bangkok Tool Supply', 'Bang Na-Trat Road, Bangkok', 'Bangkok', 'Thailand', 100.6362, 13.6682],
      ['Mumbai', 'Mumbai Tool Supply', 'Andheri East Industrial Estate, Mumbai', 'Mumbai', 'India', 72.8697, 19.1155],
      ['Istanbul', 'Istanbul Tool Supply', 'Maslak Industrial Zone, Istanbul', 'Istanbul', 'Turkey', 29.0225, 41.1125],
      ['Sao Paulo', 'Sao Paulo Tool Supply', 'Mooca Industrial District, Sao Paulo', 'Sao Paulo', 'Brazil', -46.5974, -23.5515],
    ],
  },
  'automotive_parts/engine_parts': {
    assetClass: 'physical_goods',
    categoryLabel: 'Automotive Parts',
    subcategoryLabel: 'Engine Parts',
    suffix: 'Motor Parts Shop',
    businessType: 'automotive parts storefront',
    bio: 'Automotive parts storefront presenting engine components, service-ready parts, and clear compatibility context for repair and fleet buyers.',
    bannerQuery: 'auto-parts-store',
    locations: [
      ['Detroit', 'Detroit Motor Parts Shop', 'Woodward Avenue, Detroit', 'Detroit', 'United States', -83.0458, 42.3314],
      ['Stuttgart', 'Stuttgart Motor Parts Shop', 'Konigstrasse, Stuttgart', 'Stuttgart', 'Germany', 9.1775, 48.7758],
      ['Nagoya', 'Nagoya Motor Parts Shop', 'Sakae, Nagoya', 'Nagoya', 'Japan', 136.9066, 35.1687],
      ['Turin', 'Turin Motor Parts Shop', 'Corso Francia, Turin', 'Turin', 'Italy', 7.6586, 45.0703],
      ['Seoul', 'Seoul Motor Parts Shop', 'Seongsu-dong, Seoul', 'Seoul', 'South Korea', 127.0567, 37.5446],
      ['Bangkok', 'Bangkok Motor Parts Shop', 'Rama IX Road, Bangkok', 'Bangkok', 'Thailand', 100.5700, 13.7536],
      ['Mexico City', 'Mexico City Motor Parts Shop', 'Avenida Insurgentes, Mexico City', 'Mexico City', 'Mexico', -99.1677, 19.4050],
      ['Sao Paulo', 'Sao Paulo Motor Parts Shop', 'Avenida do Estado, Sao Paulo', 'Sao Paulo', 'Brazil', -46.6220, -23.5558],
      ['Dubai', 'Dubai Motor Parts Shop', 'Ras Al Khor Industrial Area, Dubai', 'Dubai', 'United Arab Emirates', 55.3421, 25.1910],
      ['Istanbul', 'Istanbul Motor Parts Shop', 'Ataturk Oto Sanayi, Istanbul', 'Istanbul', 'Turkey', 29.0214, 41.1089],
      ['Melbourne', 'Melbourne Motor Parts Shop', 'Elizabeth Street, Melbourne', 'Melbourne', 'Australia', 144.9609, -37.8116],
      ['Johannesburg', 'Johannesburg Motor Parts Shop', 'Main Reef Road, Johannesburg', 'Johannesburg', 'South Africa', 28.0473, -26.2041],
    ],
  },
  'raw_materials_packaging/metals': {
    assetClass: 'physical_goods',
    categoryLabel: 'Raw Materials & Packaging',
    subcategoryLabel: 'Metals',
    suffix: 'Metal Supply',
    businessType: 'metals and packaging material supplier',
    bio: 'Raw materials profile for metals, alloy lots, packaging inputs, and procurement-ready industrial supply offers.',
    bannerQuery: 'metal-supply',
    locations: [
      ['Shanghai', 'Shanghai Metal Supply', 'Yangshan Port Area, Shanghai', 'Shanghai', 'China', 121.7939, 30.6267],
      ['Singapore', 'Singapore Metal Supply', 'Tuas Avenue, Singapore', 'Singapore', 'Singapore', 103.6390, 1.3297],
      ['Rotterdam', 'Rotterdam Metal Supply', 'Maasvlakte, Rotterdam', 'Rotterdam', 'Netherlands', 4.0292, 51.9572],
      ['Dubai', 'Dubai Metal Supply', 'Jebel Ali, Dubai', 'Dubai', 'United Arab Emirates', 55.0678, 24.9857],
      ['Mumbai', 'Mumbai Metal Supply', 'Nhava Sheva Road, Navi Mumbai', 'Mumbai', 'India', 72.9487, 18.9490],
      ['Istanbul', 'Istanbul Metal Supply', 'Gebze Organized Industrial Zone, Istanbul', 'Istanbul', 'Turkey', 29.4376, 40.8064],
      ['Hamburg', 'Hamburg Metal Supply', 'Veddel, Hamburg', 'Hamburg', 'Germany', 10.0239, 53.5262],
      ['Houston', 'Houston Metal Supply', 'Port Houston, Houston', 'Houston', 'United States', -95.2655, 29.7368],
      ['Santiago', 'Santiago Metal Supply', 'Avenida Apoquindo, Santiago', 'Santiago', 'Chile', -70.5755, -33.4150],
      ['Johannesburg', 'Johannesburg Metal Supply', 'City Deep, Johannesburg', 'Johannesburg', 'South Africa', 28.0705, -26.2364],
      ['Seoul', 'Seoul Metal Supply', 'Guro Digital Complex, Seoul', 'Seoul', 'South Korea', 126.8954, 37.4853],
      ['Sydney', 'Sydney Metal Supply', 'Port Botany, Sydney', 'Sydney', 'Australia', 151.2215, -33.9604],
    ],
  },
  'luxury_collectibles/watches': {
    assetClass: 'physical_goods',
    categoryLabel: 'Luxury & Collectibles',
    subcategoryLabel: 'Watches',
    suffix: 'Time Shop',
    businessType: 'watch and collectible storefront',
    bio: 'Luxury collectible storefront focused on watches, curated timepiece drops, and provenance-aware presentation for premium marketplace buyers.',
    bannerQuery: 'watch-shop',
    locations: [
      ['Geneva', 'Geneva Time Shop', 'Rue du Rhone, Geneva', 'Geneva', 'Switzerland', 6.1500, 46.2044],
      ['Zurich', 'Zurich Time Shop', 'Bahnhofstrasse, Zurich', 'Zurich', 'Switzerland', 8.5392, 47.3686],
      ['London', 'London Time Shop', 'Bond Street, London', 'London', 'United Kingdom', -0.1455, 51.5129],
      ['New York', 'New York Time Shop', 'Madison Avenue, New York', 'New York', 'United States', -73.9707, 40.7794],
      ['Tokyo', 'Tokyo Time Shop', 'Ginza, Tokyo', 'Tokyo', 'Japan', 139.7671, 35.6719],
      ['Hong Kong', 'Hong Kong Time Shop', 'Canton Road, Hong Kong', 'Hong Kong', 'Hong Kong', 114.1680, 22.2964],
      ['Singapore', 'Singapore Time Shop', 'Marina Bay, Singapore', 'Singapore', 'Singapore', 103.8605, 1.2834],
      ['Dubai', 'Dubai Time Shop', 'Dubai Mall, Dubai', 'Dubai', 'United Arab Emirates', 55.2796, 25.1972],
      ['Paris', 'Paris Time Shop', 'Place Vendome, Paris', 'Paris', 'France', 2.3295, 48.8675],
      ['Milan', 'Milan Time Shop', 'Via Montenapoleone, Milan', 'Milan', 'Italy', 9.1950, 45.4681],
      ['Seoul', 'Seoul Time Shop', 'Apgujeong, Seoul', 'Seoul', 'South Korea', 127.0286, 37.5270],
      ['Los Angeles', 'Los Angeles Time Shop', 'Rodeo Drive, Beverly Hills', 'Los Angeles', 'United States', -118.4004, 34.0696],
    ],
  },
};

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonSql(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function loadMediaIpfsManifest() {
  try {
    const raw = await fs.readFile(MEDIA_IPFS_MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Missing ${MEDIA_IPFS_MANIFEST_PATH}. Pin avatar/banner media to IPFS first; seed profiles must not use generated placeholder or non-IPFS URLs.`,
      );
    }
    throw error;
  }
}

function getMediaIpfsEntry(mediaManifest, profileId, mediaKind) {
  const entry = mediaManifest?.profiles?.[profileId]?.[mediaKind];
  if (!entry?.url || !entry?.ipfsHash) {
    throw new Error(`Missing IPFS ${mediaKind} entry for ${profileId} in ${MEDIA_IPFS_MANIFEST_PATH}`);
  }
  if (!/^https:\/\/gateway\.pinata\.cloud\/ipfs\/[A-Za-z0-9]+/.test(entry.url)) {
    throw new Error(`Invalid ${mediaKind} IPFS gateway URL for ${profileId}: ${entry.url}`);
  }
  return entry;
}

function buildStoryDocument(profile, metadata) {
  const now = Date.now();
  const blocks = [
    {
      id: `${profile.profileId}-overview-heading`,
      type: 'heading',
      content: 'Marketplace Role',
    },
    {
      id: `${profile.profileId}-overview`,
      type: 'paragraph',
      content: `${profile.displayName} operates as a ${profile.businessType} based in ${profile.city}. The profile is seeded for beta testing with realistic storefront context, address metadata, and map-ready coordinates.`,
    },
    {
      id: `${profile.profileId}-capability-heading`,
      type: 'heading',
      content: 'Capability',
    },
    {
      id: `${profile.profileId}-capability`,
      type: 'paragraph',
      content: `Focus area: ${profile.categoryLabel} / ${profile.subcategoryLabel}. Typical work includes curated product presentation, buyer-ready metadata, repeat listing operations, and marketplace search coverage.`,
    },
    {
      id: `${profile.profileId}-trust-heading`,
      type: 'heading',
      content: 'Trust Notes',
    },
    {
      id: `${profile.profileId}-trust`,
      type: 'paragraph',
      content: 'Seed profile for v3.5 beta. KYC is not submitted, verified badge is false, and reputation values are synthetic testnet context only.',
    },
  ];

  return {
    draftBlocks: blocks,
    draftSettings: {
      category: profile.category,
      tags: [profile.subcategory, profile.city, profile.assetClass, 'testnet-beta'].join(', '),
    },
    publishedBlocks: blocks,
    publishedSettings: {
      category: profile.category,
      tags: [profile.subcategory, profile.city, profile.assetClass, 'testnet-beta'].join(', '),
    },
    seedProfileMetadata: metadata,
    updatedAt: now,
    publishedAt: now,
  };
}

function buildProfiles(indexRows, mediaManifest) {
  const laneCounters = new Map();
  return indexRows.map((row, index) => {
    const lane = `${row.category}/${row.subcategory}`;
    const config = laneConfigs[lane];
    if (!config) throw new Error(`Missing lane config for ${lane}`);

    const nextCount = (laneCounters.get(lane) || 0) + 1;
    laneCounters.set(lane, nextCount);
    const location = config.locations[(nextCount - 1) % config.locations.length];
    const [locationLabel, displayName, address, city, country, longitude, latitude] = location;
    const username = `@${slugify(displayName)}`;
    const walletAddress = String(row.walletAddress || '').trim().toLowerCase();
    const profileIndex = index + 1;
    const avatarMedia = getMediaIpfsEntry(mediaManifest, row.profileId, 'avatar');
    const bannerMedia = getMediaIpfsEntry(mediaManifest, row.profileId, 'banner');
    const metadata = {
      seed_source: 'orina_v3_5_beta_seed_profiles',
      seed_batch: SEED_BATCH,
      source_profile_id: row.profileId,
      profile_index: profileIndex,
      wallet_address: walletAddress,
      network: row.network || 'BSC Testnet (97)',
      asset_class: config.assetClass,
      primary_category: row.category,
      subcategory_focus: row.subcategory,
      category_label: config.categoryLabel,
      subcategory_label: config.subcategoryLabel,
      business_type: config.businessType,
      location_label: locationLabel,
      city,
      country,
      address,
      coordinates: { longitude, latitude },
      testnet: true,
      beta_seed: true,
      verified: false,
      kyc_status: 'not_submitted',
      map_visible: true,
      media_source: 'pinata_ipfs',
      avatar_url: avatarMedia.url,
      avatar_ipfs_hash: avatarMedia.ipfsHash,
      banner_url: bannerMedia.url,
      banner_ipfs_hash: bannerMedia.ipfsHash,
      synthetic_reputation: {
        rating: Number((4.2 + ((profileIndex % 7) * 0.07)).toFixed(2)),
        reviews: 4 + (profileIndex % 18),
        completed_orders: 8 + (profileIndex % 35),
      },
    };
    const profile = {
      profileId: row.profileId,
      walletAddress,
      displayName,
      username,
      bio: config.bio,
      avatarUrl: avatarMedia.url,
      bannerUrl: bannerMedia.url,
      website: `https://beta.orina.test/${slugify(displayName)}`,
      twitter: null,
      discord: null,
      telegram: null,
      isVerified: false,
      status: 'active',
      address,
      city,
      country,
      longitude,
      latitude,
      assetClass: config.assetClass,
      category: row.category,
      subcategory: row.subcategory,
      categoryLabel: config.categoryLabel,
      subcategoryLabel: config.subcategoryLabel,
      businessType: config.businessType,
      bannerQuery: config.bannerQuery,
      metadata,
    };
    profile.storyDocument = buildStoryDocument(profile, metadata);
    return profile;
  });
}

function validateProfiles(profiles) {
  const errors = [];
  const walletSet = new Set();
  const usernameSet = new Set();
  const nameSet = new Set();
  for (const profile of profiles) {
    if (!/^0x[a-f0-9]{40}$/.test(profile.walletAddress)) errors.push(`Invalid wallet ${profile.profileId}`);
    if (walletSet.has(profile.walletAddress)) errors.push(`Duplicate wallet ${profile.walletAddress}`);
    if (usernameSet.has(profile.username.toLowerCase())) errors.push(`Duplicate username ${profile.username}`);
    if (nameSet.has(profile.displayName.toLowerCase())) errors.push(`Duplicate display name ${profile.displayName}`);
    walletSet.add(profile.walletAddress);
    usernameSet.add(profile.username.toLowerCase());
    nameSet.add(profile.displayName.toLowerCase());
  }
  if (profiles.length !== 100) errors.push(`Expected 100 profiles, got ${profiles.length}`);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function buildCsv(profiles) {
  const headers = [
    'profileId',
    'displayName',
    'username',
    'walletAddress',
    'category',
    'subcategory',
    'city',
    'country',
    'address',
    'longitude',
    'latitude',
  ];
  const rows = profiles.map((profile) => headers.map((key) => csvEscape(profile[key])).join(','));
  return [headers.join(','), ...rows].join('\n') + '\n';
}

function buildMigration(profiles) {
  const payload = profiles.map((profile) => ({
    wallet_address: profile.walletAddress,
    display_name: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    banner_url: profile.bannerUrl,
    website: profile.website,
    is_verified: profile.isVerified,
    status: profile.status,
    address: profile.address,
    city: profile.city,
    longitude: profile.longitude,
    latitude: profile.latitude,
    story_document: profile.storyDocument,
    seed_profile_metadata: profile.metadata,
  }));

  return `-- ============================================================
-- 000077 - v3.5 beta seed profiles
-- ============================================================
-- Creates 100 realistic testnet beta profiles from the BSC testnet
-- campaign wallet index. No private keys are included.
-- ============================================================

do $$
declare
  payload jsonb := $seed$${JSON.stringify(payload)}$seed$::jsonb;
begin
  create temporary table tmp_v35_seed_profiles (
    row_index integer generated always as identity,
    wallet_address text not null,
    display_name text not null,
    username text not null,
    bio text not null,
    avatar_url text not null,
    banner_url text not null,
    website text null,
    is_verified boolean not null,
    status text not null,
    address text not null,
    city text not null,
    longitude numeric not null,
    latitude numeric not null,
    story_document jsonb not null,
    seed_profile_metadata jsonb not null
  ) on commit drop;

  insert into tmp_v35_seed_profiles (
    wallet_address,
    display_name,
    username,
    bio,
    avatar_url,
    banner_url,
    website,
    is_verified,
    status,
    address,
    city,
    longitude,
    latitude,
    story_document,
    seed_profile_metadata
  )
  select
    lower(trim(item ->> 'wallet_address')),
    item ->> 'display_name',
    item ->> 'username',
    item ->> 'bio',
    item ->> 'avatar_url',
    item ->> 'banner_url',
    nullif(item ->> 'website', ''),
    coalesce((item ->> 'is_verified')::boolean, false),
    coalesce(nullif(item ->> 'status', ''), 'active'),
    item ->> 'address',
    item ->> 'city',
    (item ->> 'longitude')::numeric,
    (item ->> 'latitude')::numeric,
    coalesce(item -> 'story_document', '{}'::jsonb),
    coalesce(item -> 'seed_profile_metadata', '{}'::jsonb)
  from jsonb_array_elements(payload) item;

  insert into public.profiles (
    wallet_address,
    display_name,
    username,
    bio,
    avatar_url,
    banner_url,
    website,
    is_verified,
    status,
    address,
    city,
    coordinates
  )
  select
    wallet_address,
    display_name,
    username::citext,
    bio,
    avatar_url,
    banner_url,
    website,
    is_verified,
    status,
    address,
    city,
    st_setsrid(st_makepoint(longitude, latitude), 4326)
  from tmp_v35_seed_profiles
  on conflict (wallet_address) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    bio = excluded.bio,
    avatar_url = excluded.avatar_url,
    banner_url = excluded.banner_url,
    website = excluded.website,
    is_verified = false,
    status = 'active',
    address = excluded.address,
    city = excluded.city,
    coordinates = excluded.coordinates,
    updated_at = now();

  insert into public.profile_story_documents (user_id, story_document)
  select
    profiles.id,
    seed.story_document
  from tmp_v35_seed_profiles seed
  join public.profiles profiles
    on profiles.wallet_address = seed.wallet_address
  on conflict (user_id) do update set
    story_document = excluded.story_document,
    updated_at = now();

  insert into public.user_preferences (
    user_id,
    notification_settings,
    ui_preferences,
    privacy_settings
  )
  select
    profiles.id,
    '{}'::jsonb,
    jsonb_build_object(
      'seed_profile_metadata',
      seed.seed_profile_metadata,
      'story_document',
      seed.story_document
    ),
    '{}'::jsonb
  from tmp_v35_seed_profiles seed
  join public.profiles profiles
    on profiles.wallet_address = seed.wallet_address
  on conflict (user_id) do update set
    ui_preferences = coalesce(public.user_preferences.ui_preferences, '{}'::jsonb)
      || jsonb_build_object(
        'seed_profile_metadata',
        excluded.ui_preferences -> 'seed_profile_metadata',
        'story_document',
        excluded.ui_preferences -> 'story_document'
      ),
    updated_at = now();

  perform public.refresh_marketplace_profile_browse_index_v1();
end $$;
`;
}

async function main() {
  const indexRows = JSON.parse(await fs.readFile(SOURCE_INDEX_PATH, 'utf8'));
  const mediaManifest = await loadMediaIpfsManifest();
  const profiles = buildProfiles(indexRows, mediaManifest);
  validateProfiles(profiles);
  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.writeFile(PREVIEW_JSON_PATH, JSON.stringify(profiles, null, 2) + '\n');
  await fs.writeFile(PREVIEW_CSV_PATH, buildCsv(profiles));
  await fs.writeFile(MIGRATION_PATH, buildMigration(profiles));

  const categoryCounts = profiles.reduce((acc, profile) => {
    const key = `${profile.category}/${profile.subcategory}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    ok: true,
    profiles: profiles.length,
    uniqueWallets: new Set(profiles.map((profile) => profile.walletAddress)).size,
    uniqueUsernames: new Set(profiles.map((profile) => profile.username.toLowerCase())).size,
    previewJson: PREVIEW_JSON_PATH,
    previewCsv: PREVIEW_CSV_PATH,
    migration: MIGRATION_PATH,
    categoryCounts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
