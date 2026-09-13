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
  function stateTransitionLayout(layout, edge) {
    var transitions = Array.isArray(layout?.transitions) ? layout.transitions : [];
    return transitions.find(function (item) { return item && item.from === edge.from && item.to === edge.to && (item.label === undefined || item.label === edge.label); }) || null;
  }
  function statePort(node, side) {
    if (side === "left") return { x: node.x, y: node.y + node.h / 2 };
    if (side === "right") return { x: node.x + node.w, y: node.y + node.h / 2 };
    if (side === "top") return { x: node.x + node.w / 2, y: node.y };
    return { x: node.x + node.w / 2, y: node.y + node.h };
  }
  function renderState(source, focus, layout) {
    var data = parseState(source); if (!data) return null;
    layout = layout || {};
    var count = data.states.length, columns = count > 6 ? 4 : count, rows = Math.ceil(count / columns), width = 144, height = 64, x0 = 96, xGap = columns > 1 ? (1104 - columns * width) / (columns - 1) : 0, y0 = rows > 1 ? 136 : 164, yGap = 156, nodes = {}, viewHeight = rows > 1 ? 440 : 320, configuredStates = layout.states || {};
    data.states.forEach(function (state, index) { var column = index % columns, row = Math.floor(index / columns), configured = configuredStates[state] || {}; nodes[state] = { x: Number.isFinite(configured.x) ? configured.x : x0 + column * (width + xGap), y: Number.isFinite(configured.y) ? configured.y : y0 + row * yGap, w: Number.isFinite(configured.width) ? configured.width : width, h: Number.isFinite(configured.height) ? configured.height : height, row: row }; });
    var body = '<text x="72" y="48" fill="' + C.ink + '" font-family="Geist,Inter,sans-serif" font-size="16" font-weight="600">Editorial document lifecycle</text>', incoming = {}, outgoing = {};
    data.edges.forEach(function (edge) { if (edge.from !== "[*]") (outgoing[edge.from] ||= []).push(edge); if (edge.to !== "[*]") (incoming[edge.to] ||= []).push(edge); });
    data.edges.forEach(function (edge) {
      var focal = String(focus || "").toLowerCase() === edge.to.toLowerCase(), from = nodes[edge.from], to = nodes[edge.to], style = { accent: focal };
      if (edge.from === "[*]" && to) {
        body += '<circle cx="' + (to.x - 28) + '" cy="' + (to.y + height / 2) + '" r="6" fill="' + C.ink + '"/>' + routeConnector([{ x: to.x - 22, y: to.y + height / 2 }, { x: to.x, y: to.y + height / 2 }], style);
        return;
      }
      if (edge.to === "[*]" && from) {
        body += '<circle cx="' + (from.x + from.w + 28) + '" cy="' + (from.y + height / 2) + '" r="9" fill="none" stroke="' + C.ink + '"/><circle cx="' + (from.x + from.w + 28) + '" cy="' + (from.y + height / 2) + '" r="5" fill="' + C.ink + '"/>' + routeConnector([{ x: from.x + from.w, y: from.y + height / 2 }, { x: from.x + from.w + 19, y: from.y + height / 2 }], style);
        return;
      }
      if (!from || !to) return;
      var configured = stateTransitionLayout(layout, edge), route, label;
      if (configured) {
        var sourceSide = configured.fromSide || (from.x <= to.x ? "right" : "left"), targetSide = configured.toSide || (from.x <= to.x ? "left" : "right"), start = statePort(from, sourceSide), end = statePort(to, targetSide);
        route = orthogonalRoute([start].concat(configured.waypoints || []).concat([end]), sourceSide);
        label = configured.labelPlacement || { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 16 };
      } else if (from.row === to.row && from.x < to.x) {
        route = [{ x: from.x + from.w, y: from.y + height / 2 }, { x: to.x, y: to.y + height / 2 }];
        label = { x: (from.x + from.w + to.x) / 2, y: from.y + 12 };
      } else if (from.row < to.row) {
        route = [{ x: from.x + from.w / 2, y: from.y + height }, { x: from.x + from.w / 2, y: to.y - 28 }, { x: to.x + to.w / 2, y: to.y - 28 }, { x: to.x + to.w / 2, y: to.y }];
        label = { x: (from.x + from.w / 2 + to.x + to.w / 2) / 2 + 36, y: (from.y + height + to.y) / 2 };
      } else {
        var lane = Math.max(from.x + from.w, to.x + to.w) + 44;
        route = [{ x: from.x + from.w, y: from.y + height / 2 }, { x: lane, y: from.y + height / 2 }, { x: lane, y: to.y + height / 2 }, { x: to.x + to.w, y: to.y + height / 2 }];
        label = { x: lane + 32, y: (from.y + to.y + height) / 2 };
      }
      body += routeConnector(route, style);
      if (edge.label) body += maskedLabel(label.x, label.y, edge.label);
    });
    data.states.forEach(function (state) {
      var node = nodes[state], focal = String(focus || "").toLowerCase() === state.toLowerCase(), terminal = !(outgoing[state] || []).length;
      body += '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" rx="8" fill="' + (focal ? C.accentTint : (terminal ? "rgba(45,49,66,.04)" : C.white)) + '" stroke="' + (focal ? C.accent : (terminal ? C.muted : C.ink)) + '" stroke-width="1.2"/>' + text(node.x + node.w / 2, node.y + 30, state, { size: 11, weight: 600, anchor: "middle", wrap: 18 });
      if (terminal) body += '<circle cx="' + (node.x + node.w + 24) + '" cy="' + (node.y + node.h / 2) + '" r="8" fill="none" stroke="' + C.muted + '"/><circle cx="' + (node.x + node.w + 24) + '" cy="' + (node.y + node.h / 2) + '" r="4" fill="' + C.muted + '"/>';
    });
    return svg("0 0 " + (Number.isFinite(layout.canvas?.width) ? layout.canvas.width : 1200) + " " + (Number.isFinite(layout.canvas?.height) ? layout.canvas.height : viewHeight), body);
  }
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
  function cleanRoute(points) {
    var clean = [];
    points.forEach(function (point) {
      var previous = clean[clean.length - 1];
      if (!previous || previous.x !== point.x || previous.y !== point.y) clean.push({ x: point.x, y: point.y });
    });
    for (var i = clean.length - 2; i > 0; i -= 1) {
      var before = clean[i - 1], current = clean[i], after = clean[i + 1];
      if ((before.x === current.x && current.x === after.x) || (before.y === current.y && current.y === after.y)) clean.splice(i, 1);
    }
    return clean;
  }
  function routeSegments(points) {
    var segments = [];
    for (var i = 1; i < points.length; i += 1) {
      var a = points[i - 1], b = points[i];
      if (a.x !== b.x || a.y !== b.y) segments.push({ a: a, b: b, horizontal: a.y === b.y, length: Math.abs(b.x - a.x) + Math.abs(b.y - a.y) });
    }
    return segments;
  }
  function routeLength(points) { return routeSegments(points).reduce(function (sum, segment) { return sum + segment.length; }, 0); }
  function routeSvg(points) {
    if (!points.length) return "";
    var d = "M" + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length; i += 1) {
      if (i === points.length - 1) { d += " L" + points[i].x + " " + points[i].y; continue; }
      var previous = points[i - 1], current = points[i], next = points[i + 1];
      var inX = current.x - previous.x, inY = current.y - previous.y, outX = next.x - current.x, outY = next.y - current.y;
      var radius = Math.min(8, Math.abs(inX || inY) / 4, Math.abs(outX || outY) / 4);
      if (!radius) { d += " L" + current.x + " " + current.y; continue; }
      var before = { x: current.x - Math.sign(inX) * radius, y: current.y - Math.sign(inY) * radius };
      var after = { x: current.x + Math.sign(outX) * radius, y: current.y + Math.sign(outY) * radius };
      d += " L" + before.x + " " + before.y + " Q" + current.x + " " + current.y + " " + after.x + " " + after.y;
    }
    return d;
  }
  function routeConnector(points, options) {
    options = options || {};
    var color = options.accent ? C.accent : C.muted, marker = options.marker === false ? "" : ' marker-end="url(#' + (options.accent ? "editorial-arrow-accent" : "editorial-arrow") + ')"', dash = options.dashed ? ' stroke-dasharray="5 4"' : "";
    return '<path d="' + routeSvg(points) + '" fill="none" stroke="' + color + '" stroke-width="' + (options.accent ? "2" : "1.4") + '" stroke-linejoin="round" stroke-linecap="round"' + dash + marker + '/>';
  }
  function rectOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function segmentHitsBox(segment, box, margin) {
    var left = box.x - margin, right = box.x + box.w + margin, top = box.y - margin, bottom = box.y + box.h + margin;
    if (segment.horizontal) return segment.a.y >= top && segment.a.y <= bottom && Math.max(Math.min(segment.a.x, segment.b.x), left) <= Math.min(Math.max(segment.a.x, segment.b.x), right);
    return segment.a.x >= left && segment.a.x <= right && Math.max(Math.min(segment.a.y, segment.b.y), top) <= Math.min(Math.max(segment.a.y, segment.b.y), bottom);
  }
  function routeHitsBoxes(points, boxes, endpoints) {
    return routeSegments(points).some(function (segment) { return boxes.some(function (box) { return endpoints[box.id] ? false : segmentHitsBox(segment, box, 12); }); });
  }
  function crossingBetween(first, second) {
    var crossings = [];
    routeSegments(first).forEach(function (a) { routeSegments(second).forEach(function (b) {
      if (a.horizontal === b.horizontal) return;
      var horizontal = a.horizontal ? a : b, vertical = a.horizontal ? b : a;
      var x = vertical.a.x, y = horizontal.a.y;
      var withinX = x > Math.min(horizontal.a.x, horizontal.b.x) && x < Math.max(horizontal.a.x, horizontal.b.x);
      var withinY = y > Math.min(vertical.a.y, vertical.b.y) && y < Math.max(vertical.a.y, vertical.b.y);
      if (withinX && withinY) crossings.push({ x: x, y: y, horizontal: a.horizontal });
    }); });
    return crossings;
  }
  function routesOverlap(first, second) {
    return routeSegments(first).some(function (a) { return routeSegments(second).some(function (b) {
      if (a.horizontal !== b.horizontal) return false;
      if (a.horizontal && a.a.y === b.a.y) return Math.min(Math.max(a.a.x, a.b.x), Math.max(b.a.x, b.b.x)) - Math.max(Math.min(a.a.x, a.b.x), Math.min(b.a.x, b.b.x)) > 8;
      if (!a.horizontal && a.a.x === b.a.x) return Math.min(Math.max(a.a.y, a.b.y), Math.max(b.a.y, b.b.y)) - Math.max(Math.min(a.a.y, a.b.y), Math.min(b.a.y, b.b.y)) > 8;
      return false;
    }); });
  }
  function bridge(x, y, horizontal, color) {
    var d = horizontal ? "M" + (x - 8) + " " + y + " L" + (x - 4) + " " + y + " Q" + x + " " + (y - 8) + " " + (x + 4) + " " + y + " L" + (x + 8) + " " + y : "M" + x + " " + (y - 8) + " L" + x + " " + (y - 4) + " Q" + (x + 8) + " " + y + " " + x + " " + (y + 4) + " L" + x + " " + (y + 8);
    return '<path d="' + d + '" fill="none" stroke="' + C.paper + '" stroke-width="5" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.4" stroke-linecap="round"/>';
  }
  function configuredPoint(value) { return value && Number.isFinite(value.x) && Number.isFinite(value.y); }
  function relationshipLayout(layout, relationship) {
    var relationships = Array.isArray(layout?.relationships) ? layout.relationships : [];
    return relationships.find(function (item) { return item && item.from === relationship.from && item.to === relationship.to && (item.label === undefined || item.label === relationship.label); }) || null;
  }
  function singular(value) {
    return String(value || "").toLowerCase().replace(/ies$/, "y").replace(/s$/, "");
  }
  function inferredPort(entity, fields, relationship, endpoint) {
    var candidates = Array.isArray(fields) ? fields : [];
    if (endpoint === "from") {
      return candidates.some(function (field) { return field.name === "id"; }) ? { field: "id" } : {};
    }
    var label = String(relationship.label || "").toLowerCase();
    var source = singular(relationship.from), exact = candidates.find(function (field) { return String(field.name).toLowerCase() === label; });
    if (exact) return { field: exact.name };
    var matchingForeignKey = candidates.find(function (field) {
      var name = String(field.name).toLowerCase();
      return name === source + "_id" || name.endsWith("_" + source + "_id");
    });
    return matchingForeignKey ? { field: matchingForeignKey.name } : {};
  }
  function orthogonalRoute(points, sourceSide) {
    var output = [];
    points.forEach(function (point, index) {
      var current = { x: point.x, y: point.y }, previous = output[output.length - 1];
      if (!previous) { output.push(current); return; }
      if (previous.x !== current.x && previous.y !== current.y) {
        var horizontalFirst = index === 1 ? sourceSide === "left" || sourceSide === "right" : true;
        output.push(horizontalFirst ? { x: current.x, y: previous.y } : { x: previous.x, y: current.y });
      }
      output.push(current);
    });
    return cleanRoute(output);
  }
  function port(node, side, index, count, fields, configuration) {
    configuration = configuration || {};
    side = configuration.side || side;
    var offset = Number.isFinite(configuration.offset) ? configuration.offset : (index + 1) / (count + 1);
    var fieldIndex = configuration.field && Array.isArray(fields) ? fields.findIndex(function (field) { return field.name === configuration.field; }) : -1;
    if (fieldIndex >= 0 && (side === "left" || side === "right")) {
      var fieldOffset = Number.isFinite(configuration.fieldOffset) ? configuration.fieldOffset : (count > 1 ? (index - (count - 1) / 2) * 12 : 0);
      return { x: side === "left" ? node.x : node.x + node.w, y: node.y + 48 + fieldIndex * 28 + fieldOffset };
    }
    if (side === "left") return { x: node.x, y: node.y + node.h * offset };
    if (side === "right") return { x: node.x + node.w, y: node.y + node.h * offset };
    if (side === "top") return { x: node.x + node.w * offset, y: node.y };
    return { x: node.x + node.w * offset, y: node.y + node.h };
  }
  function preferredSides(a, b) {
    var dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2);
    if (Math.abs(dx) >= Math.abs(dy)) return { source: dx >= 0 ? "right" : "left", target: dx >= 0 ? "left" : "right" };
    return { source: dy >= 0 ? "bottom" : "top", target: dy >= 0 ? "top" : "bottom" };
  }
  function routeCandidates(start, end, sourceSide, boxes) {
    var minX = Math.min.apply(null, boxes.map(function (box) { return box.x; })), maxX = Math.max.apply(null, boxes.map(function (box) { return box.x + box.w; })), minY = Math.min.apply(null, boxes.map(function (box) { return box.y; })), maxY = Math.max.apply(null, boxes.map(function (box) { return box.y + box.h; }));
    var lanesX = [minX - 32, maxX + 32], lanesY = [minY - 32, maxY + 32];
    boxes.forEach(function (box) { lanesX.push(box.x - 32, box.x + box.w + 32); lanesY.push(box.y - 32, box.y + box.h + 32); });
    var candidates = [], seen = {};
    function add(points) { var route = cleanRoute(points), key = route.map(function (point) { return point.x + "," + point.y; }).join(";"); if (route.length > 1 && !seen[key]) { seen[key] = true; candidates.push(route); } }
    add([start, { x: end.x, y: start.y }, end]);
    add([start, { x: start.x, y: end.y }, end]);
    lanesY.forEach(function (laneY) {
      var escapeX = sourceSide === "left" ? start.x - 24 : sourceSide === "right" ? start.x + 24 : start.x;
      add([start, { x: escapeX, y: start.y }, { x: escapeX, y: laneY }, { x: end.x, y: laneY }, end]);
    });
    lanesX.forEach(function (laneX) {
      var escapeY = sourceSide === "top" ? start.y - 24 : sourceSide === "bottom" ? start.y + 24 : start.y;
      add([start, { x: start.x, y: escapeY }, { x: laneX, y: escapeY }, { x: laneX, y: end.y }, end]);
    });
    return candidates;
  }
  function chooseRoute(start, end, sourceSide, boxes, endpoints, previousRoutes) {
    var candidates = routeCandidates(start, end, sourceSide, boxes), best = null, bestScore = Infinity;
    candidates.forEach(function (candidate) {
      if (routeHitsBoxes(candidate, boxes, endpoints)) return;
      var score = routeLength(candidate) + (candidate.length - 2) * 24;
      previousRoutes.forEach(function (previous) { if (routesOverlap(candidate, previous.points)) score += 100000; else score += crossingBetween(candidate, previous.points).length * 180; });
      if (score < bestScore) { bestScore = score; best = candidate; }
    });
    return best || candidates[0] || [start, end];
  }
  function labelBox(x, y, value) { var width = Math.max(32, Math.ceil(String(value || "").length * 5.2) + 16); return { x: x - width / 2, y: y - 10, w: width, h: 16 }; }
  function placeLabel(route, value, boxes, preferSide, placement) {
    if (!value) return "";
    if (configuredPoint(placement)) return maskedLabel(placement.x, placement.y, value);
    var segments = routeSegments(route).filter(function (segment) { return segment.length >= 28; }).sort(function (a, b) { return b.length - a.length; });
    var candidates = [];
    segments.forEach(function (segment) {
      var midX = (segment.a.x + segment.b.x) / 2, midY = (segment.a.y + segment.b.y) / 2;
      if (segment.horizontal) candidates.push({ x: midX, y: segment.a.y - 16 }, { x: midX, y: segment.a.y + 16 });
      else candidates.push({ x: segment.a.x + (preferSide === "left" ? -24 : 24), y: midY }, { x: segment.a.x + (preferSide === "left" ? 24 : -24), y: midY });
    });
    var choice = candidates.find(function (candidate) { return !boxes.some(function (box) { return rectOverlap(labelBox(candidate.x, candidate.y, value), box); }); }) || candidates[0];
    return choice ? maskedLabel(choice.x, choice.y, value) : "";
  }
  function placeCardinality(point, side, value, boxes, placement) {
    if (configuredPoint(placement)) return maskedLabel(placement.x, placement.y, value);
    var candidates = side === "left" ? [{ x: point.x - 24, y: point.y - 16 }, { x: point.x - 24, y: point.y + 16 }] : side === "right" ? [{ x: point.x + 24, y: point.y - 16 }, { x: point.x + 24, y: point.y + 16 }] : side === "top" ? [{ x: point.x, y: point.y - 24 }, { x: point.x + 24, y: point.y - 24 }] : [{ x: point.x, y: point.y + 24 }, { x: point.x + 24, y: point.y + 24 }];
    var choice = candidates.find(function (candidate) { return !boxes.some(function (box) { return rectOverlap(labelBox(candidate.x, candidate.y, value), box); }); }) || candidates[0];
    return maskedLabel(choice.x, choice.y, value);
  }
  function renderER(source, focus, analysis, layout, kind) {
    var data = parseER(source);
    if (analysis && Array.isArray(analysis.relationships) && analysis.relationships.length) data.relationships = analysis.relationships;
    if (!Object.keys(data.fields).length) return null;
    layout = layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {};
    var ids = Object.keys(data.fields), positions = {}, preset = { DOCUMENT: [480, 72], SECTION: [96, 302], VISUAL: [480, 302], SOURCE_REF: [864, 302], DECLARATIVE_SOURCE: [480, 532] }, dimensions = {};
    ids.forEach(function (id) {
      var fields = data.fields[id], longestField = Math.max.apply(null, fields.map(function (field) { return String(field.name || "").length; })), longestType = Math.max.apply(null, fields.map(function (field) { return String(field.type || "").length; }));
      dimensions[id] = { w: Math.max(240, Math.min(520, 68 + longestField * 5.4 + longestType * 5)), h: 58 + fields.length * 28 };
    });
    var columnWidths = [0, 0, 0], rowHeights = [];
    ids.forEach(function (id, index) { columnWidths[index % 3] = Math.max(columnWidths[index % 3], dimensions[id].w); rowHeights[Math.floor(index / 3)] = Math.max(rowHeights[Math.floor(index / 3)] || 0, dimensions[id].h); });
    var columnX = [96, 96 + columnWidths[0] + 112, 96 + columnWidths[0] + columnWidths[1] + 224], rowY = [], cursorY = 72;
    rowHeights.forEach(function (height, index) { rowY[index] = cursorY; cursorY += height + 112; });
    ids.forEach(function (id, i) {
      var configured = layout.entities && layout.entities[id] || {}, presetPosition = preset[id], column = i % 3, row = Math.floor(i / 3);
      positions[id] = {
        x: Number.isFinite(configured.x) ? configured.x : (presetPosition?.[0] ?? columnX[column]),
        y: Number.isFinite(configured.y) ? configured.y : (presetPosition?.[1] ?? rowY[row]),
        w: Number.isFinite(configured.width) ? configured.width : dimensions[id].w,
        h: dimensions[id].h,
      };
    });
    var boxes = ids.map(function (id) { return { id: id, x: positions[id].x, y: positions[id].y, w: positions[id].w, h: positions[id].h }; }), portGroups = {};
    data.relationships.forEach(function (rel, index) {
      var a = positions[rel.from], b = positions[rel.to]; if (!a || !b) return;
      var sides = preferredSides(a, b), configured = relationshipLayout(layout, rel);
      rel.__routeIndex = index; rel.__layout = configured; rel.__sourceSide = configured?.fromPort?.side || sides.source; rel.__targetSide = configured?.toPort?.side || sides.target;
      (portGroups[rel.from + "|" + rel.__sourceSide] ||= []).push(rel); (portGroups[rel.to + "|" + rel.__targetSide] ||= []).push(rel);
    });
    Object.keys(portGroups).forEach(function (key) { portGroups[key].forEach(function (rel, index) { rel[rel.from + "|" + rel.__sourceSide === key ? "__sourcePortIndex" : "__targetPortIndex"] = index; rel[rel.from + "|" + rel.__sourceSide === key ? "__sourcePortCount" : "__targetPortCount"] = portGroups[key].length; }); });
    var routes = [];
    data.relationships.forEach(function (rel) {
      var a = positions[rel.from], b = positions[rel.to]; if (!a || !b) return;
      var configured = rel.__layout || {}, sourcePort = Object.assign({}, inferredPort(rel.from, data.fields[rel.from], rel, "from"), configured.fromPort || {}), targetPort = Object.assign({}, inferredPort(rel.to, data.fields[rel.to], rel, "to"), configured.toPort || {}), start = port(a, rel.__sourceSide, rel.__sourcePortIndex || 0, rel.__sourcePortCount || 1, data.fields[rel.from], sourcePort), end = port(b, rel.__targetSide, rel.__targetPortIndex || 0, rel.__targetPortCount || 1, data.fields[rel.to], targetPort), endpoints = {}; endpoints[rel.from] = true; endpoints[rel.to] = true;
      var manualRoute = Array.isArray(configured.waypoints) && configured.waypoints.length ? orthogonalRoute([start].concat(configured.waypoints).concat([end]), rel.__sourceSide) : null;
      routes.push({ rel: rel, layout: configured, points: manualRoute || chooseRoute(start, end, rel.__sourceSide, boxes, endpoints, routes), start: start, end: end });
    });
    var body = "";
    var isDatabaseSchema = kind === "db-schema";
    routes.forEach(function (route) { body += routeConnector(route.points, { marker: true, dashed: routes.some(function (other) { return other !== route && routesOverlap(route.points, other.points); }) }); });
    routes.forEach(function (route) { (route.layout.bridges || []).forEach(function (item) { body += bridge(item.x, item.y, item.orientation === "horizontal", C.muted); }); });
    routes.forEach(function (route, routeIndex) { if ((route.layout.bridges || []).length) return; routes.slice(0, routeIndex).forEach(function (previous) { crossingBetween(route.points, previous.points).forEach(function (crossing) { body += bridge(crossing.x, crossing.y, crossing.horizontal, C.muted); }); }); });
    routes.forEach(function (route) {
      var rel = route.rel, configured = route.layout;
      if (!isDatabaseSchema || configured.showCardinality === true) body += placeCardinality(route.start, rel.__sourceSide, card(rel.left), boxes, configured.cardinalityPlacement?.from) + placeCardinality(route.end, rel.__targetSide, card(rel.right), boxes, configured.cardinalityPlacement?.to);
      if (!isDatabaseSchema || configured.showLabel === true) body += placeLabel(route.points, rel.label, boxes, rel.__sourceSide, configured.labelPlacement);
    });
    ids.forEach(function (id) { var p = positions[id], focal = String(focus || "").toLowerCase().includes(id.toLowerCase()), tag = isDatabaseSchema ? "TABLE" : "ENTITY"; body += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="6" fill="' + C.white + '" stroke="' + (focal ? C.accent : C.ink) + '" stroke-width="' + (focal ? "1.4" : "1") + '"/><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="30" rx="6" fill="' + (focal ? C.accentTint : "rgba(45,49,66,.035)") + '"/>' + text(p.x + 12, p.y + 12, tag, { mono: true, size: 7, fill: C.muted, letter: ".12em" }) + text(p.x + 12, p.y + 24, id, { size: 12, weight: 600 }); data.fields[id].forEach(function (field, index) { var y = p.y + 48 + index * 28, typeWidth = Math.max(24, String(field.type || "").length * 5), chipX = p.x + p.w - typeWidth - 52; body += '<line x1="' + p.x + '" y1="' + (y - 9) + '" x2="' + (p.x + p.w) + '" y2="' + (y - 9) + '" stroke="' + C.rule + '"/>' + text(p.x + 12, y, field.name, { size: 9, weight: 500, fill: C.ink }) + text(p.x + p.w - 12, y, field.type, { mono: true, size: 8, fill: C.muted, anchor: "end" }) + (field.key ? '<rect x="' + chipX + '" y="' + (y - 10) + '" width="28" height="13" rx="2" fill="' + C.paper + '" stroke="' + C.rule + '"/>' + text(chipX + 14, y, field.key, { mono: true, size: 7, fill: C.muted, anchor: "middle" }) : ""); }); });
    var maxRight = Math.max.apply(null, boxes.map(function (box) { return box.x + box.w; })), maxBottom = Math.max.apply(null, boxes.map(function (box) { return box.y + box.h; })), canvasWidth = Number.isFinite(layout.canvas?.width) ? layout.canvas.width : Math.max(1200, maxRight + 80), canvasHeight = Number.isFinite(layout.canvas?.height) ? layout.canvas.height : Math.max(760, maxBottom + 80);
    return svg("0 0 " + canvasWidth + " " + canvasHeight, body);
  }
  window.AureliusEditorial = { render: function (source, kind, focus, analysis, layout) { if (kind === "line" || kind === "bar" || kind === "waterfall") return renderLine(source); if (kind === "journey") return renderJourney(source, focus); if (kind === "state") return renderState(source, focus, layout); if (kind === "dependency") return renderDependency(source, focus); if (kind === "er" || kind === "db-schema") return renderER(source, focus, analysis, layout, kind); return null; } };
})();
