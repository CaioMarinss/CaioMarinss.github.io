// Verifica qual modo de exibição cada tipo de aparelho recebe. Uso: npm run build && npm run e2e
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/caio-portfolio/browser');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

async function resolveFile(url) {
  const path = normalize(decodeURIComponent(new URL(url, 'http://x').pathname)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  for (const candidate of [
    join(root, path),
    join(root, path, 'index.html'),
    join(root, 'index.html'),
  ]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');
  if (!file) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const NO_WEBGL = ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];
const WITH_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function inspect(args, context) {
  const browser = await chromium.launch({ args });
  try {
    const page = await browser.newPage(context);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => {
      const host = document.querySelector('app-cinema-canvas');
      const canvas = host?.querySelector('canvas');
      let lit = 0;
      if (canvas && host.dataset.renderer === 'canvas2d') {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < data.length; i += 4) if (data[i] > 120) lit++;
      }
      return {
        cinema: document.documentElement.classList.contains('is-cinema'),
        renderer: host?.dataset.renderer ?? null,
        lit,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    return { ...state, errors };
  } finally {
    await browser.close();
  }
}

const desktop = { viewport: { width: 1198, height: 680 } };
const scenarios = [
  {
    name: 'desktop sem WebGL usa o modo cinema em Canvas 2D',
    run: () => inspect(NO_WEBGL, desktop),
    check: (s) => s.cinema && s.renderer === 'canvas2d' && s.lit > 200,
  },
  {
    name: 'desktop sem WebGL e com menos movimento também usa Canvas 2D',
    run: () => inspect(NO_WEBGL, { ...desktop, reducedMotion: 'reduce' }),
    check: (s) => s.cinema && s.renderer === 'canvas2d',
  },
  {
    name: 'desktop com WebGL continua no Three.js',
    run: () => inspect(WITH_WEBGL, desktop),
    check: (s) => s.cinema && s.renderer === 'webgl',
  },
  {
    name: 'celular continua no modo estático',
    run: () =>
      inspect(WITH_WEBGL, {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      }),
    check: (s) => !s.cinema && s.renderer === null,
  },
];

let failed = 0;
try {
  for (const { name, run, check } of scenarios) {
    const state = await run();
    const ok = check(state) && !state.overflow && state.errors.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : ` → ${JSON.stringify(state)}`}`);
  }
} finally {
  server.close();
}
process.exit(failed ? 1 : 0);
