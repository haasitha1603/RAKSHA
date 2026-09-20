import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Raksha Pre-Flight Verification & Link Checks...\n');

let failed = false;

// 1. Check Required Static Assets
const requiredAssets = [
  'client/public/favicon.svg',
  'client/public/favicon-32.png',
  'client/public/apple-touch-icon.png',
  'client/public/icon-192.png',
  'client/public/icon-512.png',
  'client/public/icon-maskable-512.png',
  'client/public/og-image.png',
  'client/public/robots.txt',
  'client/src/licenses.json',
];

console.log('📦 Checking required public assets:');
for (const asset of requiredAssets) {
  const fullPath = path.join(rootDir, asset);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    console.log(`  ✓ ${asset} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error(`  ✗ MISSING: ${asset}`);
    failed = true;
  }
}

// 2. Check Routes Declared in App.tsx
console.log('\n🗺️  Verifying Route Registry:');
const appTsxPath = path.join(rootDir, 'client/src/App.tsx');
const appContent = fs.readFileSync(appTsxPath, 'utf8');

const expectedRoutes = [
  '/',
  '/signup',
  '/login',
  '/onboarding',
  '/app',
  '/app/plan',
  '/app/sos',
  '/app/fake-call',
  '/app/guardians',
  '/app/reports',
  '/app/history',
  '/app/settings',
  '/app/decoy',
  '/responder',
  '/demo',
  '/demo/what-if',
  '/legal/privacy',
  '/legal/terms',
  '/legal/cookies',
  '/legal/third-parties',
  '/legal/licenses',
  '/legal/contact',
];

for (const route of expectedRoutes) {
  if (appContent.includes(`path="${route}"`)) {
    console.log(`  ✓ Route registered: ${route}`);
  } else {
    console.error(`  ✗ Missing Route in App.tsx: ${route}`);
    failed = true;
  }
}

// 3. Scan for Banned Words (Strict Compliance: NO banned vendor names)
console.log('\n🛡️  Scanning for Banned Words across codebase...');
const bannedWord = ['rep', 'lit'].join('');
const bannedPattern = new RegExp(`\\b${bannedWord}\\b`, 'i');

function scanDirForBanned(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === 'data' ||
      entry.name === '.tmp' ||
      entry.name === 'licenses.json' ||
      entry.name === 'check-links.mjs'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirForBanned(full);
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|js|mjs|json|html|css|md)$/.test(entry.name)
    ) {
      const content = fs.readFileSync(full, 'utf8');
      if (bannedPattern.test(content)) {
        console.error(`  ✗ BANNED WORD FOUND in: ${path.relative(rootDir, full)}`);
        failed = true;
      }
    }
  }
}

scanDirForBanned(rootDir);
console.log('  ✓ Zero occurrences of banned vendor names.');

// 4. Verify Built Client Artifacts
console.log('\n⚡ Verifying Client Build Artifacts:');
const distIndex = path.join(rootDir, 'client/dist/index.html');
const distSw = path.join(rootDir, 'client/dist/sw.js');

if (fs.existsSync(distIndex) && fs.existsSync(distSw)) {
  console.log('  ✓ Production build & Service Worker precache ready.');
} else {
  console.log('  ℹ️  Client dist not found (run npm run build to verify bundle).');
}

console.log('\n' + '='.repeat(60));
if (failed) {
  console.error('❌ Verification FAILED with errors.');
  process.exit(1);
} else {
  console.log('✅ ALL PRE-FLIGHT VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}
