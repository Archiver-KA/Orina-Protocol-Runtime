import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
const DEFAULT_SITE_URL = 'https://app.orina.io';
const DEFAULT_SUPABASE_PROJECT_ID = 'vcixsdudkizgfikhmfuv';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaXhzZHVka2l6Z2Zpa2htZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTIyMjgsImV4cCI6MjA4NzU2ODIyOH0.Gk3PIFWYzEWwqTJ11E81WVQGtNyFZOdHa7PitY_Sf5o';
const DEFAULT_OG_IMAGE = '/orina-social-card.svg';
const DEFAULT_LIMIT = 120;
const BUILD_LASTMOD_ISO = resolveBuildLastModifiedIso();

const PRERENDER_CSS = `
#orina-prerender {
  min-height: 100vh;
  background:
    radial-gradient(circle at 14% 16%, rgba(44, 194, 149, 0.18), transparent 28%),
    radial-gradient(circle at 82% 14%, rgba(22, 79, 220, 0.18), transparent 24%),
    linear-gradient(180deg, #071018 0%, #05090d 100%);
  color: #eff6f7;
  font-family: "Google Sans", "Segoe UI", sans-serif;
}

#orina-prerender * {
  box-sizing: border-box;
}

#orina-prerender a {
  color: inherit;
  text-decoration: none;
}

#orina-prerender .orina-shell {
  max-width: 1180px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}

#orina-prerender .orina-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #8deccd;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

#orina-prerender .orina-title {
  max-width: 920px;
  margin: 18px 0 0;
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

#orina-prerender .orina-description {
  max-width: 760px;
  margin: 20px 0 0;
  color: rgba(233, 240, 242, 0.8);
  font-size: 1.03rem;
  line-height: 1.9;
}

#orina-prerender .orina-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 26px 0 0;
}

#orina-prerender .orina-link-primary,
#orina-prerender .orina-link-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 700;
}

#orina-prerender .orina-link-primary {
  background: #2cc295;
  color: #06130d;
}

#orina-prerender .orina-link-secondary {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.94);
}

#orina-prerender .orina-stats {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin: 34px 0 0;
}

#orina-prerender .orina-stat {
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.24);
}

#orina-prerender .orina-stat-label {
  color: rgba(230, 238, 239, 0.54);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

#orina-prerender .orina-stat-value {
  margin-top: 10px;
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

#orina-prerender .orina-grid {
  display: grid;
  gap: 24px;
  margin-top: 40px;
}

#orina-prerender .orina-grid.columns-2 {
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.95fr);
}

#orina-prerender .orina-panel {
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 60px -42px rgba(0, 0, 0, 0.55);
}

#orina-prerender .orina-panel h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.03em;
}

#orina-prerender .orina-panel p {
  margin: 12px 0 0;
  color: rgba(230, 238, 239, 0.72);
  line-height: 1.75;
}

#orina-prerender .orina-list {
  display: grid;
  gap: 12px;
  margin: 18px 0 0;
}

#orina-prerender .orina-card {
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

#orina-prerender .orina-card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

#orina-prerender .orina-card-meta {
  color: rgba(232, 239, 241, 0.58);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

#orina-prerender .orina-card-copy {
  color: rgba(232, 239, 241, 0.78);
  font-size: 0.92rem;
  line-height: 1.75;
}

#orina-prerender .orina-hero-media {
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.25);
}

#orina-prerender .orina-hero-media img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

#orina-prerender .orina-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

#orina-prerender .orina-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(241, 246, 247, 0.84);
  font-size: 0.78rem;
  font-weight: 700;
}

#orina-prerender .orina-breadcrumbs {
  margin: 0 0 18px;
  color: rgba(229, 237, 239, 0.58);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

#orina-prerender .orina-breadcrumbs span {
  margin: 0 8px;
}

@media (max-width: 900px) {
  #orina-prerender .orina-grid.columns-2 {
    grid-template-columns: 1fr;
  }
}
`;

function log(message) {
  process.stdout.write(`[prerender] ${message}\n`);
}

function warn(message) {
  process.stderr.write(`[prerender] ${message}\n`);
}

function resolveBuildLastModifiedIso() {
  const explicit = String(process.env.ORINA_PRERENDER_LASTMOD || '').trim();
  if (explicit) {
    const parsed = Date.parse(explicit);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }

  const sourceDateEpoch = String(process.env.SOURCE_DATE_EPOCH || '').trim();
  if (sourceDateEpoch) {
    const epochSeconds = Number(sourceDateEpoch);
    if (Number.isFinite(epochSeconds)) return new Date(epochSeconds * 1000).toISOString();

    const parsed = Date.parse(sourceDateEpoch);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function parseEnvFile(filePath, target) {
  if (!fileExists(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in target)) {
      target[key] = value;
    }
  }
}

function loadEnv() {
  const env = { ...process.env };
  parseEnvFile(path.join(ROOT_DIR, '.env.local'), env);
  parseEnvFile(path.join(ROOT_DIR, '.env'), env);
  return env;
}

function resolveSupabaseBuildEnv(siteEnv) {
  const configuredUrl = String(siteEnv.VITE_SUPABASE_URL || '').trim();
  const configuredProjectId = String(siteEnv.VITE_SUPABASE_PROJECT_ID || '').trim();
  const configuredApiKey = String(
    siteEnv.VITE_SUPABASE_ANON_KEY
    || siteEnv.VITE_SUPABASE_PUBLISHABLE_KEY
    || siteEnv.VITE_SUPABASE_LEGACY_ANON_KEY
    || ''
  ).trim();

  const supabaseUrl =
    configuredUrl
    || (configuredProjectId ? `https://${configuredProjectId}.supabase.co` : DEFAULT_SUPABASE_URL);
  const apiKey = configuredApiKey || DEFAULT_SUPABASE_ANON_KEY;
  const usingFallback = !configuredUrl || !configuredApiKey;

  return {
    supabaseUrl,
    apiKey,
    usingFallback,
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength = 160) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

function coalesceString(...values) {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function normalizeWallet(value) {
  const normalized = String(value || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return '';
  return normalized.toLowerCase();
}

function shortWallet(value) {
  const normalized = normalizeWallet(value);
  if (!normalized) return '';
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function titleCase(value) {
  return String(value || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildMarketplaceCategoryPath(categorySlug) {
  return `/marketplace/category/${encodeURIComponent(String(categorySlug || '').trim())}`;
}

function buildSearchCategoryPath(categorySlug) {
  return `/search/category/${encodeURIComponent(String(categorySlug || '').trim())}`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'collection';
}

function ensureAbsoluteUrl(siteUrl, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return `${siteUrl}${DEFAULT_OG_IMAGE}`;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${siteUrl}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function formatCount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toLocaleString('en-US');
}

function toIsoDate(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : BUILD_LASTMOD_ISO;
}

function maxIsoDate(values) {
  let latest = 0;

  for (const value of values) {
    const parsed = Date.parse(String(value || ''));
    if (Number.isFinite(parsed) && parsed > latest) {
      latest = parsed;
    }
  }

  return latest > 0 ? new Date(latest).toISOString() : BUILD_LASTMOD_ISO;
}

function createBreadcrumbList(siteUrl, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

function buildPanel(title, description, body = '') {
  return `
    <section class="orina-panel">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${body}
    </section>
  `;
}

function buildCardList(items) {
  if (!items.length) {
    return '<div class="orina-list"><div class="orina-card"><p class="orina-card-copy">No public items available in the current prerender snapshot.</p></div></div>';
  }

  return `
    <div class="orina-list">
      ${items.map((item) => `
        <a class="orina-card" href="${escapeHtml(item.href)}">
          <div class="orina-card-meta">${escapeHtml(item.meta || '')}</div>
          <h3 class="orina-card-title">${escapeHtml(item.title)}</h3>
          <div class="orina-card-copy">${escapeHtml(item.copy || '')}</div>
        </a>
      `).join('')}
    </div>
  `;
}

function buildChips(values) {
  const chips = values.filter(Boolean);
  if (!chips.length) return '';
  return `
    <div class="orina-chip-row">
      ${chips.map((value) => `<span class="orina-chip">${escapeHtml(value)}</span>`).join('')}
    </div>
  `;
}

function renderRouteShell({
  eyebrow,
  title,
  description,
  links = [],
  stats = [],
  mediaImage = '',
  mediaAlt = '',
  panels = [],
  breadcrumbs = [],
}) {
  const breadcrumbMarkup = breadcrumbs.length
    ? `
      <nav class="orina-breadcrumbs" aria-label="Breadcrumb">
        ${breadcrumbs.map((item, index) => {
          const content = item.href
            ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
            : `<strong>${escapeHtml(item.label)}</strong>`;
          return `${index > 0 ? '<span>/</span>' : ''}${content}`;
        }).join('')}
      </nav>
    `
    : '';

  return `
    <div class="orina-shell">
      ${breadcrumbMarkup}
      <div class="orina-badge">${escapeHtml(eyebrow)}</div>
      <h1 class="orina-title">${escapeHtml(title)}</h1>
      <p class="orina-description">${escapeHtml(description)}</p>
      ${links.length ? `
        <div class="orina-links">
          ${links.map((link) => `
            <a class="${link.primary ? 'orina-link-primary' : 'orina-link-secondary'}" href="${escapeHtml(link.href)}">
              ${escapeHtml(link.label)}
            </a>
          `).join('')}
        </div>
      ` : ''}
      ${stats.length ? `
        <div class="orina-stats">
          ${stats.map((stat) => `
            <div class="orina-stat">
              <div class="orina-stat-label">${escapeHtml(stat.label)}</div>
              <div class="orina-stat-value">${escapeHtml(stat.value)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="orina-grid ${mediaImage ? 'columns-2' : ''}">
        ${panels[0] || ''}
        ${mediaImage ? `
          <aside class="orina-hero-media">
            <img src="${escapeHtml(mediaImage)}" alt="${escapeHtml(mediaAlt || title)}" loading="eager" />
          </aside>
        ` : ''}
        ${panels.slice(mediaImage ? 1 : 0).join('')}
      </div>
    </div>
  `;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, replacement)
    : html.replace('</head>', `${replacement}\n    </head>`);
}

function upsertMeta(html, attribute, key, content) {
  const tag = `      <meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  return replaceTag(html, pattern, tag);
}

function upsertLink(html, rel, href) {
  const tag = `      <link rel="${rel}" href="${escapeHtml(href)}" />`;
  const pattern = new RegExp(`<link\\s+rel="${rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'i');
  return replaceTag(html, pattern, tag);
}

function upsertStructuredData(html, payload) {
  const tag = `      <script type="application/ld+json" data-prerender-jsonld="true">${JSON.stringify(payload)}</script>`;
  const pattern = /<script type="application\/ld\+json" data-prerender-jsonld="true">[\s\S]*?<\/script>/i;
  return replaceTag(html, pattern, tag);
}

function upsertPrerenderStyle(html) {
  const tag = `      <style data-orina-prerender="true">${PRERENDER_CSS}</style>`;
  const pattern = /<style data-orina-prerender="true">[\s\S]*?<\/style>/i;
  return replaceTag(html, pattern, tag);
}

function injectPrerenderBody(html, body) {
  if (html.includes('<div id="orina-prerender"></div>')) {
    return html.replace('<div id="orina-prerender"></div>', `<div id="orina-prerender">${body}</div>`);
  }

  return html.replace('<div id="root"></div>', `<div id="orina-prerender">${body}</div>\n      <div id="root"></div>`);
}

function applySeoToHtml(templateHtml, siteUrl, route) {
  const canonicalUrl = `${siteUrl}${route.path}`;
  const ogImage = ensureAbsoluteUrl(siteUrl, route.image || DEFAULT_OG_IMAGE);
  let html = templateHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  html = upsertMeta(html, 'name', 'description', route.description);
  html = upsertMeta(html, 'property', 'og:type', route.ogType || 'website');
  html = upsertMeta(html, 'property', 'og:site_name', 'Orina Protocol');
  html = upsertMeta(html, 'property', 'og:title', route.title);
  html = upsertMeta(html, 'property', 'og:description', route.description);
  html = upsertMeta(html, 'property', 'og:url', canonicalUrl);
  html = upsertMeta(html, 'property', 'og:image', ogImage);
  html = upsertMeta(html, 'property', 'og:image:alt', route.imageAlt || route.title);
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', route.title);
  html = upsertMeta(html, 'name', 'twitter:description', route.description);
  html = upsertMeta(html, 'name', 'twitter:image', ogImage);
  html = upsertLink(html, 'canonical', canonicalUrl);
  html = upsertPrerenderStyle(html);
  html = upsertStructuredData(html, route.structuredData);
  html = injectPrerenderBody(html, route.body);
  return html;
}

async function fetchRestRows(baseUrl, apiKey, table, params) {
  if (!baseUrl || !apiKey) return [];

  const url = new URL(`/rest/v1/${table}`, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`${table} responded with ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function loadPublicData(siteEnv) {
  const { supabaseUrl, apiKey, usingFallback } = resolveSupabaseBuildEnv(siteEnv);

  if (usingFallback) {
    warn('Supabase build env is incomplete. Using canonical public runtime fallbacks for prerender data.');
  }

  const limit = Math.max(20, Number.parseInt(siteEnv.ORINA_PRERENDER_LIMIT || '', 10) || DEFAULT_LIMIT);
  const results = await Promise.allSettled([
    fetchRestRows(supabaseUrl, apiKey, 'assets_catalog', {
      select: 'id,asset_uid,title,category,description,cover_image_url,metadata,seller_user_id,contract_address,token_id,chain_id,is_active,updated_at',
      is_active: 'eq.true',
      order: 'updated_at.desc',
      limit,
    }),
    fetchRestRows(supabaseUrl, apiKey, 'profiles', {
      select: 'id,wallet_address,display_name,username,bio,avatar_url,banner_url,is_verified,status,updated_at',
      status: 'eq.active',
      order: 'updated_at.desc',
      limit,
    }),
    fetchRestRows(supabaseUrl, apiKey, 'collections', {
      select: 'id,owner_user_id,owner_wallet_snapshot,slug,name,category,description,cover_image,bio,tags,verified,featured,updated_at',
      order: 'updated_at.desc',
      limit,
    }),
    fetchRestRows(supabaseUrl, apiKey, 'collection_assets', {
      select: 'collection_id,asset_id,added_at',
      order: 'added_at.asc',
      limit: limit * 12,
    }),
  ]);

  const [assetsResult, profilesResult, collectionsResult, collectionAssetsResult] = results;

  if (assetsResult.status === 'rejected') warn(`Asset fetch skipped: ${assetsResult.reason}`);
  if (profilesResult.status === 'rejected') warn(`Profile fetch skipped: ${profilesResult.reason}`);
  if (collectionsResult.status === 'rejected') warn(`Collection fetch skipped: ${collectionsResult.reason}`);
  if (collectionAssetsResult.status === 'rejected') warn(`Collection membership fetch skipped: ${collectionAssetsResult.reason}`);

  return {
    assets: assetsResult.status === 'fulfilled' ? assetsResult.value : [],
    profiles: profilesResult.status === 'fulfilled' ? profilesResult.value : [],
    collections: collectionsResult.status === 'fulfilled' ? collectionsResult.value : [],
    collectionAssets: collectionAssetsResult.status === 'fulfilled' ? collectionAssetsResult.value : [],
  };
}

function buildPublicDataset(rawData) {
  const profileById = new Map();
  const profileByWallet = new Map();

  const profiles = rawData.profiles
    .map((row) => {
      const walletAddress = normalizeWallet(row.wallet_address);
      if (!walletAddress) return null;
      const displayName = coalesceString(row.display_name, row.username, shortWallet(walletAddress));
      const profile = {
        id: String(row.id || '').trim(),
        walletAddress,
        displayName,
        username: String(row.username || '').trim(),
        bio: truncate(coalesceString(row.bio)),
        avatarUrl: coalesceString(row.avatar_url, row.banner_url),
        isVerified: Boolean(row.is_verified),
        updatedAt: row.updated_at,
      };

      profileById.set(profile.id, profile);
      profileByWallet.set(profile.walletAddress, profile);
      return profile;
    })
    .filter(Boolean);

  const assets = rawData.assets
    .map((row) => {
      const metadata = asRecord(row.metadata) || {};
      const metadataSeller = asRecord(metadata.seller) || {};
      const sellerProfile = profileById.get(String(row.seller_user_id || '').trim()) || null;
      const sellerWallet = normalizeWallet(
        coalesceString(
          sellerProfile?.walletAddress,
          metadataSeller.address,
          metadata.seller_wallet,
          metadata.ownerAddress,
          metadata.walletAddress,
          metadata.submittedByWallet,
        ),
      );

      const id = String(row.asset_uid || row.id || '').trim().toLowerCase();
      if (!id) return null;

      return {
        id,
        name: coalesceString(row.title, metadata.name, 'Untitled Asset'),
        description: truncate(coalesceString(row.description, metadata.description, 'Marketplace asset listed on Orina Protocol.'), 220),
        image: coalesceString(row.cover_image_url, metadata.image, ...asStringArray(metadata.images)),
        category: coalesceString(row.category, metadata.category, 'uncategorized'),
        sellerWallet,
        sellerName: coalesceString(
          sellerProfile?.displayName,
          metadataSeller.ensName,
          sellerWallet ? shortWallet(sellerWallet) : '',
        ),
        chainId: String(row.chain_id || metadata.chainId || '').trim(),
        tokenId: coalesceString(row.token_id, metadata.tokenId),
        updatedAt: row.updated_at,
      };
    })
    .filter(Boolean);

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const collectionAssetsByCollectionId = new Map();
  for (const row of rawData.collectionAssets) {
    const collectionId = String(row.collection_id || '').trim();
    const assetId = String(row.asset_id || '').trim().toLowerCase();
    if (!collectionId || !assetId) continue;
    const bucket = collectionAssetsByCollectionId.get(collectionId) || [];
    bucket.push(assetId);
    collectionAssetsByCollectionId.set(collectionId, bucket);
  }

  const collections = rawData.collections
    .map((row) => {
      const collectionId = String(row.id || '').trim();
      if (!collectionId) return null;

      const ownerWallet = normalizeWallet(row.owner_wallet_snapshot);
      const ownerProfile = profileById.get(String(row.owner_user_id || '').trim()) || profileByWallet.get(ownerWallet) || null;
      const assetIds = Array.from(new Set(collectionAssetsByCollectionId.get(collectionId) || []));
      const linkedAssets = assetIds.map((assetId) => assetById.get(assetId)).filter(Boolean);

      return {
        id: collectionId,
        slug: slugify(coalesceString(row.slug, row.name)),
        name: coalesceString(row.name, 'Untitled Collection'),
        description: truncate(coalesceString(row.bio, row.description, 'Curated collection published on Orina Protocol.'), 220),
        image: coalesceString(row.cover_image, linkedAssets[0]?.image),
        category: coalesceString(row.category, 'uncategorized'),
        ownerWallet,
        ownerName: coalesceString(
          ownerProfile?.displayName,
          ownerWallet ? shortWallet(ownerWallet) : '',
        ),
        assetIds,
        assets: linkedAssets.slice(0, 6),
        tags: asStringArray(row.tags).slice(0, 5),
        updatedAt: row.updated_at,
      };
    })
    .filter(Boolean);

  const listingCountByWallet = new Map();
  for (const asset of assets) {
    if (!asset.sellerWallet) continue;
    listingCountByWallet.set(asset.sellerWallet, (listingCountByWallet.get(asset.sellerWallet) || 0) + 1);
  }

  const collectionCountByWallet = new Map();
  for (const collection of collections) {
    if (!collection.ownerWallet) continue;
    collectionCountByWallet.set(
      collection.ownerWallet,
      (collectionCountByWallet.get(collection.ownerWallet) || 0) + 1,
    );
  }

  const derivedProfileWallets = new Set([
    ...profiles.map((profile) => profile.walletAddress),
    ...assets.map((asset) => asset.sellerWallet).filter(Boolean),
    ...collections.map((collection) => collection.ownerWallet).filter(Boolean),
  ]);

  const publicProfiles = Array.from(derivedProfileWallets)
    .map((walletAddress) => {
      const existing = profileByWallet.get(walletAddress);
      const listings = assets.filter((asset) => asset.sellerWallet === walletAddress).slice(0, 6);
      const ownedCollections = collections.filter((collection) => collection.ownerWallet === walletAddress).slice(0, 6);
      return {
        walletAddress,
        displayName: existing?.displayName || shortWallet(walletAddress),
        username: existing?.username || '',
        bio: existing?.bio || truncate(`Explore ${shortWallet(walletAddress)} on Orina Protocol.`, 140),
        image: existing?.avatarUrl || ownedCollections[0]?.image || listings[0]?.image || '',
        isVerified: Boolean(existing?.isVerified),
        listingCount: listingCountByWallet.get(walletAddress) || 0,
        collectionCount: collectionCountByWallet.get(walletAddress) || 0,
        listings,
        collections: ownedCollections,
        updatedAt: existing?.updatedAt || ownedCollections[0]?.updatedAt || listings[0]?.updatedAt || '',
      };
    })
    .sort((left, right) => {
      const byListings = right.listingCount - left.listingCount;
      if (byListings !== 0) return byListings;
      return right.collectionCount - left.collectionCount;
    });

  const publicProfileByWallet = new Map(
    publicProfiles.map((profile) => [profile.walletAddress, profile]),
  );
  const categoryKeys = Array.from(
    new Set(
      [
        ...assets.map((asset) => String(asset.category || '').trim()),
        ...collections.map((collection) => String(collection.category || '').trim()),
      ].filter(Boolean),
    ),
  );
  const categories = categoryKeys
    .map((categorySlug) => {
      const categoryAssets = assets.filter((asset) => asset.category === categorySlug);
      const categoryCollections = collections.filter((collection) => collection.category === categorySlug);
      const categoryProfiles = new Map();

      for (const asset of categoryAssets) {
        if (!asset.sellerWallet) continue;
        const profile = publicProfileByWallet.get(asset.sellerWallet);
        if (profile) categoryProfiles.set(profile.walletAddress, profile);
      }

      for (const collection of categoryCollections) {
        if (!collection.ownerWallet) continue;
        const profile = publicProfileByWallet.get(collection.ownerWallet);
        if (profile) categoryProfiles.set(profile.walletAddress, profile);
      }

      return {
        slug: categorySlug,
        label: titleCase(categorySlug),
        assetCount: categoryAssets.length,
        collectionCount: categoryCollections.length,
        profileCount: categoryProfiles.size,
        assets: categoryAssets.slice(0, 6),
        collections: categoryCollections.slice(0, 6),
        profiles: Array.from(categoryProfiles.values()).slice(0, 6),
        updatedAt: maxIsoDate([
          ...categoryAssets.map((asset) => asset.updatedAt),
          ...categoryCollections.map((collection) => collection.updatedAt),
        ]),
      };
    })
    .sort((left, right) => {
      const byAssetCount = right.assetCount - left.assetCount;
      if (byAssetCount !== 0) return byAssetCount;
      const byCollectionCount = right.collectionCount - left.collectionCount;
      if (byCollectionCount !== 0) return byCollectionCount;
      return left.label.localeCompare(right.label);
    });

  return {
    assets,
    collections,
    profiles: publicProfiles,
    categories,
  };
}

function buildCoreRoutes(siteUrl, dataset) {
  const topAssets = dataset.assets.slice(0, 6);
  const topCollections = dataset.collections.slice(0, 6);
  const topProfiles = dataset.profiles.slice(0, 6);
  const topCategories = dataset.categories.slice(0, 6);

  const organizationGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Orina Protocol',
        url: `${siteUrl}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/favicon.svg`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: 'Orina Protocol',
        description: 'Agent-to-agent marketplace for RWAs and NFTs with wallet-native public discovery.',
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        inLanguage: 'en',
      },
    ],
  };

  return [
    {
      group: 'core',
      path: '/',
      title: 'Orina Protocol | Agent-to-Agent Marketplace for RWA and NFTs',
      description: truncate(
        `Discover Orina Protocol with ${dataset.assets.length} public listings, ${dataset.collections.length} collections, and ${dataset.profiles.length} seller profiles available for public discovery.`,
        170,
      ),
      image: DEFAULT_OG_IMAGE,
      body: renderRouteShell({
        eyebrow: 'Orina Protocol',
        title: 'Agent-to-agent marketplace for RWAs and NFTs.',
        description: 'Explore public marketplace inventory, seller reputation, collections, and wallet-native commerce flows across Orina Protocol.',
        links: [
          { href: '/marketplace', label: 'Explore Marketplace', primary: true },
          { href: '/search', label: 'Search Protocol' },
        ],
        stats: [
          { label: 'Live Listings', value: formatCount(dataset.assets.length) },
          { label: 'Curated Collections', value: formatCount(dataset.collections.length) },
          { label: 'Seller Profiles', value: formatCount(dataset.profiles.length) },
        ],
        panels: [
          buildPanel(
            'Featured assets',
            'Public asset pages are now available as crawlable route-level entries.',
            buildCardList(
              topAssets.map((asset) => ({
                href: `/asset/${encodeURIComponent(asset.id)}`,
                meta: `${titleCase(asset.category)}${asset.sellerName ? ` • ${asset.sellerName}` : ''}`,
                title: asset.name,
                copy: asset.description,
              })),
            ),
          ),
          buildPanel(
            'Curated collections',
            'Collection pages expose grouped inventory and curator context.',
            buildCardList(
              topCollections.map((collection) => ({
                href: `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`,
                meta: `${titleCase(collection.category)} • ${collection.assets.length || collection.assetIds.length} items`,
                title: collection.name,
                copy: collection.description,
              })),
            ),
          ),
          buildPanel(
            'Public seller profiles',
            'Seller discovery now resolves to dedicated public profile URLs.',
            buildCardList(
              topProfiles.map((profile) => ({
                href: `/profile/${encodeURIComponent(profile.walletAddress)}`,
                meta: `${formatCount(profile.listingCount)} listings • ${formatCount(profile.collectionCount)} collections`,
                title: profile.displayName,
                copy: profile.bio,
              })),
            ),
          ),
        ],
      }),
      structuredData: organizationGraph,
      ogType: 'website',
      lastModified: BUILD_LASTMOD_ISO,
    },
    {
      group: 'core',
      path: '/marketplace',
      title: 'Marketplace | Orina Protocol',
      description: truncate(
        `Browse ${dataset.assets.length} public Orina Protocol listings spanning ${dataset.categories.length || 1} active marketplace categories.`,
        165,
      ),
      image: topAssets[0]?.image || DEFAULT_OG_IMAGE,
      body: renderRouteShell({
        eyebrow: 'Marketplace',
        title: 'Public marketplace inventory on Orina Protocol.',
        description: 'Browse route-level asset discovery with canonical asset detail pages, seller profile links, and collection-first exploration.',
        links: [
          { href: '/', label: 'Open Homepage' },
          { href: '/search', label: 'Search Listings', primary: true },
        ],
        stats: [
          { label: 'Public Listings', value: formatCount(dataset.assets.length) },
          { label: 'Active Categories', value: formatCount(dataset.categories.length) },
          { label: 'Seller Profiles', value: formatCount(dataset.profiles.length) },
        ],
        panels: [
          buildPanel(
            'Newest listings',
            'Marketplace entries now map to dedicated asset URLs that can be indexed and shared directly.',
            buildCardList(
              topAssets.map((asset) => ({
                href: `/asset/${encodeURIComponent(asset.id)}`,
                meta: `${titleCase(asset.category)}${asset.chainId ? ` • Chain ${asset.chainId}` : ''}`,
                title: asset.name,
                copy: asset.description,
              })),
            ),
          ),
          buildPanel(
            'Popular categories',
            'Top marketplace categories currently visible to public discovery.',
            buildCardList(
              topCategories.map((category) => ({
                href: buildMarketplaceCategoryPath(category.slug),
                meta: `${formatCount(category.assetCount)} listings`,
                title: category.label,
                copy: `Browse ${category.label} listings in the public Orina Protocol marketplace.`,
              })),
            ),
          ),
        ],
      }),
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: 'Orina Protocol Marketplace',
            url: `${siteUrl}/marketplace`,
            description: 'Public marketplace browse page for Orina Protocol.',
          },
          createBreadcrumbList(siteUrl, [
            { name: 'Home', path: '/' },
            { name: 'Marketplace', path: '/marketplace' },
          ]),
        ],
      },
      ogType: 'website',
      lastModified: BUILD_LASTMOD_ISO,
    },
    {
      group: 'core',
      path: '/search',
      title: 'Search | Orina Protocol',
      description: 'Search public Orina Protocol assets, collections, and seller profiles from a crawlable discovery surface.',
      image: topCollections[0]?.image || topAssets[0]?.image || DEFAULT_OG_IMAGE,
      body: renderRouteShell({
        eyebrow: 'Search',
        title: 'Search Orina Protocol public inventory.',
        description: 'Public search now resolves against assets, collections, and seller profiles that each have dedicated route-level pages.',
        links: [
          { href: '/marketplace', label: 'Browse Marketplace', primary: true },
          { href: '/', label: 'Back to Homepage' },
        ],
        stats: [
          { label: 'Indexed Assets', value: formatCount(dataset.assets.length) },
          { label: 'Indexed Collections', value: formatCount(dataset.collections.length) },
          { label: 'Indexed Profiles', value: formatCount(dataset.profiles.length) },
        ],
        panels: [
          buildPanel(
            'Searchable collections',
            'Collection routes group related inventory for stronger internal linking and richer search previews.',
            buildCardList(
              topCollections.map((collection) => ({
                href: `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`,
                meta: `${collection.ownerName || 'Curated'} • ${collection.assets.length || collection.assetIds.length} items`,
                title: collection.name,
                copy: collection.description,
              })),
            ),
          ),
          buildPanel(
            'Searchable profiles',
            'Seller profiles are now public route-level surfaces rather than modal-only destinations.',
            buildCardList(
              topProfiles.map((profile) => ({
                href: `/profile/${encodeURIComponent(profile.walletAddress)}`,
                meta: `${formatCount(profile.listingCount)} listings`,
                title: profile.displayName,
                copy: profile.bio,
              })),
            ),
          ),
        ],
      }),
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SearchResultsPage',
            name: 'Orina Protocol Search',
            url: `${siteUrl}/search`,
            description: 'Public search landing page for Orina Protocol.',
          },
          createBreadcrumbList(siteUrl, [
            { name: 'Home', path: '/' },
            { name: 'Search', path: '/search' },
          ]),
        ],
      },
      ogType: 'website',
      lastModified: BUILD_LASTMOD_ISO,
    },
  ];
}

function buildCategoryRoutes(siteUrl, dataset) {
  return dataset.categories.flatMap((category) => {
    const marketplacePath = buildMarketplaceCategoryPath(category.slug);
    const searchPath = buildSearchCategoryPath(category.slug);
    const heroImage = category.assets[0]?.image || category.collections[0]?.image || DEFAULT_OG_IMAGE;
    const categoryDescription = truncate(
      `Browse ${formatCount(category.assetCount)} public ${category.label} listings, ${formatCount(category.collectionCount)} collections, and ${formatCount(category.profileCount)} seller profiles on Orina Protocol.`,
      170,
    );
    const commonBreadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: category.label },
    ];

    return [
      {
        group: 'categories',
        path: marketplacePath,
        title: `${category.label} Marketplace | Orina Protocol`,
        description: categoryDescription,
        image: heroImage,
        imageAlt: `${category.label} marketplace on Orina Protocol`,
        body: renderRouteShell({
          eyebrow: 'Category Landing',
          title: `${category.label} marketplace on Orina Protocol.`,
          description: `Discover ${category.label} listings, curated collections, and active seller profiles across the public Orina Protocol marketplace.`,
          breadcrumbs: commonBreadcrumbs,
          links: [
            { href: '/marketplace', label: 'Browse All Categories', primary: true },
            { href: searchPath, label: `Search ${category.label}` },
          ],
          stats: [
            { label: 'Listings', value: formatCount(category.assetCount) },
            { label: 'Collections', value: formatCount(category.collectionCount) },
            { label: 'Profiles', value: formatCount(category.profileCount) },
          ],
          mediaImage: heroImage,
          mediaAlt: `${category.label} category preview`,
          panels: [
            buildPanel(
              'Featured listings',
              `Public ${category.label} listings now resolve to their own crawlable asset routes.`,
              buildCardList(
                category.assets.map((asset) => ({
                  href: `/asset/${encodeURIComponent(asset.id)}`,
                  meta: asset.sellerName ? `${asset.sellerName}${asset.chainId ? ` | Chain ${asset.chainId}` : ''}` : `Chain ${asset.chainId || 'Marketplace'}`,
                  title: asset.name,
                  copy: asset.description,
                })),
              ),
            ),
            buildPanel(
              'Curated collections',
              `Collection routes strengthen internal linking for ${category.label} discovery.`,
              buildCardList(
                category.collections.map((collection) => ({
                  href: `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`,
                  meta: `${collection.assets.length || collection.assetIds.length} items`,
                  title: collection.name,
                  copy: collection.description,
                })),
              ),
            ),
            buildPanel(
              'Active sellers',
              `Seller profile routes keep ${category.label} inventory discoverable beyond a single listing page.`,
              buildCardList(
                category.profiles.map((profile) => ({
                  href: `/profile/${encodeURIComponent(profile.walletAddress)}`,
                  meta: `${formatCount(profile.listingCount)} listings | ${formatCount(profile.collectionCount)} collections`,
                  title: profile.displayName,
                  copy: profile.bio,
                })),
              ),
            ),
          ],
        }),
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              name: `${category.label} Marketplace | Orina Protocol`,
              url: `${siteUrl}${marketplacePath}`,
              description: categoryDescription,
            },
            createBreadcrumbList(siteUrl, [
              { name: 'Home', path: '/' },
              { name: 'Marketplace', path: '/marketplace' },
              { name: category.label, path: marketplacePath },
            ]),
          ],
        },
        ogType: 'website',
        lastModified: toIsoDate(category.updatedAt),
      },
      {
        group: 'categories',
        path: searchPath,
        title: `${category.label} Search | Orina Protocol`,
        description: truncate(
          `Search ${category.label} assets, collections, and seller profiles across the public Orina Protocol marketplace.`,
          170,
        ),
        image: heroImage,
        imageAlt: `${category.label} search on Orina Protocol`,
        body: renderRouteShell({
          eyebrow: 'Category Search',
          title: `Search ${category.label} inventory on Orina Protocol.`,
          description: `Use the public Orina search surface to drill into ${category.label} listings, curators, and seller profiles from a category-specific entry point.`,
          breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: category.label },
          ],
          links: [
            { href: searchPath, label: `Search ${category.label}`, primary: true },
            { href: marketplacePath, label: `${category.label} Marketplace` },
          ],
          stats: [
            { label: 'Indexed Listings', value: formatCount(category.assetCount) },
            { label: 'Indexed Collections', value: formatCount(category.collectionCount) },
            { label: 'Indexed Profiles', value: formatCount(category.profileCount) },
          ],
          panels: [
            buildPanel(
              'Searchable listings',
              `Asset pages in ${category.label} carry canonical titles, metadata, and public seller links.`,
              buildCardList(
                category.assets.map((asset) => ({
                  href: `/asset/${encodeURIComponent(asset.id)}`,
                  meta: asset.chainId ? `Chain ${asset.chainId}` : 'Marketplace',
                  title: asset.name,
                  copy: asset.description,
                })),
              ),
            ),
            buildPanel(
              'Searchable collections',
              `Collections help category search resolve beyond individual items.`,
              buildCardList(
                category.collections.map((collection) => ({
                  href: `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`,
                  meta: collection.ownerName || 'Curated collection',
                  title: collection.name,
                  copy: collection.description,
                })),
              ),
            ),
            buildPanel(
              'Searchable sellers',
              `Profiles associated with ${category.label} inventory provide additional internal linking depth.`,
              buildCardList(
                category.profiles.map((profile) => ({
                  href: `/profile/${encodeURIComponent(profile.walletAddress)}`,
                  meta: `${formatCount(profile.listingCount)} listings`,
                  title: profile.displayName,
                  copy: profile.bio,
                })),
              ),
            ),
          ],
        }),
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SearchResultsPage',
              name: `${category.label} Search | Orina Protocol`,
              url: `${siteUrl}${searchPath}`,
              description: `Search ${category.label} assets, collections, and seller profiles on Orina Protocol.`,
            },
            createBreadcrumbList(siteUrl, [
              { name: 'Home', path: '/' },
              { name: 'Search', path: '/search' },
              { name: category.label, path: searchPath },
            ]),
          ],
        },
        ogType: 'website',
        lastModified: toIsoDate(category.updatedAt),
      },
    ];
  });
}

function buildAssetRoutes(siteUrl, dataset) {
  return dataset.assets.map((asset) => {
    const sellerHref = asset.sellerWallet ? `/profile/${encodeURIComponent(asset.sellerWallet)}` : '/marketplace';
    const chainLabel = asset.chainId ? `Chain ${asset.chainId}` : 'Marketplace';
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: asset.name },
    ];

    return {
      group: 'assets',
      path: `/asset/${encodeURIComponent(asset.id)}`,
      title: `${asset.name} | Orina Protocol`,
      description: truncate(
        `${asset.name} is listed on Orina Protocol in ${titleCase(asset.category)}${asset.sellerName ? ` by ${asset.sellerName}` : ''}. ${asset.description}`,
        170,
      ),
      image: asset.image || DEFAULT_OG_IMAGE,
      imageAlt: asset.name,
      body: renderRouteShell({
        eyebrow: 'Asset Details',
        title: asset.name,
        description: asset.description,
        breadcrumbs,
        links: [
          { href: sellerHref, label: asset.sellerName ? `View ${asset.sellerName}` : 'View seller', primary: true },
          { href: '/marketplace', label: 'Browse Marketplace' },
        ],
        stats: [
          { label: 'Category', value: titleCase(asset.category) },
          { label: 'Network', value: chainLabel },
          { label: 'Token', value: asset.tokenId || asset.id.slice(0, 12) },
        ],
        mediaImage: asset.image,
        mediaAlt: asset.name,
        panels: [
          buildPanel(
            'Marketplace context',
            'This asset page is prerendered from public marketplace data and resolves to the canonical route used by the Orina Protocol app shell.',
            buildChips([
              titleCase(asset.category),
              chainLabel,
              asset.sellerName || '',
            ]),
          ),
          buildPanel(
            'Seller route',
            'Seller profiles are public routes, so asset pages can pass both user traffic and crawl signals into profile-level discovery.',
            buildCardList([
              {
                href: sellerHref,
                meta: 'Public Profile',
                title: asset.sellerName || shortWallet(asset.sellerWallet) || 'Seller profile',
                copy: asset.sellerWallet || 'Open the seller profile to review public inventory and collections.',
              },
            ]),
          ),
        ],
      }),
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Product',
            name: asset.name,
            description: asset.description,
            image: ensureAbsoluteUrl(siteUrl, asset.image || DEFAULT_OG_IMAGE),
            category: titleCase(asset.category),
            url: `${siteUrl}/asset/${encodeURIComponent(asset.id)}`,
            brand: {
              '@type': 'Brand',
              name: 'Orina Protocol',
            },
          },
          createBreadcrumbList(siteUrl, [
            { name: 'Home', path: '/' },
            { name: 'Marketplace', path: '/marketplace' },
            { name: asset.name, path: `/asset/${encodeURIComponent(asset.id)}` },
          ]),
        ],
      },
      ogType: 'product',
      lastModified: toIsoDate(asset.updatedAt),
    };
  });
}

function buildProfileRoutes(siteUrl, dataset) {
  return dataset.profiles
    .filter((profile) => profile.walletAddress)
    .map((profile) => {
      const breadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Profiles', href: '/search' },
        { label: profile.displayName },
      ];

      return {
        group: 'profiles',
        path: `/profile/${encodeURIComponent(profile.walletAddress)}`,
        title: `${profile.displayName} | Orina Protocol`,
        description: truncate(
          `${profile.displayName} on Orina Protocol with ${profile.listingCount} public listings and ${profile.collectionCount} collections. ${profile.bio}`,
          170,
        ),
        image: profile.image || profile.listings[0]?.image || profile.collections[0]?.image || DEFAULT_OG_IMAGE,
        imageAlt: profile.displayName,
        body: renderRouteShell({
          eyebrow: 'Seller Profile',
          title: profile.displayName,
          description: profile.bio,
          breadcrumbs,
          links: [
            { href: '/marketplace', label: 'Browse Marketplace', primary: true },
            { href: '/search', label: 'Search Protocol' },
          ],
          stats: [
            { label: 'Listings', value: formatCount(profile.listingCount) },
            { label: 'Collections', value: formatCount(profile.collectionCount) },
            { label: 'Verification', value: profile.isVerified ? 'Verified' : 'Public' },
          ],
          mediaImage: profile.image,
          mediaAlt: profile.displayName,
          panels: [
            buildPanel(
              'Latest public listings',
              'Listings on this profile route resolve directly into asset detail pages.',
              buildCardList(
                profile.listings.map((asset) => ({
                  href: `/asset/${encodeURIComponent(asset.id)}`,
                  meta: `${titleCase(asset.category)}${asset.chainId ? ` • Chain ${asset.chainId}` : ''}`,
                  title: asset.name,
                  copy: asset.description,
                })),
              ),
            ),
            buildPanel(
              'Published collections',
              'Collections owned by this seller are exposed as public collection routes.',
              buildCardList(
                profile.collections.map((collection) => ({
                  href: `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`,
                  meta: `${titleCase(collection.category)} • ${collection.assets.length || collection.assetIds.length} items`,
                  title: collection.name,
                  copy: collection.description,
                })),
              ),
            ),
          ],
        }),
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ProfilePage',
              name: `${profile.displayName} | Orina Protocol`,
              description: profile.bio,
              url: `${siteUrl}/profile/${encodeURIComponent(profile.walletAddress)}`,
              mainEntity: {
                '@type': 'Person',
                name: profile.displayName,
                identifier: profile.walletAddress,
              },
            },
            createBreadcrumbList(siteUrl, [
              { name: 'Home', path: '/' },
              { name: 'Search', path: '/search' },
              { name: profile.displayName, path: `/profile/${encodeURIComponent(profile.walletAddress)}` },
            ]),
          ],
        },
        ogType: 'profile',
        lastModified: toIsoDate(profile.updatedAt),
      };
    });
}

function buildCollectionRoutes(siteUrl, dataset) {
  return dataset.collections.map((collection) => {
    const routePath = `/collections/${encodeURIComponent(`${collection.slug}--${collection.id}`)}`;
    const ownerHref = collection.ownerWallet ? `/profile/${encodeURIComponent(collection.ownerWallet)}` : '/search';
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Collections', href: '/search' },
      { label: collection.name },
    ];

    return {
      group: 'collections',
      path: routePath,
      title: `${collection.name} | Orina Protocol`,
      description: truncate(
        `${collection.name} is a public Orina Protocol collection in ${titleCase(collection.category)} with ${collection.assetIds.length} linked assets. ${collection.description}`,
        170,
      ),
      image: collection.image || collection.assets[0]?.image || DEFAULT_OG_IMAGE,
      imageAlt: collection.name,
      body: renderRouteShell({
        eyebrow: 'Collection',
        title: collection.name,
        description: collection.description,
        breadcrumbs,
        links: [
          { href: ownerHref, label: collection.ownerName ? `View ${collection.ownerName}` : 'View curator', primary: true },
          { href: '/search', label: 'Search Collections' },
        ],
        stats: [
          { label: 'Category', value: titleCase(collection.category) },
          { label: 'Assets', value: formatCount(collection.assetIds.length) },
          { label: 'Curator', value: collection.ownerName || shortWallet(collection.ownerWallet) || 'Public' },
        ],
        mediaImage: collection.image || collection.assets[0]?.image,
        mediaAlt: collection.name,
        panels: [
          buildPanel(
            'Collection assets',
            'Each linked asset below resolves into its own public asset route.',
            buildCardList(
              collection.assets.map((asset) => ({
                href: `/asset/${encodeURIComponent(asset.id)}`,
                meta: `${titleCase(asset.category)}${asset.sellerName ? ` • ${asset.sellerName}` : ''}`,
                title: asset.name,
                copy: asset.description,
              })),
            ),
          ),
          buildPanel(
            'Curator context',
            'Collection routes strengthen public discovery by linking grouped inventory back to a public seller profile.',
            buildCardList([
              {
                href: ownerHref,
                meta: 'Profile Route',
                title: collection.ownerName || shortWallet(collection.ownerWallet) || 'Curator profile',
                copy: collection.ownerWallet || 'Open the curator profile to explore additional public collections and listings.',
              },
            ]) + buildChips(collection.tags),
          ),
        ],
      }),
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: collection.name,
            description: collection.description,
            url: `${siteUrl}${routePath}`,
          },
          createBreadcrumbList(siteUrl, [
            { name: 'Home', path: '/' },
            { name: 'Search', path: '/search' },
            { name: collection.name, path: routePath },
          ]),
        ],
      },
      ogType: 'website',
      lastModified: toIsoDate(collection.updatedAt),
    };
  });
}

function writeRouteHtml(templateHtml, siteUrl, route) {
  const outputHtml = applySeoToHtml(templateHtml, siteUrl, route);
  const outputPath = route.path === '/'
    ? INDEX_HTML_PATH
    : path.join(DIST_DIR, route.path.replace(/^\/+/, ''), 'index.html');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, outputHtml, 'utf8');
}

function buildSitemapUrlSet(siteUrl, routes) {
  const urls = routes
    .map((route) => `
  <url>
    <loc>${escapeHtml(`${siteUrl}${route.path}`)}</loc>
    <lastmod>${escapeHtml(route.lastModified || BUILD_LASTMOD_ISO)}</lastmod>
  </url>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>
`;
}

function writeSitemaps(siteUrl, routes) {
  const partitions = [
    { name: 'core', routes: routes.filter((route) => route.group === 'core') },
    { name: 'assets', routes: routes.filter((route) => route.group === 'assets') },
    { name: 'profiles', routes: routes.filter((route) => route.group === 'profiles') },
    { name: 'collections', routes: routes.filter((route) => route.group === 'collections') },
    { name: 'categories', routes: routes.filter((route) => route.group === 'categories') },
  ];

  const sitemapEntries = partitions
    .map((partition) => {
      const fileName = `sitemap-${partition.name}.xml`;
      fs.writeFileSync(
        path.join(DIST_DIR, fileName),
        buildSitemapUrlSet(siteUrl, partition.routes),
        'utf8',
      );

      return `
  <sitemap>
    <loc>${escapeHtml(`${siteUrl}/${fileName}`)}</loc>
    <lastmod>${escapeHtml(maxIsoDate(partition.routes.map((route) => route.lastModified)))}</lastmod>
  </sitemap>`;
    })
    .join('');

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}
</sitemapindex>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapIndex, 'utf8');
}

async function main() {
  if (!fileExists(INDEX_HTML_PATH)) {
    throw new Error(`Build output is missing: ${INDEX_HTML_PATH}`);
  }

  const env = loadEnv();
  const siteUrl = String(env.VITE_SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '') || DEFAULT_SITE_URL;
  const templateHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const rawData = await loadPublicData(env);
  const dataset = buildPublicDataset(rawData);

  const routes = [
    ...buildCoreRoutes(siteUrl, dataset),
    ...buildCategoryRoutes(siteUrl, dataset),
    ...buildAssetRoutes(siteUrl, dataset),
    ...buildProfileRoutes(siteUrl, dataset),
    ...buildCollectionRoutes(siteUrl, dataset),
  ];

  for (const route of routes) {
    writeRouteHtml(templateHtml, siteUrl, route);
  }

  writeSitemaps(siteUrl, routes);
  log(`Generated ${routes.length} prerendered public routes.`);
}

main().catch((error) => {
  warn(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
