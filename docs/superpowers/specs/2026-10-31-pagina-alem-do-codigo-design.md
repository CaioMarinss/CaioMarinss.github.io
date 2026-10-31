# Página "Além do código" (vida pessoal) — design

Data: 2026-10-31 · Status: aguardando aprovação

## Intenção

O portfólio de hoje mostra só o lado profissional do Caio. A ideia é ter uma segunda página, com o
**mesmo leiaute da home**, que conte quem ele é fora do trabalho: Jiu-Jitsu, violão e música, games
e kart. Ela também traz uma playlist que dá pra ouvir ali mesmo, como no site de referência
(kc1t.com, seção "Ouvindo"). A página serve pra aproximar recrutadores e visitantes: mostra
disciplina (o tatame desde criança, hoje ensinando crianças) e personalidade.

## Objetivos

- Um botão bem visível no fim da seção "Além do código" da home (`stage`) que leva à página nova.
- Uma página nova em PT e EN (`/sobre` e `/en/about`) com 5 capítulos que seguem o padrão da home.
- No modo cinema, as partículas 3D ganham **5 formas novas**: a das "órbitas" na abertura e uma
  forma ligada ao tema de cada capítulo.
- O player do Spotify com a playlist do Caio.

## Fora do escopo

- O "tocando agora" via Last.fm ou Spotify API. Pode entrar depois.
- Fotos. A sugestão de uma foto de kimono no capítulo de Jiu-Jitsu ficou em aberto. O leiaute não
  pode depender dela, mas o capítulo deve aceitá-la mais tarde sem retrabalho.
- Deixar o número de formas/capítulos variável (opção 2, descartada).

## O que não pode acontecer

- **A home mudar de comportamento ou de visual.** As formas, o enquadramento, o scroll, o menu e
  os testes atuais continuam iguais.
- O player deixar a página lenta no primeiro carregamento.
- A página nova parecer um "template genérico", destoando da home.

## Restrições

- Angular 22, SSR com prerender e GitHub Pages: tudo é estático, sem backend.
- `SHAPE_COUNT = 5` e `CHAPTER_COUNT = 5` ficam fixos. A lógica de morph do shader (`p0..p4`),
  `chapter-math` e `staticProgress` continuam como estão. O shader só ganha a extensão de órbitas
  descrita abaixo, que o Caio autorizou e que não tem efeito nenhum na home. A regra para o `ScrollDirector` é que **a home se comporte
  igual**, não que o código fique congelado (veja "Pontos de integração").
- Conteúdo bilíngue em `content.pt.ts` e `content.en.ts`, tipado em `content.types.ts`.
- Os dois modos de exibição atuais funcionam na página nova: cinema (desktop, `CinemaCanvas`) e
  estático (celular, `AmbientBackground`).
- Acessibilidade no mesmo nível da home: skip link, foco, `prefers-reduced-motion` e alt.

## Abordagens consideradas

1. **Manter 5 formas e trocar o conjunto por página (escolhida).** A cena recebe qual conjunto de
   formas e qual enquadramento usar. A home usa o conjunto atual, e a página nova usa o conjunto
   "vida". A lógica de morph e o scroll não mudam, então o risco pra home é mínimo.
2. Número de formas variável. Mais flexível, mas mexe no shader, no enquadramento, no
   `chapter-math` e nos testes da home. Descartada porque não há necessidade hoje.
3. Uma cena 3D separada pra página nova. Descartada porque duplica código.

O Caio escolheu a opção 1.

## Decisões do Caio

- **Botão:** a opção B, "faixa editorial". É uma frase grande em Instrument Serif, entre duas
  linhas vermelhas (`--accent`), com um círculo e uma seta ↗ à direita. No hover, o texto anda pra
  direita e o círculo é preenchido de vermelho. Fica logo abaixo da lista de eventos da seção
  `stage`. O texto em PT é "E fora do *trabalho?*" e em EN "And outside *work?*", com a palavra em
  itálico na cor de destaque, no padrão de `title-words`. É um link real (`<a href>`) com rótulo
  acessível, por exemplo "Conheça minha vida fora do código".
- **Leiaute da página:** igual ao da home, com capítulos em tela cheia e as partículas mudando de forma.
- **Player:** o embed oficial do Spotify, igual ao da referência (`iframe`, `loading="lazy"`,
  altura 152, `allow="encrypted-media"`, título acessível). A playlist é
  `https://open.spotify.com/embed/playlist/166KNpL6HlNIQq6TIO8kBa`, sem o parâmetro `si` do link
  de compartilhamento. Quem está logado no Spotify ouve as músicas inteiras. Quem não está, ouve
  prévias de 30 segundos. Essa limitação é do Spotify.
- **Rotas:** `/sobre` e `/en/about`.

## Estrutura da página

| # | id | Capítulo | Forma 3D (cinema) |
|---|----|----------|-------------------|
| 0 | `life-intro` | Abertura: kicker "Fora do expediente", título "Além do *código*" e uma frase | **Órbitas** (escolha do Caio): um núcleo pequeno com 4 aglomerados em órbitas inclinadas, um por capítulo, e rastros tênues das órbitas. A prévia aprovada está em `.superpowers/brainstorm/…/content/opening-shape.html`. Cada aglomerado gira na própria órbita, como na prévia, por meio da extensão de órbitas do shader |
| 1 | `jiujitsu` | Jiu-Jitsu | Faixa com nó: um laço de faixa visto de frente, com as duas pontas caindo |
| 2 | `music` | Violão e música + player | Cordas vibrando: 6 linhas paralelas em onda senoidal, sugerindo o braço do violão |
| 3 | `games` | Games | Mira/crosshair: dois anéis concêntricos com quatro traços |
| 4 | `kart` | Kart + link "voltar ao início" | Circuito: uma pista fechada em forma de laço, com faixa de largada |

As formas descritas acima são proposta minha. O builder pode ajustar a geometria, desde que cada
forma seja reconhecível como partículas e fique no mesmo raio aproximado das formas da home
(cerca de 3 unidades), pra que o enquadramento funcione.

### Textos (proposta; o Caio revisa antes de publicar)

**Abertura**: "Fora do expediente" · "Além do *código*" · "Quando fecho o editor, sobra tatame,
corda de violão, controle na mão e pista."

**Jiu-Jitsu**: kicker "Tatame". "Comecei a treinar ainda criança, num projeto social. Hoje sou
faixa roxa e dou aula para crianças, devolvendo o que o esporte me deu."

**Violão e música**: kicker "Violão". "Rock clássico e músicas mais melódicas, como a introdução de
The Last of Us. É o que mais gosto de tocar e de ouvir." Em seguida vem o player, com o rótulo
"Ouvindo".

**Games**: kicker "Controle". Lista: The Last of Us, Battlefield 6, Call of Duty: Black Ops II e
Call of Duty: Modern Warfare 3.

**Kart**: kicker "Pista". "Adoro andar de kart: a mesma busca pela volta perfeita, só que fora da
tela." Logo abaixo, o link "← Voltar para a home" (EN: "← Back to home"). É um `<a href>` simples
para `/` ou `/en/`, conforme o idioma. *(Decisão minha: "voltar ao início" significa voltar à home.)*

As versões em EN são traduções diretas, feitas pelo builder e revisadas pelo Caio.

## Pontos de integração (o que muda no código)

- `app.routes.ts` e `app.routes.server.ts`: rotas `sobre` e `en/about` com `data.lang` e prerender.
- Uma página nova, `pages/life.ts`, no molde de `pages/home.ts` (ScrollDirector, CinemaCanvas e
  AmbientBackground), com seções novas em `sections/life/…`.
- A cena (`cinema-scene.ts` e `shapes.ts`) passa a receber um identificador de conjunto
  (`'home' | 'life'`) por `CinemaSceneOptions`. Esse identificador escolhe o gerador de formas e as
  tabelas `FRAME_X` e `FRAME_Y`. O valor padrão é `'home'`, e com ele a saída é idêntica à atual. O
  conjunto chega a `CinemaCanvas` e `AmbientBackground` por input ou por um token de DI fornecido
  pela página. Quem decide qual dos dois é o builder.
- **Extensão de órbitas no shader** *(autorizada pelo Caio; o desenho é decisão minha)*:
  - Em `PARTICLE_VERTEX`, cada partícula ganha um atributo `orbit`: 0 significa sem órbita, e de 1
    a 4 indica o aglomerado (ou o rastro) da forma de abertura.
  - Um uniform `uOrbit` (0..1) liga o efeito.
  - Quando `orbit > 0`, a posição da forma 0 (`p0`) gira em volta do eixo inclinado do aglomerado,
    num ângulo que depende de `uTime`, antes do `mix` do morph.
  - O giro age só sobre `p0`. Como o morph faz `mix(p0 girado, p1, f)`, a transição pra forma 1 sai
    de onde o aglomerado está naquele momento e chega à forma 1 sem salto. Não precisa de peso
    extra: um peso que zerasse o ângulo faria os aglomerados "desenrolarem" voltas durante a
    transição.
  - Na home, `orbit = 0` em todas as partículas e `uOrbit = 0`, então o resultado é idêntico ao de
    hoje.
  - Com `prefers-reduced-motion`, o modo cinema não roda, então não há nada a tratar. No modo
    estático (`AmbientBackground`), as órbitas podem girar mais devagar, e quem define a velocidade
    é o builder.
  - Um teste garante que o conjunto `'home'` gera `orbit` todo em zero.
- `CinemaCanvas`: o hover de projetos e o painel de camadas (Almeida) só existem na home. Na página
  nova eles ficam inativos.
- **IDs de capítulo por página** *(decisão minha)*: hoje `ScrollDirector` (`goTo` no modo
  estático, deep link por hash), `Header.navigate` e `LanguageService.pathFor` (tipado como
  `ChapterId`) usam `CHAPTER_IDS` da home. A lista de ids passa a vir da página ativa, por token de
  DI ou por `start(ids)`, e o padrão continua sendo `CHAPTER_IDS`. Assim o menu, links como
  `/sobre#music` e a troca de idioma que mantém o capítulo funcionam na página nova. Os testes
  atuais da home precisam continuar passando sem alteração.
- **Header**: hoje ele é ligado a `CHAPTER_IDS` da home. Na página nova, o menu mostra os capítulos
  dela (Jiu-Jitsu, Música, Games, Kart) com a mesma barra de progresso, e a marca "Caio Marins"
  leva de volta à home. A troca de idioma leva para `/sobre` ou `/en/about`. Como generalizar isso
  (lista de capítulos por rota, por exemplo) fica com o builder, sem mudar a home.
- `LanguageService.pathFor` e `SeoService.apply` precisam saber da página atual pra montar
  canonical e hreflang de `/sobre` e `/en/about`. Hoje os alternates apontam sempre pra home.
- `public/sitemap.xml`: duas entradas novas, com os alternates.
- Conteúdo: os novos tipos e textos em `content.types.ts`, `content.pt.ts` e `content.en.ts`, além
  do texto do botão em `stage`.

## Fica com o builder

- A geometria exata das formas e os valores de enquadramento.
- O estilo de cada capítulo dentro do sistema existente (tokens de `styles.scss`, `.fade`,
  `title-words`).
- A estratégia de testes, seguindo o padrão `*.spec.ts`. No mínimo: as formas novas são
  determinísticas e têm o tamanho certo, o conjunto `'home'` continua idêntico ao atual, as rotas
  e o SEO da página nova estão certos, e o botão aponta pro caminho certo em cada idioma.
