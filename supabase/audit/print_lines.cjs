const fs = require('fs');

const [, , filePath, startArg, endArg] = process.argv;

if (!filePath || !startArg || !endArg) {
  console.error('Usage: node supabase/audit/print_lines.cjs <file> <start> <end>');
  process.exit(1);
}

const start = Number(startArg);
const end = Number(endArg);

if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
  console.error('Invalid line range');
  process.exit(1);
}

const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
for (let i = start; i <= end; i += 1) {
  const line = lines[i - 1];
  if (line === undefined) break;
  console.log(`${i}:${line}`);
}
