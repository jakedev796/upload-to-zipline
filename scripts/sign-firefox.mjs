import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = resolve('.');
const DEFAULT_SELF_ID = 'upload-to-zipline@2ipm1nd';

// 1. Read .env.local or .env if present (without external dependencies)
function loadEnvFile(filename) {
  const filePath = resolve(ROOT_DIR, filename);
  if (!existsSync(filePath)) return;
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn(`[sign-firefox] Warning: Failed to read ${filename}:`, err);
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const targetId = process.env.FIREFOX_EXTENSION_ID || DEFAULT_SELF_ID;
process.env.FIREFOX_EXTENSION_ID = targetId;

const isBuildOnly = process.argv.includes('--build-only');

console.log(`\n========================================`);
console.log(`🦊 Firefox Build & Self-Signing Pipeline`);
console.log(`========================================`);
console.log(`• Target Extension ID: ${targetId}`);
console.log(`• Mode: ${isBuildOnly ? 'Build Only' : 'Build & AMO Sign'}`);
console.log(`----------------------------------------\n`);

// 2. Build Firefox extension with target ID
console.log(`[1/2] Building Firefox MV3 extension...`);
const buildResult = spawnSync(
  'pnpm',
  ['wxt', 'build', '-b', 'firefox'],
  { stdio: 'inherit', env: process.env, shell: true }
);

if (buildResult.status !== 0) {
  console.error(`\n❌ Error: Firefox build failed.`);
  process.exit(buildResult.status || 1);
}

if (isBuildOnly) {
  console.log(`\n[2/2] Generating zip package...`);
  spawnSync(
    'pnpm',
    ['wxt', 'zip', '-b', 'firefox'],
    { stdio: 'inherit', env: process.env, shell: true }
  );
  console.log(`\n✅ Build completed successfully for self-hosted ID: ${targetId}`);
  console.log(`Output folder: .output/firefox-mv3`);
  process.exit(0);
}

// 3. AMO Signing
const apiKey = process.env.AMO_JWT_ISSUER;
const apiSecret = process.env.AMO_JWT_SECRET;

if (!apiKey || !apiSecret) {
  console.error(`\n❌ Missing AMO API Credentials!`);
  console.error(`Please provide your credentials in .env.local:`);
  console.error(`----------------------------------------`);
  console.error(`AMO_JWT_ISSUER=your_jwt_issuer_here`);
  console.error(`AMO_JWT_SECRET=your_jwt_secret_here`);
  console.error(`----------------------------------------`);
  console.error(`You can get your API credentials at:`);
  console.error(`https://addons.mozilla.org/developers/addon/api/key/\n`);
  process.exit(1);
}

console.log(`\n[2/2] Requesting unlisted signing from Mozilla AMO...`);
const signArgs = [
  '--yes',
  'web-ext',
  'sign',
  '--source-dir=.output/firefox-mv3',
  '--artifacts-dir=.output/signed',
  '--channel=unlisted',
  `--api-key=${apiKey}`,
  `--api-secret=${apiSecret}`,
];

const signResult = spawnSync(
  'npx',
  signArgs,
  { stdio: 'inherit', env: process.env, shell: true }
);

if (signResult.status !== 0) {
  console.error(`\n❌ Error: web-ext sign failed.`);
  process.exit(signResult.status || 1);
}

console.log(`\n========================================`);
console.log(`🎉 Self-Signing completed successfully!`);
console.log(`Signed .xpi location: .output/signed/`);
console.log(`Drag the .xpi file into Firefox to install.`);
console.log(`========================================\n`);
