function normalizeVersionCell(cell) {
  return cell
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/`/g, "")
    .trim();
}

export function parseRows(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("|") || /Local\s*\|\s*Remote/i.test(line) || /^[-\s|]+$/.test(line)) {
      continue;
    }
    const cells = line.split("|").map(normalizeVersionCell);
    if (cells.length < 2) {
      continue;
    }
    const local = cells[0] || "";
    const remote = cells[1] || "";
    if (!/^\d+$/.test(local) && !/^\d+$/.test(remote)) {
      continue;
    }
    rows.push({ local, remote });
  }
  return rows;
}
