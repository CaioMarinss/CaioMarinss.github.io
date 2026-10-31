// Captura as prévias dos projetos. Uso: node scripts/capture-shots.mjs
// Requer o Chromium do Playwright: npx playwright install chromium
// Somente sites públicos do portfólio; nunca capturar sistemas internos de clientes.
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/images/shots');
const targets = {
  climb: 'https://caiomarinss.github.io/climb-TCC/',
  continuar: 'https://caiomarinss.github.io/continuar-marcas-e-patentes/',
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
    for (const [name, url] of Object.entries(targets)) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const res = await page.goto(url, { waitUntil: 'networkidle' });
      if (!res?.ok()) throw new Error(`${url} respondeu ${res?.status() ?? 'sem resposta'}`);
      await page.waitForTimeout(6000); // aguarda a animação de entrada terminar;
      const png = await page.screenshot();
      const info = await sharp(png)
        .resize(960, 600)
        .webp({ quality: 80 })
        .toFile(resolve(out, `${name}.webp`));
      console.log(`${name}.webp ${info.width}x${info.height} ${info.size}B`);
      await page.close();
    }
} finally {
  await browser.close();
}
