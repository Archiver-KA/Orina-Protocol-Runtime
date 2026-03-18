import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const outDir = path.resolve(projectRoot, 'data/geo/out');
const places = JSON.parse(fs.readFileSync(path.join(outDir, 'geo-places.json'), 'utf8'));
const countries = JSON.parse(fs.readFileSync(path.join(outDir, 'geo-countries.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'geo-import-manifest.json'), 'utf8'));
const unmappedCsv = fs.readFileSync(path.join(outDir, 'geo-import-unmapped-localities.csv'), 'utf8');
const sampleCountry = String(process.argv[2] || '').trim().toUpperCase();

const targetCountries = ['US', 'CA', 'GB', 'VN', 'JP', 'DE'];
const placesByCountry = new Map();
for (const place of places) {
  const bucket = placesByCountry.get(place.country_code) || { total: 0, localities: 0, admin: 0 };
  bucket.total += 1;
  if (place.place_kind === 'locality') bucket.localities += 1;
  else bucket.admin += 1;
  placesByCountry.set(place.country_code, bucket);
}

const unmappedCounts = new Map();
const unmappedRows = [];
for (const line of unmappedCsv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const columns = line.split(',');
  const countryCode = columns[1];
  unmappedCounts.set(countryCode, (unmappedCounts.get(countryCode) || 0) + 1);
  unmappedRows.push({
    geonameId: columns[0],
    countryCode,
    name: columns[2],
    admin1Code: columns[3],
    admin2Code: columns[4],
    reason: columns[5],
  });
}

console.log(`Dataset: ${manifest.datasetVersion}`);
console.log(`Countries: ${countries.length}`);
console.log(`Places: ${places.length}`);
console.log(`Warnings: ${manifest.counts.warnings}`);
console.log('');
console.log('Target country summary:');
for (const code of targetCountries) {
  const stats = placesByCountry.get(code) || { total: 0, localities: 0, admin: 0 };
  const unmapped = unmappedCounts.get(code) || 0;
  console.log(`${code}: admin=${stats.admin}, localities=${stats.localities}, total=${stats.total}, unmapped=${unmapped}`);
}
console.log('');
console.log('Top unmapped countries:');
for (const [code, count] of [...unmappedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`${code}: ${count}`);
}

if (sampleCountry) {
  console.log('');
  console.log(`Sample unmapped rows for ${sampleCountry}:`);
  for (const row of unmappedRows.filter((item) => item.countryCode === sampleCountry).slice(0, 20)) {
    console.log(
      `${row.geonameId} | ${row.name} | admin1=${row.admin1Code || '-'} | admin2=${row.admin2Code || '-'} | ${row.reason}`
    );
  }
}
