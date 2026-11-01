# Abertura da home com "</>" — design (curto)

Data: 2026-11-01 · Status: aguardando aprovação

## Intenção
A abertura da home deve passar a ideia de **programação** logo de cara. A forma de partículas da abertura
deixa de ser a esfera (que no design original significava "o Caio") e vira um **"</>"**.

## O que o Caio decidiu
- Substituir a esfera **por completo** pelo "</>". Ele não se desfaz em esfera, e não existe introdução separada.
- **O giro continua como hoje (opção A).** O Caio sabe que, se a pessoa ficar parada na abertura, o "</>"
  fica de lado por volta dos 30 s e depois aparece espelhado até completar a volta (~2 min).
- **Abordagem 1:** o "</>" é desenhado com traços geométricos no gerador de formas da home.

## Abordagens consideradas
1. **Traços geométricos no gerador de formas (escolhida).** Troca só a forma 0 da home em
   `src/app/cinema/scene/shapes.ts`. É determinística, testável e não depende de nada carregando no navegador.
2. **Amostrar o glifo "</>" da fonte mono do site (JetBrains Mono) em runtime.** A tipografia ficaria idêntica,
   mas a forma dependeria do carregamento da fonte no navegador, teria mais código e poderia falhar com conexão
   lenta. Descartada.

## Escopo
- **Desktop (cinema):** o "</>" fica à direita do nome, no lugar da esfera, e se transforma na rede ao rolar,
  como hoje.
- **Celular (ambient):** o "</>" nasce pequeno ao lado do nome e cresce ao rolar, como a esfera hoje.
- **Fora do escopo:** a página `/sobre` (as órbitas continuam), mudanças no giro, no enquadramento dos outros
  capítulos ou no shader, e qualquer introdução ou animação nova.

## O que não pode acontecer
- O "</>" encostar no nome ou no texto da abertura, no desktop (1440×900 e 1280×720) ou no celular (390 px).
- **Mudar as outras formas da home.** As formas 1 a 4 e o `rnd` precisam continuar **bit a bit iguais**. Hoje
  a forma 0 consome exatamente **um** `random()` por partícula, no meio da sequência compartilhada. A nova
  forma deve consumir esse mesmo um `random()` no mesmo ponto (pode usá-lo como parâmetro) e tirar qualquer
  outra aleatoriedade de um **PRNG separado**, por exemplo `mulberry32(seed ^ constante)`. Assim a sequência
  das outras formas não se desloca.

## Restrições
- Mesma quantidade de partículas, saída determinística e |v| ≤ 3.5.
- A página `/sobre` usa o conjunto `life`, que fica intocado.

## Visual (decisões minhas)
- O visual segue a prévia aprovada (`.superpowers/brainstorm/649439-1793503997/content/code-motion-v2.html`):
  três traços grossos ("<", "/" e ">"), com espessura de ~0,2 e um pouco de profundidade em z (~±0,17), pra
  ter volume ao girar.
- O tamanho é escolhido pra caber no enquadramento atual da forma 0 sem encostar no texto. O ponto de partida
  é a largura de ~±1,7 a ±2,0 e a altura de ~±1,0, mas quem fecha o valor são os screenshots. Os valores de
  `FRAME_X/FRAME_Y` da home **não** mudam. Se não couber, a correção é reduzir o glifo, não mover a cena.

## Testes
- **Trocar** o teste existente `builds the sphere with radius ~1.55` (`shapes.spec.ts`) por testes do "</>".
  A mudança é intencional, porque a home muda por escolha do Caio. Os testes novos verificam que as partículas
  ficam sobre os três traços (distância ao segmento mais próximo ≤ meia espessura), que todos os três traços
  recebem partículas, e os limites de tamanho.
- **Fixar as outras formas.** Antes da mudança, calcular um checksum de `shapes[1..4]` e `rnd`
  (`generateShapes(1000, 1)`) e fixar esse valor num teste. Depois da mudança, o teste precisa passar sem
  alterar o valor.
- Os demais testes da suíte continuam passando.

## Ajustes de documentação
- Atualizar os comentários que falam da "esfera" na abertura da home (`shapes.ts`, `styles.scss:216` e
  `intro.scss:59`).
- Atualizar a linha "0 Abertura | Esfera | O Caio" da tabela em
  `docs/superpowers/specs/2026-10-31-portfolio-design.md` para "</> | Programação".
- Remover o item correspondente de `docs/TODO.md`.

## Fica com o implementador
As coordenadas exatas dos traços, a distribuição de partículas entre eles, a espessura e a profundidade
finais, dentro do que está descrito acima e conferido com screenshots.
