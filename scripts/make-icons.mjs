import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../client/public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Raksha SVG Icon: An elegant safety shield with locator pulse in indigo & emerald
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4338CA" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded shield -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Outer pulse ring -->
  <circle cx="256" cy="240" r="150" fill="none" stroke="#6366F1" stroke-width="6" stroke-dasharray="12 8" opacity="0.5" />

  <!-- Shield contour -->
  <path d="M256 96 L376 144 V260 C376 340 320 404 256 424 C192 404 136 340 136 260 V144 Z"
        fill="none" stroke="url(#accentGrad)" stroke-width="20" stroke-linejoin="round" stroke-linecap="round" />

  <!-- Inner locator pin / beacon -->
  <circle cx="256" cy="226" r="38" fill="url(#accentGrad)" />
  <circle cx="256" cy="226" r="18" fill="#FFFFFF" />

  <!-- Pulse beacon waves -->
  <path d="M256 264 L256 320" stroke="#34D399" stroke-width="12" stroke-linecap="round" />
</svg>`;

// Maskable Icon (safe zone padding: 10% inner padding)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#4338CA" />
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M256 96 L376 144 V260 C376 340 320 404 256 424 C192 404 136 340 136 260 V144 Z"
          fill="none" stroke="#34D399" stroke-width="24" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="256" cy="226" r="42" fill="#34D399" />
    <circle cx="256" cy="226" r="20" fill="#FFFFFF" />
    <path d="M256 268 L256 324" stroke="#34D399" stroke-width="14" stroke-linecap="round" />
  </g>
</svg>`;

// OpenGraph Card (1200x630)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1020" />
      <stop offset="50%" stop-color="#151B2E" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
    <linearGradient id="ogAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogBg)" />

  <!-- Shield visual -->
  <g transform="translate(100, 165)">
    <path d="M150 40 L230 72 V160 C230 220 190 265 150 280 C110 265 70 220 70 160 V72 Z"
          fill="none" stroke="url(#ogAccent)" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="150" cy="140" r="26" fill="#34D399" />
    <circle cx="150" cy="140" r="12" fill="#FFFFFF" />
    <path d="M150 166 L150 205" stroke="#34D399" stroke-width="8" stroke-linecap="round" />
  </g>

  <!-- Typography -->
  <text x="420" y="240" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="76" fill="#FFFFFF">RAKSHA</text>
  <text x="420" y="305" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="30" fill="#34D399">Smart Safe Route &amp; Emergency Assistance</text>
  <text x="420" y="365" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="22" fill="#A3AEC2">Safety-aware navigation, explainable risk scoring, and</text>
  <text x="420" y="398" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="22" fill="#A3AEC2">parallel PulseRouteAI Emergency Bridge coordination.</text>

  <!-- Badge -->
  <rect x="420" y="440" width="220" height="42" rx="21" fill="#4338CA" opacity="0.8" />
  <text x="530" y="467" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#FFFFFF" text-anchor="middle">HACKATHON PROTOTYPE</text>
</svg>`;

async function generate() {
  console.log('Generating icon suite in', publicDir);

  // Write SVG files
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg);

  const svgBuffer = Buffer.from(iconSvg);
  const maskableBuffer = Buffer.from(maskableSvg);
  const ogBuffer = Buffer.from(ogSvg);

  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(ogBuffer).resize(1200, 630).png().toFile(path.join(publicDir, 'og-image.png'));

  console.log('Successfully generated: favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png, og-image.png');
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
