# Contrato de conteúdo Aurelius

Cada arquivo em `content/` é Markdown com frontmatter simples. Os campos obrigatórios são `id`, `title`, `description`, `type`, `status` e `visibility`. Use listas separadas por vírgula para `tags`, `related`, `source_refs` e, quando necessário, `authors`. `updated` aceita uma data ou versão editorial livre.

```markdown
---
id: authentication
title: Autenticação
description: Como o sistema identifica pessoas e decide acesso.
type: architecture
status: observed
visibility: internal
tags: security, identity
related: authorization, audit
source_refs: ../app/AuthService.php, ../routes/web.php
authors: Plataforma, Segurança
updated: 2026-09-08
diagram: authentication-flow
---
```

- `id` é único e estável; `home` é a página inicial.
- `related` só pode apontar para outro `id` existente.
- `source_refs` é relativo à raiz do site e deve existir quando declarado. Para uma fonte técnica externa, use uma URL pública `https://` estável.
- `diagram` aponta para o `id` de uma fonte JSON em `diagrams/`.
- `{{diagram:id}}` inclui qualquer visual que não seja Canvas; `{{canvas:id}}` inclui um Canvas.
- `asset:arquivo.ext` aponta para `assets/arquivo.ext`, que é copiado para a saída.

## Arquitetura legível

Arquiteturas são declarativas: descreva nós, zonas e relações; o Aurelius escolhe portas distintas e desenha conectores ortogonais com cantos arredondados. Não use coordenadas SVG em `edges.path`. Mantenha no máximo 9 nós, 12 relações e 3 zonas; quando o modelo for maior, publique uma visão geral e páginas de detalhe.

```json
{
  "id": "runtime-overview",
  "kind": "architecture",
  "title": "Caminho de publicação",
  "description": "O build recebe Markdown, produz uma projeção estática e disponibiliza contratos para agentes.",
  "zones": [
    { "label": "BUILD", "x": 40, "y": 40, "width": 640, "height": 240 }
  ],
  "nodes": [
    { "id": "content", "kind": "input", "tag": "FONTE", "label": "Markdown e JSON", "detail": "versionados", "x": 80, "y": 120, "width": 180, "height": 100 },
    { "id": "build", "kind": "focal", "tag": "BUILD", "label": "Aurelius", "detail": "projeção estática", "x": 400, "y": 120, "width": 180, "height": 100 }
  ],
  "edges": [
    { "id": "compile", "from": "content", "to": "build", "label": "COMPILA", "tone": "accent" }
  ]
}
```

Use a grade de 4px para `x`, `y`, `width` e `height`; não sobreponha nós. `label` é uma frase humana curta, `detail` contém o dado técnico e `tag` identifica a categoria. O SVG resultante inclui título e descrição para leitores de tela, uma legenda construída apenas com os tipos realmente usados e uma ação para copiar o vetor na página.

O build produz `markdown/{id}.md`, `api/documents/{id}.json`, `api/graph.json`, `api/search.json`, `api/manifest.json`, schemas JSON, `llms.txt` e `llms-full.txt`. Esses arquivos são a interface preferida para agentes; `dist/` nunca é a fonte de edição.

## Fontes visuais

Um envelope em `diagrams/` pode usar Mermaid declarativo, o renderer JSON nativo, um `svgSource` acessível ou um `htmlSource` autoral isolado. Mermaid é a primeira opção para UML, decisões, fluxogramas, sequência, estados, ER, Gantt, jornadas e gráficos que sua gramática represente:

```json
{
  "id": "approval-flow",
  "kind": "flowchart",
  "title": "Fluxo de aprovação",
  "description": "Uma solicitação aprovada é publicada; uma rejeitada volta para revisão.",
  "source": {
    "language": "mermaid",
    "path": "diagrams/sources/approval-flow.mmd"
  },
  "summary": "A aprovação publica a solicitação. A rejeição devolve o item ao autor para revisão.",
  "data": { "outcomes": ["published", "revision"] }
}
```

Use exatamente um de `source.path` (`.mmd` ou `.mermaid`) e `source.code`. O `check` executa o parser Mermaid e bloqueia diretivas de configuração, links e callbacks; o `build` aplica os tokens claros do site e empacota o runtime local. Em todos os modos, mantenha `id`, `kind`, `title`, `description`, um `summary` autônomo quando o visual carregar informação relevante, `sourceRefs` e `data` semântico quando houver valores ou relações que agentes devam consultar.

O SVG precisa declarar `viewBox`, `role="img"`, `aria-labelledby`, `<title>` e `<desc>`; referências locais como `url(#seta)` são aceitas quando o ID existe, enquanto conteúdo executável, externo ou ambíguo é rejeitado. O HTML autoral precisa ser um documento completo, claro, autocontido e funcionar sem acesso ao DOM do site; scripts exigem `interactive: true`, e o estado completo precisa permanecer disponível sem JavaScript. Use `svgSource` como fallback estático de um HTML quando a qualidade de impressão for importante ou marque um SVG inline autocontido com `data-aurelius-print-source="true"`.

Leia [o contrato de autoria visual](html-visuals.md) para escolher o modo, preencher `presentation`, preservar legibilidade responsiva, oferecer cópia e validar a visualização completa e a impressão. O build publica metadados sem duplicar payloads privados de SVG ou HTML na API.
