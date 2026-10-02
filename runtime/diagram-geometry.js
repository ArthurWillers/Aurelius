(function (root) {
  "use strict";
  var padding = 20, clearance = 24, cornerRadius = 8;
  function union(boxes) {
    boxes = boxes.filter(function (b) { return b && [b.x, b.y, b.width, b.height].every(Number.isFinite); });
    if (!boxes.length) return { x: 0, y: 0, width: 1, height: 1 };
    var x = Math.min.apply(null, boxes.map(function (b) { return b.x; }));
    var y = Math.min.apply(null, boxes.map(function (b) { return b.y; }));
    return { x: x, y: y, width: Math.max.apply(null, boxes.map(function (b) { return b.x + b.width; })) - x, height: Math.max.apply(null, boxes.map(function (b) { return b.y + b.height; })) - y };
  }
  function pad(box, amount) { return { x: box.x - amount, y: box.y - amount, width: Math.max(1, box.width) + amount * 2, height: Math.max(1, box.height) + amount * 2 }; }
  function viewBox(box) { return [box.x, box.y, box.width, box.height]; }
  function pointsBounds(points, margin) { return pad(union(points.map(function (p) { return { x: p.x, y: p.y, width: 0, height: 0 }; })), margin || 0); }
  function textWidth(value, size, mono) {
    return Array.from(String(value)).reduce(function (sum, ch) {
      if (/\p{Mark}/u.test(ch)) return sum;
      var em = mono ? 0.62 : /[ilI.,'!|\s]/.test(ch) ? 0.32 : /[MW@%]/.test(ch) ? 0.9 : /[\u2e80-\u9fff\u{1f000}-\u{1ffff}]/u.test(ch) ? 1 : 0.62;
      return sum + em * size;
    }, 0);
  }
  function wrapText(value, width, size, mono) {
    var lines = [];
    String(value == null ? "" : value).split(/\r?\n|<br\s*\/?\s*>/i).forEach(function (paragraph) {
      var line = "";
      paragraph.split(/\s+/).filter(Boolean).forEach(function (word) {
        if (line && textWidth(line + " " + word, size, mono) > width) { lines.push(line); line = ""; }
        if (textWidth(word, size, mono) > width) {
          Array.from(word).forEach(function (ch) { if (line && textWidth(line + ch, size, mono) > width) { lines.push(line); line = ""; } line += ch; });
        } else line += (line ? " " : "") + word;
      });
      lines.push(line);
    });
    return lines;
  }
  function overlap(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
  function clean(points) {
    var out = [];
    points.forEach(function (p) { var last = out[out.length - 1]; if (!last || last.x !== p.x || last.y !== p.y) out.push(p); });
    for (var i = out.length - 2; i > 0; i--) {
      var a = out[i - 1], b = out[i], c = out[i + 1];
      // Do not erase a reversal: its excursion can be an intentional loop.
      if ((a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0) || (a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0)) out.splice(i, 1);
    }
    return out;
  }
  function segments(points) { return points.slice(1).map(function (b, i) { var a = points[i]; return { a: a, b: b, horizontal: a.y === b.y, length: Math.hypot(a.x - b.x, a.y - b.y) }; }).filter(function (segment) { return !segment.b.move; }); }
  function path(points) {
    points = clean(points);
    if (!points.length) return "";
    var d = "M" + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length; i++) {
      var p = points[i], a = points[i - 1], b = points[i + 1];
      var radius = b ? Math.min(cornerRadius, Math.hypot(p.x - a.x, p.y - a.y) / 2, Math.hypot(b.x - p.x, b.y - p.y) / 2) : 0;
      if (!radius) d += " L" + p.x + " " + p.y;
      else d += " L" + (p.x - Math.sign(p.x - a.x) * radius) + " " + (p.y - Math.sign(p.y - a.y) * radius) + " Q" + p.x + " " + p.y + " " + (p.x + Math.sign(b.x - p.x) * radius) + " " + (p.y + Math.sign(b.y - p.y) * radius);
    }
    return d;
  }
  var vectors = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
  function sides(a, b) {
    var dx = b.x + b.width / 2 - a.x - a.width / 2, dy = b.y + b.height / 2 - a.y - a.height / 2;
    return Math.abs(dx) >= Math.abs(dy) ? { from: dx >= 0 ? "right" : "left", to: dx >= 0 ? "left" : "right" } : { from: dy >= 0 ? "bottom" : "top", to: dy >= 0 ? "top" : "bottom" };
  }
  function port(node, side, index, count) {
    var ratio = ((index || 0) + 1) / ((count || 1) + 1);
    if (side === "left" || side === "right") return { x: node.x + (side === "right" ? node.width : 0), y: node.y + node.height * ratio };
    return { x: node.x + node.width * ratio, y: node.y + (side === "bottom" ? node.height : 0) };
  }
  function hits(points, boxes) {
    return segments(points).some(function (s) { return boxes.some(function (b) {
      if (s.horizontal) return s.a.y > b.y && s.a.y < b.y + b.height && Math.min(s.a.x, s.b.x) < b.x + b.width && Math.max(s.a.x, s.b.x) > b.x;
      return s.a.x > b.x && s.a.x < b.x + b.width && Math.min(s.a.y, s.b.y) < b.y + b.height && Math.max(s.a.y, s.b.y) > b.y;
    }); });
  }
  function routeEdges(nodes, edges, pointsForEdge) {
    var byId = new Map(nodes.map(function (n) { return [n.id, n]; })), groups = new Map();
    var all = union(nodes);
    var items = edges.map(function (edge) {
      var a = byId.get(edge.from), b = byId.get(edge.to), chosen = sides(a, b);
      // Return connections use a separate outside lane along their local span.
      if (edge.tone === "return" || a === b) chosen = Math.abs(a.x - b.x) >= Math.abs(a.y - b.y) ? { from: "bottom", to: "bottom" } : { from: "right", to: "right" };
      var item = { edge: edge, from: a, to: b, fromSide: edge.fromSide || chosen.from, toSide: edge.toSide || chosen.to };
      [edge.from + ":" + item.fromSide, edge.to + ":" + item.toSide].forEach(function (key) { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(item); });
      return item;
    });
    var previous = [], labels = [];
    function escapeDistance(point, vector, owner) {
      var distance = clearance;
      nodes.forEach(function (node) {
        if (node === owner) return;
        var gap;
        if (vector[0] && point.y > node.y && point.y < node.y + node.height) gap = vector[0] > 0 ? node.x - point.x : point.x - node.x - node.width;
        if (vector[1] && point.x > node.x && point.x < node.x + node.width) gap = vector[1] > 0 ? node.y - point.y : point.y - node.y - node.height;
        if (gap >= 0) distance = Math.min(distance, gap / 2);
      });
      return distance;
    }
    items.forEach(function (item) {
      var authored = pointsForEdge && pointsForEdge(item.edge);
      if (authored) {
        item.points = authored;
        item.label = placeLabel(authored, item.edge.label, nodes.concat(labels));
        if (item.label) labels.push(item.label);
        return;
      }
      var sourceGroup = groups.get(item.edge.from + ":" + item.fromSide), targetGroup = groups.get(item.edge.to + ":" + item.toSide);
      var start = port(item.from, item.fromSide, sourceGroup.indexOf(item), sourceGroup.length);
      var end = port(item.to, item.toSide, item.from === item.to ? targetGroup.lastIndexOf(item) : targetGroup.indexOf(item), targetGroup.length);
      var sv = vectors[item.fromSide], tv = vectors[item.toSide];
      var sourceEscape = escapeDistance(start, sv, item.from), targetEscape = escapeDistance(end, tv, item.to);
      var stub = clearance, s = { x: start.x + sv[0] * sourceEscape, y: start.y + sv[1] * sourceEscape }, t = { x: end.x + tv[0] * targetEscape, y: end.y + tv[1] * targetEscape };
      var local = union([item.from, item.to]);
      var lanesX = [(s.x + t.x) / 2, local.x - stub, local.x + local.width + stub, all.x - stub, all.x + all.width + stub];
      var lanesY = [(s.y + t.y) / 2, local.y - stub, local.y + local.height + stub, all.y - stub, all.y + all.height + stub];
      // Parallel routes reserve nearby lanes instead of sharing entire segments.
      var laneOffset = Math.max(sourceGroup.indexOf(item), targetGroup.indexOf(item)) * 16;
      lanesX.push(local.x - stub - laneOffset, local.x + local.width + stub + laneOffset);
      lanesY.push(local.y - stub - laneOffset, local.y + local.height + stub + laneOffset);
      var candidates = [clean([start, s, { x: t.x, y: s.y }, t, end]), clean([start, s, { x: s.x, y: t.y }, t, end])];
      lanesX.forEach(function (x) { candidates.push(clean([start, s, { x: x, y: s.y }, { x: x, y: t.y }, t, end])); });
      lanesY.forEach(function (y) { candidates.push(clean([start, s, { x: s.x, y: y }, { x: t.x, y: y }, t, end])); });
      var best, score = Infinity;
      candidates.forEach(function (points) {
        if (hits(points, nodes)) return;
        var candidateSegments = segments(points);
        var cost = candidateSegments.reduce(function (sum, seg) { return sum + seg.length; }, 0) + points.length * cornerRadius;
        var label = placeLabel(points, item.edge.label, nodes.concat(labels));
        if (label && nodes.concat(labels).some(function (box) { return overlap(pad(label, 3), box); })) cost += (all.width + all.height) * 2;
        previous.forEach(function (routeSegments) { routeSegments.forEach(function (old) { candidateSegments.forEach(function (seg) {
          if (seg.horizontal === old.horizontal && (seg.horizontal ? seg.a.y === old.a.y : seg.a.x === old.a.x)) {
            var shared = seg.horizontal ? Math.min(Math.max(seg.a.x, seg.b.x), Math.max(old.a.x, old.b.x)) - Math.max(Math.min(seg.a.x, seg.b.x), Math.min(old.a.x, old.b.x)) : Math.min(Math.max(seg.a.y, seg.b.y), Math.max(old.a.y, old.b.y)) - Math.max(Math.min(seg.a.y, seg.b.y), Math.min(old.a.y, old.b.y));
            cost += Math.max(0, shared) * 4;
          }
        }); }); });
        if (cost < score) { score = cost; best = points; }
      });
      item.points = best || candidates[0];
      item.path = path(item.points);
      item.label = placeLabel(item.points, item.edge.label, nodes.concat(labels));
      if (item.label) labels.push(item.label);
      previous.push(segments(item.points));
    });
    return items;
  }
  function placeLabel(points, value, boxes) {
    if (!value) return null;
    var lines = wrapText(value, 160, 9, true), width = Math.max.apply(null, lines.map(function (line) { return textWidth(line, 9, true); })) + 12, height = lines.length * 12 + 6;
    var choices = [];
    var parts = segments(points);
    if (parts.some(function (seg) { return seg.a.x !== seg.b.x && seg.a.y !== seg.b.y; })) {
      var halfway = parts.reduce(function (sum, seg) { return sum + seg.length; }, 0) / 2;
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (halfway <= part.length) {
          var fraction = part.length ? halfway / part.length : 0;
          choices.push({ x: part.a.x + (part.b.x - part.a.x) * fraction - width / 2, y: part.a.y + (part.b.y - part.a.y) * fraction - height / 2, width: width, height: height, lines: lines });
          break;
        }
        halfway -= part.length;
      }
    }
    parts.sort(function (a, b) { return (b.horizontal ? b.length : 0) - (a.horizontal ? a.length : 0) || b.length - a.length; }).forEach(function (seg) {
      var x = (seg.a.x + seg.b.x) / 2, y = (seg.a.y + seg.b.y) / 2;
      choices.push({ x: x - width / 2, y: y - height / 2, width: width, height: height, lines: lines });
    });
    return choices.find(function (box) { return !boxes.some(function (other) { return overlap(pad(box, 3), other); }); }) || choices[0];
  }
  function fit(box, width, height) {
    var ratio = width > 0 && height > 0 ? width / height : box.width / box.height;
    var w = Math.max(box.width, box.height * ratio), h = w / ratio;
    return [box.x + (box.width - w) / 2, box.y + (box.height - h) / 2, w, h];
  }
  root.AureliusDiagramGeometry = { padding: padding, union: union, pad: pad, viewBox: viewBox, pointsBounds: pointsBounds, textWidth: textWidth, wrapText: wrapText, overlap: overlap, cleanRoute: clean, segments: segments, path: path, sides: sides, routeEdges: routeEdges, placeLabel: placeLabel, fit: fit };
})(globalThis);
