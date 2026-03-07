const fs = require('fs');
const path = require('path');

const srcDir =
  process.argv[2] ||
  'C:\\Users\\proje\\Documents\\GitHub\\orina-atp\\packages\\contracts\\foundry\\src';

function readSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

function main() {
  if (!fs.existsSync(srcDir)) {
    console.error(`NOT_FOUND ${srcDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((name) => name.endsWith('.sol'))
    .sort((a, b) => a.localeCompare(b));

  const summary = [];

  for (const name of files) {
    const full = path.join(srcDir, name);
    const text = readSafe(full);
    if (text == null) continue;
    const lines = text.split(/\r?\n/);
    const hits = [];
    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      const line = raw.trim();
      if (/^(contract|interface)\s+\w+/.test(line) || /^function\s+\w+/.test(line)) {
        hits.push({ line: i + 1, text: line });
      }
    }
    summary.push({ file: name, hits });
  }

  console.log(JSON.stringify({ srcDir, files: summary }, null, 2));
}

main();

