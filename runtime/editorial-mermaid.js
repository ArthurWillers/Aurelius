(function () {
  var C = { paper: "#f5f5f5", white: "#ffffff", ink: "#2d3142", muted: "#4f5d75", soft: "#7a8399", rule: "rgba(45,49,66,.12)", accent: "#eb6c36", accentTint: "rgba(235,108,54,.08)" };
  var G = globalThis.AureliusDiagramGeometry, measured = [];
  var ns = "http://www.w3.org/2000/svg";
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>\"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function words(value, width) { return G.wrapText(value, width * 7.5, 12, false); }
  function include(x, y, width, height) { measured.push({ x: x, y: y, width: width, height: height }); }
  function text(x, y, value, options) {
    options = options || {}; var lines = words(value, options.wrap || 80); var attrs = 'x="' + x + '" y="' + y + '" fill="' + (options.fill || C.ink) + '" font-family="' + (options.mono ? "Geist Mono,ui-monospace,monospace" : "Geist,Inter,system-ui,sans-serif") + '" font-size="' + (options.size || 12) + '"' + (options.weight ? ' font-weight="' + options.weight + '"' : "") + (options.anchor ? ' text-anchor="' + options.anchor + '"' : "") + (options.letter ? ' letter-spacing="' + options.letter + '"' : "");
    var size = options.size || 12, lineHeight = size * 1.3;
    var width = Math.max.apply(null, lines.map(function (line) { return G.textWidth(line, size, options.mono); }));
    include(options.anchor === "middle" ? x - width / 2 : options.anchor === "end" ? x - width : x, y - size, width, lines.length * lineHeight);
    return "<text " + attrs + ">" + lines.map(function (line, index) { return '<tspan x="' + x + '" dy="' + (index ? lineHeight : 0) + '">' + esc(line) + '</tspan>'; }).join("") + "</text>";
  }
  function svg(viewBox, content, explicitCanvas) {
    var bounds = G.pad(G.union(measured), G.padding);
    if (explicitCanvas) { var values = viewBox.split(" ").map(Number); bounds = G.union([bounds, { x: values[0], y: values[1], width: values[2], height: values[3] }]); }
    return '<svg xmlns="' + ns + '" viewBox="' + G.viewBox(bounds).join(" ") + '" width="' + bounds.width + '" height="' + bounds.height + '" class="aurelius-editorial-svg"' + (explicitCanvas ? ' data-diagram-preserve-bounds' : '') + '><defs><marker id="editorial-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="' + C.muted + '"/></marker><marker id="editorial-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="' + C.accent + '"/></marker></defs><rect data-diagram-background x="' + bounds.x + '" y="' + bounds.y + '" width="' + bounds.width + '" height="' + bounds.height + '" fill="' + C.paper + '"/><g data-diagram-content>' + content + '</g></svg>';
  }
  function maskedLabel(x, y, value, options) {
    options = options || {};
    var label = String(value || "");
    if (!label) return "";
    var lines = G.wrapText(label, 160, 8, true);
    var width = Math.max(32, Math.ceil(Math.max.apply(null, lines.map(function (line) { return G.textWidth(line, 8, true); }))) + 16), height = lines.length * 10.4 + 6;
    include(x - width / 2, y - height / 2, width, height);
    return '<rect x="' + (x - width / 2) + '" y="' + (y - height / 2) + '" width="' + width + '" height="' + height + '" rx="2" fill="' + C.paper + '"/>' +
      text(x, y - height / 2 + 11, lines.join("\n"), { mono: true, size: 8, fill: options.accent ? C.accent : C.muted, anchor: "middle" });
  }
  function parseState(source) {
    var edges = [], states = [], valid = true;
    source.split(/\n/).forEach(function (line) {
      if (/^\s*(?:$|%%|stateDiagram(?:-v2)?\s*$|direction\s+(?:LR|RL|TB|BT)\s*$)/.test(line)) return;
      var match = line.match(/^\s*(\[\*\]|[\w-]+)\s*-->\s*(\[\*\]|[\w-]+)(?:\s*:\s*(.+))?\s*$/);
      if (!match) { valid = false; return; }
      edges.push({ from: match[1], to: match[2], label: (match[3] || "").trim() });
      [match[1], match[2]].forEach(function (id) { if (id !== "[*]" && !states.includes(id)) states.push(id); });
    });
    return valid && states.length ? { states: states, edges: edges } : null;
  }
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
    var count = data.states.length, columns = Math.min(4, count), width = 144, height = 64, x0 = 40, xGap = 72, y0 = 40, yGap = height + 72, nodes = {}, configuredStates = layout.states || {};
    data.states.forEach(function (state, index) { var column = index % columns, row = Math.floor(index / columns), configured = configuredStates[state] || {}; nodes[state] = { x: Number.isFinite(configured.x) ? configured.x : x0 + column * (width + xGap), y: Number.isFinite(configured.y) ? configured.y : y0 + row * yGap, w: Number.isFinite(configured.width) ? configured.width : width, h: Number.isFinite(configured.height) ? configured.height : height, row: row }; });
    var body = "", incoming = {}, outgoing = {};
    data.edges.forEach(function (edge) { if (edge.from !== "[*]") (outgoing[edge.from] ||= []).push(edge); if (edge.to !== "[*]") (incoming[edge.to] ||= []).push(edge); });
    var automaticEdges = data.edges.filter(function (edge) { return nodes[edge.from] && nodes[edge.to]; });
    var automaticRoutes = G.routeEdges(data.states.map(function (id) { var n = nodes[id]; return { id: id, x: n.x, y: n.y, width: n.w, height: n.h }; }), automaticEdges.map(function (edge) { return { from: edge.from, to: edge.to, label: edge.label, tone: data.states.indexOf(edge.from) >= data.states.indexOf(edge.to) ? "return" : "default" }; }));
    data.edges.forEach(function (edge) {
      var focal = String(focus || "").toLowerCase() === edge.to.toLowerCase(), from = nodes[edge.from], to = nodes[edge.to], style = { accent: focal };
      if (edge.from === "[*]" && to) {
        include(to.x - 34, to.y + to.h / 2 - 6, 12, 12);
        body += '<circle cx="' + (to.x - 28) + '" cy="' + (to.y + to.h / 2) + '" r="6" fill="' + C.ink + '"/>' + routeConnector([{ x: to.x - 22, y: to.y + to.h / 2 }, { x: to.x, y: to.y + to.h / 2 }], style);
        return;
      }
      if (edge.to === "[*]" && from) {
        include(from.x + from.w + 19, from.y + from.h / 2 - 9, 18, 18);
        body += '<circle cx="' + (from.x + from.w + 28) + '" cy="' + (from.y + from.h / 2) + '" r="9" fill="none" stroke="' + C.ink + '"/><circle cx="' + (from.x + from.w + 28) + '" cy="' + (from.y + from.h / 2) + '" r="5" fill="' + C.ink + '"/>' + routeConnector([{ x: from.x + from.w, y: from.y + from.h / 2 }, { x: from.x + from.w + 19, y: from.y + from.h / 2 }], style);
        return;
      }
      if (!from || !to) return;
      var configured = stateTransitionLayout(layout, edge), route, label;
      if (configured) {
        var sourceSide = configured.fromSide || (from.x <= to.x ? "right" : "left"), targetSide = configured.toSide || (from.x <= to.x ? "left" : "right"), start = statePort(from, sourceSide), end = statePort(to, targetSide);
        route = orthogonalRoute([start].concat(configured.waypoints || []).concat([end]), sourceSide);
        label = configured.labelPlacement || { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 16 };
      } else {
        var automatic = automaticRoutes[automaticEdges.indexOf(edge)];
        route = automatic.points;
        label = automatic.label ? { x: automatic.label.x + automatic.label.width / 2, y: automatic.label.y + automatic.label.height / 2 } : null;
      }
      body += routeConnector(route, style);
      if (edge.label) body += configured?.labelPlacement ? maskedLabel(label.x, label.y, edge.label) : placeLabel(route, edge.label, Object.values(nodes), "right");
    });
    data.states.forEach(function (state) {
      var node = nodes[state], focal = String(focus || "").toLowerCase() === state.toLowerCase(), terminal = !(outgoing[state] || []).length;
      include(node.x, node.y, node.w, node.h);
      body += '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" rx="8" fill="' + (focal ? C.accentTint : (terminal ? "rgba(45,49,66,.04)" : C.white)) + '" stroke="' + (focal ? C.accent : (terminal ? C.muted : C.ink)) + '" stroke-width="1.2"/>' + text(node.x + node.w / 2, node.y + 30, state, { size: 11, weight: 600, anchor: "middle", wrap: 18 });
      if (terminal) { include(node.x + node.w + 16, node.y + node.h / 2 - 8, 16, 16); body += '<circle cx="' + (node.x + node.w + 24) + '" cy="' + (node.y + node.h / 2) + '" r="8" fill="none" stroke="' + C.muted + '"/><circle cx="' + (node.x + node.w + 24) + '" cy="' + (node.y + node.h / 2) + '" r="4" fill="' + C.muted + '"/>'; }
    });
    return svg("0 0 " + (Number.isFinite(layout.canvas?.width) ? layout.canvas.width : 1) + " " + (Number.isFinite(layout.canvas?.height) ? layout.canvas.height : 1), body, Boolean(layout.canvas));
  }
  function parseER(source) {
    var fields = {}, relationships = [], entity = null, valid = true;
    source.split(/\n/).forEach(function (line) {
      if (/^\s*(?:$|%%|erDiagram\s*$|direction\s+(?:LR|RL|TB|BT)\s*$)/.test(line)) return;
      if (/^\s*}\s*$/.test(line) && entity) { entity = null; return; }
      var rel = line.match(/^\s*([A-Za-z_][\w]*)\s+([|o}{]+)--([|o}{]+)\s+([A-Za-z_][\w]*)\s*:\s*(.+)\s*$/);
      var box = line.match(/^\s*([A-Za-z_][\w]*)\s*\{\s*$/);
      var field = line.match(/^\s*([\w\[\]]+)\s+([\w_]+)(?:\s+(PK(?:,FK)?|FK|UK))?\s*$/);
      if (rel && !entity) relationships.push({ from: rel[1], left: rel[2], right: rel[3], to: rel[4], label: rel[5] });
      else if (box && !entity) { entity = box[1]; fields[entity] = []; }
      else if (field && entity) fields[entity].push({ type: field[1], name: field[2], key: field[3] || "" });
      else valid = false;
    });
    if (!valid || entity) return null;
    relationships.forEach(function (relationship) { [relationship.from, relationship.to].forEach(function (id) { if (!fields[id]) fields[id] = []; }); });
    return { fields: fields, relationships: relationships };
  }
  function card(token) { if (/^(?:1|N|0\.\.1|0\.\.N)$/i.test(token)) return String(token).toUpperCase(); if (token.indexOf("o") >= 0 && token.indexOf("{") >= 0) return "0..N"; if (token.indexOf("{") >= 0) return "N"; if (token.indexOf("o") >= 0) return "0..1"; return "1"; }
  function cleanRoute(points) { return G.cleanRoute(points); }
  function routeSegments(points) { return G.segments(points); }
  function routeLength(points) { return G.segments(points).reduce(function (sum, segment) { return sum + segment.length; }, 0); }
  function routeConnector(points, options) {
    options = options || {};
    var color = options.accent ? C.accent : C.muted, marker = options.marker === false ? "" : ' marker-end="url(#' + (options.accent ? "editorial-arrow-accent" : "editorial-arrow") + ')"', dash = options.dashed ? ' stroke-dasharray="5 4"' : "";
    measured.push(G.pointsBounds(points, 10));
    return '<path d="' + G.path(points) + '" fill="none" stroke="' + color + '" stroke-width="' + (options.accent ? "2" : "1.4") + '" stroke-linejoin="round" stroke-linecap="round"' + dash + marker + '/>';
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
    include(x - 11, y - 11, 22, 22);
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
    var label = G.placeLabel(route, value, boxes.map(function (box) { return { x: box.x, y: box.y, width: box.w, height: box.h }; }));
    return label ? maskedLabel(label.x + label.width / 2, label.y + label.height / 2, value) : "";
  }

  function placeCardinality(point, side, value, boxes, placement) {
    if (configuredPoint(placement)) return maskedLabel(placement.x, placement.y, value);
    var candidates = side === "left" ? [{ x: point.x - 24, y: point.y - 16 }, { x: point.x - 24, y: point.y + 16 }] : side === "right" ? [{ x: point.x + 24, y: point.y - 16 }, { x: point.x + 24, y: point.y + 16 }] : side === "top" ? [{ x: point.x, y: point.y - 24 }, { x: point.x + 24, y: point.y - 24 }] : [{ x: point.x, y: point.y + 24 }, { x: point.x + 24, y: point.y + 24 }];
    var choice = candidates.find(function (candidate) { return !boxes.some(function (box) { return rectOverlap(labelBox(candidate.x, candidate.y, value), box); }); }) || candidates[0];
    return maskedLabel(choice.x, choice.y, value);
  }
  function renderER(source, focus, layout, kind) {
    var data = parseER(source);
    if (!data) return null;
    if (!Object.keys(data.fields).length) return null;
    layout = layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {};
    var ids = Object.keys(data.fields), positions = {}, dimensions = {};
    ids.forEach(function (id) {
      var fields = data.fields[id], longestField = Math.max.apply(null, [{name: id, type: ""}].concat(fields).map(function (field) { return String(field.name || "").length; })), longestType = Math.max.apply(null, [{name: id, type: ""}].concat(fields).map(function (field) { return String(field.type || "").length; }));
      dimensions[id] = { w: Math.max(240, Math.min(520, 68 + longestField * 5.4 + longestType * 5)), h: 58 + fields.length * 28 };
    });
    var columnWidths = [0, 0, 0], rowHeights = [];
    ids.forEach(function (id, index) { columnWidths[index % 3] = Math.max(columnWidths[index % 3], dimensions[id].w); rowHeights[Math.floor(index / 3)] = Math.max(rowHeights[Math.floor(index / 3)] || 0, dimensions[id].h); });
    var columnX = [96, 96 + columnWidths[0] + 112, 96 + columnWidths[0] + columnWidths[1] + 224], rowY = [], cursorY = 72;
    rowHeights.forEach(function (height, index) { rowY[index] = cursorY; cursorY += height + 112; });
    ids.forEach(function (id, i) {
      var configured = layout.entities && layout.entities[id] || {}, column = i % 3, row = Math.floor(i / 3);
      positions[id] = {
        x: Number.isFinite(configured.x) ? configured.x : columnX[column],
        y: Number.isFinite(configured.y) ? configured.y : rowY[row],
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
    ids.forEach(function (id) { var p = positions[id]; include(p.x, p.y, p.w, p.h); var focal = String(focus || "").toLowerCase().includes(id.toLowerCase()), tag = isDatabaseSchema ? "TABLE" : "ENTITY"; body += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="6" fill="' + C.white + '" stroke="' + (focal ? C.accent : C.ink) + '" stroke-width="' + (focal ? "1.4" : "1") + '"/><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="30" rx="6" fill="' + (focal ? C.accentTint : "rgba(45,49,66,.035)") + '"/>' + text(p.x + 12, p.y + 12, tag, { mono: true, size: 7, fill: C.muted, letter: ".12em" }) + text(p.x + 12, p.y + 24, id, { size: 12, weight: 600 }); data.fields[id].forEach(function (field, index) { var y = p.y + 48 + index * 28, typeWidth = Math.max(24, String(field.type || "").length * 5), chipX = p.x + p.w - typeWidth - 52; body += '<line x1="' + p.x + '" y1="' + (y - 9) + '" x2="' + (p.x + p.w) + '" y2="' + (y - 9) + '" stroke="' + C.rule + '"/>' + text(p.x + 12, y, field.name, { size: 9, weight: 500, fill: C.ink }) + text(p.x + p.w - 12, y, field.type, { mono: true, size: 8, fill: C.muted, anchor: "end" }) + (field.key ? '<rect x="' + chipX + '" y="' + (y - 10) + '" width="28" height="13" rx="2" fill="' + C.paper + '" stroke="' + C.rule + '"/>' + text(chipX + 14, y, field.key, { mono: true, size: 7, fill: C.muted, anchor: "middle" }) : ""); }); });
    var canvasWidth = Number.isFinite(layout.canvas?.width) ? layout.canvas.width : 1, canvasHeight = Number.isFinite(layout.canvas?.height) ? layout.canvas.height : 1;
    return svg("0 0 " + canvasWidth + " " + canvasHeight, body, Boolean(layout.canvas));
  }
  window.AureliusEditorial = { render: function (source, kind, focus, analysis, layout) {
    measured = [];
    // Mermaid owns parsing and automatic layout. Editorial overrides are only
    // used for the explicit table/field and state port contracts they support.
    if (!layout || !Object.keys(layout).length) return null;
    if (kind === "state") return renderState(source, focus, layout);
    if (kind === "er" || kind === "db-schema") return renderER(source, focus, layout, kind);
    return null;
  } };
})();
