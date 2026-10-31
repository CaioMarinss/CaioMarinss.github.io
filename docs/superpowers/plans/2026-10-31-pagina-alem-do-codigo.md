# Página "Além do código" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma segunda página (`/sobre`, `/en/about`), com o mesmo leiaute cinematográfico da home, sobre a vida pessoal do Caio: Jiu-Jitsu, violão e música (player do Spotify), games e kart. Na home, um botão em faixa editorial leva até ela.

**Architecture:** Um `PageService` raiz (no molde de `LanguageService.setLang`) guarda a página ativa (`'home' | 'life'`). Com ela, `ScrollDirector`, `Header`, `App`, `LanguageService.pathFor`, `CinemaCanvas` e `AmbientBackground` escolhem os ids de capítulo, os caminhos e o conjunto de formas. A cena 3D continua com 5 formas: `generateShapes` passa a receber um conjunto (`'home' | 'life'`) e devolve também um atributo `orbit` por partícula, que o shader usa pra girar os aglomerados da abertura. Com `'home'`, todos os valores ficam em zero e nada muda.

**Tech Stack:** Angular 22 (standalone, signals, SSR prerender), Three.js 0.187, Vitest via `@angular/build:unit-test`, SCSS.

**Spec:** `docs/superpowers/specs/2026-10-31-pagina-alem-do-codigo-design.md`

## Global Constraints

- **A home não muda de comportamento nem de visual.** Os 98 testes atuais (`npx ng test --watch=false`) passam **sem editar nenhum `*.spec.ts` existente**. Só podem ser acrescentados testes novos, em arquivos novos ou como `it` novos.
- `SHAPE_COUNT = 5` e `CHAPTER_COUNT = 5` não mudam. A lógica de morph do shader só ganha a rotação de `p0`.
- Rotas: `sobre` (pt) e `en/about` (en). Os caminhos canônicos terminam em barra: `/sobre/` e `/en/about/`.
- Ids de capítulo da página nova, em ordem: `life-intro`, `jiujitsu`, `music`, `games`, `kart`.
- A playlist entra como embed estático, sem parâmetro `si`: `https://open.spotify.com/embed/playlist/166KNpL6HlNIQq6TIO8kBa`, com `loading="lazy"`, `height="152"`, `width="100%"`, `allow="encrypted-media"` e `frameborder="0"`.
- Botão da home (opção B): "E fora do *trabalho?*" / "And outside *work?*", com a palavra em itálico na cor `--accent`, entre duas linhas `--accent` e com um círculo ↗ à direita.
- Toda cópia nova vai em `content.pt.ts` e `content.en.ts`, com a mesma estrutura (o `content.spec` verifica isso).
- Navegação entre home e página nova por `<a href>` simples, com recarga completa. Sem `routerLink`, pra que o script do `index.html` e o `ScrollDirector` reiniciem limpos.
- **Git:** trabalhar numa branch `feat/pagina-alem-do-codigo`. Commits só com autorização do Caio (CLAUDE.md). Os passos "Commit" abaixo valem depois dessa autorização.

## Review Focus

1. **Troca de idioma na página nova mantendo o capítulo** (`/sobre#music` → `/en/about/#music`). O link do idioma aponta pra mesma página e pro mesmo capítulo. Teste na Task 2.
2. **Deep link com hash da página nova** (`/sobre#games`, nos modos estático e cinema). Rola até a seção certa, e nenhum id da home é usado. Teste na Task 2.
3. **Transição da abertura (órbitas) pro Jiu-Jitsu.** Não pode haver salto: a rotação só age sobre `p0`, então com `uP ≥ 1` a posição independe de `orbit`. Teste na Task 4 (lógica espelhada em TS).
4. **Página nova sem WebGL, com `prefers-reduced-motion` ou com falha do chunk 3D.** Todo o conteúdo e o player ficam visíveis no leiaute estático. Teste na Task 6.
5. **Skip link e marca no header da página nova.** O skip link vai pra `/sobre/#life-intro` e a marca leva pra home (`/` ou `/en/`). Teste na Task 2.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/app/content/page.ts` (novo) | `PageId`, `PAGE_PATHS`, `PageService` (os ids de capítulo ficam em `content.types.ts`) |
| `src/app/content/language.ts` | `pathFor` ciente da página |
| `src/app/cinema/scroll-director.ts` | ids de capítulo vêm do `PageService` |
| `src/app/layout/header.{ts,html}` | menu, marca e idioma por página |
| `src/app/app.ts` | skip link por página |
| `src/app/cinema/scene/shapes.ts` | `ShapeSetId`, `orbit` em `ShapeSet`, despacho por conjunto |
| `src/app/cinema/scene/shapes-life.ts` (novo) | as 5 formas da página nova |
| `src/app/cinema/scene/shaders.ts` | atributo `orbit` e uniform `uOrbit` |
| `src/app/cinema/scene/cinema-scene.ts` | opção `shapes` e enquadramento por conjunto |
| `src/app/cinema/cinema-canvas.ts`, `ambient-background.ts` | repassam `PageService.page()` como `shapes` |
| `src/app/content/content.types.ts`, `content.pt.ts`, `content.en.ts` | tipo `LifeContent` e `stage.more` |
| `src/app/sections/life/*/` (novos) | 5 seções: `life-intro`, `jiujitsu`, `music`, `games`, `kart` |
| `src/app/pages/life.ts` (novo) | a página nova |
| `src/app/app.routes.ts`, `app.routes.server.ts` | rotas novas |
| `src/app/seo/seo.ts` | `applyLife` |
| `public/sitemap.xml` | 2 entradas novas |
| `src/app/sections/stage/stage.{html,scss,ts}` | o botão da faixa editorial |

---

### Task 1: PageService e caminhos por página

**Files:**
- Create: `src/app/content/page.ts`
- Modify: `src/app/content/language.ts`, `src/app/content/content.types.ts` (ids da página nova ao lado de `CHAPTER_IDS`, evitando import circular)
- Test: `src/app/content/page.spec.ts` (novo)

**Interfaces:**
- Produces:
  - `export type PageId = 'home' | 'life'`
  - Em `content.types.ts`: `export const LIFE_CHAPTER_IDS = ['life-intro', 'jiujitsu', 'music', 'games', 'kart'] as const`, `export type LifeChapterId = (typeof LIFE_CHAPTER_IDS)[number]` e `export type AnyChapterId = ChapterId | LifeChapterId`
  - `export const PAGE_PATHS: Record<PageId, Record<Lang, string>> = { home: { pt: '/', en: '/en/' }, life: { pt: '/sobre/', en: '/en/about/' } }`
  - `@Injectable({ providedIn: 'root' }) class PageService { readonly page: Signal<PageId>; readonly chapterIds: Signal<readonly AnyChapterId[]>; setPage(page: PageId): void }`, com `'home'` como padrão
  - `LanguageService.pathFor(lang: Lang, fragment?: AnyChapterId, page: PageId = 'home'): string`

- [ ] **Step 1: Escrever os testes que falham** em `page.spec.ts`:
  - `it('defaults to the home chapters')`: `TestBed.inject(PageService).chapterIds()` é igual a `[...CHAPTER_IDS]`, e `page()` é `'home'`.
  - `it('switches to the life chapters')`: depois de `setPage('life')`, `chapterIds()` é igual a `['life-intro','jiujitsu','music','games','kart']`.
  - `it('builds life paths')`: `pathFor('pt', undefined, 'life')` dá `'/sobre/'`, `pathFor('en', 'music', 'life')` dá `'/en/about/#music'` e `pathFor('en', 'projects')` continua `'/en/#projects'`.
- [ ] **Step 2: Rodar** `npx ng test --watch=false --include src/app/content/page.spec.ts`. O esperado é FALHA (módulo `./page` inexistente).
- [ ] **Step 3: Implementar** `page.ts` e trocar o `base` de `pathFor` por `PAGE_PATHS[page][lang]`.
- [ ] **Step 4: Rodar** a suíte inteira com `npx ng test --watch=false`. O esperado é PASSAR (98 + 3).
- [ ] **Step 5: Commit** com `feat: page service with per-page chapter ids and paths`.

### Task 2: Scroll, header e skip link por página

**Files:**
- Modify: `src/app/cinema/scroll-director.ts` (linhas 14, 52, 64-65), `src/app/layout/header.ts`, `src/app/layout/header.html`, `src/app/app.ts:37`
- Modify: `src/app/content/content.types.ts`: adicionar o campo `life.nav` (a definição completa de `LifeContent` fica na Task 5; aqui entra só `nav`)
- Test: `src/app/layout/header-life.spec.ts` (novo) e `src/app/cinema/scroll-director-life.spec.ts` (novo)

**Interfaces:**
- Consumes: `PageService`, `PAGE_PATHS` e `pathFor(lang, fragment, page)` da Task 1.
- Produces: `SiteContent.life.nav: Record<LifeChapterId, string>`. Os valores em PT são `{ 'life-intro': 'Início', jiujitsu: 'Jiu-Jitsu', music: 'Música', games: 'Games', kart: 'Kart' }` e em EN `{ 'life-intro': 'Start', jiujitsu: 'Jiu-Jitsu', music: 'Music', games: 'Games', kart: 'Kart' }`. Pra o tipo compilar, já crie `life: { nav }` nos dois arquivos de conteúdo.

- [ ] **Step 1: Escrever os testes que falham.**
  - `header-life.spec.ts` monta o `Header` (no mesmo molde de `header.spec.ts`), com `setPage('life')`:
    - `it('lists the life chapters with life paths')`: os hrefs de `nav a` são `['/sobre/#life-intro','/sobre/#jiujitsu','/sobre/#music','/sobre/#games','/sobre/#kart']`, e os textos vêm de `CONTENT.pt.life.nav`.
    - `it('keeps page and chapter in the language switch')`: com o ativo em 2, o href de `a.lang` é `'/en/about/#music'`.
    - `it('brand links back to the home')`: em pt, o href de `a.brand` é `'/'`. Em en é `'/en/'`. O clique na marca não chama `director.goTo`, mesmo em cinema.
  - `scroll-director-life.spec.ts`:
    - `it('deep-links a life hash in static mode')`: com `location.hash = '#games'` e `setPage('life')`, existe um `<section id="games">` com `scrollIntoView` espiado. `start()` chama esse spy.
    - `it('ignores home ids on the life page')`: com o hash `#projects` e a página `life`, nada rola.
- [ ] **Step 2: Rodar** os dois arquivos. O esperado é FALHA.
- [ ] **Step 3: Implementar.**
  - `ScrollDirector`: trocar `CHAPTER_IDS` por `this.pages.chapterIds()` no `goTo` estático e no deep link. O `isChapterId` passa a checar contra essa lista.
  - `Header`: `chapters = computed(() => pages.chapterIds())`. O rótulo vem de `c.nav[id]` na home e de `c.life.nav[id]` na página nova. Os hrefs usam `pathFor(lang, id, page)`. Na página nova, a marca usa `href = PAGE_PATHS.home[lang]` e não intercepta o clique. A troca de idioma fica com `pathFor(other, index > 0 ? ids[index] : undefined, page)`. `navigate` foca `ids[index]`.
  - `App.skipHref`: `pathFor(lang, pages.chapterIds()[0], pages.page())`.
- [ ] **Step 4: Rodar** a suíte inteira. O esperado é PASSAR, com os testes da home intactos.
- [ ] **Step 5: Commit** com `feat: header, scroll and skip link follow the active page`.

### Task 3: Formas da página nova

**Files:**
- Create: `src/app/cinema/scene/shapes-life.ts`
- Modify: `src/app/cinema/scene/shapes.ts`
- Test: `src/app/cinema/scene/shapes-life.spec.ts` (novo)

**Interfaces:**
- Produces:
  - `export type ShapeSetId = 'home' | 'life'` (em `shapes.ts`)
  - `ShapeSet` ganha o campo `readonly orbit: Float32Array`, com `count * 4` valores: `(axisX, axisY, axisZ, speed)` por partícula, com eixo unitário e velocidade em rad/s. `speed = 0` significa sem órbita.
  - `generateShapes(count: number, seed: number, set: ShapeSetId = 'home'): ShapeSet`. Com `'home'`, a saída de `shapes` e `rnd` fica bit a bit igual à de hoje, e `orbit` vem todo em zero.
  - `export function generateLifeShapes(count: number, seed: number): ShapeSet` (em `shapes-life.ts`)
  - `export const ORBIT_COUNT = 4`, `export const ORBIT_RADIUS = 1.9`

**Geometria (proposta da spec; os parâmetros finos ficam com o implementador, sempre com `|v| ≤ 3.5`):**
- **0, órbitas:** 20% das partículas formam um núcleo (bola com raio 0,45, `speed = 0`). O restante se divide entre 4 aglomerados (`i % 4`). Cada aglomerado tem um eixo de órbita inclinado próprio, nas inclinações `[0.4, -0.5, 1.1, -0.2]` rad. 75% das partículas de cada órbita ficam numa bola de raio 0,28 em volta de um ponto do círculo de raio `ORBIT_RADIUS`, com fases iniciais `[0, 1.2, 2.1, 3.3]`. Os outros 25% se espalham ao longo do círculo inteiro, formando o rastro. As velocidades são `0.5 + k * 0.12` rad/s, com `k` de 1 a 4. Isso reproduz `opening-shape.html`.
- **1, faixa com nó:** um laço em forma de "8" achatado no centro e duas pontas caindo, de 1,6 de comprimento cada.
- **2, cordas:** 6 linhas paralelas em x ∈ [-2.4, 2.4], espaçadas 0,22 em y, com deslocamento `sin(x * 3 + corda) * 0.12`.
- **3, mira:** anéis com raio 1,1 e 1,9 e quatro traços radiais de 0,6 a 2,4.
- **4, circuito:** uma curva fechada achatada (x com raio 2,4 e z com raio 1,3, com uma "chicane" de `0.35 * sin(3t)`) no plano y = -0.4, mais uma faixa de largada (16 partículas em grade).

- [ ] **Step 1: Escrever os testes que falham:**
  - `it('home set is unchanged and has no orbits')`: com `a = generateShapes(1000, 1)` e `b = generateShapes(1000, 1, 'home')`, `shapes` e `rnd` são idênticos entre os dois, e `b.orbit` é todo zero com comprimento 4000.
  - `it('life set has five finite shapes inside 3.5 and is deterministic')`
  - `it('life opening: core has no orbit, the rest have unit axes and positive speed')`: na forma 0, as partículas com `speed > 0` têm `|axis| ≈ 1` (±1e-6), e entre 15% e 25% têm `speed = 0`.
  - `it('life orbiting particles lie near the orbit radius')`: a distância do centro fica entre `ORBIT_RADIUS - 0.35` e `ORBIT_RADIUS + 0.35`.
- [ ] **Step 2: Rodar** e confirmar FALHA.
- [ ] **Step 3: Implementar.** Usar o mesmo `mulberry32` de `shapes.ts`, exportado ou reaproveitado, sem duplicar.
- [ ] **Step 4: Rodar** a suíte inteira. O esperado é PASSAR, com o `shapes.spec.ts` existente intacto.
- [ ] **Step 5: Commit** com `feat: particle shapes for the life page`.

### Task 4: Órbitas no shader e conjunto na cena

**Files:**
- Modify: `src/app/cinema/scene/shaders.ts` (`PARTICLE_VERTEX`), `src/app/cinema/scene/cinema-scene.ts`, `src/app/cinema/cinema-canvas.ts:247` (chamada `createScene`) e `src/app/cinema/ambient-background.ts:109`
- Test: `src/app/cinema/scene/cinema-scene-life.spec.ts` (novo) e `src/app/cinema/scene/orbit.spec.ts` (novo)

**Interfaces:**
- Consumes: `generateShapes(count, seed, set)` e `ShapeSet.orbit` da Task 3, além de `PageService.page()` da Task 1.
- Produces:
  - `CinemaSceneOptions.shapes?: ShapeSetId`, com `'home'` como padrão.
  - O atributo de geometria `orbit` (itemSize 4) e o uniform `uOrbit`: `1` no conjunto `life` em desktop e mobile, `0.6` no ambient e `0` em `home`.
  - `export function orbitRotate(p: [number, number, number], axis: [number, number, number], angle: number): [number, number, number]` em `src/app/cinema/scene/orbit.ts` (novo). É a fórmula de Rodrigues, a mesma do GLSL. Ela existe pra testar a matemática, porque o jsdom não roda shader.
  - `FRAME_X` e `FRAME_Y` passam a ser `Record<ShapeSetId, …>`. Em `home` ficam os valores de hoje. Em `life`, os valores iniciais são desktop X `[1.55, 1.35, 1.35, -1.6, 1.35]` e Y `[0.05, 0.1, 0, 0, 0]`, e mobile e ambient iguais aos da home. O ajuste fino é visual e fica a critério do implementador.

**GLSL** (decisão da spec; só este trecho é fixo):
```glsl
attribute vec4 orbit; uniform float uOrbit;
vec3 orbitRot(vec3 p){ float a=uTime*orbit.w*uOrbit; vec3 k=orbit.xyz;
  return p*cos(a)+cross(k,p)*sin(a)+k*dot(k,p)*(1.-cos(a)); }
// pick(): troca `return p0` por `return orbitRot(p0)`
```
Com `orbit.w = 0` ou `uOrbit = 0`, temos `a = 0` e o resultado é `p` exatamente. O eixo zero da home não gera NaN, porque não há `normalize`.

- [ ] **Step 1: Escrever os testes que falham:**
  - `orbit.spec.ts`:
    - `it('is the identity at angle 0, even with a zero axis')`
    - `it('keeps the distance to the axis')`
    - `it('rotates a quarter turn')`: `orbitRotate([1,0,0],[0,1,0],π/2)` ≈ `[0,0,-1]`.
  - `cinema-scene-life.spec.ts`, usando o `FakeRenderer` de `cinema-scene.spec.ts`, copiado ou extraído pra um helper novo, sem alterar o spec antigo:
    - `it('home scene has a zero orbit attribute and uOrbit 0')`
    - `it('life scene uploads life shapes and sets uOrbit 1')`
    - `it('ambient life scene sets uOrbit 0.6')`
  - Pra ler o material, use `(scene as any).material.uniforms`. Em teste isso é aceitável, mas o ideal é um getter `debugUniforms()` marcado como `@internal`, se o implementador preferir.
- [ ] **Step 2: Rodar** e confirmar FALHA.
- [ ] **Step 3: Implementar** o shader, a cena (`generateShapes(PARTICLES[device], SHAPE_SEED, opts.shapes ?? 'home')`, o atributo `orbit` e o uniform) e o repasse de `shapes: inject(PageService).page()` em `CinemaCanvas` e `AmbientBackground`.
- [ ] **Step 4: Rodar** a suíte inteira, que deve PASSAR, e depois `npx ng build`, que deve terminar sem erro.
- [ ] **Step 5: Commit** com `feat: orbiting clusters and per-page shape set in the scene`.

### Task 5: Conteúdo da página nova e do botão

**Files:**
- Modify: `src/app/content/content.types.ts`, `content.pt.ts` e `content.en.ts`
- Test: `src/app/content/content-life.spec.ts` (novo)

**Interfaces:**
- Produces (em `content.types.ts`):
```ts
export interface LifeContent {
  readonly meta: { readonly title: string; readonly description: string };
  readonly nav: Record<LifeChapterId, string>;
  readonly intro: { readonly kicker: string; readonly title: readonly TitleLine[]; readonly lead: string };
  readonly jiujitsu: { readonly kicker: string; readonly title: readonly TitleLine[]; readonly text: string; readonly facts: readonly string[] };
  readonly music: { readonly kicker: string; readonly title: readonly TitleLine[]; readonly text: string; readonly playerLabel: string; readonly playerTitle: string };
  readonly games: { readonly kicker: string; readonly title: readonly TitleLine[]; readonly items: readonly string[] };
  readonly kart: { readonly kicker: string; readonly title: readonly TitleLine[]; readonly text: string; readonly back: string };
}
// SiteContent ganha:  readonly life: LifeContent;
// SiteContent.stage ganha:  readonly more: { readonly title: readonly TitleLine[]; readonly label: string };
```
- **Cópia PT** (da spec; o Caio revisa):
  - meta: título "Caio Marins — Além do código", descrição "Fora do trabalho: Jiu-Jitsu desde criança (faixa roxa e professor), violão, games e kart."
  - intro: kicker "Fora do expediente", título `[Além do] [*código*]`, lead "Quando fecho o editor, sobra tatame, corda de violão, controle na mão e pista."
  - jiujitsu: kicker "Tatame", título `[Desde] [*criança*]`, texto "Comecei a treinar ainda criança, num projeto social. Hoje sou faixa roxa e dou aula para crianças, devolvendo o que o esporte me deu.", facts `['Faixa roxa', 'Professor de crianças']`
  - music: kicker "Violão", título `[Rock e] [*melodia*]`, texto "Rock clássico e músicas mais melódicas, como a introdução de The Last of Us. É o que mais gosto de tocar e de ouvir.", playerLabel "Ouvindo", playerTitle "Playlist do Caio no Spotify"
  - games: kicker "Controle", título `[No] [*controle*]`, itens `['The Last of Us', 'Battlefield 6', 'Call of Duty: Black Ops II', 'Call of Duty: Modern Warfare 3']`
  - kart: kicker "Pista", título `[Volta] [*rápida*]`, texto "Adoro andar de kart: a mesma busca pela volta perfeita, só que fora da tela.", back "Voltar para a home"
  - stage.more: título `[E fora do] [*trabalho?*]` e label "Conheça minha vida fora do código"
- **Cópia EN**: tradução direta. intro `[Beyond the] [*code*]`, jiujitsu `[Since] [*childhood*]`, music `[Rock and] [*melody*]`, games `[On the] [*controller*]`, kart `[Fast] [*lap*]`, stage.more `[And outside] [*work?*]` / "Get to know my life outside code", back "Back to home", playerLabel "Listening".

- [ ] **Step 1: Escrever os testes que falham:**
  - `it('every life title has exactly one emphasised word')`, em pt e en, cobrindo os 5 títulos e `stage.more.title`.
  - `it('life nav covers every life chapter')`: as chaves de `life.nav` são iguais a `LIFE_CHAPTER_IDS`.
  - `it('lists the four games in order')`
  - O `content.spec.ts` existente ("PT and EN have the same structure") também precisa passar.
- [ ] **Step 2: Rodar** e confirmar FALHA. **Step 3: Implementar.** **Step 4: Rodar** a suíte inteira e confirmar que PASSA.
- [ ] **Step 5: Commit** com `feat: life page and stage link copy`.

### Task 6: Seções, página e rotas

**Files:**
- Create: `src/app/sections/life/{life-intro,jiujitsu,music,games,kart}/{*.ts,*.html,*.scss}` e `src/app/pages/life.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/app/seo/seo.ts` e `public/sitemap.xml`
- Test: `src/app/pages/life.spec.ts` (novo) e `src/app/seo/seo-life.spec.ts` (novo)

**Interfaces:**
- Consumes: `LifeContent` (Task 5), `PageService` (Task 1), `TitleWords` e o padrão de seção de `sections/stage`.
- Produces:
  - `Life`, o componente da página, no molde de `Home`. Em vez de `setLang` + `seo.apply`, ele faz `setLang` + `pages.setPage('life')` + `seo.applyLife(content)`. `Home` passa a chamar `pages.setPage('home')`, que é uma linha nova e não muda nenhum teste.
  - `SeoService.applyLife(content: SiteContent): void`. Ele monta o title e a description a partir de `content.life.meta`, o canonical em `SITE_ORIGIN + PAGE_PATHS.life[lang]` e os alternates pt-BR e en apontando pra `/sobre/` e `/en/about/`, com x-default em `/sobre/`. Pra isso, refatore o corpo de `apply` num `private applyMeta(...)` compartilhado. O `seo.spec.ts` existente não muda.
  - Rotas: `{ path: 'sobre', component: Life, data: { lang: 'pt' } }` e `{ path: 'en/about', component: Life, data: { lang: 'en' } }`, as duas antes de `**`, mais `RenderMode.Prerender` pra cada uma.
- **Marcação** (padrão: `<section id="<id>" class="ch <classe>" data-chapter="<n>" tabindex="-1" [attr.aria-label]="c.life.nav[id]">`):
  - `life-intro` (0) usa a classe `ch intro`, pra herdar a animação de entrada global, e um `app-title-words` com `[level]="1"`. É o único `h1` da página.
  - `jiujitsu` (1) tem uma `.desc` e os facts em `.meta`. Deixe um slot opcional de imagem, sem marcação enquanto não houver foto.
  - `music` (2) tem uma `.desc`, um `<p class="kicker">` com o `playerLabel` e o `<iframe>` da Global Constraints, com `[title]="c.life.music.playerTitle"` e `src` estático. O iframe fica dentro de um wrapper `.player` com `pointer-events: auto`.
  - `games` (3) é um `<ul>` com os 4 itens.
  - `kart` (4) tem uma `.desc` e `<a class="back" [href]="homeHref()">← {{ back }}</a>`, onde `homeHref = PAGE_PATHS.home[lang]`.
  - SCSS: estático primeiro, depois `:host-context(.is-cinema)` com posições absolutas no estilo de `stage.scss`. A coluna de texto fica à esquerda (`left: var(--pad)`), porque as formas ficam à direita.
- **Sitemap**: duas entradas `<url>` (`/sobre/` e `/en/about/`), com `xhtml:link` pt-BR e en, no formato das entradas atuais.

- [ ] **Step 1: Escrever os testes que falham:**
  - `life.spec.ts`, no padrão de `renderHome` em `sections.spec.ts`:
    - `it('renders the five life chapters in order')`: os ids das seções são iguais a `LIFE_CHAPTER_IDS`, e os `data-chapter` vão de `'0'` a `'4'`.
    - `it('has a single h1 "Além do código"')`
    - `it('embeds the playlist lazily with an accessible title')`: o `iframe` tem `src` igual à URL da Global Constraints, `loading="lazy"` e `title` igual a `CONTENT.pt.life.music.playerTitle`.
    - `it('links back to the home in each language')`: `.back` aponta pra `'/'` em pt e `'/en/'` em en.
    - `it('sets page to life and the language from route data')`
    - `it('shows all copy and the player in static mode')`: sem a classe `is-cinema`, todos os textos de `CONTENT.pt.life`, exceto `meta` e `nav` (que ficam no `<head>` e no header), aparecem no `textContent`, e o `iframe` existe. (Review Focus 4)
  - `seo-life.spec.ts`:
    - `it('sets canonical and alternates for /sobre/')`
    - `it('sets life title and description in en')`
  - Um `it` novo em `app.routes` ou no spec da página: as rotas `sobre` e `en/about` resolvem pra `Life` com o `lang` certo.
- [ ] **Step 2: Rodar** e confirmar FALHA. **Step 3: Implementar.** **Step 4: Rodar** a suíte inteira e confirmar que PASSA.
- [ ] **Step 5: Rodar** `npx ng build` e conferir que `dist/caio-portfolio/browser/sobre/index.html` e `dist/caio-portfolio/browser/en/about/index.html` existem (`ls`). Conferir também que o primeiro contém "Além do código" e `open.spotify.com/embed/playlist/166KNpL6HlNIQq6TIO8kBa` (`grep -c`, com resultado ≥ 1).
- [ ] **Step 6: Commit** com `feat: life page with five chapters, routes, seo and sitemap`.

### Task 7: Botão "E fora do trabalho?" na home

**Files:**
- Modify: `src/app/sections/stage/stage.html`, `stage.scss` e `stage.ts`
- Test: `src/app/sections/stage/stage-more.spec.ts` (novo)

**Interfaces:**
- Consumes: `stage.more` (Task 5) e `PAGE_PATHS` (Task 1).
- Produces: `<a class="more fade d3" [href]="lifeHref()" [attr.aria-label]="c.stage.more.label">`, com o `<app-title-words [lines]="c.stage.more.title" />`, ou um `<span>` com as palavras se `TitleWords` forçar `h2`. Nesse caso, renderize as palavras num `<span class="big">` próprio, com o mesmo `<i>` da ênfase, pra não criar um heading dentro do link. Depois vem `<span class="circ" aria-hidden="true">↗</span>`. `lifeHref = computed(() => PAGE_PATHS.life[lang()])`.
- **Visual** (do mockup aprovado, `button.html` opção B): `display:flex; justify-content:space-between; align-items:center`. Bordas superior e inferior `1px solid var(--accent)`, padding vertical 14px. O texto fica em `var(--font-serif)`, com `clamp(1.8rem, 1.2rem + 2vw, 2.6rem)`. O círculo tem 44px, `border: 1px solid var(--accent)` e cor `--accent`. No `:hover` e `:focus-visible`, `padding-left: 12px` e o círculo com `background: var(--accent); color: var(--bg)`, com transição `var(--dur) var(--ease)`. No cinema, ele fica abaixo dos eventos, na mesma coluna (`left: calc(var(--col) - 8px)`), com `bottom` ajustado pra não colidir. No mobile, ocupa a largura total.

- [ ] **Step 1: Escrever os testes que falham:**
  - `it('links to /sobre/ in pt and /en/about/ in en')`
  - `it('has an accessible label and no heading inside the link')`: `a.more` tem `aria-label` igual a `CONTENT.pt.stage.more.label` e `a.more h2` é `null`.
  - O teste existente "has a single h1 … and an h2 for every other chapter" (`sections.spec.ts`) continua passando, o que confirma que nenhum `h2` extra entrou.
- [ ] **Step 2: Rodar** e confirmar FALHA. **Step 3: Implementar.** **Step 4: Rodar** a suíte inteira e confirmar que PASSA.
- [ ] **Step 5: Commit** com `feat: editorial link from the stage chapter to the life page`.

### Task 8: Verificação final

- [ ] **Step 1:** `npx ng test --watch=false`: todos passam, e o total é 98 mais os novos.
- [ ] **Step 2:** `npx ng build`: termina sem erros e sem warnings novos de budget.
- [ ] **Step 3:** Rodar `npx ng serve` e conferir no navegador, em desktop (cinema) e com largura de 390px (estático):
  - o botão da home;
  - os 5 capítulos de `/sobre`;
  - as órbitas girando e a transição sem salto pro Jiu-Jitsu;
  - o player tocando;
  - a troca de idioma em `/sobre#music`;
  - o deep link `/sobre#games`;
  - a home idêntica à de antes.
- [ ] **Step 4:** Relatar ao Caio os arquivos alterados, as decisões, o resultado dos testes e os riscos. Em especial, registrar que o enquadramento das formas novas foi ajustado só visualmente.
