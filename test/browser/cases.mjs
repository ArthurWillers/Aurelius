export const mermaidCases = [
  { id: "return-flow", kind: "flowchart", code: `flowchart LR
    A["Acesso e vínculo"] --> B["Solicitação e análise"]
    B -->|aceite| C["Documentos e formalização"]
    C --> D["Estágio em andamento"]
    D --> E["Acompanhamento acadêmico e conclusão"]
    C -->|pendência| B
    B -->|erro| A`, nodes: 5, edges: 6 },
  { id: "vertical-flow", kind: "flowchart", code: "flowchart TB\n A[Start] --> B[Review]\n B -->|sim| C[Finish]\n C -->|não| B", nodes: 3, edges: 3 },
  { id: "small-flow", kind: "flowchart", code: "flowchart LR\n A[One] --> B[Two]", nodes: 2, edges: 1 },
  { id: "heterogeneous", kind: "flowchart", code: 'flowchart RL\n A["Texto longo com caracteres Unicode: revisão acadêmica e informação 日本語 🚀"] --> B{OK?}\n B -->|sim| C([Concluído])\n B -->|não| A', nodes: 3, edges: 3 },
  { id: "parallel-loops", kind: "flowchart", code: "flowchart LR\n A[Check] -->|retry| A\n A -->|first| B[Finish]\n A -->|second| B\n B -->|return| A", nodes: 2, edges: 4 },
  { id: "large-flow", kind: "flowchart", code: "flowchart LR\n" + Array.from({ length: 39 }, (_, i) => ` N${i}[Step ${i}] --> N${i + 1}[Step ${i + 1}]`).join("\n"), nodes: 40, edges: 39 },
  { id: "tall-flow", kind: "flowchart", code: "flowchart BT\n" + Array.from({ length: 29 }, (_, i) => ` N${i}[Step ${i}] --> N${i + 1}[Step ${i + 1}]`).join("\n"), nodes: 30, edges: 29 },
  { id: "dependency-groups", kind: "dependency", code: "flowchart LR\n subgraph Inputs\n A[Source]\n end\n subgraph Build\n B[Validate]\n end\n A --> B --> C[Publish]\n B -->|retry| A", nodes: 3, edges: 3 },
  { id: "multiple-series", kind: "bar", code: 'xychart-beta\n title "Volume"\n x-axis [A, B, C]\n y-axis "Count" -10 --> 30\n bar [10, -5, 20]\n line [15, 0, 25]\n line [5, 10, 30]' },
  { id: "long-journey", kind: "journey", code: "journey\n title Complete journey\n section Work\n" + Array.from({ length: 9 }, (_, i) => ` Task ${i}: ${i % 5 + 1}: User`).join("\n") },
  { id: "state-composite", kind: "state", code: 'stateDiagram-v2\n [*] --> Work\n state Work {\n [*] --> Draft\n Draft --> Published: release\n }\n Work --> [*]' },
  { id: "er-fields", kind: "er", code: 'erDiagram\n users ||--o{ orders : owns\n users {\n int id PK "identifier"\n string name\n }\n orders {\n int id PK\n int user_id FK\n }' },
  { id: "manual-state", kind: "state", code: "stateDiagram-v2\n [*] --> Draft\n Draft --> Published: release\n Published --> Draft: retry", layout: { states: { Draft: { x: 80, y: 80 }, Published: { x: 400, y: 80, width: 192, height: 80 } } } },
  { id: "manual-er", kind: "db-schema", code: "erDiagram\n USERS ||--o{ ORDERS : user_id\n USERS {\n int id PK\n string name\n }\n ORDERS {\n int id PK\n int user_id FK\n }", layout: { entities: { USERS: { x: 80, y: 80 }, ORDERS: { x: 440, y: 200 } } } },
];

export const nativeCases = [
  { id: "canvas-groups", kind: "canvas", groups: [{ x: -160, y: 0, width: 520, height: 260, label: "Grupo com título longo: preparação, análise acadêmica, formalização e acompanhamento completo 日本語" }], nodes: [{ id: "a", title: "Input", x: -120, y: 80, width: 160, height: 100 }, { id: "b", title: "Output", x: 140, y: 80, width: 160, height: 100 }], edges: [{ from: "a", to: "b", label: "sim" }, { from: "a", to: "b", label: "não" }] },
  { id: "native-compact", kind: "architecture", nodes: [{ id: "a", kind: "input", tag: "IN", label: "Input", x: -120, y: -80, width: 120, height: 80 }, { id: "b", kind: "backend", tag: "OUT", label: "A longer Unicode title: revisão", x: 120, y: -80, width: 160, height: 100 }], edges: [{ id: "ab", from: "a", to: "b", label: "aceite" }, { id: "ba", from: "b", to: "a", tone: "return", label: "pendência" }] },
  { id: "canvas-compact", kind: "canvas", nodes: [{ id: "a", title: "Input", x: -200, y: -100, width: 160, height: 100 }, { id: "b", title: "Solicitação e análise acadêmica completa", x: 80, y: -100, width: 240, height: 140 }], edges: [{ from: "a", to: "b", label: "aceite" }, { from: "b", to: "a", label: "pendência", tone: "return" }, { from: "b", to: "b", label: "retry" }] },
  { id: "canvas-path", kind: "canvas", nodes: [{ id: "a", title: "Source", x: -200, y: 0, width: 160, height: 100 }, { id: "b", title: "Target", x: 200, y: 0, width: 160, height: 100 }], edges: [{ from: "a", to: "b", path: "M-40 50 C40 -200 120 -200 200 50", label: "Curva autorada" }] },
];
