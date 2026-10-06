const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const inputPng = '/tmp/tradingbible-logo/0243BAEF-6620-428B-861C-9E7719F63238.PNG';
const outDir = '/Users/malibagt/TradingBible-edit/apps/web/public/icons/';

async function createTransparentIcons() {
  const img = await loadImage('/tmp/tradingbible-logo/0243BAEF-6620-428B-861C-9E7719F63238.PNG');
  
  // Create transparent canvas (no background) - preserve exact transparency
  const sizes = [
    { name: 'favicon.svg', size: 256 },
    { name: 'favicon-16x16.svg', size: 16 },
    { name: 'favicon-32x32.svg', size: 32 },
    { name: 'apple-touch-icon.svg', size: 180 },
  ];

  for (const { name, size } of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    // No fill - transparent background
    ctx.drawImage(img, 0, 0, size, size);
    
    const base64 = canvas.toBuffer('image/png').toString('base64');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <image href="data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}" width="${size}" height="${size}"/>
</svg>`;
    fs.writeFileSync(`/Users/malibagt/TradingBible-edit/apps/web/public/icons/${name}`, svg);
    console.log(`Created ${name} (${size}x${size}) - transparent`);
  }

  // PNG for manifest (192x192 and 512x512) - preserve transparency
  const canvas192 = createCanvas(192, 192);
  const ctx192 = canvas192.getContext('2d');
  ctx192.drawImage(img, 0, 0, 192, 192);
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-192.png', canvas192.toBuffer('image/png'));
  console.log('Created favicon-192.png (transparent)');

  const canvas512 = createCanvas(512, 512);
  const ctx512 = canvas512.getContext('2d');
  ctx512.drawImage(img, 0, 0, 512, 512);
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-512.png', canvas512.toBuffer('image/png'));
  console.log('Created favicon-512.png (transparent)');

  console.log('All transparent icons created!');
}

createTransparentIcons().catch(console.error);
