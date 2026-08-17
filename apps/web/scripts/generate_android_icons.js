const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_PATH = path.join(__dirname, '../public/brand/isotipo-secundario.svg');
const RES_PATH = path.join(__dirname, '../android/app/src/main/res');

const ICON_SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const SPLASH_SIZES = [
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1080 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { dir: 'drawable-port-xxxhdpi', width: 1080, height: 1920 },
];

async function generate() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  // 1. Generate Mipmap Icons
  for (const { dir, size } of ICON_SIZES) {
    const targetDir = path.join(RES_PATH, dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const iconBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), iconBuffer);

    console.log(`[Icon] Generado ${dir} (${size}x${size})`);
  }

  // 2. Generate Splash Screens with Navy Background and Centered Logo
  for (const { dir, width, height } of SPLASH_SIZES) {
    const targetDir = path.join(RES_PATH, dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const logoSize = Math.round(Math.min(width, height) * 0.4);
    const logoBuffer = await sharp(svgBuffer)
      .resize(logoSize, logoSize)
      .png()
      .toBuffer();

    const splashBuffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 16, g: 42, b: 67, alpha: 1 }, // #102A43
      },
    })
      .composite([
        {
          input: logoBuffer,
          gravity: 'center',
        },
      ])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'splash.png'), splashBuffer);
    console.log(`[Splash] Generado ${dir} (${width}x${height})`);
  }

  // Base splash in drawable
  const baseDrawableDir = path.join(RES_PATH, 'drawable');
  if (!fs.existsSync(baseDrawableDir)) fs.mkdirSync(baseDrawableDir, { recursive: true });
  const baseSplash = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 16, g: 42, b: 67, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(220, 220).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(baseDrawableDir, 'splash.png'), baseSplash);

  console.log('✅ ¡Todos los íconos y pantallas splash de Presenxa generados exitosamente!');
}

generate().catch(console.error);
