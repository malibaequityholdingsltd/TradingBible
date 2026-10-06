const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const inputPng = '/tmp/tradingbible-logo/0243BAEF-6620-428B-861C-9E7719F63238.PNG';
const outDir = '/Users/malibagt/TradingBible-edit/apps/web/public/icons/';

async function createAllIcons() {
  const img = await loadImage('/tmp/tradingbible-logo/0243BAEF-6620-428B-861C-9E7719F63238.PNG');
  
  // 1. favicon.svg (256x256)
  const canvas256 = createCanvas(256, 256);
  const ctx256 = canvas256.getContext('2d');
  ctx256.drawImage(img, 0, 0, 256, 256);
  const base64_256 = canvas256.toBuffer('image/png').toString('base64');
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <image href="data:image/png;base64,${base64_256}" width="256" height="256"/>
</svg>`);
  console.log('Created favicon.svg');

  // 2. favicon-16x16.svg
  const canvas16 = createCanvas(16, 16);
  const ctx16 = canvas16.getContext('2d');
  ctx16.drawImage(img, 0, 0, 16, 16);
  const base64_16 = canvas16.toBuffer('image/png').toString('base64');
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-16x16.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
  <image href="data:image/png;base64,${base64_16}" width="16" height="16"/>
</svg>`);
  console.log('Created favicon-16x16.svg');

  // 3. favicon-32x32.svg
  const canvas32 = createCanvas(32, 32);
  const ctx32 = canvas32.getContext('2d');
  ctx32.drawImage(img, 0, 0, 32, 32);
  const base64_32 = canvas32.toBuffer('image/png').toString('base64');
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-32x32.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <image href="data:image/png;base64,${base64_32}" width="32" height="32"/>
</svg>`);
  console.log('Created favicon-32x32.svg');

  // 4. apple-touch-icon.svg (180x180)
  const canvas180 = createCanvas(180, 180);
  const ctx180 = canvas180.getContext('2d');
  ctx180.drawImage(img, 0, 0, 180, 180);
  const base64_180 = canvas180.toBuffer('image/png').toString('base64');
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/apple-touch-icon.svg', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <image href="data:image/png;base64,${base64_180}" width="180" height="180"/>
</svg>`);
  console.log('Created apple-touch-icon.svg');

  // 5. PNG for manifest (192x192 and 512x512)
  const canvas192 = createCanvas(192, 192);
  const ctx192 = canvas192.getContext('2d');
  ctx192.drawImage(img, 0, 0, 192, 192);
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-192.png', canvas192.toBuffer('image/png'));
  console.log('Created favicon-192.png');

  const canvas512 = createCanvas(512, 512);
  const ctx512 = canvas512.getContext('2d');
  ctx512.drawImage(img, 0, 0, 512, 512);
  fs.writeFileSync('/Users/malibagt/TradingBible-edit/apps/web/public/icons/favicon-512.png', canvas512.toBuffer('image/png'));
  console.log('Created favicon-512.png');

  console.log('All icons created successfully!');
}

createAllIcons().catch(console.error);
