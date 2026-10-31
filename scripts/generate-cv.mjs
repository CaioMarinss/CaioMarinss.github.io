// Gera os PDFs do currículo (A4, 1 página) a partir das páginas pré-renderizadas.
// Uso: npx ng build && npm run cv && npx ng build   (o segundo build embute os PDFs em dist/)
import { createServer } from 'node:http';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist/caio-portfolio/browser');
const outDir = join(root, 'public/cv');

const TARGETS = [
  { path: '/curriculo', file: 'caio-marins-cv-pt.pdf' },
  { path: '/en/resume', file: 'caio-marins-cv-en.pdf' },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

async function resolveFile(urlPath) {
  let clean;
  try {
    clean = normalize(decodeURIComponent(urlPath.split('?')[0]));
  } catch {
    return null; // URL malformada
  }
  const candidates = [clean, join(clean, 'index.html')];
  for (const rel of candidates) {
    const full = join(dist, rel);
    if (full !== dist && !full.startsWith(dist + sep)) continue;
    try {
      const data = await readFile(full);
      return { data, type: TYPES[extname(full)] ?? 'application/octet-stream' };
    } catch {
      // try next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const hit = await resolveFile(req.url ?? '/');
  if (!hit) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': hit.type }).end(hit.data);
});

// Páginas de um PDF: conta objetos /Type /Page (não /Pages).
const pageCount = (pdf) => (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;

try {
  await access(join(dist, 'curriculo/index.html'));
} catch {
  console.error(`FAIL: ${dist} sem as páginas do currículo. Rode "npx ng build" antes.`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let failed = false;

try {
  browser = await chromium.launch();
  for (const { path, file } of TARGETS) {
    const page = await browser.newPage();
    const res = await page.goto(base + path, { waitUntil: 'networkidle' });
    // Sem esta checagem, um 404 viraria um PDF de 1 página "not found" sobre o aprovado.
    if (!res?.ok()) throw new Error(`${path} respondeu ${res?.status() ?? 'sem resposta'}`);
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const pages = pageCount(pdf);
    await page.close();
    if (pages !== 1) {
      console.error(`FAIL ${file}: ${pages} páginas (esperado 1)`);
      failed = true;
      continue;
    }
    await writeFile(join(outDir, file), pdf);
    console.log(`ok ${file}: ${pages} página, ${(pdf.length / 1024).toFixed(1)} KB`);
  }
} finally {
  await browser?.close();
  server.close();
}
if (failed) process.exit(1);
