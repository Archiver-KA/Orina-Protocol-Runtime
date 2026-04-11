import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const viewerScopedFiles = [
  'src/hooks/useAnalytics.ts',
  'src/app/components/orders.tsx',
  'src/app/components/market-insights.tsx',
  'src/app/components/messages.tsx',
  'src/app/components/marketplace.tsx',
  'src/app/components/settings.tsx',
  'src/app/components/agent-settings.tsx',
  'src/app/components/assets.tsx',
  'src/app/components/assets-right-sidebar.tsx',
  'src/app/components/minting.tsx',
  'src/app/components/minting-right-sidebar.tsx',
  'src/app/components/community/enhanced-community.tsx',
  'src/app/components/community/create-post-modal.tsx',
  'src/app/components/community-right-sidebar.tsx',
  'src/app/components/favorites/favorites-following-page.tsx',
  'src/app/components/profile/enhanced-profile.tsx',
  'src/app/components/profile-search-card.tsx',
  'src/app/components/asset-details-modal.tsx',
  'src/app/components/seller-asset-management-modal.tsx',
  'src/app/components/collections/collection-editor-modal.tsx',
  'src/app/components/collections/collection-details-modal.tsx',
  'src/app/components/search/search-page.tsx',
  'src/app/components/ai/ai-sidebar.tsx',
];

const directUseAccountPattern = /\buseAccount\s*(?:<[^>]+>)?\s*\(/;
const directUseAccountImportPattern = /\buseAccount\b/;
const violations = [];

for (const relativePath of viewerScopedFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = await readFile(absolutePath, 'utf8');

  if (directUseAccountPattern.test(source) || /from ['"]wagmi['"];?/.test(source) && directUseAccountImportPattern.test(source)) {
    violations.push(relativePath);
  }
}

if (violations.length > 0) {
  console.error('Viewer surface guard failed. Direct useAccount() remains in:');
  for (const violation of violations) {
    console.error(` - ${violation}`);
  }
  process.exit(1);
}

console.log(`Viewer surface guard passed for ${viewerScopedFiles.length} files.`);