// Requer o Chromium do Playwright (OG e ícones): npx playwright install chromium
// Gera as imagens de public/images a partir das fontes. Uso: node scripts/build-images.mjs [foto.jpeg]
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/images');
const photo = process.argv[2] ?? '/mnt/c/Users/cMarins/Downloads/fotoProfissionalCaio.jpeg';

// Foto 1068x1600. Recorte 4:5 com rosto, ombros e braços cruzados. O fundo da foto é
// carregado (prateleiras com luz azul e um letreiro neon à direita), então uma máscara
// elíptica em torno da pessoa dissolve as bordas na cor do site e uma faixa lateral
// apaga o letreiro. Sem moldura: a foto se funde ao fundo da abertura.
const crop = { left: 140, top: 150, width: 900, height: 1125 };
const BG = { r: 7, g: 4, b: 5 }; // --bg #070405
const mask = (w, h) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1 1.25" preserveAspectRatio="none">` +
      '<defs>' +
      '<radialGradient id="r" cx="0.46" cy="0.525" r="0.5" gradientUnits="userSpaceOnUse" gradientTransform="translate(0.46 0.525) scale(0.92 1.4375) translate(-0.46 -0.525)">' +
      '<stop offset="0.5" stop-color="#fff"/><stop offset="0.98" stop-color="#000"/></radialGradient>' +
      '<linearGradient id="side" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="0.76" stop-color="#000" stop-opacity="1"/></linearGradient>' +
      '<linearGradient id="v" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0.58" stop-color="#fff"/><stop offset="0.7" stop-color="#000"/></linearGradient>' +
      '<mask id="m"><rect width="1" height="1.25" fill="url(#v)"/></mask>' +
      '</defs>' +
      '<rect width="1" height="1.25" fill="url(#r)"/>' +
      '<rect width="1" height="1.25" fill="url(#side)" mask="url(#m)"/></svg>',
  );

await mkdir(out, { recursive: true });
for (const width of [480, 900]) {
  const height = (width / 4) * 5;
  const rgb = await sharp(photo)
    .extract(crop)
    .resize(width, height, { kernel: 'lanczos3' })
    .modulate({ saturation: 0.62, brightness: 0.95 })
    .linear(1.08, -8)
    .removeAlpha()
    .raw()
    .toBuffer();
  const alpha = await sharp(mask(width, height)).resize(width, height).greyscale().raw().toBuffer();
  const px = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const a = alpha[i] / 255;
    px[i * 3] = rgb[i * 3] * a + BG.r * (1 - a);
    px[i * 3 + 1] = rgb[i * 3 + 1] * a + BG.g * (1 - a);
    px[i * 3 + 2] = rgb[i * 3 + 2] * a + BG.b * (1 - a);
  }
  const info = await sharp(px, { raw: { width, height, channels: 3 } })
    .webp({ quality: 80 })
    .toFile(resolve(out, `caio-${width}.webp`));
  console.log(`caio-${width}.webp ${info.width}x${info.height} ${info.size}B`);
}

// OG, favicon e apple-touch-icon: HTML renderizado no Chromium (Playwright) para
// usar a Instrument Serif real; o librsvg do sharp não carrega fontes por arquivo.
const { chromium } = await import('playwright');
const { readFile } = await import('node:fs/promises');
const font = resolve(root, 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2');
const fontCss = `@font-face{font-family:IS;src:url(data:font/woff2;base64,${(await readFile(font)).toString('base64')}) format('woff2')}`;
const photoUrl = 'data:image/webp;base64,' + (await sharp(resolve(out, 'caio-900.webp')).toBuffer()).toString('base64');
const ogHtml = `<style>${fontCss}*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#070405;position:relative;overflow:hidden;color:#f5eff0;font-family:IS}
.glow{position:absolute;right:-120px;top:-80px;width:760px;height:760px;background:radial-gradient(closest-side,rgba(255,77,94,.22),transparent)}
img{position:absolute;right:0;top:0;height:630px;width:504px;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent,#000 35%)}
.t{position:absolute;left:80px;top:185px;width:660px}
.k{font:500 22px/1 monospace;letter-spacing:.2em;text-transform:uppercase;color:#ff4d5e;margin-bottom:28px}
h1{font-weight:400;font-size:132px;line-height:.95;letter-spacing:-.01em}
p{margin-top:34px;font:400 34px/1.2 sans-serif;color:#bdb2b4}
.bar{position:absolute;left:80px;bottom:70px;width:72px;height:4px;background:#ff4d5e;border-radius:2px}</style>
<div class="glow"></div><img src="${photoUrl}"><div class="t"><div class="k">Portfólio</div><h1>Caio Marins</h1><p>Desenvolvedor Full Stack Júnior</p></div><div class="bar"></div>`;
const iconHtml = (size) => `<style>${fontCss}*{margin:0}
body{width:${size}px;height:${size}px;background:#070405;display:grid;place-items:center;font-family:IS;color:#ff4d5e;font-size:${size * 0.62}px;line-height:1;letter-spacing:-.04em;padding-bottom:${size * 0.04}px}</style>CM`;
const browser = await chromium.launch();
async function shot(html, w, h, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
  const m = await sharp(file).metadata();
  console.log(`${file.replace(root + '/', '')} ${m.width}x${m.height}`);
}
try {
  await shot(ogHtml, 1200, 630, resolve(out, 'og-image.png'));
  await shot(iconHtml(64), 64, 64, resolve(root, 'public/favicon.png'));
  await shot(iconHtml(180), 180, 180, resolve(root, 'public/apple-touch-icon.png'));
} finally {
  await browser.close();
}
