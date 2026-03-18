import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const projectRoot = process.cwd();
const rawDir = resolveFromRoot(args['raw-dir'] || 'data/geo/raw');
const outDir = resolveFromRoot(args['out-dir'] || 'data/geo/out');
const configPath = resolveFromRoot(args.config || 'data/geo/config/country-address-overrides.json');
const datasetVersion = String(args['dataset-version'] || new Date().toISOString().slice(0, 10));
const datasetKey = String(args['dataset-key'] || 'geo_reference_import');
const citiesFile = String(args['cities-file'] || 'cities15000.txt');
const strict = Boolean(args.strict);

const sourcePaths = {
  countriesCsv: path.join(rawDir, 'iso', 'countries.csv'),
  subdivisionsCsv: path.join(rawDir, 'iso', 'subdivisions.csv'),
  geonamesCountryInfo: path.join(rawDir, 'geonames', 'countryInfo.txt'),
  geonamesAdmin1: path.join(rawDir, 'geonames', 'admin1CodesASCII.txt'),
  geonamesAdmin2: path.join(rawDir, 'geonames', 'admin2Codes.txt'),
  geonamesCities: path.join(rawDir, 'geonames', citiesFile),
  geonamesOverrides: path.join(rawDir, 'mappings', 'geonames-admin-overrides.csv'),
};

const warnings = [];

main();

function main() {
  ensureDir(outDir);

  const countryOverrides = loadCountryOverrides(configPath);
  const isoCountries = loadIsoCountries(sourcePaths.countriesCsv, warnings);
  const subdivisions = loadSubdivisions(sourcePaths.subdivisionsCsv, warnings);
  const geonamesCountries = loadGeoNamesCountries(sourcePaths.geonamesCountryInfo, warnings);
  const geonamesAdmin1 = loadGeoNamesAdminRows(sourcePaths.geonamesAdmin1, 1, warnings);
  const geonamesAdmin2 = loadGeoNamesAdminRows(sourcePaths.geonamesAdmin2, 2, warnings);
  const geonamesOverrides = loadGeoNamesOverrides(sourcePaths.geonamesOverrides, warnings);

  const countries = buildCountries({
    isoCountries,
    geonamesCountries,
    subdivisions,
    countryOverrides,
    warnings,
  });

  const subdivisionPlaces = buildSubdivisionPlaces(subdivisions);
  const adminMappings = buildAdminMappings({
    subdivisionPlaces,
    geonamesAdmin1,
    geonamesAdmin2,
    geonamesOverrides,
    warnings,
  });

  const localityResult = buildLocalities({
    citiesPath: sourcePaths.geonamesCities,
    countries,
    adminMappings,
    parentPlaces: [...subdivisionPlaces, ...adminMappings.syntheticPlaces],
    warnings,
  });

  const allPlaces = [...subdivisionPlaces, ...adminMappings.syntheticPlaces, ...localityResult.places].sort(comparePlaces);

  const manifest = {
    datasetKey,
    datasetVersion,
    generatedAt: new Date().toISOString(),
    sourceFiles: Object.fromEntries(
      Object.entries(sourcePaths).map(([key, value]) => [key, relativeToRoot(value)])
    ),
    counts: {
      countries: countries.length,
      subdivisions: subdivisionPlaces.length,
      localities: localityResult.places.length,
      places: allPlaces.length,
      unmappedLocalities: localityResult.unmapped.length,
      warnings: warnings.length,
    },
    warningsPreview: warnings.slice(0, 100),
  };

  writeJson(path.join(outDir, 'geo-countries.json'), countries);
  writeJson(path.join(outDir, 'geo-places.json'), allPlaces);
  writeJson(path.join(outDir, 'geo-import-manifest.json'), manifest);
  writeCsv(path.join(outDir, 'geo-import-unmapped-localities.csv'), localityResult.unmapped, [
    'geoname_id',
    'country_code',
    'name',
    'admin1_code',
    'admin2_code',
    'reason',
  ]);
  fs.writeFileSync(path.join(outDir, 'geo-import.sql'), buildGeoImportSql({
    datasetKey,
    datasetVersion,
    countries,
    places: allPlaces,
    manifest,
  }));

  console.log(
    [
      `Geo import artifacts generated in ${relativeToRoot(outDir)}`,
      `Countries: ${countries.length}`,
      `Places: ${allPlaces.length}`,
      `Unmapped localities: ${localityResult.unmapped.length}`,
      `Warnings: ${warnings.length}`,
    ].join('\n')
  );

  if (strict && (warnings.length > 0 || localityResult.unmapped.length > 0)) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'help' || key === 'strict') {
      result[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  node scripts/geo/build-geo-import.mjs [options]',
      '',
      'Options:',
      '  --dataset-version  Version label written to geo_dataset_versions',
      '  --dataset-key      Dataset key written to geo_dataset_versions',
      '  --cities-file      GeoNames city dump file name under data/geo/raw/geonames',
      '  --raw-dir          Raw input directory',
      '  --out-dir          Artifact output directory',
      '  --config           Country override JSON path',
      '  --strict           Exit with code 1 when warnings or unmapped cities exist',
      '  --help             Show this message',
    ].join('\n')
  );
}

function resolveFromRoot(relativePathValue) {
  return path.resolve(projectRoot, relativePathValue);
}

function relativeToRoot(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function fail(message) {
  throw new Error(message);
}

function warn(list, code, message, detail = {}) {
  list.push({ code, message, ...detail });
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeCountryCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeAscii(value) {
  return String(value || '')
    .replace(/[ĐÐ]/g, 'D')
    .replace(/[đð]/g, 'd')
    .replace(/ß/g, 'ss')
    .replace(/[ÆǼ]/g, 'AE')
    .replace(/[æǽ]/g, 'ae')
    .replace(/[Ø]/g, 'O')
    .replace(/[ø]/g, 'o')
    .replace(/[Ł]/g, 'L')
    .replace(/[ł]/g, 'l')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeNameKey(value) {
  return normalizeAscii(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactKey(value) {
  return String(value || '').replace(/\s+/g, '');
}

function normalizeAdminMatchKey(value) {
  return normalizeNameKey(value)
    .replace(
      /\b(province|city|state|region|district|county|municipality|metropolitan|department|governorate|prefecture|territory|autonomous|republic|special|capital|federal|island|islands|parish|emirate|oblast|krai|rayon|canton|land|state of|city state)\b/g,
      ' '
    )
    .replace(/\b(hcmc)\b/g, 'ho chi minh')
    .replace(/\s+/g, ' ')
    .trim();
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').trim().toLowerCase();
  if (!text) return fallback;
  if (['1', 'true', 'yes', 'y'].includes(text)) return true;
  if (['0', 'false', 'no', 'n'].includes(text)) return false;
  return fallback;
}

function parseDelimitedLine(line, delimiter) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseDelimitedLine(lines[0], ',');
  return lines.slice(1).map((line) => rowFromCells(headers, parseDelimitedLine(line, ',')));
}

function parseTsv(text, skipComments = true) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !skipComments || !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

function rowFromCells(headers, cells) {
  const row = {};
  headers.forEach((header, index) => {
    row[String(header)] = String(cells[index] || '').trim();
  });
  return row;
}

function fieldValue(row, aliases) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const match = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);
    if (match && String(match[1] || '').trim()) return String(match[1]).trim();
  }
  return '';
}

function jsonOrDefault(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}

function loadCountryOverrides(filePath) {
  const text = readTextIfExists(filePath);
  if (!text) return {};
  const parsed = JSON.parse(text);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function loadIsoCountries(filePath, warningList) {
  const text = readTextIfExists(filePath);
  if (!text) {
    warn(warningList, 'missing_iso_countries', 'countries.csv was not found', {
      file: relativeToRoot(filePath),
    });
    return new Map();
  }

  const rows = parseCsv(text);
  const result = new Map();

  rows.forEach((row, index) => {
    const code = normalizeCountryCode(
      fieldValue(row, [
        'code',
        'country_code',
        'country_code_alpha2',
        'alpha2',
        'alpha_2',
        'iso2',
      ])
    );
    const iso3 = normalizeCode(
      fieldValue(row, [
        'iso3',
        'country_code_alpha3',
        'alpha3',
        'alpha_3',
        'code3',
      ])
    );
    const name = fieldValue(row, ['name', 'name_short', 'country', 'common_name', 'name_long']);

    if (!code || !iso3 || !name) {
      warn(warningList, 'invalid_iso_country_row', 'countries.csv row is missing code, iso3, or name', {
        row: index + 2,
      });
      return;
    }

    result.set(code, {
      code,
      iso3,
      name,
      nativeName: fieldValue(row, ['native_name', 'nativename']) || null,
      phoneCode: fieldValue(row, ['phone_code', 'calling_code']) || null,
      postalCodeLabel: fieldValue(row, ['postal_code_label']) || null,
      postalCodeRequired: toBoolean(fieldValue(row, ['postal_code_required']), false),
      postalCodePattern: fieldValue(row, ['postal_code_pattern', 'postal_regex']) || null,
    });
  });

  return result;
}

function loadGeoNamesCountries(filePath, warningList) {
  const text = readTextIfExists(filePath);
  if (!text) {
    warn(warningList, 'missing_geonames_country_info', 'countryInfo.txt was not found', {
      file: relativeToRoot(filePath),
    });
    return new Map();
  }

  const rows = parseTsv(text, true);
  const result = new Map();

  rows.forEach((cells) => {
    const code = normalizeCountryCode(cells[0]);
    if (!code) return;
    const phoneDigits = String(cells[12] || '').trim();
    result.set(code, {
      code,
      iso3: normalizeCode(cells[1]),
      name: String(cells[4] || '').trim(),
      capital: String(cells[5] || '').trim() || null,
      phoneCode: phoneDigits ? `+${phoneDigits.replace(/[^\d]/g, '')}` : null,
      postalCodePattern: String(cells[14] || '').trim() || null,
      geonameId: String(cells[16] || '').trim() || null,
      continent: String(cells[8] || '').trim() || null,
      currencyCode: String(cells[10] || '').trim() || null,
    });
  });

  return result;
}

function loadSubdivisions(filePath, warningList) {
  const text = readTextIfExists(filePath);
  if (!text) {
    fail(`Missing required subdivision source: ${relativeToRoot(filePath)}`);
  }

  const rows = parseCsv(text);
  const byCode = new Map();

  rows.forEach((row, index) => {
    const code = normalizeCode(
      fieldValue(row, [
        'code',
        'subdivision_code',
        'subdivision_code_iso3166-2',
        'subdivision_code_iso31662',
        'iso_3166_2',
        'iso31662',
      ])
    );
    const countryCode = normalizeCountryCode(
      fieldValue(row, ['country_code', 'country', 'country_code_alpha2']) || code.split('-')[0]
    );
    const name = fieldValue(row, ['name', 'subdivision_name']);

    if (!code || !countryCode || !name) {
      warn(warningList, 'invalid_subdivision_row', 'subdivisions.csv row is missing code, country, or name', {
        row: index + 2,
      });
      return;
    }

    const item = {
      code,
      countryCode,
      name,
      asciiName: normalizeAscii(name),
      parentCode:
        normalizeCode(fieldValue(row, ['parent_code', 'parent_subdivision_code', 'parent_subdivision'])) || null,
      type: fieldValue(row, ['type', 'subdivision_type', 'category']) || null,
      localName: fieldValue(row, ['local_name', 'localized_name', 'local_variant', 'localvariant']) || null,
      lat: toNumber(fieldValue(row, ['lat', 'latitude'])),
      lng: toNumber(fieldValue(row, ['lng', 'longitude', 'lon'])),
      geonamesAdmin1Code: fieldValue(row, ['geonames_admin1_code']) || null,
      geonamesAdmin2Code: fieldValue(row, ['geonames_admin2_code']) || null,
      languageCode: fieldValue(row, ['language_code']) || null,
    };

    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, item);
      return;
    }

    const existingRank = subdivisionLanguageRank(existing.languageCode);
    const nextRank = subdivisionLanguageRank(item.languageCode);
    if (nextRank > existingRank) {
      byCode.set(code, {
        ...item,
        localName: item.localName || existing.localName,
      });
      return;
    }

    if (!existing.localName && item.localName) {
      existing.localName = item.localName;
    }
  });

  const memo = new Map();
  const subdivisions = Array.from(byCode.values()).map((row) => ({
    ...row,
    depth: resolveSubdivisionDepth(row, byCode, memo, warningList),
  }));

  return subdivisions;
}

function subdivisionLanguageRank(languageCode) {
  const normalized = String(languageCode || '').trim().toLowerCase();
  if (normalized === 'en') return 3;
  if (!normalized) return 2;
  return 1;
}

function resolveSubdivisionDepth(row, byCode, memo, warningList, stack = []) {
  if (memo.has(row.code)) return memo.get(row.code);
  if (!row.parentCode) {
    memo.set(row.code, 1);
    return 1;
  }
  if (stack.includes(row.code)) {
    warn(warningList, 'subdivision_cycle', 'Subdivision parent cycle detected', {
      code: row.code,
    });
    memo.set(row.code, 1);
    return 1;
  }
  const parent = byCode.get(row.parentCode);
  if (!parent || parent.countryCode !== row.countryCode) {
    warn(warningList, 'missing_subdivision_parent', 'Subdivision parent was not found in the same country', {
      code: row.code,
      parentCode: row.parentCode,
    });
    memo.set(row.code, 1);
    return 1;
  }
  const depth = resolveSubdivisionDepth(parent, byCode, memo, warningList, [...stack, row.code]) + 1;
  if (depth > 5) {
    warn(warningList, 'subdivision_depth_capped', 'Subdivision depth exceeded admin5 and was capped', {
      code: row.code,
      depth,
    });
    memo.set(row.code, 5);
    return 5;
  }
  memo.set(row.code, depth);
  return depth;
}

function depthToAdminKind(depth) {
  return `admin${Math.max(1, Math.min(depth, 5))}`;
}

function buildCountries({ isoCountries, geonamesCountries, subdivisions, countryOverrides, warnings: warningList }) {
  const countryCodes = new Set([
    ...isoCountries.keys(),
    ...geonamesCountries.keys(),
    ...subdivisions.map((row) => row.countryCode),
    ...Object.keys(countryOverrides),
  ]);

  return Array.from(countryCodes)
    .sort()
    .map((code) => {
      const iso = isoCountries.get(code) || {};
      const geonames = geonamesCountries.get(code) || {};
      const override = countryOverrides[code] || {};
      const hasAdmin = subdivisions.some((row) => row.countryCode === code);
      const maxDepth = Math.max(0, ...subdivisions.filter((row) => row.countryCode === code).map((row) => row.depth));
      const name = override.name || iso.name || geonames.name || code;
      const iso3 = normalizeCode(override.iso3 || iso.iso3 || geonames.iso3);

      if (!iso3) {
        warn(warningList, 'missing_country_iso3', 'Country is missing an ISO alpha-3 code', { code });
      }

      return {
        code,
        iso3: iso3 || 'UNK',
        name,
        native_name: jsonOrDefault(override.nativeName, iso.nativeName || null),
        phone_code: jsonOrDefault(override.phoneCode, iso.phoneCode || geonames.phoneCode || null),
        postal_code_label: override.postalCodeLabel || iso.postalCodeLabel || 'Postal code',
        postal_code_required: override.postalCodeRequired ?? iso.postalCodeRequired ?? Boolean(geonames.postalCodePattern),
        postal_code_pattern:
          override.postalCodePattern || iso.postalCodePattern || geonames.postalCodePattern || null,
        address_schema: override.addressSchema || defaultAddressSchema(hasAdmin, maxDepth),
        is_active: override.isActive ?? true,
        metadata: {
          source: {
            iso: Boolean(iso.name),
            geonames: Boolean(geonames.name),
            overrides: Object.keys(override).length > 0,
          },
          geonameId: geonames.geonameId || null,
          capital: geonames.capital || null,
          continent: geonames.continent || null,
          currencyCode: geonames.currencyCode || null,
        },
      };
    });
}

function defaultAddressSchema(hasAdmin, maxDepth) {
  if (!hasAdmin || maxDepth <= 0) {
    return {
      levels: [{ kind: 'locality', label: 'City / Locality', required: true }],
    };
  }

  const labels = {
    admin1: 'Region',
    admin2: 'District',
    admin3: 'Subdistrict',
    admin4: 'Area',
    admin5: 'Zone',
  };

  const levels = [];
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const kind = depthToAdminKind(depth);
    levels.push({
      kind,
      label: labels[kind] || `Admin ${depth}`,
      required: depth === 1,
    });
  }
  levels.push({ kind: 'locality', label: 'City / Locality', required: true });
  return { levels };
}

function buildSubdivisionPlaces(subdivisions) {
  return subdivisions.map((row) => ({
    id: row.code,
    country_code: row.countryCode,
    parent_id: row.parentCode || null,
    depth: row.depth,
    place_kind: depthToAdminKind(row.depth),
    code: row.code,
    name: row.name,
    name_ascii: row.asciiName || row.name,
    label: row.type || null,
    is_selectable: true,
    sort_order: 0,
    lat: row.lat,
    lng: row.lng,
    postal_code_pattern: null,
    metadata: {
      source: 'iso3166-2',
      localName: row.localName,
      type: row.type,
      geonamesAdmin1Code: row.geonamesAdmin1Code,
      geonamesAdmin2Code: row.geonamesAdmin2Code,
    },
  }));
}

function loadGeoNamesAdminRows(filePath, adminLevel, warningList) {
  const text = readTextIfExists(filePath);
  if (!text) {
    warn(warningList, `missing_geonames_admin${adminLevel}`, `admin${adminLevel} file was not found`, {
      file: relativeToRoot(filePath),
    });
    return [];
  }

  return parseTsv(text, true).map((cells) => {
    const key = String(cells[0] || '').trim();
    const parts = key.split('.');
    return {
      key,
      adminLevel,
      countryCode: normalizeCountryCode(parts[0]),
      parentKey: adminLevel === 2 ? `${parts[0]}.${parts[1]}` : null,
      name: String(cells[1] || '').trim(),
      asciiName: String(cells[2] || '').trim() || String(cells[1] || '').trim(),
      geonameId: String(cells[3] || '').trim() || null,
    };
  });
}

function loadGeoNamesOverrides(filePath, warningList) {
  const text = readTextIfExists(filePath);
  if (!text) return new Map();

  const rows = parseCsv(text);
  const result = new Map();

  rows.forEach((row, index) => {
    const geonamesCode = fieldValue(row, ['geonames_code']);
    const adminLevel = fieldValue(row, ['admin_level']);
    const placeId = fieldValue(row, ['place_id', 'subdivision_code']);
    if (!geonamesCode || !adminLevel || !placeId) {
      warn(warningList, 'invalid_geonames_override', 'Override row is missing geonames_code, admin_level, or place_id', {
        row: index + 2,
      });
      return;
    }
    result.set(`${adminLevel}:${geonamesCode}`, normalizeCode(placeId));
  });

  return result;
}

function buildAdminMappings({
  subdivisionPlaces,
  geonamesAdmin1,
  geonamesAdmin2,
  geonamesOverrides,
  warnings: warningList,
}) {
  const byCountryDepthName = new Map();
  const byCountryDepthAdminMatch = new Map();
  const placeById = new Map(subdivisionPlaces.map((place) => [place.id, place]));
  const admin1 = new Map();
  const admin2 = new Map();
  const syntheticPlaces = [];

  subdivisionPlaces.forEach((place) => {
    for (const key of buildPlaceMatchKeys(place)) {
      const exactBucketKey = `${place.country_code}:${place.depth}:${key.exact}`;
      const exactBucket = byCountryDepthName.get(exactBucketKey) || [];
      exactBucket.push(place);
      byCountryDepthName.set(exactBucketKey, exactBucket);

      const fuzzyBucketKey = `${place.country_code}:${place.depth}:${key.fuzzy}`;
      const fuzzyBucket = byCountryDepthAdminMatch.get(fuzzyBucketKey) || [];
      fuzzyBucket.push(place);
      byCountryDepthAdminMatch.set(fuzzyBucketKey, fuzzyBucket);
    }

    const admin1Code = place.metadata?.geonamesAdmin1Code;
    const admin2Code = place.metadata?.geonamesAdmin2Code;
    if (place.place_kind === 'admin1' && admin1Code) {
      admin1.set(String(admin1Code), place.id);
    }
    if (place.place_kind === 'admin2' && admin2Code) {
      admin2.set(String(admin2Code), place.id);
    }
  });

  geonamesAdmin1.forEach((row) => {
    const overrideKey = `admin1:${row.key}`;
    if (geonamesOverrides.has(overrideKey)) {
      admin1.set(row.key, geonamesOverrides.get(overrideKey));
      return;
    }
    if (admin1.has(row.key)) return;
    const candidates = resolveAdminCandidates({
      countryCode: row.countryCode,
      depth: 1,
      name: row.name,
      asciiName: row.asciiName,
      byCountryDepthName,
      byCountryDepthAdminMatch,
    });
    if (candidates.length === 1) {
      admin1.set(row.key, candidates[0].id);
    }
  });

  geonamesAdmin2.forEach((row) => {
    const overrideKey = `admin2:${row.key}`;
    if (geonamesOverrides.has(overrideKey)) {
      admin2.set(row.key, geonamesOverrides.get(overrideKey));
      return;
    }
    if (admin2.has(row.key)) return;
    const parentId = row.parentKey ? admin1.get(row.parentKey) : null;
    const candidates = resolveAdminCandidates({
      countryCode: row.countryCode,
      depth: 2,
      name: row.name,
      asciiName: row.asciiName,
      byCountryDepthName,
      byCountryDepthAdminMatch,
    }).filter((place) => !parentId || place.parent_id === parentId);
    if (candidates.length === 1) {
      admin2.set(row.key, candidates[0].id);
    } else if (candidates.length > 1) {
      warn(warningList, 'ambiguous_admin2_mapping', 'Multiple subdivision candidates matched a GeoNames admin2 row', {
        geonamesCode: row.key,
      });
    }
  });

  geonamesAdmin2.forEach((row) => {
    if (admin2.has(row.key)) return;
    const parentId = row.parentKey ? admin1.get(row.parentKey) : null;
    const parent = parentId ? placeById.get(parentId) : null;
    if (!parent) return;

    const syntheticId = `GA2-${row.key.replace(/\./g, '-')}`;
    const syntheticPlace = {
      id: syntheticId,
      country_code: row.countryCode,
      parent_id: parent.id,
      depth: Math.min(Number(parent.depth || 1) + 1, 5),
      place_kind: 'admin2',
      code: row.key.split('.').pop() || null,
      name: row.name,
      name_ascii: row.asciiName || row.name,
      label: 'Admin 2',
      is_selectable: true,
      sort_order: 0,
      lat: null,
      lng: null,
      postal_code_pattern: null,
      metadata: {
        source: 'geonames_admin2',
        geonameId: row.geonameId,
        geonamesCode: row.key,
      },
    };

    syntheticPlaces.push(syntheticPlace);
    placeById.set(syntheticId, syntheticPlace);
    admin2.set(row.key, syntheticId);
  });

  return {
    admin1,
    admin2,
    syntheticPlaces,
  };
}

function buildPlaceMatchKeys(place) {
  const values = [
    place.name,
    place.name_ascii,
    place.metadata?.localName,
  ].filter(Boolean);

  const pairs = [];
  for (const value of values) {
    const exact = normalizeNameKey(value);
    const fuzzy = normalizeAdminMatchKey(value);
    pairs.push({
      exact,
      fuzzy,
    });
    pairs.push({
      exact: compactKey(exact),
      fuzzy: compactKey(fuzzy),
    });
  }

  return dedupeObjects(pairs, (item) => `${item.exact}|${item.fuzzy}`);
}

function resolveAdminCandidates({
  countryCode,
  depth,
  name,
  asciiName,
  byCountryDepthName,
  byCountryDepthAdminMatch,
}) {
  const exactName = normalizeNameKey(name);
  const exactAscii = normalizeNameKey(asciiName);
  const exactKeys = dedupeStrings([
    exactName,
    exactAscii,
    compactKey(exactName),
    compactKey(exactAscii),
  ]);
  for (const key of exactKeys) {
    const candidates = byCountryDepthName.get(`${countryCode}:${depth}:${key}`) || [];
    if (candidates.length > 0) return candidates;
  }

  const fuzzyName = normalizeAdminMatchKey(name);
  const fuzzyAscii = normalizeAdminMatchKey(asciiName);
  const fuzzyKeys = dedupeStrings([
    fuzzyName,
    fuzzyAscii,
    compactKey(fuzzyName),
    compactKey(fuzzyAscii),
  ]);
  for (const key of fuzzyKeys) {
    const candidates = byCountryDepthAdminMatch.get(`${countryCode}:${depth}:${key}`) || [];
    if (candidates.length > 0) return candidates;
  }

  const allCandidates = [];
  for (const key of fuzzyKeys) {
    if (!key) continue;
    for (const [bucketKey, bucket] of byCountryDepthAdminMatch.entries()) {
      if (!bucketKey.startsWith(`${countryCode}:${depth}:`)) continue;
      const matchKey = bucketKey.split(':').slice(2).join(':');
      if (!matchKey) continue;
      if (matchKey === key || matchKey.includes(key) || key.includes(matchKey)) {
        allCandidates.push(...bucket);
      }
    }
  }

  return dedupeObjects(allCandidates, (item) => item.id);
}

function dedupeStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function dedupeObjects(values, keyFn) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function buildLocalities({ citiesPath, countries, adminMappings, parentPlaces, warnings: warningList }) {
  const text = readTextIfExists(citiesPath);
  if (!text) {
    warn(warningList, 'missing_geonames_cities', 'GeoNames city dump was not found', {
      file: relativeToRoot(citiesPath),
    });
    return { places: [], unmapped: [] };
  }

  const countrySet = new Set(countries.map((country) => country.code));
  const byId = new Map(parentPlaces.map((place) => [place.id, place]));
  const places = [];
  const unmapped = [];

  parseTsv(text, false).forEach((cells) => {
    const geonameId = String(cells[0] || '').trim();
    const countryCode = normalizeCountryCode(cells[8]);
    const featureClass = String(cells[6] || '').trim();
    const name = String(cells[1] || '').trim();
    const asciiName = String(cells[2] || '').trim() || name;

    if (!geonameId || !countrySet.has(countryCode) || featureClass !== 'P' || !name) return;

    const admin1Code = String(cells[10] || '').trim();
    const admin2Code = String(cells[11] || '').trim();
    const admin1Key = admin1Code ? `${countryCode}.${admin1Code}` : '';
    const admin2Key = admin2Code ? `${countryCode}.${admin1Code}.${admin2Code}` : '';
    const parentId =
      (admin2Key && adminMappings.admin2.get(admin2Key))
      || (admin1Key && adminMappings.admin1.get(admin1Key))
      || null;

    if (!parentId || !byId.has(parentId)) {
      unmapped.push({
        geoname_id: geonameId,
        country_code: countryCode,
        name,
        admin1_code: admin1Code,
        admin2_code: admin2Code,
        reason: 'no_parent_mapping',
      });
      return;
    }

    const parent = byId.get(parentId);
    places.push({
      id: `GN-${geonameId}`,
      country_code: countryCode,
      parent_id: parent.id,
      depth: Math.min(Number(parent.depth || 1) + 1, 6),
      place_kind: 'locality',
      code: null,
      name,
      name_ascii: asciiName,
      label: null,
      is_selectable: true,
      sort_order: 0,
      lat: toNumber(cells[4]),
      lng: toNumber(cells[5]),
      postal_code_pattern: null,
      metadata: {
        source: 'geonames',
        geonameId,
        featureCode: String(cells[7] || '').trim() || null,
        admin1Code: admin1Code || null,
        admin2Code: admin2Code || null,
        population: toInteger(cells[14]),
        timezone: String(cells[17] || '').trim() || null,
      },
    });
  });

  if (unmapped.length > 0) {
    warn(warningList, 'unmapped_localities', 'Some GeoNames localities were skipped because no subdivision mapping was found', {
      count: unmapped.length,
    });
  }

  return { places, unmapped };
}

function comparePlaces(left, right) {
  return (
    left.depth - right.depth
    || left.country_code.localeCompare(right.country_code)
    || String(left.parent_id || '').localeCompare(String(right.parent_id || ''))
    || left.name.localeCompare(right.name)
  );
}

function toNumber(value) {
  const parsed = Number(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(filePath, rows, columns) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(','));
  fs.writeFileSync(filePath, `${[header, ...body].join('\n')}\n`);
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildGeoImportSql({ datasetKey, datasetVersion, countries, places, manifest }) {
  const countryColumns = [
    'code',
    'iso3',
    'name',
    'native_name',
    'phone_code',
    'postal_code_label',
    'postal_code_required',
    'postal_code_pattern',
    'address_schema',
    'is_active',
    'metadata',
  ];

  const placeColumns = [
    'id',
    'country_code',
    'parent_id',
    'depth',
    'place_kind',
    'code',
    'name',
    'name_ascii',
    'label',
    'is_selectable',
    'sort_order',
    'lat',
    'lng',
    'postal_code_pattern',
    'metadata',
  ];

  const statements = [
    '-- Generated by scripts/geo/build-geo-import.mjs',
    `-- Dataset version: ${datasetVersion}`,
    'begin;',
    buildUpsertStatement('geo_countries', countryColumns, countries, 'code'),
    buildUpsertStatement('geo_places', placeColumns, places, 'id'),
    buildDatasetVersionStatement(datasetKey, datasetVersion, manifest),
    'commit;',
    '',
  ];

  return statements.filter(Boolean).join('\n');
}

function buildUpsertStatement(tableName, columns, rows, conflictTarget) {
  if (rows.length === 0) return '';

  const updateColumns = columns.filter((column) => column !== conflictTarget);
  const valueLines = rows.map((row) => `  (${columns.map((column) => sqlLiteralForColumn(column, row[column])).join(', ')})`);

  return [
    `insert into public.${tableName} (`,
    `  ${columns.join(', ')}`,
    ')',
    'values',
    valueLines.join(',\n'),
    `on conflict (${conflictTarget}) do update`,
    'set',
    `  ${updateColumns.map((column) => `${column} = excluded.${column}`).join(',\n  ')};`,
    '',
  ].join('\n');
}

function buildDatasetVersionStatement(datasetKey, datasetVersion, manifest) {
  return [
    'insert into public.geo_dataset_versions (',
    '  dataset_key,',
    '  dataset_version,',
    '  metadata',
    ')',
    'values (',
    `  ${sqlLiteral(datasetKey)},`,
    `  ${sqlLiteral(datasetVersion)},`,
    `  ${sqlJson({
      generatedAt: manifest.generatedAt,
      counts: manifest.counts,
      sourceFiles: manifest.sourceFiles,
    })}`,
    ')',
    'on conflict (dataset_key, dataset_version) do update',
    'set metadata = excluded.metadata;',
    '',
  ].join('\n');
}

function sqlLiteralForColumn(column, value) {
  if (column === 'address_schema' || column === 'metadata') {
    return sqlJson(value || {});
  }
  return sqlLiteral(value);
}

function sqlJson(value) {
  return `${sqlLiteral(JSON.stringify(value || {}))}::jsonb`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined || value === '') return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}
