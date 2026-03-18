import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const rawDir = path.resolve(projectRoot, 'data/geo/raw/geonames');

const files = [
  {
    url: 'https://download.geonames.org/export/dump/countryInfo.txt',
    output: path.join(rawDir, 'countryInfo.txt'),
    extract: false,
  },
  {
    url: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    output: path.join(rawDir, 'admin1CodesASCII.txt'),
    extract: false,
  },
  {
    url: 'https://download.geonames.org/export/dump/admin2Codes.txt',
    output: path.join(rawDir, 'admin2Codes.txt'),
    extract: false,
  },
  {
    url: 'https://download.geonames.org/export/dump/cities15000.zip',
    output: path.join(rawDir, 'cities15000.zip'),
    extract: true,
    extractedFile: path.join(rawDir, 'cities15000.txt'),
  },
];

await main();

async function main() {
  fs.mkdirSync(rawDir, { recursive: true });

  for (const file of files) {
    console.log(`Downloading ${file.url}`);
    await downloadToFile(file.url, file.output);

    if (file.extract) {
      extractWith7Zip(file.output, rawDir);
      if (!fs.existsSync(file.extractedFile)) {
        throw new Error(`Expected extracted file was not found: ${relative(file.extractedFile)}`);
      }
    }
  }

  console.log('GeoNames source files are ready in data/geo/raw/geonames');
}

async function downloadToFile(url, outputPath) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'ATP2-geo-import/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, data);
}

function extractWith7Zip(zipPath, outputDir) {
  const result = spawnSync(
    '7z',
    ['x', '-y', `-o${outputDir}`, zipPath],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `7z failed while extracting ${relative(zipPath)}`,
        result.stdout || '',
        result.stderr || '',
      ].join('\n')
    );
  }
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}
