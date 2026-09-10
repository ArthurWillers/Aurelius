import { diagramKindLabel } from "./registry.mjs";

export const rendererGroups = [
  { label: "Systems", kinds: ["architecture", "it-state", "high-level", "medallion", "dp-integration", "deployment"] },
  { label: "Behavior", kinds: ["flowchart", "sequence", "state", "process", "data-flow", "swimlane", "journey"] },
  { label: "Structure", kinds: ["er", "db-schema", "uml-class", "tree", "nested", "org-chart", "layers", "dependency"] },
  { label: "Planning", kinds: ["timeline", "gantt", "kanban", "story-map", "wardley"] },
  { label: "Analysis", kinds: ["quadrant", "venn", "pyramid", "fishbone", "dp-security-matrix"] },
  { label: "Quantitative", kinds: ["radar", "polar", "bar", "waterfall", "line", "scatter", "treemap", "sankey"] },
  { label: "Cycles and maps", kinds: ["loop", "canvas"] },
];

const esc = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const box = (x, y, width, height, label = "", accent = false, dash = false) =>
  '<g><rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="5" class="gallery-box' + (accent ? " gallery-box--accent" : "") + '"' + (dash ? ' stroke-dasharray="4 3"' : "") + '/>' +
  (label ? '<text x="' + (x + width / 2) + '" y="' + (y + height / 2 + 3) + '" text-anchor="middle">' + esc(label) + "</text>" : "") + "</g>";
const path = (data, accent = false, dash = false, marker = true) =>
  '<path d="' + data + '" class="gallery-line' + (accent ? " gallery-line--accent" : "") + '"' + (dash ? ' stroke-dasharray="4 3"' : "") + (marker ? ' marker-end="url(#arrow)"' : "") + "/>";
const dot = (x, y, radius = 4, accent = true) =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" class="gallery-dot' + (accent ? " gallery-dot--accent" : "") + '"/>';
const label = (x, y, value, anchor = "start") =>
  '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" class="gallery-label">' + esc(value) + "</text>";
const compartment = (x, y, width, height, title, { attributes = [], operations = [] }, accent = false) => {
  const stroke = accent ? " gallery-box--accent" : "";
  const headerY = y + 20;
  const attributeStart = y + 50;
  const splitY = attributes.length && operations.length ? attributeStart + attributes.length * 18 - 6 : null;
  const operationStart = splitY ? splitY + 20 : attributeStart;
  const attributeLines = attributes.map((field, index) =>
    '<text x="' + (x + 12) + '" y="' + (attributeStart + index * 18) + '" class="gallery-field">' + esc(field) + "</text>",
  ).join("");
  const operationLines = operations.map((field, index) =>
    '<text x="' + (x + 12) + '" y="' + (operationStart + index * 18) + '" class="gallery-field">' + esc(field) + "</text>",
  ).join("");
  const divider = splitY === null ? "" : '<line x1="' + x + '" y1="' + splitY + '" x2="' + (x + width) + '" y2="' + splitY + '" class="gallery-rule"/>';
  return '<g><rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" rx="6" class="gallery-box' + stroke + '"/>' +
    '<text x="' + (x + width / 2) + '" y="' + headerY + '" text-anchor="middle" class="gallery-node-title">' + esc(title) + "</text>" +
    '<line x1="' + x + '" y1="' + (y + 30) + '" x2="' + (x + width) + '" y2="' + (y + 30) + '" class="gallery-rule"/>' + divider + attributeLines + operationLines + "</g>";
};

function exampleVisual(kind) {
  switch (kind) {
    case "architecture":
      return box(22, 70, 70, 38, "WEB") + path("M92 89 H125") + box(125, 55, 72, 68, "API", true) + path("M197 76 H230") + path("M197 104 H230") + box(230, 48, 68, 34, "DATA") + box(230, 98, 68, 34, "QUEUE");
    case "it-state":
      return '<rect x="18" y="30" width="126" height="120" rx="7" class="gallery-zone"/>' + '<rect x="176" y="30" width="126" height="120" rx="7" class="gallery-zone"/>' + label(30, 49, "CURRENT") + label(188, 49, "TARGET") + box(32, 65, 96, 28, "LEGACY") + box(32, 105, 96, 28, "BATCH") + box(190, 65, 96, 28, "PLATFORM", true) + box(190, 105, 96, 28, "EVENTS", true) + path("M144 90 H176", true);
    case "high-level":
      return box(24, 69, 76, 42, "INPUT") + path("M100 90 H123") + box(123, 51, 76, 78, "SYSTEM", true) + path("M199 90 H222") + box(222, 69, 76, 42, "OUTCOME");
    case "medallion":
      return box(26, 96, 78, 40, "BRONZE") + box(80, 70, 78, 40, "SILVER") + box(134, 44, 78, 40, "GOLD", true) + path("M104 116 L125 103", false, false) + path("M158 90 L179 77", true, false);
    case "dp-integration":
      return box(22, 52, 66, 32, "CRM") + box(22, 103, 66, 32, "ERP") + path("M88 68 H123") + path("M88 119 H123") + box(123, 55, 74, 74, "HUB", true) + path("M197 92 H230") + box(230, 74, 68, 36, "LAKE");
    case "deployment":
      return '<rect x="16" y="25" width="288" height="130" rx="8" class="gallery-zone"/>' + label(28, 45, "REGION") + box(35, 63, 74, 66, "WEB") + box(123, 63, 74, 66, "API", true) + box(211, 63, 74, 66, "DB") + path("M109 96 H123") + path("M197 96 H211");
    case "flowchart":
      return '<ellipse cx="53" cy="90" rx="34" ry="20" class="gallery-box"/>' + label(53, 94, "START", "middle") + path("M87 90 H116") + box(116, 70, 70, 40, "CHECK") + path("M186 90 H214") + '<path d="M252 60 L290 90 L252 120 L214 90 Z" class="gallery-box gallery-box--accent"/>' + label(252, 94, "OK?", "middle");
    case "sequence":
      return [52, 160, 268].map((x) => box(x - 32, 28, 64, 25, x === 160 ? "API" : x < 100 ? "USER" : "DB", x === 160) + '<line x1="' + x + '" y1="53" x2="' + x + '" y2="151" class="gallery-line" stroke-dasharray="3 3"/>').join("") + path("M52 76 H160") + path("M160 101 H268") + path("M268 127 H160", true, true);
    case "state":
      return dot(28, 90, 7, false) + path("M35 90 H74") + box(74, 68, 70, 44, "DRAFT") + path("M144 90 H176") + box(176, 68, 78, 44, "LIVE", true) + path("M254 90 H287") + '<circle cx="294" cy="90" r="10" class="gallery-box"/><circle cx="294" cy="90" r="5" class="gallery-dot"/>';
    case "process":
      return ["PLAN", "BUILD", "CHECK", "SHIP"].map((name, index) => box(17 + index * 77, 70, 60, 40, name, index === 2) + (index < 3 ? path("M" + (77 + index * 77) + " 90 H" + (94 + index * 77)) : "")).join("");
    case "data-flow":
      return box(18, 72, 64, 36, "SOURCE") + path("M82 90 H116") + '<circle cx="154" cy="90" r="34" class="gallery-box gallery-box--accent"/>' + label(154, 94, "MAP", "middle") + path("M188 90 H222") + '<path d="M222 72 C222 64 290 64 290 72 V108 C290 116 222 116 222 108 Z" class="gallery-box"/>' + label(256, 94, "STORE", "middle");
    case "swimlane":
      return '<rect x="18" y="30" width="284" height="120" rx="6" class="gallery-zone"/><line x1="18" y1="70" x2="302" y2="70" class="gallery-rule"/><line x1="18" y1="110" x2="302" y2="110" class="gallery-rule"/>' + label(28, 52, "USER") + label(28, 92, "APP") + label(28, 132, "OPS") + box(99, 38, 55, 24, "ASK") + path("M154 50 L190 82") + box(190, 78, 55, 24, "RUN", true) + path("M245 90 L273 122") + box(248, 118, 50, 24, "LOG");
    case "journey":
      return '<line x1="28" y1="130" x2="292" y2="130" class="gallery-rule"/>' +
        '<path d="M42 102 H120 V74 H198 V98 H278" class="gallery-line gallery-line--accent"/>' +
        [42, 120, 198, 278].map((x, index) => dot(x, [102, 74, 98, 98][index], 5, index === 1)).join("") +
        label(42, 42, "DISCOVER", "middle") + label(120, 42, "EVALUATE", "middle") + label(198, 42, "USE", "middle") + label(278, 42, "RETURN", "middle") +
        label(42, 154, "NEED") + label(120, 154, "CONFIDENCE", "middle") + label(198, 154, "SUCCESS", "middle") + label(278, 154, "LOYALTY", "end");
    case "er":
      return path("M116 94 H204", false, false, false) + label(160, 84, "1 : N", "middle") + compartment(20, 40, 96, 102, "CUSTOMER", { attributes: ["# id", "email"] }) + compartment(204, 40, 96, 102, "ORDER", { attributes: ["# id", "→ customer_id"] }, true);
    case "db-schema":
      return path("M116 104 H204", true, false, false) + compartment(18, 32, 98, 116, "USERS", { attributes: ["PK  id", "    email"] }) + compartment(204, 32, 98, 116, "ORDERS", { attributes: ["PK  id", "FK  user_id"] }, true);
    case "uml-class":
      return path("M136 90 H198", false, false, false) + '<path d="M136 90 l12 -7 v14 Z" class="gallery-box"/>' + compartment(22, 26, 114, 128, "Account", { attributes: ["+ id: UUID"], operations: ["+ save(): void"] }) + compartment(198, 48, 100, 84, "Admin", { operations: ["+ audit(): void"] }, true);
    case "tree":
      return box(125, 24, 70, 30, "ROOT", true) + path("M160 54 V76 H78 V94", false, false, false) + path("M160 76 H242 V94", false, false, false) + box(43, 94, 70, 30, "BRANCH") + box(207, 94, 70, 30, "BRANCH") + path("M78 124 V145", false, false, false) + dot(78, 151, 5, false);
    case "nested":
      return '<rect x="22" y="24" width="276" height="132" rx="9" class="gallery-zone"/>' + label(34, 45, "DOMAIN") + '<rect x="54" y="56" width="212" height="80" rx="7" class="gallery-zone gallery-zone--accent"/>' + label(66, 77, "SERVICE") + box(91, 89, 138, 30, "COMPONENT", true);
    case "org-chart":
      return box(125, 24, 70, 30, "LEAD", true) + path("M160 54 V78 H78 V94", false, false, false) + path("M160 78 H242 V94", false, false, false) + box(40, 94, 76, 34, "DESIGN") + box(204, 94, 76, 34, "ENGINEER");
    case "layers":
      return box(61, 38, 198, 26, "EXPERIENCE") + box(50, 70, 220, 26, "SERVICES", true) + box(39, 102, 242, 26, "DATA") + box(28, 134, 264, 20, "INFRA");
    case "dependency":
      return path("M90 47 H108 V72 H117") + path("M230 47 H212 V72 H203") + path("M90 137 H108 V108 H117") + path("M230 137 H212 V108 H203") +
        box(117, 68, 86, 44, "CORE", true) + box(18, 30, 72, 34, "CLI") + box(230, 30, 72, 34, "SITE") + box(18, 120, 72, 34, "SCHEMA") + box(230, 120, 72, 34, "API");
    case "timeline":
      return '<line x1="25" y1="91" x2="295" y2="91" class="gallery-line"/>' + [45, 112, 180, 248].map((x, index) => dot(x, 91, 6, index === 2) + label(x, index % 2 ? 118 : 70, ["IDEA", "BETA", "LAUNCH", "SCALE"][index], "middle")).join("");
    case "gantt":
      return label(25, 52, "PLAN") + label(25, 83, "BUILD") + label(25, 114, "TEST") + label(25, 145, "SHIP") + '<g class="gallery-bars"><rect x="90" y="39" width="62" height="16"/><rect x="128" y="70" width="94" height="16"/><rect x="202" y="101" width="54" height="16"/><rect x="248" y="132" width="46" height="16" class="gallery-bar-accent"/></g>';
    case "kanban":
      return ["BACKLOG", "DOING", "DONE"].map((name, index) => '<g><rect x="' + (18 + index * 98) + '" y="27" width="88" height="126" rx="6" class="gallery-zone"/>' + label(28 + index * 98, 47, name) + box(28 + index * 98, 60, 68, 27, "CARD", index === 1) + (index !== 2 ? box(28 + index * 98, 96, 68, 27, "CARD") : "") + "</g>").join("");
    case "story-map":
      return ["SEARCH", "CHOOSE", "BUY"].map((name, index) => box(19 + index * 98, 31, 86, 28, name, index === 1) + box(25 + index * 98, 76, 74, 24, "STORY") + box(25 + index * 98, 111, 74, 24, "STORY", index === 1)).join("");
    case "wardley":
      return '<line x1="45" y1="22" x2="45" y2="151" class="gallery-rule"/><line x1="45" y1="151" x2="298" y2="151" class="gallery-rule"/>' + label(50, 35, "VISIBLE") + label(55, 168, "GENESIS") + label(296, 168, "UTILITY", "end") + path("M83 57 L143 84 L212 70 L270 125", true, false, false) + dot(83, 57) + dot(143, 84, 4, false) + dot(212, 70) + dot(270, 125, 4, false);
    case "quadrant":
      return '<rect x="48" y="24" width="224" height="132" class="gallery-zone"/><line x1="160" y1="24" x2="160" y2="156" class="gallery-rule"/><line x1="48" y1="90" x2="272" y2="90" class="gallery-rule"/>' + dot(101, 59) + dot(214, 51, 4, false) + dot(117, 126, 4, false) + dot(229, 118) + label(58, 42, "INVEST") + label(170, 42, "SCALE");
    case "venn":
      return '<circle cx="126" cy="90" r="58" class="gallery-area"/><circle cx="194" cy="90" r="58" class="gallery-area gallery-area--accent"/>' + label(99,94,"PEOPLE","middle") + label(221,94,"AGENTS","middle") + label(160,94,"DOCS","middle");
    case "pyramid":
      return '<path d="M160 22 L293 151 H27 Z" class="gallery-area"/><line x1="70" y1="109" x2="250" y2="109" class="gallery-rule"/><line x1="112" y1="68" x2="208" y2="68" class="gallery-rule"/>' + label(160,53,"VISION","middle") + label(160,94,"STRATEGY","middle") + label(160,136,"EXECUTION","middle");
    case "fishbone":
      return path("M40 90 H282", true, false, false) + '<path d="M282 90 l-20 -14 v28 Z" class="gallery-box gallery-box--accent"/>' + [83,139,195,251].map((x,index)=>path("M"+x+" 90 L"+(x-28)+" "+(index%2?136:44),false,false,false)+label(x-31,index%2?149:38,["PEOPLE","TOOLS","INPUT","RULES"][index],"middle")).join("");
    case "dp-security-matrix":
      return '<rect x="58" y="32" width="232" height="120" class="gallery-zone"/>' + [116,174,232].map((x)=>'<line x1="'+x+'" y1="32" x2="'+x+'" y2="152" class="gallery-rule"/>').join("") + [72,112].map((y)=>'<line x1="58" y1="'+y+'" x2="290" y2="'+y+'" class="gallery-rule"/>').join("") + label(20,58,"READ")+label(20,98,"WRITE")+label(20,138,"ADMIN") + [[87,52],[145,92],[203,132],[261,52]].map(([x,y])=>dot(x,y,6,true)).join("");
    case "radar":
      return '<g transform="translate(160 90)"><path d="M0 -64 L61 -20 L38 52 L-38 52 L-61 -20 Z" class="gallery-grid"/><path d="M0 -32 L30 -10 L19 26 L-19 26 L-30 -10 Z" class="gallery-grid"/><path d="M0 -52 L44 -14 L24 33 L-29 40 L-45 -15 Z" class="gallery-area gallery-area--accent"/></g>';
    case "polar":
      return '<circle cx="160" cy="90" r="62" class="gallery-grid"/><circle cx="160" cy="90" r="38" class="gallery-grid"/>' + [0,45,90,135,180,225,270,315].map((angle,index)=>{const rad=angle*Math.PI/180;const length=[42,58,31,50,61,37,54,46][index];const x=160+Math.cos(rad)*length;const y=90+Math.sin(rad)*length;return path("M160 90 L"+x.toFixed(1)+" "+y.toFixed(1),index===1,false,false)+dot(x.toFixed(1),y.toFixed(1),4,index===1);}).join("");
    case "bar":
      return '<line x1="38" y1="146" x2="296" y2="146" class="gallery-rule"/><g class="gallery-bars"><rect x="62" y="94" width="34" height="52"/><rect x="117" y="61" width="34" height="85"/><rect x="172" y="77" width="34" height="69" class="gallery-bar-accent"/><rect x="227" y="38" width="34" height="108"/></g>';
    case "waterfall":
      return '<line x1="30" y1="146" x2="298" y2="146" class="gallery-rule"/><g class="gallery-bars"><rect x="44" y="58" width="32" height="88"/><rect x="95" y="58" width="32" height="28" class="gallery-bar-accent"/><rect x="146" y="86" width="32" height="22"/><rect x="197" y="76" width="32" height="32" class="gallery-bar-accent"/><rect x="248" y="76" width="32" height="70"/></g><path d="M76 58 H95 M127 86 H146 M178 108 H197 M229 76 H248" class="gallery-line" stroke-dasharray="3 3"/>';
    case "line":
      return '<line x1="38" y1="146" x2="296" y2="146" class="gallery-rule"/><line x1="38" y1="30" x2="38" y2="146" class="gallery-rule"/>' + path("M46 123 L94 107 L142 115 L190 69 L238 78 L286 42",true,false,false) + [[46,123],[94,107],[142,115],[190,69],[238,78],[286,42]].map(([x,y])=>dot(x,y,4,true)).join("");
    case "scatter":
      return '<line x1="38" y1="146" x2="296" y2="146" class="gallery-rule"/><line x1="38" y1="30" x2="38" y2="146" class="gallery-rule"/>' + [[63,128],[88,112],[112,119],[137,91],[163,98],[191,68],[219,79],[247,48],[274,55]].map(([x,y],index)=>dot(x,y,index===6?6:4,index===6)).join("");
    case "treemap":
      return '<rect x="28" y="28" width="264" height="124" class="gallery-zone"/><rect x="30" y="30" width="125" height="120" class="gallery-area gallery-area--accent"/><rect x="157" y="30" width="133" height="70" class="gallery-area"/><rect x="157" y="102" width="76" height="48" class="gallery-area"/><rect x="235" y="102" width="55" height="48" class="gallery-area"/>' + label(43,50,"CORE")+label(170,50,"SITE");
    case "sankey":
      return '<text x="30" y="22" class="gallery-label">INPUT</text><text x="148" y="22" class="gallery-label">STAGE</text><text x="252" y="22" class="gallery-label">OUTCOME</text>' +
        '<path d="M42 42 C92 42 104 58 150 58 L150 86 C104 86 92 70 42 70 Z" class="gallery-flow gallery-flow--accent"/>' +
        '<path d="M42 76 C94 76 105 88 150 88 L150 118 C105 118 94 106 42 106 Z" class="gallery-flow"/>' +
        '<path d="M164 58 C204 58 218 48 272 48 L272 80 C218 80 204 90 164 90 Z" class="gallery-flow gallery-flow--accent"/>' +
        '<path d="M164 92 C208 92 220 102 272 102 L272 128 C220 128 208 118 164 118 Z" class="gallery-flow"/>' +
        '<rect x="28" y="38" width="14" height="72" rx="2" class="gallery-box"/><rect x="150" y="54" width="14" height="68" rx="2" class="gallery-box gallery-box--accent"/><rect x="272" y="44" width="14" height="88" rx="2" class="gallery-box"/>' +
        label(35, 142, "DEMAND", "middle") + label(157, 142, "CHECK", "middle") + label(279, 142, "PASSED", "middle");
    case "loop":
      return path("M132 53 H188") + path("M252 70 V110") + path("M188 127 H132") + path("M68 110 V70") +
        box(68, 36, 64, 34, "PLAN") + box(188, 36, 64, 34, "MAKE") + box(188, 110, 64, 34, "LEARN", true) + box(68, 110, 64, 34, "ADAPT");
    case "canvas":
      return '<rect x="18" y="24" width="284" height="132" rx="7" class="gallery-zone"/><rect x="32" y="38" width="118" height="104" rx="6" class="gallery-zone"/><rect x="168" y="38" width="120" height="104" rx="6" class="gallery-zone"/>' + box(45,54,88,30,"DISCOVER") + box(45,99,88,30,"DEFINE",true) + box(184,54,88,30,"BUILD") + box(184,99,88,30,"SHIP") + path("M133 69 H184") + path("M133 114 H184",true,true);
    default:
      return box(55, 58, 90, 54, "SOURCE") + path("M145 85 H175") + box(175, 58, 90, 54, "OUTPUT", true);
  }
}

function rendererPreview(kind) {
  const titleId = "renderer-" + kind + "-title";
  const descriptionId = "renderer-" + kind + "-description";
  return [
    '<svg viewBox="0 0 320 180" role="img" aria-labelledby="' + titleId + " " + descriptionId + '">',
    '<title id="' + titleId + '">' + esc(diagramKindLabel(kind)) + " example</title>",
    '<desc id="' + descriptionId + '">A compact example of the ' + esc(kind) + " visual grammar.</desc>",
    '<defs><marker id="arrow" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6 Z" class="gallery-arrow"/></marker></defs>',
    '<rect width="320" height="180" class="gallery-paper"/>',
    exampleVisual(kind),
    "</svg>",
  ].join("");
}

function rendererModeLabel(kind) {
  if (kind === "canvas") return "native canvas";
  if (kind === "architecture") return "native · Mermaid · SVG · HTML";
  return "Mermaid · SVG · HTML";
}

function rendererModeMarkdown(kind) {
  if (kind === "canvas") return "native canvas";
  if (kind === "architecture") return "native, Mermaid, SVG, or authored HTML";
  return "Mermaid, SVG, or authored HTML";
}

export function renderRendererGallery() {
  return '<div class="renderer-gallery" aria-label="Renderer examples">' + rendererGroups.map((group) =>
    '<section class="renderer-group" aria-labelledby="renderer-group-' + esc(group.label.toLowerCase().replace(/[^a-z]+/g, "-")) + '">' +
    '<header class="renderer-group__header"><h3 id="renderer-group-' + esc(group.label.toLowerCase().replace(/[^a-z]+/g, "-")) + '">' + esc(group.label) + '</h3><span>' + group.kinds.length + " types</span></header>" +
    '<div class="renderer-grid">' + group.kinds.map((kind) =>
      '<article class="renderer-card" data-renderer-kind="' + esc(kind) + '"><div class="renderer-card__preview">' + rendererPreview(kind) + '</div><div class="renderer-card__meta"><code>' + esc(kind) + '</code><span>' + rendererModeLabel(kind) + "</span></div></article>"
    ).join("") + "</div></section>"
  ).join("") + "</div>";
}

export function rendererGalleryMarkdown() {
  return rendererGroups.flatMap((group) => [
    "### " + group.label,
    "",
    ...group.kinds.map((kind) => "- `" + kind + "` — " + rendererModeMarkdown(kind)),
    "",
  ]).join("\n").trim();
}
