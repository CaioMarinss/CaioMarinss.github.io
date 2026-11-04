# Caio Marins | Portfólio

Portfólio cinematográfico bilíngue (PT/EN) em Angular 22 + Three.js, pré-renderizado como HTML estático.
Publicado em https://caiomarinss.github.io/.

## Comandos

```bash
npm install        # .npmrc usa legacy-peer-deps (contorna bug do npm 10 com peers do vitest)
npm start          # servidor de desenvolvimento em http://localhost:4200
npm run build      # gera dist/caio-portfolio/browser (HTML estático, pronto para qualquer hospedagem)
npm test -- --watch=false
```

## Rotas

| Rota          | Conteúdo                               |
| ------------- | -------------------------------------- |
| `/`           | portfólio em português                 |
| `/en`         | portfólio em inglês                    |
| `/curriculo`  | currículo PT (fonte do PDF, `noindex`) |
| `/en/resume`  | currículo EN (fonte do PDF, `noindex`) |

## Estrutura

```
src/app/content/         textos PT/EN (fonte única dos fatos do site e do currículo)
src/app/sections/        as 5 seções em HTML (abertura, Núclea, projetos, palco, contato)
src/app/cinema/          modo cinema: capítulos, rolagem, cursor, cena 3D (carregada sob demanda)
src/app/pages/           home e currículo
src/app/seo/             título, meta tags e noindex por rota
src/styles.scss          tokens (cores, tipografia), reset, foco, skip link
src/styles/_mixins.scss  breakpoint mobile (860px), container, rótulo mono
scripts/                 geração de imagens, capturas e PDFs
```

O modo cinema roda só no desktop (tela > 860px com mouse). Celulares e tablets, ausência de WebGL ou falha da cena 3D usam o modo estático (rolagem normal, sem baixar o Three.js).
Fontes auto-hospedadas via @fontsource (Instrument Serif, Manrope, JetBrains Mono); nenhuma chamada a Google Fonts.

## Regerar imagens e PDFs

Imagens e PDFs ficam versionados em `public/`, então o CI não precisa de navegador. Para regerar localmente:

```bash
npx playwright install chromium              # uma vez
npm run images -- caminho/da/foto.jpeg       # imagem de compartilhamento (OG, com a foto) e favicon
npm run shots                                # prévias dos projetos públicos
npx ng build && npm run cv && npx ng build   # PDFs do currículo (A4, 1 página; falha se passar disso)
```

## Deploy

Cada push na `main` roda `.github/workflows/deploy.yml`: testes, build com `--base-href "/"` e publicação no GitHub Pages.
