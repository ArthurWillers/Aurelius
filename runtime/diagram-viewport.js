(function (root) {
  "use strict";
  var G = root.AureliusDiagramGeometry;
  var controllers = new WeakMap();
  var sequence = 0;
  function namespaceSvg(svg) {
    var prefix = "aurelius-svg-" + (++sequence) + "-", ids = new Map();
    [svg].concat(Array.from(svg.querySelectorAll("[id]"))).forEach(function (element) {
      if (element.id) { ids.set(element.id, prefix + element.id); element.id = prefix + element.id; }
    });
    [svg].concat(Array.from(svg.querySelectorAll("*"))).forEach(function (element) {
      Array.from(element.attributes).forEach(function (attribute) {
        var value = attribute.value.replace(/url\(\s*#([^)]*)\)/g, function (all, id) { return ids.has(id) ? "url(#" + ids.get(id) + ")" : all; });
        if ((attribute.name === "href" || attribute.name === "xlink:href") && ids.has(value.slice(1))) value = "#" + ids.get(value.slice(1));
        if (/^aria-(labelledby|describedby)$/.test(attribute.name)) value = value.split(/\s+/).map(function (id) { return ids.get(id) || id; }).join(" ");
        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      });
    });
  }
  function readBox(svg) {
    var values = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    return values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0 ? { x: values[0], y: values[1], width: values[2], height: values[3] } : null;
  }
  function contentBounds(svg) {
    var boxes = [], inverse;
    try { inverse = svg.getCTM().inverse(); } catch (_) { return null; }
    Array.from(svg.children).forEach(function (element) {
      if (/^(defs|style|title|desc|metadata)$/i.test(element.localName) || element.hasAttribute("data-diagram-background") || typeof element.getBBox !== "function") return;
      try {
        var b = element.getBBox(), matrix = inverse.multiply(element.getCTM());
        if (!b.width && !b.height) return;
        var points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(function (p) { return { x: matrix.a * p[0] + matrix.c * p[1] + matrix.e, y: matrix.b * p[0] + matrix.d * p[1] + matrix.f }; });
        boxes.push(G.pointsBounds(points));
      } catch (_) { /* A hidden or unsupported graphics element has no measurable box. */ }
    });
    // getBBox does not consistently include strokes and markers across browsers.
    // Ten SVG units cover Aurelius's arrowheads; source padding is preserved for
    // custom markers larger than that by retaining their declared viewBox.
    return boxes.length ? G.pad(G.union(boxes), G.padding + 10) : null;
  }
  function mount(options) {
    var svg = options.svg, viewport = options.viewport, shell = options.shell, prefix = options.prefix;
    if (controllers.has(svg)) return controllers.get(svg);
    if (options.namespace) namespaceSvg(svg);
    var declared = readBox(svg);
    if (!declared || !viewport || !shell) return null;
    var original = options.measure === false || svg.hasAttribute("data-diagram-preserve-bounds") ? declared : contentBounds(svg) || declared;
    var fitted, current, zoom = 1, drag = null, frame = 0, fullscreen = false, inlineState = null, printState = null;
    var output = shell.querySelector("[data-" + prefix + "-zoom]");
    var messages = root.__AURELIUS_MESSAGES__ || {};
    svg.setAttribute("width", original.width);
    svg.setAttribute("height", original.height);
    svg.style.maxWidth = "none";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.dataset.diagramViewBox = G.viewBox(original).join(" ");
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-keyshortcuts", "+ - 0 Home ArrowLeft ArrowRight ArrowUp ArrowDown");
    function active() { return document.fullscreenElement === shell || shell.classList.contains("is-expanded"); }
    function rect() { return svg.getBoundingClientRect(); }
    function setView(next) { current = next; svg.setAttribute("viewBox", next.join(" ")); }
    function updateOutput() { if (output) output.textContent = Math.round(zoom * 100) + "%"; viewport.dataset.diagramZoomed = zoom > 1 ? "true" : "false"; }
    function clamp(x, y, w, h) {
      var minX = w < original.width ? original.x : original.x + (original.width - w) / 2;
      var minY = h < original.height ? original.y : original.y + (original.height - h) / 2;
      return [Math.max(minX, Math.min(minX + Math.max(0, original.width - w), x)), Math.max(minY, Math.min(minY + Math.max(0, original.height - h), y)), w, h];
    }
    function resize(restore) {
      if (printState) return;
      if (!active()) {
        var width = viewport.clientWidth;
        // Never enlarge a tiny diagram into a poster. Tall diagrams get a
        // bounded navigation area, with zoom available for reading details.
        var natural = Math.min(width / original.width, 1.5) * original.height;
        var ceiling = Math.max(160, Math.min(root.innerHeight * 0.68, 720));
        viewport.style.setProperty("--diagram-height", Math.round(Math.max(120, Math.min(ceiling, natural))) + "px");
      }
      var bounds = rect(), center = current ? [current[0] + current[2] / 2, current[1] + current[3] / 2] : [original.x + original.width / 2, original.y + original.height / 2];
      fitted = G.fit(original, bounds.width, bounds.height);
      if (restore) { zoom = restore.zoom; center = restore.center; }
      setView(clamp(center[0] - fitted[2] / zoom / 2, center[1] - fitted[3] / zoom / 2, fitted[2] / zoom, fitted[3] / zoom));
      updateOutput();
    }
    function reset() { zoom = 1; current = null; resize(); if (options.onReset) options.onReset(); }
    function applyZoom(next, clientX, clientY) {
      var b = rect();
      if (!b.width || !b.height) return;
      var rx = clientX == null ? 0.5 : Math.max(0, Math.min(1, (clientX - b.left) / b.width));
      var ry = clientY == null ? 0.5 : Math.max(0, Math.min(1, (clientY - b.top) / b.height));
      var ax = current[0] + current[2] * rx, ay = current[1] + current[3] * ry;
      // A large diagram may need more than 4x to reach readable text sizes.
      var maximum = Math.max(4, Math.min(32, fitted[2] / Math.max(1, b.width) * 2));
      zoom = Math.max(0.5, Math.min(maximum, next));
      var w = fitted[2] / zoom, h = fitted[3] / zoom;
      setView(clamp(ax - w * rx, ay - h * ry, w, h)); updateOutput();
    }
    function state() { return { zoom: zoom, center: [current[0] + current[2] / 2, current[1] + current[3] / 2] }; }
    function scheduleResize() {
      if (frame) return;
      frame = root.requestAnimationFrame(function () { frame = 0; resize(); });
    }
    function fullscreenChanged() {
      var next = active();
      if (next === fullscreen) return;
      if (next) { inlineState = state(); zoom = 1; current = null; }
      fullscreen = next;
      shell.querySelectorAll('[data-' + prefix + '-control="full"]').forEach(function (button) { button.setAttribute("aria-pressed", String(next)); button.textContent = next ? (messages.closeFullscreen || "Exit fullscreen") : (messages.fullscreen || "Fullscreen"); });
      root.requestAnimationFrame(function () { resize(next ? null : inlineState); });
    }
    function toggleFullscreen() {
      if (shell.classList.contains("is-expanded")) { shell.classList.remove("is-expanded"); fullscreenChanged(); }
      else if (document.fullscreenElement === shell) document.exitFullscreen();
      else if (shell.requestFullscreen) shell.requestFullscreen().catch(function () { shell.classList.add("is-expanded"); fullscreenChanged(); });
      else { shell.classList.add("is-expanded"); fullscreenChanged(); }
    }
    shell.querySelectorAll("[data-" + prefix + "-control]").forEach(function (button) { button.addEventListener("click", function () {
      var action = button.getAttribute("data-" + prefix + "-control");
      if (action === "reset") reset();
      else if (action === "full") toggleFullscreen();
      else applyZoom(zoom * (action === "in" ? 1.25 : 0.8));
    }); });
    viewport.addEventListener("wheel", function (event) { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); applyZoom(zoom * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.005), event.clientX, event.clientY); }, { passive: false });
    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || drag || event.isPrimary === false) return;
      var b = rect();
      var pan = event.pointerType !== "touch" || zoom > 1 || active();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, view: current.slice(), sx: current[2] / b.width, sy: current[3] / b.height, target: event.target, moved: false, pan: pan };
      if (pan) { viewport.setPointerCapture(event.pointerId); viewport.classList.add("is-panning"); }
    });
    viewport.addEventListener("pointermove", function (event) { if (!drag || drag.id !== event.pointerId) return;
      var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) < 4 && !drag.moved) return;
      drag.moved = true;
      if (drag.pan) setView(clamp(drag.view[0] - dx * drag.sx, drag.view[1] - dy * drag.sy, drag.view[2], drag.view[3]));
    });
    function stop(event) { if (!drag || drag.id !== event.pointerId) return; var ended = drag; drag = null; viewport.classList.remove("is-panning"); if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); if (!ended.moved && event.type === "pointerup" && options.onSelect) options.onSelect(ended.target); }
    viewport.addEventListener("pointerup", stop); viewport.addEventListener("pointercancel", stop); viewport.addEventListener("lostpointercapture", stop);
    viewport.addEventListener("keydown", function (event) {
      if (event.key === "+" || event.key === "=") applyZoom(zoom * 1.25);
      else if (event.key === "-") applyZoom(zoom * 0.8);
      else if (event.key === "0" || event.key === "Home") reset();
      else if (/^Arrow/.test(event.key)) { var dx = event.key === "ArrowLeft" ? -0.08 : event.key === "ArrowRight" ? 0.08 : 0, dy = event.key === "ArrowUp" ? -0.08 : event.key === "ArrowDown" ? 0.08 : 0; setView(clamp(current[0] + dx * current[2], current[1] + dy * current[3], current[2], current[3])); }
      else return;
      event.preventDefault();
    });
    document.addEventListener("fullscreenchange", fullscreenChanged);
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && shell.classList.contains("is-expanded")) { shell.classList.remove("is-expanded"); fullscreenChanged(); shell.querySelector('[data-' + prefix + '-control="full"]').focus(); } });
    if (typeof ResizeObserver === "function") new ResizeObserver(scheduleResize).observe(viewport);
    else root.addEventListener("resize", scheduleResize);
    root.addEventListener("beforeprint", function () { if (!printState) printState = current.slice(); svg.setAttribute("viewBox", G.viewBox(original).join(" ")); });
    root.addEventListener("afterprint", function () { if (printState) { setView(printState); printState = null; } });
    reset();
    if (options.initialZoom && options.initialZoom !== 1) {
      applyZoom(options.initialZoom);
      if (options.initialPosition === "start") {
        var direction = options.direction || "TB";
        setView(clamp(direction === "RL" ? original.x + original.width - current[2] : /^LR$/.test(direction) ? original.x : current[0], direction === "BT" ? original.y + original.height - current[3] : /^(TB|TD)$/.test(direction) ? original.y : current[1], current[2], current[3]));
      }
    }
    var controller = { reset: reset, resize: scheduleResize };
    controllers.set(svg, controller);
    return controller;
  }
  function exportSvg(svg) {
    var clone = svg.cloneNode(true), box = svg.dataset.diagramViewBox || svg.getAttribute("viewBox");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.setAttribute("viewBox", box);
    var dimensions = box.trim().split(/[\s,]+/).map(Number);
    clone.setAttribute("width", dimensions[2]); clone.setAttribute("height", dimensions[3]);
    var properties = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "text-anchor", "dominant-baseline", "visibility", "paint-order"];
    var originals = [svg].concat(Array.from(svg.querySelectorAll("*"))), copies = [clone].concat(Array.from(clone.querySelectorAll("*")));
    originals.forEach(function (element, i) {
      if (/^(title|desc|defs|style)$/i.test(element.localName)) return;
      var style = getComputedStyle(element);
      properties.forEach(function (property) { var value = style.getPropertyValue(property); if (value) copies[i].style.setProperty(property, value); });
    });
    [clone].concat(Array.from(clone.querySelectorAll("*"))).forEach(function (element) { Array.from(element.attributes).forEach(function (attribute) { if (attribute.name.startsWith("data-")) element.removeAttribute(attribute.name); }); });
    clone.style.removeProperty("width"); clone.style.removeProperty("height"); clone.style.removeProperty("max-width");
    return new XMLSerializer().serializeToString(clone);
  }
  root.AureliusDiagramViewport = { mount: mount, exportSvg: exportSvg, contentBounds: contentBounds, namespaceSvg: namespaceSvg };
})(globalThis);
