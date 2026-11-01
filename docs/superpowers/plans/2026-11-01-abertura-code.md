# Abertura com "</>" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a forma 0 da home (a esfera) por um "</>" em partículas, sem alterar mais nada na cena.

**Architecture:** Só o gerador de formas da home (`src/app/cinema/scene/shapes.ts`) muda. A forma 0 passa a ser
gerada sobre três traços geométricos com espessura e profundidade. A sequência do PRNG compartilhado é preservada,
porque a forma consome **um** `random()` por partícula, como hoje, e todo o resto da aleatoriedade vem de um PRNG
separado. Assim as formas 1 a 4 e o `rnd` ficam bit a bit iguais.

**Tech Stack:** Angular 22, Three.js 0.187, Vitest (`npx ng test --watch=false`).

**Spec:** `docs/superpowers/specs/2026-11-01-abertura-code-design.md`

## Global Constraints
- Formas 1 a 4 e `rnd` da home **bit a bit iguais** às atuais. O conjunto `life` fica intocado.
- Mesma quantidade de partículas, saída determinística e |v| ≤ 3.5.
- `FRAME_X/FRAME_Y`, o giro e o shader **não mudam**. Se o glifo não couber, a solução é reduzir o glifo.
- Commits **sem** linha de coautoria (preferência do Caio).
- Branch: `feat/abertura-code`.

## Review Focus
1. **O "</>" encostando no nome ou no texto** em 1440×900, 1280×720 e no celular (390 px). Isso é conferido com
   screenshots na Task 2.
2. **Legibilidade no celular**, com o glifo pequeno ao lado do nome (escala ambient `AMBIENT_SMALL = 0.32`).
   Também conferido com screenshots na Task 2.
3. **Transição da abertura pra rede** (Experiência). O "estouro" do shader usa `normalize(p0)` e precisa
   continuar suave. Conferido com screenshots na Task 2.
4. **Regressão nas outras formas da home.** O checksum da Task 1 cobre isso.
5. **Partícula com raio zero.** Uma partícula exatamente na origem daria `normalize` instável no estouro. O teste
   da Task 1 exige |p| > 0,05.

---

### Task 1: Forma 0 = "</>" (com as outras formas fixadas)

**Files:**
- Modify: `src/app/cinema/scene/shapes.ts` (bloco "0 — core sphere", ~linhas 53-60, e o comentário da linha 53)
- Modify: `src/app/cinema/scene/shapes.spec.ts` (substituir `it('builds the sphere with radius ~1.55')`)
- Test: `src/app/cinema/scene/shapes-code.spec.ts` (novo)

**Interfaces:**
- Produces (em `shapes.ts`):
  - `export const CODE_STROKES: readonly (readonly [readonly [number, number], readonly [number, number]])[]` são
    os 5 segmentos no plano xy: dois para "<", um para "/" e dois para ">".
  - `export const CODE_GLYPH_OF_STROKE: readonly (0 | 1 | 2)[]` diz a qual glifo pertence cada segmento
    (`[0, 0, 1, 2, 2]`).
  - `export const CODE_HALF_THICKNESS = 0.1` e `export const CODE_DEPTH = 0.17` (meia profundidade em z).
  - Valores iniciais dos traços, tirados da prévia aprovada e ajustáveis na Task 2:
    `<` vai de (-1.15, 0.95) a (-2.05, 0) e de (-2.05, 0) a (-1.15, -0.95); `/` vai de (-0.42, -1.15) a (0.42, 1.15);
    `>` vai de (1.15, 0.95) a (2.05, 0) e de (2.05, 0) a (1.15, -0.95).

- [ ] **Step 1: Fixar as formas atuais (teste de caracterização).** Em `shapes-code.spec.ts`, escreva
  `it('keeps shapes 1-4 and rnd of the home set bit-identical')`. Ele calcula um FNV-1a 32 bits sobre os bytes
  (`new Uint8Array(arr.buffer)`) de `shapes[1]`, `shapes[2]`, `shapes[3]`, `shapes[4]` e `rnd` de
  `generateShapes(1000, 1)` e compara com um valor fixo. Primeiro rode com o código **atual**, leia o valor real
  na falha e fixe-o no teste.
  Run: `npx ng test --watch=false --include src/app/cinema/scene/shapes-code.spec.ts`. Esperado: PASS com o valor
  fixado, ainda sem mexer em `shapes.ts`.
- [ ] **Step 2: Escrever os testes do glifo (que vão falhar).** Em `shapes-code.spec.ts`:
  - `it('puts every particle of shape 0 on the </> strokes')`: para cada partícula da forma 0, a distância de
    (x, y) ao segmento mais próximo de `CODE_STROKES` é ≤ `CODE_HALF_THICKNESS + 1e-6`, |z| ≤ `CODE_DEPTH + 1e-6`
    e |p| > 0,05.
  - `it('gives each glyph a fair share of particles')`: cada glifo (`CODE_GLYPH_OF_STROKE` do segmento mais
    próximo) recebe ≥ 20% das partículas.
  - `it('keeps the glyph inside the opening frame')`: o maior |x| é ≤ 2,2 e o maior |y| é ≤ 1,3.
  - No `shapes.spec.ts`, substitua o `it('builds the sphere with radius ~1.55')` por
    `it('builds the </> opening')`, que só verifica que o maior |x| é maior que o maior |y|. Isso descreve a
    forma larga do glifo e mantém o arquivo coerente.
  Run: o mesmo comando, mais `--include src/app/cinema/scene/shapes.spec.ts`. Esperado: FAIL, porque
  `CODE_STROKES` ainda não existe.
- [ ] **Step 3: Implementar.** No bloco da forma 0 de `generateShapes`:
  - Use **um** `random()` (o `u` do parâmetro ao longo do comprimento total dos traços) no mesmo ponto onde
    hoje é chamado o `random()` do raio R.
  - Use um PRNG próprio, `const codeRandom = mulberry32((seed ^ 0x3c2f3e) >>> 0)`, criado **fora** do loop,
    para o deslocamento na espessura (perpendicular ao traço) e para o z.
  - Escolha o segmento pelo comprimento acumulado de `CODE_STROKES`, com `u * total`.
  - Atualize o comentário do bloco para `// 0 — opening "</>" (programação): ...`.
- [ ] **Step 4: Rodar.** `npx ng test --watch=false`. Esperado: tudo PASS. O checksum do Step 1 tem que passar
  **sem mudar o valor**. Depois rode `npx ng build`, que deve terminar OK.
- [ ] **Step 5: Commit** (sem coautoria): `feat: abertura da home com </> no lugar da esfera`.

### Task 2: Conferência visual e documentação

**Files:**
- Modify (se os screenshots pedirem): os valores de `CODE_STROKES` em `shapes.ts`, reduzindo a escala
- Modify: `src/styles.scss:216` (comentário), `src/app/sections/intro/intro.scss:59` (comentário),
  `docs/superpowers/specs/2026-10-31-portfolio-design.md` (linha da tabela "0 Abertura") e `docs/TODO.md`
  (remover o item do "</>")

- [ ] **Step 1: Screenshots.** Rode `npx ng build`, sirva `dist/caio-portfolio/browser` na porta 4321 e use
  o script `/tmp/claude-1000/-home-cmarins-projects-caio-portfolio/a38a364d-85b7-4178-a0f5-e389a9753a2b/scratchpad/shots/shoot.mjs`
  pra tirar a home em 1440×900, 1280×720 e 390 px no celular (capítulos 0 e 1). Confira se o "</>" está
  legível, se não encosta no nome nem no texto e se a transição pra rede está ok. Se encostar, reduza a escala
  dos traços (mantendo as proporções), atualize o limite do teste de enquadramento e rode a suíte de novo.
- [ ] **Step 2: Documentação.**
  - Troque "esfera" por "</>" nos dois comentários.
  - Na tabela do design original, a linha passa a ser `| 0 Abertura | "</>" | Programação |`.
  - Remova o item do "</>" do `docs/TODO.md`.
- [ ] **Step 3: Rodar** `npx ng test --watch=false` e `npx ng build`, os dois devem passar. Depois faça o
  commit (sem coautoria): `docs: abertura com </> nos comentários, no design original e no TODO`.
