import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '../public/icons');
const SOURCE = resolve(ICONS_DIR, 'icon-512.png');
const BG_COLOR = { r: 247, g: 245, b: 242, alpha: 1 }; // #F7F5F2

// 標準圖示尺寸
const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384];

// Apple 專用尺寸
const APPLE_SIZES = [152, 167, 180];

// Maskable 圖示尺寸（核心圖案佔 80%，四周 10% padding）
const MASKABLE_SIZES = [192, 512];

// Shortcuts 圖示
const SHORTCUT_SIZE = 96;

async function generateStandard() {
  for (const size of STANDARD_SIZES) {
    const output = resolve(ICONS_DIR, `icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(output);
    console.log(`  icon-${size}.png`);
  }
}

async function generateMaskable() {
  for (const size of MASKABLE_SIZES) {
    const innerSize = Math.round(size * 0.8);
    const padding = Math.round((size - innerSize) / 2);

    const resized = await sharp(SOURCE).resize(innerSize, innerSize).png().toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BG_COLOR,
      },
    })
      .composite([{ input: resized, left: padding, top: padding }])
      .png()
      .toFile(resolve(ICONS_DIR, `icon-maskable-${size}.png`));

    console.log(`  icon-maskable-${size}.png`);
  }
}

async function generateApple() {
  for (const size of APPLE_SIZES) {
    const output = resolve(ICONS_DIR, `apple-touch-icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(output);
    console.log(`  apple-touch-icon-${size}.png`);
  }
}

async function generateShortcuts() {
  // shortcuts 圖示直接從原圖縮小
  const names = ['shortcut-calendar', 'shortcut-members'];
  for (const name of names) {
    const output = resolve(ICONS_DIR, `${name}.png`);
    await sharp(SOURCE).resize(SHORTCUT_SIZE, SHORTCUT_SIZE).png().toFile(output);
    console.log(`  ${name}.png`);
  }
}

async function main() {
  console.log('生成標準圖示...');
  await generateStandard();

  console.log('生成 Maskable 圖示...');
  await generateMaskable();

  console.log('生成 Apple Touch 圖示...');
  await generateApple();

  console.log('生成 Shortcuts 圖示...');
  await generateShortcuts();

  console.log('\n全部完成！');
}

main().catch(console.error);
