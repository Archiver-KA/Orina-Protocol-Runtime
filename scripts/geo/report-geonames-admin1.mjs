import fs from 'node:fs';
import path from 'node:path';

const countryCode = String(process.argv[2] || '').trim().toUpperCase();
if (!countryCode) {
  console.error('Usage: node scripts/geo/report-geonames-admin1.mjs <COUNTRY_CODE>');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), 'data/geo/raw/geonames/admin1CodesASCII.txt');
const rows = fs
  .readFileSync(filePath, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.split('\t'))
  .filter((cells) => String(cells[0] || '').startsWith(`${countryCode}.`));

for (const cells of rows) {
  console.log(`${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[3]}`);
}
