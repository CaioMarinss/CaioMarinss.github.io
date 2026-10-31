// Requer o Chromium do Playwright (OG e ícones): npx playwright install chromium
// Gera as imagens de public/images a partir das fontes. Uso: node scripts/build-images.mjs [foto.jpeg]
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/images');
const photo = process.argv[2] ?? '/mnt/c/Users/cMarins/Downloads/fotoProfissionalCaio.jpeg';

// Foto 1068x1600. Recorte 3:4 focado em rosto e tronco. O letreiro iluminado
// do fundo encosta na cabeça (a partir de x~740), então um degradê na cor do
// site apaga a faixa direita em vez de cortar o cabelo.
const crop = { left: 200, top: 150, width: 600, height: 800 };
const fade = (w, h) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0.86" stop-color="#020405" stop-opacity="0"/>' +
      '<stop offset="0.93" stop-color="#020405" stop-opacity="0.97"/>' +
      '</linearGradient>' +
      // canto inferior esquerdo: apaga o fragmento do letreiro ("AN") do fundo
      '<radialGradient id="c" cx="0" cy="0.8" r="0.5" gradientTransform="translate(0 0.8) scale(0.2 0.3) translate(0 -0.8)">' +
      '<stop offset="0" stop-color="#020405" stop-opacity="0.95"/>' +
      '<stop offset="0.6" stop-color="#020405" stop-opacity="0.8"/>' +
      '<stop offset="1" stop-color="#020405" stop-opacity="0"/>' +
      '</radialGradient></defs>' +
      `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
      `<rect width="${w}" height="${h}" fill="url(#c)"/></svg>`,
  );

await mkdir(out, { recursive: true });
for (const width of [480, 960]) {
  const height = (width / 3) * 4;
  const base = await sharp(photo).extract(crop).resize(width, height, { kernel: 'lanczos3' }).toBuffer();
  const info = await sharp(base)
    .composite([{ input: fade(width, height) }])
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
const photoUrl = 'data:image/webp;base64,' + (await sharp(resolve(out, 'caio-960.webp')).toBuffer()).toString('base64');
const ogHtml = `<style>${fontCss}*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#020405;position:relative;overflow:hidden;color:#eef3f1;font-family:IS}
.glow{position:absolute;right:-120px;top:-80px;width:760px;height:760px;background:radial-gradient(closest-side,rgba(92,242,200,.22),transparent)}
img{position:absolute;right:0;top:0;height:630px;width:473px;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent,#000 35%)}
.t{position:absolute;left:80px;top:185px;width:660px}
.k{font:500 22px/1 monospace;letter-spacing:.2em;text-transform:uppercase;color:#5cf2c8;margin-bottom:28px}
h1{font-weight:400;font-size:132px;line-height:.95;letter-spacing:-.01em}
p{margin-top:34px;font:400 34px/1.2 sans-serif;color:#aeb9b5}
.bar{position:absolute;left:80px;bottom:70px;width:72px;height:4px;background:#5cf2c8;border-radius:2px}</style>
<div class="glow"></div><img src="${photoUrl}"><div class="t"><div class="k">Portfólio</div><h1>Caio Marins</h1><p>Desenvolvedor Full Stack Júnior</p></div><div class="bar"></div>`;
const iconHtml = (size) => `<style>${fontCss}*{margin:0}
body{width:${size}px;height:${size}px;background:#020405;display:grid;place-items:center;font-family:IS;color:#5cf2c8;font-size:${size * 0.62}px;line-height:1;letter-spacing:-.04em;padding-bottom:${size * 0.04}px}</style>CM`;
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
