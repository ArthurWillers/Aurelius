# Migrar um vault Obsidian

Esta referência orienta a migração de um vault para Markdown organizado ou para um site Aurelius. Ela se baseia nas skills oficiais do projeto `kepano/obsidian-skills`: [obsidian-markdown](https://github.com/kepano/obsidian-skills/tree/main/skills/obsidian-markdown), [obsidian-bases](https://github.com/kepano/obsidian-skills/tree/main/skills/obsidian-bases) e [json-canvas](https://github.com/kepano/obsidian-skills/tree/main/skills/json-canvas). Consulte as referências upstream quando a tarefa for editar o vault, e não só migrá-lo.

## Inventário antes da cópia

Inspecione o vault sem alterá-lo e produza uma tabela de contagens e exceções:

| Objeto | Procure por | Decisão a registrar |
| --- | --- | --- |
| Notas | `*.md` | destino, `id`, status de frontmatter e links |
| Links internos | `[[nota]]`, `[[nota#seção]]`, `[[nota|rótulo]]`, `[[nota#^bloco]]` | alvo resolvido, âncora preservada ou exceção |
| Embeds | `![[...]]` | conteúdo incorporado, ativo, ou referência a traduzir |
| Propriedades | frontmatter YAML | campos preservados, renomeados ou descartados com motivo |
| Tags | `#tag` e `tags:` | normalização e vocabulário de destino |
| Anexos | imagens, PDF, áudio, vídeo e outros arquivos | caminho, hash opcional, destino e referências |
| Canvas | `*.canvas` | tradução semântica, preservação como fonte ou exceção |
| Bases | `*.base` | view estática, índice narrativo, implementação própria ou não suportado |
| Configuração | `.obsidian/` e plugins | preservar como contexto/arquivo, nunca confundir com conteúdo publicado |

Inclua no relatório links ambíguos, notas de mesmo nome, embeds quebrados, frontmatter inválido, arquivos sem referência, arquivos referenciados ausentes e sintaxe de plugins. A ausência de uma referência não autoriza apagar um ativo: pode ser conteúdo intencionalmente independente.

## Markdown e propriedades

Obsidian estende Markdown com wikilinks, embeds, callouts, propriedades, comentários e tags. Mantenha o texto CommonMark como base e faça uma conversão explícita para cada extensão.

| Origem Obsidian | Destino Aurelius | Regra |
| --- | --- | --- |
| `[[Nota]]` | `[Nota](doc:nota-id)` | só após resolver `Nota` para o `id` de destino |
| `[[Nota|Rótulo]]` | `[Rótulo](doc:nota-id)` | preserve o texto apresentado |
| `[[Nota#Seção]]` | âncora equivalente, quando o destino tiver slug estável | verifique a âncora gerada; se não existir, registre exceção |
| `[[Nota#^bloco]]` | link para seção ou conteúdo transposto | Aurelius não oferece compatibilidade automática com IDs de bloco Obsidian |
| `![[imagem.png]]` | `asset:imagem.png` ou imagem Markdown publicada | copie o ativo e reescreva as referências |
| `![[Nota]]` | conteúdo transposto ou link explícito | não simule inclusão dinâmica sem suporte do destino |
| callout `> [!tipo]` | blockquote Markdown ou padrão editorial escolhido | preserve o significado e o título, não dependa da aparência Obsidian |
| propriedades YAML | frontmatter Aurelius | preencha os campos obrigatórios do Aurelius de forma deliberada |
| `tags`/`#tag` | `tags` | normalize grafia, hierarquia e sinônimos antes da importação |

Propriedades como `aliases` e `cssclasses` são semântica do Obsidian; não as trate como recursos nativos do destino. Preserve aliases em um mapa de redirecionamento ou relatório quando eles forem necessários para encontrar conteúdo antigo. Preserve `cssclasses` apenas se houver uma decisão de estilo equivalente.

Não converta URLs externas em `doc:` e não transforme wikilinks não resolvidos em links falsos. Um bom resultado mantém uma lista rastreável de cada link que não pôde ser resolvido.

## Canvas JSON

Um `.canvas` contém arrays `nodes` e `edges`; cada edge referencia os IDs dos nós de origem e destino. Antes de converter, valide JSON, unicidade de IDs e integridade de `fromNode`/`toNode`. Inventarie nós `text`, `file`, `link` e `group`, além de rótulos e direções das arestas.

Para Aurelius, use uma fonte de diagrama JSON nativa sempre que ela represente bem o assunto. Preserve a relação como dado estruturado, um `summary` que seja compreensível sem a imagem e `sourceRefs` para a fonte que sustenta a afirmação. Grupos viram zonas quando fizer sentido; nós de arquivo podem virar links para os documentos migrados. Um Canvas cujo layout é puramente espacial pode permanecer como arquivo-fonte acompanhado de uma explicação textual, em vez de ser convertido em uma imagem sem acessibilidade.

## Bases e funções de plugin

Um `.base` é YAML que define filtros, fórmulas, propriedades e views. A view pode ser tabela, cards, lista ou mapa. Ela é uma consulta sobre notas, portanto deve ser avaliada como comportamento, não copiada como se fosse uma página estática.

Para cada Base, registre os filtros, propriedades necessárias, fórmulas, ordenação, agrupamentos, limite e summaries. Se exportar uma tabela estática, declare a data de corte e a regra que a gerou. Se alguma nota não tem a propriedade esperada, não esconda o erro: mantenha a condição de ausência na regra ou no relatório.

Consultas e sintaxes de plugins comunitários não fazem parte do formato Markdown padrão do Obsidian. Detecte blocos de código, frontmatter ou comentários que dependam deles; preserve a fonte e peça uma decisão de produto antes de reimplementar, congelar como resultado estático ou excluir do escopo.

## Validação da migração

Faça pelo menos estas verificações antes de declarar a migração concluída:

1. O número de notas, anexos, Canvas e Bases tem destino ou exceção registrada.
2. Todo link interno convertido resolve para o destino esperado; links e embeds que não resolvem aparecem no relatório.
3. Todo ativo referenciado foi copiado uma vez, está acessível no caminho publicado e não perdeu o vínculo no conteúdo.
4. O frontmatter resultante é válido e atende ao contrato do destino; identifique campos que foram transformados ou descartados.
5. Diagramas preservam o significado sem depender do app Obsidian; Bases não são apresentadas como interativas quando a entrega é uma exportação estática.
6. No Aurelius, execute `aurelius check --site <site>` e, se houver build solicitado, confira as páginas Markdown e a API gerada para os documentos afetados.
