# Portfólio cinematográfico — Caio Marins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o portfólio bilíngue do Caio (Angular 22 + Three.js), com cena de partículas conduzida pela rolagem em 5 capítulos, modo estático acessível, currículo em PDF e deploy no GitHub Pages em https://caiomarinss.github.io/.

**Architecture:** App Angular standalone, zoneless/OnPush, pré-renderizado (`outputMode: "static"`) nas rotas `/`, `/en`, `/curriculo` e `/en/resume`. O conteúdo vive em dois arquivos tipados (PT/EN) e é renderizado como HTML semântico em qualquer modo; uma classe `is-cinema` no `<html>` (decidida antes da primeira pintura por um script inline) transforma o mesmo DOM na camada editorial fixa. A cena WebGL é TypeScript puro em `src/app/cinema/scene/`, carregada por `import()` só no navegador; qualquer falha devolve o site ao modo estático.

**Tech Stack:** Angular 22.2 (`@angular/build`, `@angular/ssr`), TypeScript ~6.0, SCSS, Vitest 4 (`@angular/build:unit-test`), three 0.187 + @types/three 0.187, @fontsource/instrument-serif 5.3, @fontsource-variable/manrope 5.3, @fontsource-variable/jetbrains-mono 5.3; dev-only: sharp 0.35, playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-31-portfolio-design.md` — protótipo visual aprovado: `docs/superpowers/specs/2026-10-31-prototipo-cinematico.html` (fonte dos shaders, formas, cores e constantes de movimento).

## Global Constraints

- Projeto em `/home/cmarins/projects/caio-portfolio`; padrões copiados de `/home/cmarins/projects/jaqueline-site` (configs, `afterNextRender`, `ChangeDetectionStrategy.OnPush`, testes `*.spec.ts` com `vi`). Nunca alterar o jaqueline-site.
- Repositório GitHub: `CaioMarinss/CaioMarinss.github.io`, público; `base-href` = `/`.
- Commits **só em nome do Caio**, **sem** `Co-Authored-By` ou qualquer atribuição ao Claude. **Pedir autorização ao Caio antes do primeiro commit e antes de qualquer push / criação de repo.**
- Só tema escuro. Cores: fundo `#020405`, texto `#f2f5f3`, acento `--mint: #5cf2c8`, `--violet: #9d8cff`.
- Fontes: Instrument Serif (títulos), Manrope (corpo), JetBrains Mono (rótulos) — auto-hospedadas via @fontsource, nenhuma chamada a Google Fonts.
- **Sem linhas verticais de grade.** Linha horizontal fina sob o menu: manter.
- Nome da empresa sempre **Núclea** (com acento). Datas: aprendiz 17/02/2025, júnior **09/2025**, CriaTech "2025", Trampos do Futuro "2026", ADS conclusão "2027/1". Inglês **B2**.
- Almeida JJ **sem captura de tela**. Sem Instagram, sem telefone. Certificado FGV fora.
- Nenhum fato além do spec §6; redação final livre a partir dos rascunhos do protótipo.
- Nada de texto dentro do WebGL; todo conteúdo é HTML pré-renderizado.
- `prefers-reduced-motion: reduce`, ausência de WebGL ou falha do chunk 3D ⇒ modo estático (rolagem normal, sem cursor próprio, sem 620vh).
- Constantes de movimento (do protótipo): 5 capítulos; altura da página em cinema `620vh`; lerp de rolagem `0.06`; janela de capítulo ativo `|P − i| < 0.34`; partículas 9000 (desktop) / 5000 (≤ 860px); DPR máx. 2 / 1.5; breakpoint mobile `860px`.

## Review Focus

1. **Tab entra num link de capítulo inativo (modo cinema)** — o capítulo do elemento focado deve virar o ativo (rolagem até ele), nunca foco invisível. Teste em Task 6.
2. **Contexto WebGL perdido ou chunk 3D falha no meio da sessão** — volta ao modo estático com todo o conteúdo visível e sem erro no console além de um `console.warn`. Teste em Task 7.
3. **Troca de idioma com capítulo aberto** (`/#projects` → `/en#projects`) — mantém o capítulo. Teste em Task 3.
4. **Redimensionar a janela no meio da rolagem / navegar pelo menu depois** — destino recalculado com o `maxScroll` atual. Teste em Task 4.
5. **Link direto com hash no modo estático** (`/en#contact`) — rola até a seção real. Teste em Task 6.

---

## File Structure

```
src/
  index.html                       script inline que decide is-cinema; JSON-LD Person
  styles.scss                      tokens, reset, fontes, regras globais is-cinema / estático
  styles/_mixins.scss              breakpoints (copiar do jaqueline-site e ajustar 860px)
  app/
    app.ts|html|config*.ts|routes*.ts
    content/
      content.types.ts             interfaces SiteContent, Lang, ChapterId, TitleLine…
      content.pt.ts / content.en.ts
      content.spec.ts              paridade de estrutura PT/EN
      language.ts                  LanguageService (lang signal, content signal, switchPath)
    seo/seo.ts (+ spec)            SeoService: lang, title, description, canonical, hreflang, og
    cinema/
      chapter-math.ts (+ spec)     funções puras de capítulo
      display-mode.ts (+ spec)     DisplayMode: 'cinema' | 'static'
      scroll-director.ts (+ spec)  rAF, P suavizado, --p no <html>, navegação, foco
      cinema-canvas.ts (+ spec)    componente que faz import() da cena e liga eventos
      cursor.ts                    cursor próprio
      scene/
        shapes.ts (+ spec)         geração determinística das 5 formas
        shaders.ts                 GLSL do protótipo (partículas + fundo topográfico)
        cinema-scene.ts            classe Three.js (sem Angular)
    layout/header.ts|html|scss     marca, nav, PT/EN, Currículo, barra de progresso
    sections/
      title-words.ts               componente que renderiza TitleLine[] em spans .w
      intro/ experience/ projects/ stage/ contact/   (ts|html|scss cada)
    pages/home.ts                  compõe as 5 seções + canvas + cursor
    pages/resume.ts|html|scss      currículo imprimível (fonte dos PDFs)
public/
  images/caio-480.webp, caio-960.webp, og-image.png, shots/climb.webp, shots/continuar.webp
  cv/caio-marins-cv-pt.pdf, cv/caio-marins-cv-en.pdf
  favicon.png, robots.txt, sitemap.xml
scripts/
  build-images.mjs                 sharp: foto recortada, favicon, OG
  capture-shots.mjs                playwright: capturas Climb/Continuar
  generate-cv.mjs                  playwright: PDFs a partir do build
.github/workflows/deploy.yml
```

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `angular.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `.gitignore`, `.npmrc`, `.prettierrc`, `.editorconfig`, `src/main.ts`, `src/main.server.ts`, `src/index.html`, `src/styles.scss`, `src/styles/_mixins.scss`, `src/app/app.ts`, `src/app/app.html`, `src/app/app.config.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `README.md`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Produces: projeto `caio-portfolio` que compila, testa e pré-renderiza; projeto Angular chamado `caio-portfolio` (saída `dist/caio-portfolio/browser`).

- [ ] **Step 1:** `git init -b main` em `/home/cmarins/projects/caio-portfolio` (os `docs/` já existem). Copiar do jaqueline-site os arquivos de config listados, trocando o nome do projeto para `caio-portfolio` em `package.json`/`angular.json` e removendo as fontes Cormorant/Inter. Remover a chave `cli.analytics` do `angular.json`.
- [ ] **Step 2:** `npm i three@0.187.0 @fontsource/instrument-serif@5.3.0 @fontsource-variable/manrope@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0` e `npm i -D @types/three@0.187.0 sharp@0.35.5 playwright@1.64.1`. Em `angular.json > styles`: `@fontsource/instrument-serif/400.css`, `@fontsource/instrument-serif/400-italic.css`, `@fontsource-variable/manrope/wght.css`, `@fontsource-variable/jetbrains-mono/wght.css`, `src/styles.scss`. Budget `anyComponentStyle`: warning 8kB, error 12kB.
- [ ] **Step 3: teste** `app.spec.ts`: `it('renders the app shell', …)` — cria `App` com `provideRouter([])` e espera `fixture.nativeElement.querySelector('router-outlet')` não nulo.
- [ ] **Step 4:** `npm test -- --watch=false` → PASS; `npx ng build` → sucesso e `dist/caio-portfolio/browser/index.html` existe.
- [ ] **Step 5:** `styles.scss`: tokens do Global Constraints como custom properties em `:root`, reset, `body { background:#020405; color:#f2f5f3; font: 300 15px/1.7 'Manrope Variable', system-ui }`, `:focus-visible` com contorno `--mint`, classe `.visually-hidden`, skip link. README com comandos (como no jaqueline-site).
- [ ] **Step 6: Commit** (após autorização do Caio) — `chore: scaffold Angular 22 project`.

---

### Task 2: Modelo de conteúdo PT/EN

**Files:**
- Create: `src/app/content/content.types.ts`, `content.pt.ts`, `content.en.ts`, `language.ts`
- Test: `src/app/content/content.spec.ts`, `src/app/content/language.spec.ts`

**Interfaces:**
- Produces:
  - `type Lang = 'pt' | 'en'`
  - `const CHAPTER_IDS = ['intro', 'experience', 'projects', 'stage', 'contact'] as const; type ChapterId = typeof CHAPTER_IDS[number]` (ids de fragmento, iguais nos dois idiomas)
  - `interface TitleLine { readonly words: readonly { text: string; em?: boolean }[] }`
  - `interface ProjectItem { id: 'almeida' | 'climb' | 'continuar'; name: string; summary: string; tags: readonly string[]; status: string; award?: string; links: readonly { label: string; href: string }[]; preview?: { src: string; alt: string; width: number; height: number } }`
  - `interface SiteContent { lang: Lang; meta: { title: string; description: string }; nav: Record<ChapterId, string>; ui: { resume: string; resumeHref: string; scrollHint: string; skipLink: string; switchLang: string }; intro: {...}; experience: {...}; projects: { kicker: string; title: readonly TitleLine[]; items: readonly ProjectItem[] }; stage: {...}; contact: {...}; resume: {...} }` — o implementador define os campos de `intro/experience/stage/contact/resume` a partir do spec §6 (kicker, `title: TitleLine[]`, parágrafos, listas).
  - `CONTENT: Record<Lang, SiteContent>`
  - `@Injectable({providedIn:'root'}) class LanguageService { readonly lang: Signal<Lang>; readonly content: Signal<SiteContent>; setLang(lang: Lang): void; pathFor(lang: Lang, fragment?: ChapterId): string }` — `pathFor('en','projects')` → `'/en#projects'`, `pathFor('pt')` → `'/'`.

- [ ] **Step 1: testes** em `content.spec.ts`:
  - `it('PT and EN have the same structure')` — função de teste `shape(obj)` que troca strings por `'s'` recursivamente; `expect(shape(CONTENT.en)).toEqual(shape(CONTENT.pt))`.
  - `it('lists the three approved projects in order')` — `CONTENT.pt.projects.items.map(p => p.id)` igual a `['almeida','climb','continuar']`.
  - `it('never ships a screenshot for Almeida JJ')` — `items.find(p => p.id==='almeida')!.preview` é `undefined` nos dois idiomas.
  - `it('spells Núclea with accent')` — `JSON.stringify(CONTENT.pt)` contém `'Núclea'` e não contém `'Nuclea'`.
  - `language.spec.ts`: `pathFor` nos 4 casos (pt/en × com/sem fragmento).
- [ ] **Step 2:** rodar → FAIL (módulos inexistentes).
- [ ] **Step 3:** implementar tipos, conteúdo (fatos do spec §6, rascunhos do protótipo como base; EN é tradução natural, não literal) e `LanguageService`. Links reais: LinkedIn, `mailto:caio.marins011@gmail.com`, GitHub, sites e repos do spec. `resumeHref`: `/cv/caio-marins-cv-pt.pdf` e `/cv/caio-marins-cv-en.pdf`.
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5: Commit** — `feat: typed bilingual content`.

---

### Task 3: Rotas, idioma e SEO

**Files:**
- Modify: `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/index.html`
- Create: `src/app/seo/seo.ts`, `src/app/pages/home.ts` (stub com `<p>{{ content().intro.kicker }}</p>` até a Task 5), `public/robots.txt`, `public/sitemap.xml`
- Test: `src/app/seo/seo.spec.ts`, `src/app/pages/home.spec.ts`

**Interfaces:**
- Consumes: `LanguageService`, `CONTENT`.
- Produces: rotas `''` e `'en'` → `Home` com `data: { lang }`; `'curriculo'` e `'en/resume'` → `Resume` (Task 9; até lá, rota comentada). `SeoService.apply(content: SiteContent, path: string): void`. Header usa `LanguageService.pathFor(other, currentChapter)`.

- [ ] **Step 1: testes**
  - `seo.spec.ts`: após `apply(CONTENT.en, '/en')`: `document.documentElement.lang === 'en'`; `title` = `CONTENT.en.meta.title`; `link[rel=canonical]` href `https://caiomarinss.github.io/en`; existem `link[rel=alternate][hreflang=pt-BR]` → `https://caiomarinss.github.io/` e `[hreflang=en]` → `/en`, e `x-default` → `/`; `meta[property="og:locale"]` = `en_US`. Chamar `apply` duas vezes não duplica tags.
  - `home.spec.ts` (Review Focus 3): com a rota `/#projects`, `LanguageService.pathFor('en', 'projects')` usado pelo link do seletor resulta em `href="/en#projects"` — renderizar `Header` (Task 6) depois; aqui testar só o serviço com fragmento vindo de `ActivatedRoute.fragment`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar. `Home` lê `route.snapshot.data['lang']`, chama `language.setLang` e `seo.apply`. `app.routes.server.ts`: `RenderMode.Prerender` para `''`, `'en'`, `'curriculo'`, `'en/resume'`; `'**'` → redirect `''`. `index.html`: `<html lang="pt-BR">`, theme-color `#020405`, JSON-LD `Person` (name, jobTitle "Desenvolvedor Full Stack Júnior", worksFor Organization "Núclea", url, sameAs LinkedIn+GitHub, knowsLanguage pt/en). `sitemap.xml` com `/` e `/en`; `robots.txt` apontando o sitemap e com `Disallow: /curriculo` e `/en/resume`.
- [ ] **Step 4:** rodar testes → PASS; `npx ng build` → existem `dist/caio-portfolio/browser/index.html` e `dist/caio-portfolio/browser/en/index.html`, o segundo com `<html lang="en"`.
- [ ] **Step 5: Commit** — `feat: pt/en routes and SEO head`.

---

### Task 4: Matemática dos capítulos e modo de exibição

**Files:**
- Create: `src/app/cinema/chapter-math.ts`, `src/app/cinema/display-mode.ts`
- Modify: `src/index.html` (script inline no `<head>`)
- Test: `src/app/cinema/chapter-math.spec.ts`, `src/app/cinema/display-mode.spec.ts`

**Interfaces:**
- Produces:
  - `CHAPTER_COUNT = 5`, `ACTIVE_WINDOW = 0.34`
  - `ratioToProgress(ratio: number): number` → `clamp(ratio,0,1) * (CHAPTER_COUNT-1)`
  - `isChapterActive(p: number, index: number): boolean` → `Math.abs(p-index) < ACTIVE_WINDOW`
  - `nearestChapter(p: number): number` → `Math.round(clamp(p,0,4))`
  - `chapterScrollTop(index: number, maxScroll: number): number` → `maxScroll * index / (CHAPTER_COUNT-1)`
  - `chapterFill(p: number, index: number): number` → `clamp(p - index + 0.5, 0, 1)`
  - `supportsCinema(win: Window): boolean` → `false` se `matchMedia('(prefers-reduced-motion: reduce)').matches` ou se `document.createElement('canvas').getContext('webgl2') ?? getContext('webgl')` for nulo.
  - `@Injectable({providedIn:'root'}) class DisplayMode { readonly mode: Signal<'cinema'|'static'>; fallbackToStatic(reason: string): void }` — no navegador o estado inicial é lido de `document.documentElement.classList.contains('is-cinema')`; no servidor é `'static'`. `fallbackToStatic` remove a classe, faz `console.warn(reason)` e muda o signal.

- [ ] **Step 1: testes** `chapter-math.spec.ts`: `ratioToProgress(-1)=0`, `(0.5)=2`, `(2)=4`; `isChapterActive(1.33,1)` true e `(1.35,1)` false; `nearestChapter(2.49)=2`; `chapterFill(1,1)=0.5`, `(3,1)=1`, `(0,2)=0`; **Review Focus 4:** `chapterScrollTop(2, 4000)=2000` e, após "resize", `chapterScrollTop(2, 3000)=1500` (o valor depende só do `maxScroll` passado).
  `display-mode.spec.ts`: `supportsCinema` falso com reduced-motion; falso com `getContext` retornando `null`; verdadeiro com contexto fake. `DisplayMode` com classe `is-cinema` presente → `'cinema'`; `fallbackToStatic('x')` → `'static'`, classe removida, `console.warn` chamado com `'x'`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar.
- [ ] **Step 4:** script inline no `<head>` de `index.html` (antes dos estilos), mesma lógica de `supportsCinema` em JS puro, adicionando `is-cinema` ao `<html>`; com `try/catch` (em erro, não adiciona). Assim, sem JS o site fica estático e com JS não há troca de layout depois da hidratação.
- [ ] **Step 5:** rodar → PASS. **Step 6: Commit** — `feat: chapter math and display mode`.

---

### Task 5: Seções em HTML semântico (modo estático completo)

**Files:**
- Create: `src/app/sections/title-words.ts`, `src/app/sections/{intro,experience,projects,stage,contact}/*.ts|html|scss`
- Modify: `src/app/pages/home.ts`
- Copy: foto provisória → `public/images/caio-960.webp` (a Task 9 gera as versões finais; aqui basta `npx sharp-cli` ou o script da Task 9 adiantado — preferir criar `scripts/build-images.mjs` já agora só com a foto)
- Test: `src/app/sections/sections.spec.ts`

**Interfaces:**
- Consumes: `LanguageService.content`, `CHAPTER_IDS`, `TitleLine`.
- Produces: cada seção é `<section [id]="chapterId" class="ch" data-chapter="N">` com o conteúdo do spec §6; `TitleWords` (`<app-title-words [lines]="..." [level]="1|2" />`) renderiza `<hN class="title">` com cada palavra como `<span class="w"><span [style.transition-delay.s]="i*0.07">texto</span></span>`, palavras `em` dentro de `<i>`, quebras de linha como `<br>`; texto acessível íntegro (sem `aria` extra). `ProjectsSection` emite `hovered = output<ProjectItem['id'] | null>()` em `mouseenter/mouseleave/focusin/focusout` de cada linha.

- [ ] **Step 1: testes** `sections.spec.ts` (render de `Home` com rota pt):
  - existem 5 `section.ch` com ids na ordem de `CHAPTER_IDS`;
  - `h1` único com texto `Caio Marins`;
  - `TitleWords`: `[{words:[{text:'Do'},{text:'front'}]},{words:[{text:'ao'},{text:'banco',em:true}]}]` gera 4 `.w`, 1 `br`, 1 `i`, e `textContent` normalizado `'Do front ao banco'`;
  - linha do projeto Almeida não contém `img`; Climb mostra o selo `award`;
  - todos os `a[href^="http"]` têm `target="_blank"` e `rel="noopener"`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar templates e SCSS do **modo estático** (seções empilhadas, `min-height` confortável, tipografia final, grid editorial simples; foto da abertura 3:4 com `width/height`, `fetchpriority="high"`, `srcset` 480/960). Nenhum estilo de cinema ainda.
- [ ] **Step 4:** rodar → PASS; `npx ng build` e conferir no HTML pré-renderizado de `/` e `/en` que todo o texto está presente.
- [ ] **Step 5: Commit** — `feat: semantic sections (static mode)`.

---

### Task 6: Camada cinematográfica (layout fixo, header, progresso, foco)

**Files:**
- Create: `src/app/cinema/scroll-director.ts`, `src/app/layout/header.ts|html|scss`, `src/app/cinema/cursor.ts`
- Modify: `src/styles.scss` (bloco `html.is-cinema`), SCSS de cada seção (posições por capítulo, sob `:host-context(.is-cinema)`), `src/app/app.html`, `src/app/pages/home.ts`
- Test: `src/app/cinema/scroll-director.spec.ts`, `src/app/layout/header.spec.ts`

**Interfaces:**
- Consumes: `chapter-math`, `DisplayMode`, `LanguageService`.
- Produces: `@Injectable({providedIn:'root'}) class ScrollDirector { readonly activeChapter: Signal<number>; onFrame(cb: (p: number) => void): () => void; goTo(index: number): void; start(): void; stop(): void }`.
  - `start()` (só navegador e só em `'cinema'`): loop rAF que calcula `ratio = scrollY / maxScroll`, suaviza `p += (target - p) * 0.06`, escreve `--p` (com 4 casas) em `document.documentElement.style`, atualiza `data-active` em cada `section.ch` (classe `active` quando `isChapterActive`), atualiza `activeChapter` **só quando `nearestChapter` muda**, e chama os callbacks `onFrame`. Pausa com `document.hidden`.
  - `goTo(i)`: em cinema `scrollTo({ top: chapterScrollTop(i, maxScroll()), behavior })`; em estático `document.getElementById(CHAPTER_IDS[i])?.scrollIntoView({ behavior })`. `behavior` = `'auto'` com reduced-motion, senão `'smooth'`.
  - `focusin` em `document`: se o alvo está dentro de `section.ch[data-chapter=N]` e o modo é cinema e `N !== activeChapter()`, chama `goTo(N)` com `'auto'`.
  - Na inicialização, se `location.hash` for um `ChapterId`, `goTo` desse capítulo com `'auto'`.
- `app.html`: skip link (`content().ui.skipLink` → `#intro`) como primeiro elemento focável, depois `<app-header />`, `<main>`.
- Header: marca, nav (`<a [href]="'#'+id" (click)="goTo">` com `aria-current="true"` no ativo), seletor PT/EN (link real via `pathFor`), botão "Currículo" (`content().ui.resumeHref`, `download`), barra de progresso `aria-hidden="true"` com 5 traços cujo preenchimento é CSS: `height: calc(clamp(0, var(--p, 0) - N + 0.5, 1) * 100%)`.
- CSS cinema (`html.is-cinema`): `body { min-height: 620vh }`, `main.stage { position: fixed; inset: 0; pointer-events: none }`, `.ch { position:absolute; inset:72px 56px 44px }`, `.ch.active { pointer-events:auto }`, animações de `.w > span` e `.fade` como no protótipo, posições por capítulo copiadas do protótipo (`#c0…#c4` → ids novos), mobile ≤ 860px idem. Linha horizontal sob o header: sim; **grade vertical: não**.
- `Cursor`: componente renderizado só em cinema e `(hover:hover) and (pointer:fine)`; ponto segue o ponteiro, anel com lerp `0.18`, classe `hover` sobre `a, button`; `aria-hidden`. Esconde o cursor nativo só nesse caso.

- [ ] **Step 1: testes** `scroll-director.spec.ts` (stubs de `requestAnimationFrame`, `scrollTo`, `scrollIntoView`, `matchMedia`):
  - em cinema, `goTo(2)` chama `scrollTo` com `top = chapterScrollTop(2, scrollHeight - innerHeight)`;
  - **Review Focus 5:** em estático com `location.hash = '#contact'`, `start()` chama `scrollIntoView` no elemento `#contact`;
  - **Review Focus 1:** em cinema, com `activeChapter = 0`, disparar `focusin` num `a` dentro de `section.ch[data-chapter="2"]` chama `scrollTo` com o destino do capítulo 2 e `behavior: 'auto'`;
  - após um frame com `scrollY` = metade de `maxScroll` e `p` inicial 2 (forçar), `document.documentElement.style.getPropertyValue('--p')` é `'2.0000'` e a seção 2 tem a classe `active`.
  - `header.spec.ts`: o link do idioma aponta para `/en#projects` quando `activeChapter() === 2` em PT (Review Focus 3); o item ativo tem `aria-current="true"`; a barra de progresso tem `aria-hidden="true"`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS.
- [ ] **Step 5:** `npm start`, abrir `http://localhost:4200/` com a classe `is-cinema` e conferir (sem a cena 3D ainda) que os capítulos entram e saem com a rolagem, o menu leva a cada um, o Tab rola até o capítulo do link focado, e que `/en` funciona. Com "reduzir movimento" do SO ativado: página empilhada normal.
- [ ] **Step 6: Commit** — `feat: cinematic overlay, header and scroll director`.

---

### Task 7: Cena WebGL (partículas + fundo topográfico)

**Files:**
- Create: `src/app/cinema/scene/shapes.ts`, `src/app/cinema/scene/shaders.ts`, `src/app/cinema/scene/cinema-scene.ts`, `src/app/cinema/cinema-canvas.ts`
- Modify: `src/app/pages/home.ts` (inclui `<app-cinema-canvas />` só quando `mode() === 'cinema'`)
- Test: `src/app/cinema/scene/shapes.spec.ts`, `src/app/cinema/cinema-canvas.spec.ts`

**Interfaces:**
- Consumes: `ScrollDirector.onFrame`, `DisplayMode`, saída `hovered` de `ProjectsSection` (via um `signal` em `ScrollDirector` ou serviço `ProjectHover` com `readonly hovered: WritableSignal<ProjectItem['id'] | null>` — usar `ProjectHover` em `src/app/cinema/project-hover.ts`).
- Produces:
  - `generateShapes(count: number, seed: number): { shapes: Float32Array[]; rnd: Float32Array }` — 5 arrays de `count*3`, PRNG determinístico (mulberry32) para testes estáveis; formas e parâmetros **exatamente** como no protótipo (esfera fibonacci R≈1.55; rede com os 9 hubs e 14 arestas listados lá, 38% nos hubs; 3 camadas em y = 1.15 / 0 / −1.15 com 10% em colunas; anel r≈2.3 em y = −1.3 + cone de altura 3.1; espiral de 3 braços).
  - `class CinemaScene { constructor(canvas: HTMLCanvasElement, opts: { mobile: boolean; three: typeof import('three') }); setProgress(p: number): void; setPointer(x: number, y: number): void; setLayerLabels(on: boolean): void; getLayerAnchors(): { x: number; y: number }[]; resize(w: number, h: number): void; render(time: number): void; dispose(): void }` — recebe o módulo `three` por injeção (testável e garante o `import()` dinâmico num lugar só). Shaders de `shaders.ts` = GLSL do protótipo (partículas com morph `pick(k)`/burst e fundo de curvas de nível). Enquadramento por capítulo `frameX = [1.55, 1.25, 1.35, -1.6, 0]`, `frameY = [0.05, 0.25, -0.25, 0, 0.15]` (mobile: x = 0 e `frameY = [0.9, 0.9, 0.9, 0.7, 0.35]`); rotação `y = t*0.05 + ratio*π*1.6 + mx*0.35`, `x = 0.18 + my*0.18 + sin(ratio*π)*0.25`.
  - `getLayerAnchors()` devolve as posições na tela (px) dos centros das 3 camadas da forma 2, para rótulos HTML.
- `CinemaCanvas` (componente): em `afterNextRender`, `import('three')` → cria `CinemaScene`; liga `onFrame(p => scene.setProgress(p); scene.render())`, `pointermove`, `resize`; `effect` em `ProjectHover.hovered() === 'almeida'` → `setLayerLabels(true)` e mostra 3 rótulos HTML (`Angular`, `Spring Boot + JWT`, `MySQL`) posicionados por `getLayerAnchors()` a cada frame; Climb/Continuar → imagem `preview` flutuando perto do cursor (posição com lerp, `pointer-events:none`, some no toque). Em `webglcontextlost` ou se o `import()`/construtor lançar → `displayMode.fallbackToStatic('…')`. `dispose()` no destroy.

- [ ] **Step 1: testes**
  - `shapes.spec.ts`: `generateShapes(1000, 1)` retorna 5 arrays de 3000 e `rnd` de 1000 em [0,1); todas as coordenadas finitas e dentro de |v| ≤ 3.5; mesma seed ⇒ arrays iguais; forma 2 tem ≥ 85% dos pontos com y ∈ {1.15, 0, −1.15} ± 0.02.
  - `cinema-canvas.spec.ts` (**Review Focus 2**): com `import` substituído por função que rejeita (expor `loadThree` como propriedade injetável/token `THREE_LOADER`) → `DisplayMode.mode()` vira `'static'`; com uma cena fake, disparar `webglcontextlost` no canvas → `'static'` e `dispose` chamado.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar (provider `THREE_LOADER = () => import('three')`).
- [ ] **Step 4:** rodar → PASS. `npx ng build`: o Three.js deve estar num chunk lazy separado (conferir `dist/.../browser/chunk-*.js` e que `main-*.js` não contém `WebGLRenderer`) e o budget inicial não estoura.
- [ ] **Step 5:** `npm start` e comparar lado a lado com o protótipo: formas, transições, cores, enquadramento, rótulos do Almeida e prévias de Climb/Continuar (com imagens provisórias). Celular via DevTools (≤ 860px).
- [ ] **Step 6: Commit** — `feat: particle morph scene with topographic background`.

---

### Task 8: Imagens (foto, capturas, OG, favicon)

**Files:**
- Create/Modify: `scripts/build-images.mjs`, `scripts/capture-shots.mjs`, `public/images/*`, `public/favicon.png`, `public/apple-touch-icon.png`, `package.json` (scripts `images`, `shots`)
- Test: execução dos scripts + verificação de arquivos

**Interfaces:**
- Produces: `public/images/caio-480.webp` e `caio-960.webp` (3:4), `public/images/shots/climb.webp` e `continuar.webp` (1280×800 → WebP 960 de largura), `public/images/og-image.png` (1200×630), `favicon.png` 64×64 e `apple-touch-icon.png` 180×180. Caminhos e dimensões batem com `preview`/foto do conteúdo (Task 2/5).

- [ ] **Step 1:** `build-images.mjs` (sharp): lê `/mnt/c/Users/cMarins/Downloads/fotoProfissionalCaio.jpeg` (caminho via argumento, com esse padrão), recorta 3:4 focando rosto/tronco (retirar o letreiro à direita — ajustar `extract` olhando o resultado), gera 480/960 WebP q≈80. OG: fundo `#020405`, nome em serifa, "Desenvolvedor Full Stack Júnior", foto à direita (SVG composto com sharp). Favicon: monograma "CM" em `--mint` sobre o fundo.
- [ ] **Step 2:** `npx playwright install chromium` (se faltar dependência do sistema, pedir ao Caio para rodar `! sudo npx playwright install-deps chromium`). `capture-shots.mjs`: abre `https://caiomarinss.github.io/climb-TCC/` e `https://caiomarinss.github.io/continuar-marcas-e-patentes/` em 1280×800, espera `networkidle`, captura e converte para WebP com sharp. **Nunca** capturar o sistema Almeida JJ.
- [ ] **Step 3:** `npm run images && npm run shots`; abrir cada imagem gerada com o Read para conferir enquadramento; ajustar e repetir até ficar bom.
- [ ] **Step 4:** `npm test -- --watch=false` e `npx ng build` → PASS.
- [ ] **Step 5: Commit** — `feat: optimized photo, project previews, OG image and favicon`.

---

### Task 9: Currículo (página imprimível + PDFs)

**Files:**
- Create: `src/app/pages/resume.ts|html|scss`, `scripts/generate-cv.mjs`, `public/cv/caio-marins-cv-pt.pdf`, `public/cv/caio-marins-cv-en.pdf`
- Modify: `src/app/app.routes.ts` (rotas `curriculo` e `en/resume`, `data.lang`), `package.json` (script `cv`)
- Test: `src/app/pages/resume.spec.ts`

**Interfaces:**
- Consumes: `CONTENT[lang].resume` e demais blocos do conteúdo.
- Produces: rotas pré-renderizadas com `<meta name="robots" content="noindex">`; PDFs A4 de 1 página por idioma.

- [ ] **Step 1: teste** `resume.spec.ts`: em `/curriculo` aparecem nome, e-mail, LinkedIn, GitHub, "Núclea" com as datas 02/2025 e 09/2025, os 3 projetos, ADS 2027/1, Inglês B2; não há `img` (sem foto); `meta[name=robots]` = `noindex`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar a página: uma coluna, tipografia sóbria (Manrope + títulos em Instrument Serif), preto no branco, `@page { size: A4; margin: 14mm }`, sem cena, sem cursor, sem header do site. Seções: resumo, experiência, projetos, palco/reconhecimento, formação e cursos, idiomas, contato.
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5:** `generate-cv.mjs`: sobe um servidor estático simples (`node:http`) em `dist/caio-portfolio/browser`, abre `/curriculo` e `/en/resume` com Playwright e grava `page.pdf({ format: 'A4', printBackground: true })` em `public/cv/`. Falha se o PDF tiver mais de 1 página (checar `pdf` bytes via contagem de `/Type /Page`). Rodar `npx ng build && npm run cv && npx ng build`.
- [ ] **Step 6:** abrir os dois PDFs (Read) e conferir conteúdo e quebra de página. **Mostrar ao Caio para revisão antes de publicar** (pendência do spec).
- [ ] **Step 7: Commit** — `feat: printable resume and PDF generation`.

---

### Task 10: Deploy e publicação

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: build pronto.
- Produces: site em https://caiomarinss.github.io/.

- [ ] **Step 1:** `deploy.yml` no molde do jaqueline-site, com: `actions/checkout@v5`, `actions/setup-node@v5` (`node-version: 22`, `cache: npm`), `npm ci`, `npm test -- --watch=false`, `npx ng build --base-href "/"`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`. Antes de fixar, conferir as versões mais recentes de cada action (`gh api repos/actions/<nome>/releases/latest --jq .tag_name`) e usar a maior major compatível com Node 24. Não instalar navegadores do Playwright no CI (PDFs e imagens são versionados).
- [ ] **Step 2:** `npm test -- --watch=false` e `npx ng build --base-href "/"` locais → PASS.
- [ ] **Step 3:** **Pedir autorização ao Caio** e então: `gh repo create CaioMarinss.github.io --public --source=. --remote=origin --push`; `gh api -X POST repos/CaioMarinss/CaioMarinss.github.io/pages -f build_type=workflow`; acompanhar `gh run watch --exit-status`.
- [ ] **Step 4:** `curl -s -o /dev/null -w "%{http_code}" https://caiomarinss.github.io/` → `200`; idem `/en/` e `/cv/caio-marins-cv-pt.pdf`.
- [ ] **Step 5:** README final (comandos, estrutura, como regerar imagens/PDFs). Commit — `docs: readme and deploy workflow` (com autorização).

---

### Task 11: Verificação final

- [ ] **Step 1:** `npm test -- --watch=false` → todos passam; `npx ng build` sem warnings de budget.
- [ ] **Step 2:** Playwright (script ad hoc no scratchpad, não no repo) no site publicado: capturas em 1440×900 e 390×844 de cada capítulo (rolando até `chapterScrollTop`), mais uma com `reducedMotion: 'reduce'` e uma com WebGL desativado (`--disable-webgl`) — conferir modo estático completo. Navegação só por teclado do topo ao fim.
- [ ] **Step 3:** Lighthouse mobile (`npx lighthouse https://caiomarinss.github.io/ --preset=perf --form-factor=mobile` se disponível): LCP < 2,5 s; acessibilidade ≥ 95. Registrar números reais no relatório ao Caio.
- [ ] **Step 4:** Revisão independente com o agente `code-reviewer` sobre o repositório inteiro; corrigir o que for confirmado.
- [ ] **Step 5:** Relatório ao Caio: link, prints, números, pendências (mês do CriaTech, FGV) e riscos.
