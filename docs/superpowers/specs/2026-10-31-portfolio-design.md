# Portfólio pessoal — Caio Marins

Design acordado em conversa em 31/10/2026. Itens marcados **[decisão do Claude]** foram propostos por mim e não
confirmados explicitamente pelo Caio; os demais vieram dele ou foram aprovados por ele.

Protótipo de referência aprovado (direção visual e de movimento, não código de produção):
`docs/superpowers/specs/2026-10-31-prototipo-cinematico.html`. A foto nele aponta para `/files/caio.jpeg` (servidor de
mockups); para abrir localmente, troque pelo caminho da foto.

## 1. Intenção

Portfólio pessoal para **recrutadores** avaliando o Caio para vagas de **desenvolvedor full stack júnior** (Java +
Angular). Em poucos segundos, o recrutador deve sair com três certezas: ele **já trabalha na área** (Núclea, promovido
em ~6 meses), **entrega sistemas completos de ponta a ponta** (Almeida JJ) e **tem trabalhos reais no ar**. A ação
esperada é entrar em contato (LinkedIn/e-mail) ou baixar o currículo.

A experiência precisa ser **cinematográfica** (palavra do Caio): uma cena 3D contínua conduzida pela rolagem, com
tipografia editorial grande. Uma primeira versão em grade de cards de vidro foi rejeitada por ter "cara de IA e não ser
moderna".

Referências usadas só como inspiração, sem copiar texto, layout ou assets: kc1t.com (tipos de conteúdo: status de
projeto, stack, trajetória, PT/EN) e um site-conceito "Laocoön — Bronze and Time" (linguagem cinematográfica: objeto
3D central, rolagem dirigindo a câmera, títulos editoriais por capítulo, cursor próprio).

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Experiência **cinematográfica** com **3D real (Three.js)** conduzido por rolagem e UI/UX excepcional.
- Bilíngue **PT-BR e EN**.
- O próprio código do portfólio serve de evidência técnica: Angular moderno, tipado, testado, com deploy automatizado.
- Conteúdo sempre acessível e indexável, mesmo sem WebGL ou com movimento reduzido.

**Não-objetivos**
- Blog, CMS, painel administrativo, formulário de contato com backend.
- Listar todos os repositórios do GitHub (exercícios de PHP, Beecrowd, Ionic etc. ficam de fora).
- Tema claro — o site é só escuro **[decisão do Claude]**.

**Anti-objetivos (falharia mesmo funcionando)**
- Cara de template/IA: grade de cards iguais, pílulas por toda parte, rótulos "01 · Seção" genéricos, degradê em título,
  manchas de cor como único recurso. (Foi exatamente o que o Caio rejeitou.)
- Parecer o site da Continuar Marcas e Patentes ou clonar a referência Laocoön.
- **Linhas verticais de grade em baixa opacidade** sobre a página — o Caio pediu para tirar.
- 3D que trava celular fraco, atrasa o primeiro conteúdo ou impede ler/navegar.
- Afirmações que o Caio não fez.

## 3. Restrições

- **Stack:** Angular (mesma versão/padrões do `~/projects/jaqueline-site`: Angular 22, componentes standalone, SCSS,
  `@angular/build:application` com `outputMode: "static"` e pré-renderização, testes com Vitest) + **Three.js**.
  Reaproveitar padrões de lá (conteúdo em arquivo tipado, tokens em `styles.scss`, mixins de breakpoint) sem copiar a
  identidade visual.
- **Hospedagem:** GitHub Pages, repositório novo **`CaioMarinss/CaioMarinss.github.io`** → **https://caiomarinss.github.io/**
  (`base-href` = `/`). O repo antigo `portfolio` fica intacto.
- **Deploy:** GitHub Actions no push para `main`, no molde do `deploy.yml` do jaqueline-site, com versões de actions
  compatíveis com Node 24.
- **Commits:** sempre só em nome do Caio, **sem** `Co-Authored-By` do Claude. Nada de commit/push sem autorização.
- Repo público: sem telefone, endereço ou documentos pessoais.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **Angular + Three.js (escolhida)** | O portfólio vira prova de Angular para vaga full stack Java+Angular; reaproveita estrutura, testes e deploy do jaqueline-site | Mais pesado que o necessário — compensado por pré-renderização e Three.js sob demanda |
| Astro + Three.js | Mais leve e rápido | Não é a stack do Caio; o código não demonstra o que ele quer vender |
| HTML/CSS/JS puro + Three.js | Simples de publicar | i18n, componentes e manutenção manuais; não mostra evolução |

O Caio escolheu Angular + Three.js.

## 5. Direção visual e de movimento (aprovada no protótipo)

### Modelo de página
- **Uma cena fixa** (canvas WebGL em tela cheia) com uma **camada editorial fixa** por cima. A página é alta
  (~600vh); a **rolagem nativa** dirige tudo — sem biblioteca de smooth-scroll, suavização por *lerp* em JS.
- A página tem **5 capítulos**; cada um ativa seu texto num intervalo da rolagem e as partículas mudam de forma entre
  um capítulo e o próximo.
- **Menu** fixo no topo: marca "Caio Marins *full stack*", links para os capítulos (rolam até o ponto certo; o atual fica
  marcado), seletor **PT / EN**, botão "Currículo".
- **Barra de progresso** vertical à direita, um traço por capítulo, preenchendo em verde-água.
- Uma **linha horizontal** fina sob o menu (pode sair se o Caio preferir — ainda não decidido, padrão: manter).
- **Sem** linhas verticais de grade.
- **Cursor próprio** (ponto + anel que segue com atraso e cresce sobre links), só em dispositivos com mouse; no toque
  usa o cursor nativo.

### O objeto 3D: nuvem de partículas que se transforma
~9.000 partículas (≈5.000 no celular), mistura aditiva, morfando por shader entre uma forma por capítulo, com pequeno
atraso aleatório por partícula e um leve "estouro" no meio da transição:

| Capítulo | Forma | Significado |
|---|---|---|
| 0 Abertura | "</>" | Programação |
| 1 Núclea | Rede: ~9 nós ligados por arestas | Integrações / mensageria |
| 2 Projetos | 3 camadas horizontais + colunas ligando | Front → API → banco |
| 3 Palco | Anel no chão + feixe de luz em cone | Palco / holofote |
| 4 Contato | Espiral se abrindo | Abrir conversa |

- O grupo gira devagar com o tempo e com a rolagem; inclina com o mouse; muda de posição na tela por capítulo para
  abrir espaço ao texto (no celular fica centralizado no alto).
- **Fundo:** shader próprio de **linhas topográficas** (curvas de nível de ruído), escuras e lentas, reagindo de leve ao
  mouse e à rolagem.
- **Cor:** quase-preto; partículas e acentos em **verde-água → violeta** ao longo da página (`#5cf2c8` → `#9d8cff`).
  O verde-água vem do README do GitHub do Caio.

### Tipografia e texto
- **Instrument Serif** nos títulos (grandes, ~9vw, com uma palavra em itálico verde-água por título), **Manrope** no
  corpo, **JetBrains Mono** em rótulos/metadados. Auto-hospedadas via `@fontsource` na versão final.
- Títulos entram **palavra por palavra** subindo de uma máscara; descrições entram com fade + leve desfoque, em atraso.
- Layout assimétrico, de revista, baseado em colunas de 25vw — cada capítulo posiciona o texto num lugar diferente.

### Foto
`/mnt/c/Users/cMarins/Downloads/fotoProfissionalCaio.jpeg` (1068×1600). Na abertura, em **moldura editorial vertical**
(3:4) na coluna esquerda, revelada de cima para baixo com zoom suave; recorte focando rosto/tronco, eliminando o
letreiro cortado ao fundo. Exportar WebP em 2 tamanhos. (Substitui a ideia anterior de foto no centro da constelação.)

## 6. Conteúdo por capítulo

Fonte de verdade: arquivos tipados por idioma (§7). A redação final é do builder, partindo dos rascunhos do protótipo,
**sem inventar fatos**.

**0 — Abertura.** Rótulo "Desenvolvedor Full Stack Júnior"; título "Caio *Marins*"; duas colunas: (a) conecta
sistemas, do front em Angular às filas IBM MQ e ao DB2; (b) Analista Desenvolvedor Jr. na Núclea, promovido de
aprendiz a júnior em seis meses, e entrega sistemas completos para clientes reais. Indicação "Role".

**1 — Experiência (Núclea).** Nome com acento: **Núclea** (antiga CIP). Título "Sistemas em *produção*".
- Jovem aprendiz desde **17/02/2025** → **Analista Desenvolvedor Jr.** desde **09/2025** (escada "Aprendiz → *Júnior*").
- Dia a dia: Java + Wicket, IBM DB2, IBM MQ, AWS, webservices com XML/SOAP, troca de arquivos, APIs, sustentação de
  sistemas em produção, GitHub Actions — descrito como trabalho, não só lista de logos.

**2 — Projetos.** Título "Do front ao *banco*". Lista editorial (linhas numeradas que reagem ao mouse), cada uma com
status, stack e link:
1. **Sistema Almeida JJ** — gestão interna de uma academia (cliente real). Angular + API Java/Spring Boot, JWT com
   Spring Security, MySQL, Docker. *No ar · em evolução* (abre no login; home pública ainda não existe). Links:
   https://almeidatucuruvi.vercel.app/login, repos `CaioMarinss/almeida-jj-frontend` e `CaioMarinss/almeida-jj-api`.
   **Sem captura de tela** (dados reais de alunos — decisão do Caio). A arquitetura é contada pela forma de camadas das
   partículas; ao passar o mouse/focar nesta linha, as camadas ganham rótulos "Angular / Spring Boot + JWT / MySQL"
   **[decisão do Claude]**.
2. **Climb** — site da Almeida JJ e TCC no Instituto da Oportunidade Social; selo **"Top TCC · CriaTech / TOTVS"**.
   https://caiomarinss.github.io/climb-TCC/, repo `CaioMarinss/climb-TCC`.
3. **Continuar Marcas e Patentes** — site institucional (cliente real), Angular 22 pré-renderizado, deploy automático.
   https://caiomarinss.github.io/continuar-marcas-e-patentes/, repo `CaioMarinss/continuar-marcas-e-patentes`.
- Climb e Continuar: ao passar o mouse na linha, uma **captura real do site** aparece flutuando perto do cursor
  **[decisão do Claude]**; capturas geradas pelo builder (ex. Playwright), em WebP.

**3 — Palco.** Título "Também sei *contar*".
- **CriaTech 4ª edição · TOTVS · 2025** — Climb entre os melhores TCCs, apresentado no palco.
- **Trampos do Futuro · Fundação Itaú · 2026** — palestra pela Núclea Associação contando sua trajetória até a tecnologia.

**4 — Contato.** Título "Vamos *conversar?*". Rótulo com **Inglês B2** e **ADS (conclusão 2027/1)**. Links grandes:
LinkedIn (https://www.linkedin.com/in/caio-marins-247633265/), e-mail `caio.marins011@gmail.com`, GitHub
(https://github.com/CaioMarinss), "Currículo ↓". Sem Instagram **[decisão do Claude]**, sem telefone.

**Trajetória e formação** (dados para o currículo e para o leitor sem WebGL; no modo cinematográfico aparecem
distribuídos nos capítulos acima): 2024 Desenvolvimento Web no IOS (média 10) · 2025 CriaTech/TOTVS · 02/2025 aprendiz
Núclea · 05/2025 Java, Núclea Academy (19h) · 09/2025 júnior · Fundamentos de Docker (TreinaWeb/LinkedIn Learning) ·
2026 Trampos do Futuro · 2027/1 conclusão de ADS.

## 7. Arquitetura

- **Conteúdo em HTML real:** todos os capítulos são pré-renderizados como HTML semântico (títulos, listas, links). O
  canvas e as animações são camada de apresentação por cima — nada de texto dentro do WebGL.
- **Modo sem cinema (obrigatório):** com `prefers-reduced-motion: reduce`, sem WebGL ou se o chunk 3D falhar, a página
  vira um **layout de rolagem normal** (capítulos empilhados, sem posição fixa, sem página de 600vh, sem cursor
  próprio), com fundo estático. Mesmo conteúdo, mesma ordem.
- **3D:** Three.js importado dinamicamente **só no navegador**, após a primeira pintura (`afterNextRender` + `import()`),
  em chunk separado; nunca no servidor. Lógica da cena isolada numa classe sem dependência de Angular (testável,
  com `dispose` completo). Loop pausado com a aba oculta. `devicePixelRatio` limitado (2 desktop, 1,5 celular).
- **Teclado e acessibilidade:** links do menu e Tab movem entre capítulos (o capítulo com foco fica ativo); skip link;
  foco visível; contraste AA do texto sobre o fundo; textos alternativos; a barra de progresso é decorativa
  (`aria-hidden`) e o menu marca o capítulo atual com `aria-current`.
- **i18n [decisão do Claude]:** rotas `/` (PT-BR) e `/en`, ambas pré-renderizadas; conteúdo em `content.pt.ts` e
  `content.en.ts` com a mesma interface (teste garante paridade). O seletor mantém o capítulo atual. `<html lang>`,
  título, meta description e `hreflang` por idioma. Sem redirecionamento automático. Motivo de não usar
  `@angular/localize`: um build com duas rotas é mais simples no Pages para um site de uma página.
- **SEO:** meta tags, Open Graph com imagem própria (1200×630), JSON-LD `Person`, `sitemap.xml`, `robots.txt`,
  `canonical`.
- **Desempenho (metas):** LCP < 2,5 s em celular médio/4G (o LCP é o título/foto, não o canvas); JS inicial sem Three.js
  dentro do budget do Angular; 60 fps em desktop comum e sem travar em celular intermediário.

## 8. Qualidade

- Testes (Vitest): paridade PT/EN; seletor de idioma; mapeamento rolagem → capítulo ativo; ativação do modo sem cinema
  (reduced-motion / sem WebGL); navegação do menu.
- Build de produção e pré-renderização das duas rotas no CI antes do deploy.
- Verificação visual em desktop e celular, incluindo reduced-motion e navegação só por teclado, antes de considerar
  pronto.

## 9. Deixado para o builder

Redação final (PT e EN) a partir dos fatos; formas exatas, contagem e cores finas das partículas; curvas de easing e
ritmo de rolagem; posições exatas do texto por capítulo; ajuste fino do layout no celular; captura e tratamento das
imagens; estrutura interna de pastas; nome da pasta local (sugestão: `~/projects/caio-portfolio`, onde este documento
já está).

## 10. Pendências

Resolvidas: Almeida JJ sem captura; promoção em 09/2025; currículo será gerado; direção cinematográfica aprovada;
linhas verticais removidas.

- **Currículo em PDF — gerar (decisão do Caio):** PT e EN, 1 página cada, a partir do mesmo conteúdo tipado,
  versionados em `public/` e ligados ao botão "Currículo". Sem foto, layout limpo e legível por ATS
  **[decisão do Claude]**. O Caio revisa antes de publicar.

Em aberto (não bloqueiam; o builder segue o padrão):
1. Mês do CriaTech/TOTVS — padrão: só "2025".
2. Certificado da FGV no Downloads — padrão: não incluir até o Caio confirmar.
3. Linha horizontal sob o menu — padrão: manter.
