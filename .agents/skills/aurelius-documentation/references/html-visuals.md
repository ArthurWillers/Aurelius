# Contrato de autoria visual

Leia esta referência ao criar, importar ou revisar um visual Aurelius. O objetivo é manter uma única fonte visual legível na página, em tela cheia, na impressão e nas projeções para agentes.

## Escolha da fonte

| Fonte | Use quando | Evite quando |
|---|---|---|
| Mermaid declarativo | UML, decisões, fluxogramas, sequência, estado, ER, Gantt, jornada ou gráfico cabe na gramática Mermaid e a manutenção deve evitar SVG/HTML. | A composição precisa de uma gramática que o Mermaid não representa com clareza ou de interação autoral. |

No ER declarativo, também são aceitas cardinalidades legíveis no relacionamento: `A 1 -- N B : contains`, `A N -- N B : associates` e `A 1 -- 1 B : owns`. O build as converte para crow-foot antes de validar o Mermaid, sem alterar a fonte que agentes recebem.
| JSON nativo | A estrutura cabe no modelo semântico do Aurelius e deve permanecer fácil de editar como dados. É a primeira opção para `architecture` e `canvas`. | A composição exige uma gramática visual que o renderer nativo não representa bem. |
| `svgSource` | O resultado é estático, vetorial e precisa de composição precisa. | Há interação necessária ou uma página editorial completa ao redor do gráfico. |
| `htmlSource` | Um agente precisa controlar HTML, CSS e SVG para produzir uma composição editorial, um gráfico avançado ou uma interação acessível. | Um renderer nativo ou SVG simples já comunica o mesmo conteúdo. |

O modo de autoria não altera o tipo semântico: mantenha `kind` como `sankey`, `sequence`, `timeline` ou outro tipo registrado. Uma fonte Mermaid usa `source.language: mermaid` e exatamente um de `source.path` e `source.code`; não a combine com `svgSource` ou `htmlSource`. Um HTML autoral pode declarar `svgSource` adicional como fallback estático para impressão e cópia; ele não deve declarar uma segunda fonte principal.

O runtime Mermaid oferece uma viewport limitada por `presentation.height`, pan por arraste, zoom por botões ou Ctrl/⌘ + scroll, reset, tela cheia, uma rota de visualização inteira e uma legenda contextual obrigatória. Um compilador editorial em JavaScript deriva da fonte os papéis realmente usados, seguindo a fronteira de confiança e o IR do importador Mermaid do Diagram Design; `style`, `classDef` e `linkStyle` autorais são descartados antes da renderização. Use isso para modelos grandes sem reduzir o texto até ficar ilegível; `summary`, `data` e `declarativeAnalysis` continuam sendo a visão compacta para agentes e impressão degradada. A legenda fica fora da área de pan para permanecer legível no modo inline, na página dedicada, em tela cheia e na impressão.

## Envelope de HTML autoral

Crie o scaffold com:

```text
aurelius visual init publication-cost --site ./docs --kind sankey --format html
```

O artefato é referenciado por um JSON em `diagrams/`:

```json
{
  "id": "publication-cost",
  "kind": "sankey",
  "title": "Where publication time goes",
  "description": "A Sankey diagram showing review time split across validation stages and outcomes.",
  "summary": "Twelve thousand minutes enter four validation stages. Most time reaches the passed outcome; flaky reruns consume one thousand minutes.",
  "htmlSource": "diagrams/artifacts/publication-cost.html",
  "svgSource": "diagrams/artifacts/publication-cost.svg",
  "presentation": { "width": 1200, "height": 720 },
  "interactive": false,
  "data": {
    "unit": "minutes",
    "flows": [
      { "from": "CI", "to": "Unit tests", "value": 5200 },
      { "from": "Unit tests", "to": "Passed", "value": 4400 }
    ]
  },
  "sourceRefs": ["content/publishing.md"]
}
```

- `htmlSource` aponta para um documento HTML completo e local à raiz do site.
- `summary` é texto autônomo: registra a conclusão ou estrutura que uma pessoa precisa entender sem renderizar o visual. Não descreva posições de caixas.
- `data` preserva os valores e relações importantes em formato rastreável. Não precisa duplicar toda a marcação do HTML.
- `presentation.width` e `presentation.height` declaram o quadro de autoria em pixels CSS. Escolha um quadro grande o bastante para rótulos legíveis; o leitor oferece overflow e visualização completa.
- `interactive` é `false` por padrão. Defina `true` somente quando o significado realmente melhora com interação e houver um estado completo sem JavaScript.
- `svgSource` é opcional, mas recomendado para visuais importantes em PDF. O fallback precisa representar o mesmo estado completo do HTML. Para extração automática, marque exatamente um SVG com `data-aurelius-print-source="true"`, mantenha todos os estilos e variáveis usados dentro dele e preserve o contrato acessível; CSS declarado apenas no `<head>` não acompanha a cópia nem a impressão. Sem esse marcador ou um `svgSource`, o PDF usa a alternativa textual baseada em `summary`.

Não coloque o conteúdo de `htmlSource` em `data`, Markdown ou frontmatter. O build mantém o código visual isolado e publica apenas metadados e semântica na API.

## Requisitos do HTML

O documento precisa ser autocontido e funcionar no isolamento do Aurelius:

- Use `<!doctype html>`, `lang`, `<title>` e um único conteúdo principal. Declare CSS no próprio arquivo e mantenha o fundo claro; um site Aurelius não tem variante escura.
- Prefira SVG inline para diagramas e gráficos. O SVG informativo precisa de `role="img"`, `aria-labelledby` que aponte para `<title>` e `<desc>`, `<title>` como primeiro filho e `<desc>` útil, com IDs exclusivos prefixados pelo slug. Quando ele for a fonte de impressão, inclua `data-aurelius-print-source="true"` e um `<style>` interno completo.
- Não use `iframe`, `object`, `embed`, formulários, navegação automática, `base`, `meta refresh`, requisições de rede ou imagens remotas. Fontes remotas permitidas pelo build são uma melhoria opcional; sempre forneça uma pilha local legível.
- Não tente alcançar `parent`, cookies, armazenamento, clipboard ou DOM externo. Scripts só podem operar dentro do artefato e exigem `interactive: true`.
- O estado inicial e `prefers-reduced-motion: reduce` devem mostrar o conteúdo completo. Animação e hover não podem revelar fatos indispensáveis.
- Declare os próprios tokens CSS de marca e fallbacks no arquivo: o iframe é isolado e não herda estilos do site. Não use uma fonte monoespaçada para todo o texto; reserve-a para comandos, IDs, valores e eixos compactos.

O isolamento é parte do contrato, não uma técnica de layout. O artefato deve continuar correto quando aberto sozinho e não deve depender dos estilos ou scripts do site hospedeiro.

## Legibilidade, escala e navegação

- Projete no quadro declarado em `presentation`; use um `viewBox` coerente e texto com tamanho adequado ao destino. Em um visual largo, preserve a escala de leitura e deixe o container rolar horizontalmente em vez de reduzir rótulos até ficarem ilegíveis.
- Mantenha títulos humanos curtos, rótulos diretamente junto aos dados e contraste suficiente sobre o papel claro. Use cor como reforço, nunca como código único.
- Para mapas grandes, ofereça hierarquia visual e pontos de orientação. O full view deve permitir entender o todo; detalhes densos devem continuar legíveis com zoom ou overflow.
- Em interação de canvas, scroll comum move a superfície, arrastar move a visão e o modificador indicado controla zoom. Clicar em um item seleciona ou mostra detalhe; não deve aplicar zoom inesperado.
- Divida uma explicação quando o excesso de elementos impede a leitura. Um grande mapa de processo pode ser legítimo, mas ainda precisa de agrupamentos, rótulos de fase e uma visão geral sem sobreposições.

## Impressão, cópia e alternativa textual

Considere quatro saídas antes de concluir:

1. A página inline mostra o visual em escala útil e dá acesso à visualização completa.
2. A visualização completa preserva o quadro autoral e os controles não cobrem conteúdo.
3. A impressão usa `svgSource` quando disponível; sem ele, deve permanecer uma alternativa textual com `summary`, título e fonte. Não aceite iframe vazio ou conteúdo cortado como PDF válido.
4. A cópia oferece a representação editável relevante: HTML para o artefato autoral e SVG quando houver fallback. O Markdown e a API recebem título, resumo, dados e referência ao artefato — nunca apenas `{{diagram:id}}` sem contexto.

## Qualidade com ou sem `diagram-design`

Se a skill `diagram-design` estiver disponível, escolha primeiro o padrão semântico e o tipo visual, leia apenas a referência daquele tipo e adapte uma variante clara aos tokens do site. Use os verificadores da skill quando acessíveis. Aurelius não depende dessa skill e não deve copiar seus assets durante o build.

Sem a skill, preserve os mesmos resultados essenciais: tipo adequado ao problema, pouca decoração, hierarquia explícita, conectores rastreáveis, legenda fora da área de dados, no máximo dois focos visuais e sem sombras ou efeitos que reduzam contraste. Para diagramas muito densos, priorize a rastreabilidade de cada linha e quebre em overview + detalhes quando necessário.

## Verificação

Depois de editar fontes:

```text
aurelius check --site ./docs
aurelius build --site ./docs
aurelius dev --site ./docs
```

No navegador, verifique a página que incorpora o visual e sua rota de full view. Teste largura desktop e estreita, zoom do navegador, navegação por teclado, foco visível, copiar HTML/SVG, ausência de scroll preso, fontes carregadas e `prefers-reduced-motion`. Abra a prévia de impressão e confirme que título, resumo, fallback e blocos de código não ficam cortados ou divididos de forma ilegível.
