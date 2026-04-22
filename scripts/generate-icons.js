const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const svgPath = path.join(__dirname, '..', 'assets/icon.svg');
const resourcesDir = path.join(__dirname, '..', 'resources');
const iconsetDir = path.join(resourcesDir, 'icon.iconset');

// Ensure directories exist
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

const sizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
];

async function generateIcons() {
  console.log('Reading SVG...');
  const svg = fs.readFileSync(svgPath);

  console.log('Generating PNG icons...');
  for (const { size, name } of sizes) {
    const outputPath = path.join(iconsetDir, name);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created ${name} (${size}x${size})`);
  }

  // Also create a 1024x1024 PNG for other uses
  const pngPath = path.join(resourcesDir, 'icon.png');
  await sharp(svg)
    .resize(1024, 1024)
    .png()
    .toFile(pngPath);
  console.log('  Created icon.png (1024x1024)');

  // Generate icns using macOS iconutil
  console.log('Generating icns...');
  try {
    const icnsPath = path.join(resourcesDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
    console.log('  Created icon.icns');

    // Clean up iconset folder
    fs.rmSync(iconsetDir, { recursive: true });
    console.log('  Cleaned up iconset folder');
  } catch (err) {
    console.error('Failed to create icns:', err.message);
    console.log('  iconset folder preserved for manual conversion');
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
