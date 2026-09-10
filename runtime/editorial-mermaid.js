(function () {
  var C = { paper: "#f5f5f5", white: "#ffffff", ink: "#2d3142", muted: "#4f5d75", soft: "#7a8399", rule: "rgba(45,49,66,.12)", accent: "#eb6c36", accentTint: "rgba(235,108,54,.08)" };
  var ns = "http://www.w3.org/2000/svg";
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>\"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function words(value, width) {
    var lines = [], line = "";
    String(value || "").split(/\s+/).forEach(function (word) { var next = line ? line + " " + word : word; if (next.length > width && line) { lines.push(line); line = word; } else line = next; });
    if (line) lines.push(line); return lines.slice(0, 2);
  }
  function text(x, y, value, options) {
    options = options || {}; var lines = words(value, options.wrap || 80); var attrs = 'x="' + x + '" y="' + y + '" fill="' + (options.fill || C.ink) + '" font-family="' + (options.mono ? "Geist Mono,ui-monospace,monospace" : "Geist,Inter,system-ui,sans-serif") + '" font-size="' + (options.size || 12) + '"' + (options.weight ? ' font-weight="' + options.weight + '"' : "") + (options.anchor ? ' text-anchor="' + options.anchor + '"' : "") + (options.letter ? ' letter-spacing="' + options.letter + '"' : "");
    if (lines.length < 2) return "<text " + attrs + ">" + esc(lines[0] || "") + "</text>";
    return "<text " + attrs + "><tspan x=\"" + x + "\" dy=\"0\">" + esc(lines[0]) + "</tspan><tspan x=\"" + x + "\" dy=\"13\">" + esc(lines[1]) + "</tspan></text>";
  }
  function svg(viewBox, content) { return '<svg xmlns="' + ns + '" viewBox="' + viewBox + '" class="aurelius-editorial-svg"><defs><marker id="editorial-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="' + C.muted + '"/></marker><marker id="editorial-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="' + C.accent + '"/></marker></defs><rect width="100%" height="100%" fill="' + C.paper + '"/>' + content + "</svg>"; }
  function roundedPath(x1, y1, x2, y2, direction) {
    var dx = x2 - x1, dy = y2 - y1;
    if (Math.abs(dy) < 0.5) return "M" + x1 + " " + y1 + " H" + x2;
    if (Math.abs(dx) < 0.5) return "M" + x1 + " " + y1 + " V" + y2;
    var sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, radius = Math.min(8, Math.abs(dx) / 4, Math.abs(dy) / 4);
    if (direction === "vertical") {
      var middleY = (y1 + y2) / 2;
      return "M" + x1 + " " + y1 + " V" + (middleY - sy * radius) +
        " Q" + x1 + " " + middleY + " " + (x1 + sx * radius) + " " + middleY +
        " H" + (x2 - sx * radius) + " Q" + x2 + " " + middleY + " " + x2 + " " + (middleY + sy * radius) + " V" + y2;
    }
    var middleX = (x1 + x2) / 2;
    return "M" + x1 + " " + y1 + " H" + (middleX - sx * radius) +
      " Q" + middleX + " " + y1 + " " + middleX + " " + (y1 + sy * radius) +
      " V" + (y2 - sy * radius) + " Q" + middleX + " " + y2 + " " + (middleX + sx * radius) + " " + y2 + " H" + x2;
  }
  function connector(x1, y1, x2, y2, direction, options) {
    options = options || {};
    var color = options.accent ? C.accent : C.muted;
    var marker = options.marker === false ? "" : ' marker-end="url(#' + (options.accent ? "editorial-arrow-accent" : "editorial-arrow") + ')"';
    var dash = options.dashed ? ' stroke-dasharray="5 4"' : "";
    return '<path d="' + roundedPath(x1, y1, x2, y2, direction) + '" fill="none" stroke="' + color + '" stroke-width="' + (options.accent ? "2" : "1.4") + '"' + dash + marker + '/>';
  }
  function elbow(x1, y1, x2, y2, direction, accent) {
    return connector(x1, y1, x2, y2, direction, { accent: accent });
  }
  function maskedLabel(x, y, value, options) {
    options = options || {};
    var label = String(value || "");
    if (!label) return "";
    var width = Math.max(32, Math.ceil(label.length * 5.2) + 16);
    return '<rect x="' + (x - width / 2) + '" y="' + (y - 10) + '" width="' + width + '" height="16" rx="2" fill="' + C.paper + '"/>' +
      text(x, y + 1, label, { mono: true, size: 8, fill: options.accent ? C.accent : C.soft, anchor: "middle" });
  }
  function parseLine(source) {
    var xs = source.match(/x-axis\s*\[([^\]]+)\]/i), ys = source.match(/y-axis(?:\s+\"[^\"]*\")?\s+([\d.-]+)\s*-->\s*([\d.-]+)/i), line = source.match(/line\s*\[([^\]]+)\]/i);
    if (!xs || !line) return null;
    return { labels: xs[1].split(",").map(function (v) { return v.trim(); }), values: line[1].split(",").map(Number), min: ys ? Number(ys[1]) : 0, max: ys ? Number(ys[2]) : Math.max.apply(null, line[1].split(",").map(Number)), yTitle: source.match(/y-axis\s+\"([^\"]+)/i)?.[1] || "Value" };
  }
  function renderLine(source) {
    var data = parseLine(source); if (!data || !data.values.length) return null;
    var left = 96, right = 932, top = 64, bottom = 384, range = Math.max(1, data.max - data.min), count = data.values.length - 1;
    var points = data.values.map(function (value, index) { return [left + (right - left) * index / Math.max(1, count), bottom - ((value - data.min) / range) * (bottom - top)]; });
    var body = '<text x="' + left + '" y="32" fill="' + C.ink + '" font-family="Geist,Inter,sans-serif" font-size="16" font-weight="600">Trend by publication state</text>';
    for (var i = 0; i <= 4; i++) { var value = data.min + range * i / 4, y = bottom - (bottom - top) * i / 4; body += '<line x1="' + left + '" y1="' + y + '" x2="' + right + '" y2="' + y + '" stroke="' + C.rule + '" stroke-width="1"/>' + text(left - 12, y + 3, Math.round(value), { mono: true, size: 8, fill: C.muted, anchor: "end" }); }
    body += '<line x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + bottom + '" stroke="' + C.ink + '"/><line x1="' + left + '" y1="' + bottom + '" x2="' + right + '" y2="' + bottom + '" stroke="' + C.ink + '"/>';
    body += '<polyline points="' + points.map(function (p) { return p.join(","); }).join(" ") + '" fill="none" stroke="' + C.accent + '" stroke-width="2.4" stroke-linejoin="round"/>';
    points.forEach(function (p, index) { body += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + C.accent + '" stroke="' + C.paper + '" stroke-width="2"/>' + text(p[0], p[1] - 12, data.values[index], { mono: true, size: 8, fill: C.ink, anchor: "middle" }) + text(p[0], bottom + 24, data.labels[index] || "", { mono: true, size: 8, fill: C.muted, anchor: "middle", wrap: 14 }); });
    body += text(28, (top + bottom) / 2, data.yTitle, { mono: true, size: 8, fill: C.muted, anchor: "middle" });
    return svg("0 0 1000 440", body);
  }
  function parseJourney(source) {
    var section = "Journey", items = [], sections = [], seen = {};
    source.split(/\n/).forEach(function (line) { var sectionMatch = line.match(/^\s*section\s+(.+)/i), itemMatch = line.match(/^\s*(.+?):\s*([1-5])\s*:\s*(.+)$/); if (sectionMatch) { section = sectionMatch[1].trim(); if (!seen[section]) { sections.push(section); seen[section] = true; } } else if (itemMatch) items.push({ section: section, label: itemMatch[1].trim(), score: Number(itemMatch[2]), actors: itemMatch[3].trim() }); });
    return items.length ? { items: items.slice(0, 6), sections: sections } : null;
  }
  function renderJourney(source, focus) {
    var data = parseJourney(source); if (!data) return null;
    var count = data.items.length, left = 80, right = 1160, gap = 24, width = (right - left - gap * (count - 1)) / count, centers = [];
    data.items.forEach(function (_, index) { centers.push(left + index * (width + gap) + width / 2); });
    var lowest = Math.min.apply(null, data.items.map(function (item) { return item.score; }));
    var focused = data.items.findIndex(function (item) { return String(focus || "").toLowerCase().includes(item.label.toLowerCase()); });
    var troughIndex = focused >= 0 && data.items[focused].score === lowest ? focused : data.items.findIndex(function (item) { return item.score === lowest; });
    var scoreY = function (score) { return 320 - (score - 1) * 40; };
    var body = '<text x="80" y="36" fill="' + C.ink + '" font-family="Geist,Inter,sans-serif" font-size="16" font-weight="600">From discovery to evidence</text>';

    data.items.forEach(function (item, index) {
      var center = centers[index];
      body += text(center, 76, "STAGE " + String(index + 1).padStart(2, "0"), { mono: true, size: 8, fill: C.soft, anchor: "middle", letter: ".12em" });
      body += text(center, 100, item.section, { size: 12, weight: 600, anchor: "middle", wrap: 18 });
      if (index < count - 1 && item.section !== data.items[index + 1].section) {
        var boundary = left + (index + 1) * width + index * gap + gap / 2;
        body += '<line x1="' + boundary + '" y1="60" x2="' + boundary + '" y2="472" stroke="' + C.rule + '" stroke-dasharray="4 4"/>';
      }
    });

    [{ score: 5, label: "HIGH" }, { score: 3, label: "NEUTRAL" }, { score: 1, label: "LOW" }].forEach(function (level) {
      var y = scoreY(level.score);
      body += '<line x1="' + left + '" y1="' + y + '" x2="' + right + '" y2="' + y + '" stroke="' + C.rule + '"/>';
      body += text(64, y + 4, level.label, { mono: true, size: 8, fill: C.muted, anchor: "end" });
    });

    for (var segment = 1; segment < count; segment++) {
      var x1 = centers[segment - 1], y1 = scoreY(data.items[segment - 1].score), x2 = centers[segment], y2 = scoreY(data.items[segment].score), middle = (x1 + x2) / 2, accent = segment === troughIndex;
      body += '<path d="M' + x1 + ' ' + y1 + ' C' + middle + ' ' + y1 + ' ' + middle + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + (accent ? C.accent : C.muted) + '" stroke-width="' + (accent ? "2.4" : "1.5") + '"/>';
    }
    data.items.forEach(function (item, index) {
      var focal = index === troughIndex, x = left + index * (width + gap), y = scoreY(item.score);
      body += '<circle cx="' + centers[index] + '" cy="' + y + '" r="5" fill="' + (focal ? C.accent : C.muted) + '" stroke="' + C.paper + '" stroke-width="2"/>';
      body += text(centers[index], y - 12, ["LOW", "MED-LOW", "NEUTRAL", "MED-HIGH", "HIGH"][item.score - 1], { mono: true, size: 8, fill: focal ? C.accent : C.soft, anchor: "middle" });
      body += text(x + 8, 372, item.label, { size: 12, weight: 600, wrap: 20 });
      body += text(x + 8, 432, item.actors, { mono: true, size: 8, fill: C.muted, wrap: 20 });
      if (focal) {
        body += '<rect x="' + (x + 8) + '" y="392" width="96" height="20" rx="2" fill="' + C.accentTint + '" stroke="' + C.accent + '" stroke-opacity=".55" stroke-dasharray="3 3"/>';
        body += text(x + 56, 406, "FRICTION", { mono: true, size: 8, fill: C.accent, anchor: "middle", letter: ".08em" });
      }
    });
    body += '<line x1="' + left + '" y1="344" x2="' + right + '" y2="344" stroke="' + C.rule + '"/><line x1="' + left + '" y1="416" x2="' + right + '" y2="416" stroke="' + C.rule + '"/><line x1="' + left + '" y1="464" x2="' + right + '" y2="464" stroke="' + C.rule + '"/>';
    body += text(64, 372, "ACTIONS", { mono: true, size: 8, fill: C.muted, anchor: "end", letter: ".12em" });
    body += text(64, 432, "ACTORS", { mono: true, size: 8, fill: C.muted, anchor: "end", letter: ".12em" });
    return svg("0 0 1200 488", body);
  }
  function parseState(source) { var edges = [], states = []; source.split(/\n/).forEach(function (line) { var match = line.match(/^\s*([^:\s]+)\s*-->\s*([^:\s]+)(?:\s*:\s*(.+))?/); if (match) { edges.push({ from: match[1], to: match[2], label: (match[3] || "").trim() }); [match[1], match[2]].forEach(function (id) { if (id !== "[*]" && !states.includes(id)) states.push(id); }); } }); return states.length ? { states: states, edges: edges } : null; }
  function renderState(source, focus) { var data = parseState(source); if (!data) return null; var count = data.states.length, x0 = 146, gap = Math.max(148, (1120 - x0 - 120) / Math.max(1, count - 1)), y = 204, nodes = {}; data.states.forEach(function (state, i) { nodes[state] = { x: x0 + gap * i, y: y, w: 112, h: 52 }; }); var body = '<text x="72" y="56" fill="' + C.ink + '" font-family="Geist,Inter,sans-serif" font-size="16" font-weight="600">Editorial document lifecycle</text>';
    data.edges.forEach(function (edge) { var focal = String(focus || "").toLowerCase() === edge.to.toLowerCase(), from = nodes[edge.from], to = nodes[edge.to]; if (edge.from === "[*]") { body += '<circle cx="92" cy="230" r="6" fill="' + C.ink + '"/>' + '<path d="M98 230 H' + to.x + '" stroke="' + C.muted + '" stroke-width="1.4" marker-end="url(#editorial-arrow)"/>'; return; } if (edge.to === "[*]") { body += '<circle cx="' + (from.x + from.w + 34) + '" cy="230" r="9" fill="none" stroke="' + C.ink + '"/><circle cx="' + (from.x + from.w + 34) + '" cy="230" r="5" fill="' + C.ink + '"/><path d="M' + (from.x + from.w) + ' 230 H' + (from.x + from.w + 25) + '" stroke="' + C.muted + '" stroke-width="1.4" marker-end="url(#editorial-arrow)"/>'; return; } if (from.x > to.x) { body += '<path d="M' + (from.x + 20) + ' ' + y + ' C' + (from.x + 20) + ' 122 ' + (to.x + to.w - 20) + ' 122 ' + (to.x + to.w - 20) + ' ' + y + '" fill="none" stroke="' + C.muted + '" stroke-width="1.4" marker-end="url(#editorial-arrow)"/>' + text((from.x + to.x + to.w) / 2, 126, edge.label, { mono: true, size: 8, fill: C.soft, anchor: "middle" }); } else { body += '<path d="M' + (from.x + from.w) + ' 230 H' + to.x + '" fill="none" stroke="' + (focal ? C.accent : C.muted) + '" stroke-width="' + (focal ? "2" : "1.4") + '" marker-end="url(#' + (focal ? "editorial-arrow-accent" : "editorial-arrow") + ')"/>' + text((from.x + from.w + to.x) / 2, 205, edge.label, { mono: true, size: 8, fill: C.soft, anchor: "middle" }); } });
    data.states.forEach(function (state) { var node = nodes[state], focal = String(focus || "").toLowerCase() === state.toLowerCase(); body += '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" rx="8" fill="' + (focal ? C.accentTint : C.white) + '" stroke="' + (focal ? C.accent : C.ink) + '" stroke-width="1.2"/>' + text(node.x + node.w / 2, node.y + 31, state, { size: 12, weight: 600, anchor: "middle" }); }); return svg("0 0 1200 360", body); }
  function parseFlow(source) { var labels = {}, edges = [], group = null, groups = {}; source.split(/\n/).forEach(function (line) { var sub = line.match(/^\s*subgraph\s+(.+)/i), end = /^\s*end\s*$/i.test(line), edge = line.match(/^\s*([\w-]+)(?:\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?\s*(?:--\s*([^>-]+?)\s*)?--?>\s*([\w-]+)/); if (sub) { group = sub[1].trim(); groups[group] = groups[group] || []; } else if (end) group = null; var nodes = line.matchAll(/\b([\w-]+)(?:\[([^\]]+)\]|\{([^}]+)\}|\(\[([^\]]+)\]\))/g); for (var match of nodes) { labels[match[1]] = (match[2] || match[3] || match[4] || labels[match[1]] || match[1]).trim(); if (group && !groups[group].includes(match[1])) groups[group].push(match[1]); } if (edge) edges.push({ from: edge[1], to: edge[3], label: (edge[2] || "").trim() }); }); return { labels: labels, edges: edges, groups: groups }; }
  function renderDependency(source) {
    var data = parseFlow(source); if (!data.edges.length) return null;
    var columns = Object.keys(data.groups), positions = {}, body = "", columnX = [88, 480, 872], zoneX = [40, 432, 824];
    var yByColumn = [[160, 320], [112, 256, 400], [184, 328]];
    columns.forEach(function (name, columnIndex) {
      var ids = data.groups[name] || [];
      body += '<rect x="' + zoneX[columnIndex] + '" y="64" width="336" height="440" rx="8" fill="rgba(45,49,66,.02)" stroke="' + C.rule + '" stroke-dasharray="4 4"/>';
      body += text(zoneX[columnIndex] + 16, 88, name, { mono: true, size: 8, fill: C.muted, letter: ".14em" });
      ids.forEach(function (id, index) { positions[id] = { x: columnX[columnIndex], y: yByColumn[columnIndex][index] || 160 + index * 120, w: 240, h: 56 }; });
    });
    Object.keys(data.labels).forEach(function (id) { if (!positions[id]) positions[id] = { x: 480, y: 160, w: 240, h: 56 }; });

    var outgoing = {}, incoming = {};
    data.edges.forEach(function (edge) { (outgoing[edge.from] ||= []).push(edge); (incoming[edge.to] ||= []).push(edge); });
    data.edges.forEach(function (edge) {
      var a = positions[edge.from], b = positions[edge.to]; if (!a || !b) return;
      var backwards = b.x === a.x && b.y < a.y;
      if (backwards) {
        var startY = a.y + a.h / 2, endY = b.y + b.h / 2, outside = a.x + a.w + 48;
        body += '<path d="M' + (a.x + a.w) + ' ' + startY + ' H' + (outside - 8) + ' Q' + outside + ' ' + startY + ' ' + outside + ' ' + (startY - 8) + ' V' + (endY + 8) + ' Q' + outside + ' ' + endY + ' ' + (outside - 8) + ' ' + endY + ' H' + (b.x + b.w) + '" fill="none" stroke="' + C.accent + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#editorial-arrow-accent)"/>';
        body += maskedLabel(outside, (startY + endY) / 2, (edge.label || "CYCLE").toUpperCase() + " · CYCLE", { accent: true });
        return;
      }
      if (b.x === a.x) {
        var outIndex = (outgoing[edge.from] || []).indexOf(edge), outCount = (outgoing[edge.from] || []).length;
        var inIndex = (incoming[edge.to] || []).indexOf(edge), inCount = (incoming[edge.to] || []).length;
        var sx = a.x + a.w * (outIndex + 1) / (outCount + 1), ex = b.x + b.w * (inIndex + 1) / (inCount + 1);
        body += connector(sx, a.y + a.h, ex, b.y, "vertical");
        if (edge.label) body += maskedLabel((sx + ex) / 2 + 24, (a.y + a.h + b.y) / 2, edge.label.toUpperCase());
        return;
      }
      var outList = outgoing[edge.from] || [], inList = incoming[edge.to] || [], oi = outList.indexOf(edge), ii = inList.indexOf(edge);
      var sy = a.y + a.h * (oi + 1) / (outList.length + 1), ey = b.y + b.h * (ii + 1) / (inList.length + 1);
      body += connector(a.x + a.w, sy, b.x, ey, "horizontal");
      if (edge.label) body += maskedLabel((a.x + a.w + b.x) / 2, Math.min(sy, ey) - 16, edge.label.toUpperCase());
    });

    Object.keys(positions).forEach(function (id) {
      var p = positions[id], fanIn = (incoming[id] || []).length, leaf = !(outgoing[id] || []).length;
      body += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="6" fill="' + (leaf ? "rgba(45,49,66,.05)" : C.white) + '" stroke="' + (leaf ? C.muted : C.ink) + '"/>';
      body += text(p.x + 16, p.y + 34, data.labels[id] || id, { size: 12, weight: 600 });
      body += '<rect x="' + (p.x + p.w - 52) + '" y="' + (p.y + 8) + '" width="40" height="16" rx="2" fill="' + C.paper + '" stroke="' + C.rule + '"/>';
      body += text(p.x + p.w - 32, p.y + 20, fanIn + " in", { mono: true, size: 8, fill: C.muted, anchor: "middle" });
    });
    return svg("0 0 1200 544", body);
  }
  function parseER(source) { var fields = {}, relationships = []; source.split(/\n/).forEach(function (line) { var rel = line.match(/^\s*([A-Z][\w]*)\s+([|o}{]+)--([|o}{]+)\s+([A-Z][\w]*)\s*:\s*(.+)/), entity = line.match(/^\s*([A-Z][\w]*)\s*\{\s*$/), field = line.match(/^\s*(\w+)\s+([\w_]+)(?:\s+(PK(?:,FK)?|FK))?\s*$/); if (rel) relationships.push({ from: rel[1], left: rel[2], right: rel[3], to: rel[4], label: rel[5] }); else if (entity) fields[entity[1]] = []; else if (field) { var last = Object.keys(fields).slice(-1)[0]; if (last) fields[last].push({ type: field[1], name: field[2], key: field[3] || "" }); } }); return { fields: fields, relationships: relationships }; }
  function card(token) { if (/^(?:1|N|0\.\.1|0\.\.N)$/i.test(token)) return String(token).toUpperCase(); if (token.indexOf("o") >= 0 && token.indexOf("{") >= 0) return "0..N"; if (token.indexOf("{") >= 0) return "N"; if (token.indexOf("o") >= 0) return "0..1"; return "1"; }
  function renderER(source, focus, analysis) { var data = parseER(source); if (analysis && Array.isArray(analysis.relationships) && analysis.relationships.length) data.relationships = analysis.relationships; if (!Object.keys(data.fields).length) return null; var ids = Object.keys(data.fields), positions = {}, preset = { DOCUMENT: [480, 72], SECTION: [96, 302], VISUAL: [480, 302], SOURCE_REF: [864, 302], DECLARATIVE_SOURCE: [480, 532] }; ids.forEach(function (id, i) { positions[id] = { x: preset[id]?.[0] ?? (96 + (i % 3) * 384), y: preset[id]?.[1] ?? (302 + Math.floor(i / 3) * 230), w: 240, h: 58 + data.fields[id].length * 28 }; }); var body = "";
    data.relationships.forEach(function (rel) { var a = positions[rel.from], b = positions[rel.to]; if (!a || !b) return; var vertical = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < 32, sx = vertical ? a.x + a.w / 2 : (b.x > a.x ? a.x + a.w : a.x), sy = vertical ? (b.y > a.y ? a.y + a.h : a.y) : a.y + a.h / 2, ex = vertical ? b.x + b.w / 2 : (b.x > a.x ? b.x : b.x + b.w), ey = vertical ? (b.y > a.y ? b.y : b.y + b.h) : b.y + b.h / 2; body += elbow(sx, sy, ex, ey, vertical ? "vertical" : "horizontal", false); body += text(vertical ? sx - 18 : sx + (b.x > a.x ? 18 : -18), vertical ? sy + (b.y > a.y ? 20 : -14) : sy - 14, card(rel.left), { mono: true, size: 8, fill: C.muted, anchor: vertical ? "end" : (b.x > a.x ? "start" : "end") }) + text(vertical ? ex + 18 : ex + (b.x > a.x ? -18 : 18), vertical ? ey + (b.y > a.y ? -14 : 20) : ey - 14, card(rel.right), { mono: true, size: 8, fill: C.muted, anchor: vertical ? "start" : (b.x > a.x ? "end" : "start") }) + text((sx + ex) / 2, (sy + ey) / 2 - 10, rel.label, { mono: true, size: 8, fill: C.soft, anchor: "middle" }); });
    ids.forEach(function (id) { var p = positions[id], focal = String(focus || "").toLowerCase().includes(id.toLowerCase()); body += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="6" fill="' + C.white + '" stroke="' + (focal ? C.accent : C.ink) + '" stroke-width="' + (focal ? "1.4" : "1") + '"/><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="30" rx="6" fill="' + (focal ? C.accentTint : "rgba(45,49,66,.035)") + '"/>' + text(p.x + 12, p.y + 12, "ENTITY", { mono: true, size: 7, fill: C.muted, letter: ".12em" }) + text(p.x + 12, p.y + 24, id, { size: 12, weight: 600 }); data.fields[id].forEach(function (field, index) { var y = p.y + 48 + index * 28; body += '<line x1="' + p.x + '" y1="' + (y - 9) + '" x2="' + (p.x + p.w) + '" y2="' + (y - 9) + '" stroke="' + C.rule + '"/>' + text(p.x + 12, y, field.name, { mono: true, size: 9, fill: C.ink }) + text(p.x + p.w - 12, y, field.type, { mono: true, size: 8, fill: C.muted, anchor: "end" }) + (field.key ? '<rect x="' + (p.x + 122) + '" y="' + (y - 10) + '" width="28" height="13" rx="2" fill="' + C.paper + '" stroke="' + C.rule + '"/>' + text(p.x + 136, y, field.key, { mono: true, size: 7, fill: C.muted, anchor: "middle" }) : ""); }); }); return svg("0 0 1200 760", body); }
  window.AureliusEditorial = { render: function (source, kind, focus, analysis) { if (kind === "line" || kind === "bar" || kind === "waterfall") return renderLine(source); if (kind === "journey") return renderJourney(source, focus); if (kind === "state") return renderState(source, focus); if (kind === "dependency") return renderDependency(source, focus); if (kind === "er" || kind === "db-schema") return renderER(source, focus, analysis); return null; } };
})();
