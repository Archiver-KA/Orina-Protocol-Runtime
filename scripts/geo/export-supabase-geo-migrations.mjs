import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const projectRoot = process.cwd();
const countriesPath = resolveFromRoot(args['countries-json'] || 'data/geo/out/geo-countries.json');
const placesPath = resolveFromRoot(args['places-json'] || 'data/geo/out/geo-places.json');
const manifestPath = resolveFromRoot(args.manifest || 'data/geo/out/geo-import-manifest.json');
const outDir = resolveFromRoot(args['out-dir'] || 'data/geo/out/chunked-migrations');
const migrationStart = Math.max(1, Number.parseInt(String(args['migration-start'] || '23'), 10) || 23);
const migrationPrefix = String(args['migration-prefix'] || 'c9_geo_reference_import_global');
const cleanupSeed = String(args['cleanup-seed'] || '').trim();
const priorityCountries = String(args['priority-countries'] || 'US,CA,GB,VN,JP,DE')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const placeBatchSize = Math.max(1, Number.parseInt(String(args['place-batch-size'] || '15000'), 10) || 15000);

main();

function main() {
  const countries = readJsonArray(countriesPath);
  const places = readJsonArray(placesPath);
  const manifest = readJsonObject(manifestPath);
  const datasetKey = String(args['dataset-key'] || manifest.datasetKey || 'geo_reference_import');
  const datasetVersion = String(args['dataset-version'] || manifest.datasetVersion || new Date().toISOString().slice(0, 10));

  ensureDir(outDir);

  const orderedPlaces = prioritizePlaces(places, priorityCountries);
  const files = buildMigrationFiles({
    datasetKey,
    datasetVersion,
    countries,
    places: orderedPlaces,
    manifest,
    migrationStart,
    migrationPrefix,
    cleanupSeed,
    placeBatchSize,
  });

  for (const file of files) {
    fs.writeFileSync(path.join(outDir, file.fileName), file.content);
  }

  const exportManifest = {
    generatedAt: new Date().toISOString(),
    datasetKey,
    datasetVersion,
    migrationStart,
    migrationPrefix,
    placeBatchSize,
    priorityCountries,
    cleanupSeed: cleanupSeed || null,
    files: files.map((file) => ({
      sequence: file.sequence,
      fileName: file.fileName,
      rowCounts: file.rowCounts,
    })),
  };

  fs.writeFileSync(
    path.join(outDir, `${migrationPrefix}_manifest.json`),
    `${JSON.stringify(exportManifest, null, 2)}\n`
  );

  console.log(
    [
      `Exported ${files.length} migration files to ${relativeToRoot(outDir)}`,
      `Dataset: ${datasetKey} / ${datasetVersion}`,
      `Countries: ${countries.length}`,
      `Places: ${orderedPlaces.length}`,
      `Place batch size: ${placeBatchSize}`,
    ].join('\n')
  );
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'help') {
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
      '  node scripts/geo/export-supabase-geo-migrations.mjs [options]',
      '',
      'Options:',
      '  --countries-json      Country JSON artifact path',
      '  --places-json         Place JSON artifact path',
      '  --manifest            Import manifest JSON path',
      '  --out-dir             Output directory for split migrations',
      '  --migration-start     First migration number to write',
      '  --migration-prefix    File name stem after the numeric prefix',
      '  --place-batch-size    Number of places per migration file',
      '  --priority-countries  Comma-separated country codes placed first',
      '  --cleanup-seed        Delete legacy seed rows matching metadata.seed',
      '  --dataset-key         Override dataset key from manifest',
      '  --dataset-version     Override dataset version from manifest',
      '  --help                Show this message',
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

function readJsonArray(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array JSON at ${relativeToRoot(filePath)}`);
  }
  return parsed;
}

function readJsonObject(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected object JSON at ${relativeToRoot(filePath)}`);
  }
  return parsed;
}

function prioritizePlaces(places, priorityCountries) {
  const priorityRank = new Map(priorityCountries.map((code, index) => [code, index]));
  return [...places].sort((left, right) => {
    const leftPriority = priorityRank.get(String(left.country_code || '').toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityRank.get(String(right.country_code || '').toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
    return (
      leftPriority - rightPriority
      || String(left.country_code || '').localeCompare(String(right.country_code || ''))
      || Number(left.depth || 0) - Number(right.depth || 0)
      || String(left.parent_id || '').localeCompare(String(right.parent_id || ''))
      || String(left.name || '').localeCompare(String(right.name || ''))
      || String(left.id || '').localeCompare(String(right.id || ''))
    );
  });
}

function buildMigrationFiles({
  datasetKey,
  datasetVersion,
  countries,
  places,
  manifest,
  migrationStart,
  migrationPrefix,
  cleanupSeed,
  placeBatchSize,
}) {
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

  const files = [];
  let sequence = migrationStart;
  const placeChunks = chunkArray(places, placeBatchSize);

  const countryStatements = [
    '-- Generated by scripts/geo/export-supabase-geo-migrations.mjs',
    `-- Dataset version: ${datasetVersion}`,
    'begin;',
    cleanupSeed ? `delete from public.geo_places where metadata ->> 'seed' = ${sqlLiteral(cleanupSeed)};` : '',
    buildUpsertStatement('geo_countries', countryColumns, countries, 'code'),
    placeChunks.length === 0 ? buildDatasetVersionStatement(datasetKey, datasetVersion, manifest) : '',
    'commit;',
    '',
  ];

  files.push({
    sequence,
    fileName: `${padSequence(sequence)}_${migrationPrefix}_01_countries_and_cleanup.sql`,
    content: countryStatements.filter(Boolean).join('\n'),
    rowCounts: {
      countries: countries.length,
      places: 0,
      finalizesDatasetVersion: placeChunks.length === 0,
    },
  });
  sequence += 1;

  placeChunks.forEach((chunk, index) => {
    const batchNumber = index + 1;
    const isLast = batchNumber === placeChunks.length;
    const statements = [
      '-- Generated by scripts/geo/export-supabase-geo-migrations.mjs',
      `-- Dataset version: ${datasetVersion}`,
      `-- Places batch ${batchNumber}/${placeChunks.length}`,
      'begin;',
      buildUpsertStatement('geo_places', placeColumns, chunk, 'id'),
      isLast ? buildDatasetVersionStatement(datasetKey, datasetVersion, manifest) : '',
      'commit;',
      '',
    ];

    files.push({
      sequence,
      fileName: `${padSequence(sequence)}_${migrationPrefix}_02_places_batch_${String(batchNumber).padStart(2, '0')}${isLast ? '_finalize' : ''}.sql`,
      content: statements.filter(Boolean).join('\n'),
      rowCounts: {
        countries: 0,
        places: chunk.length,
        finalizesDatasetVersion: isLast,
      },
    });
    sequence += 1;
  });

  return files;
}

function chunkArray(values, chunkSize) {
  const result = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize));
  }
  return result;
}

function padSequence(value) {
  return String(value).padStart(6, '0');
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
