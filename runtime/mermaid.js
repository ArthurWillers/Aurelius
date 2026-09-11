(function () {
  var engine = window.mermaid;
  var configuration = window.__AURELIUS_MERMAID__ || {};
  var surfaces = Array.prototype.slice.call(document.querySelectorAll("[data-mermaid]"));
  if (!surfaces.length) return;

  function showFailure(surface, error) {
    var target = surface.querySelector("[data-mermaid-target]");
    if (!target) return;
    target.removeAttribute("aria-busy");
    target.innerHTML = "";
    var message = document.createElement("p");
    message.className = "mermaid-error";
    message.setAttribute("role", "alert");
    message.textContent = configuration.errorMessage || "Não foi possível renderizar este diagrama.";
    target.appendChild(message);
    if (window.console && console.error) console.error("Aurelius Mermaid:", error);
  }

  function ensureAccessibility(svg, surface, index) {
    var namespace = "http://www.w3.org/2000/svg";
    var prefix = "aurelius-mermaid-" + index;
    var title = svg.querySelector("title");
    var description = svg.querySelector("desc");
    if (!title) {
      title = document.createElementNS(namespace, "title");
      svg.insertBefore(title, svg.firstChild);
    }
    if (!description) {
      description = document.createElementNS(namespace, "desc");
      svg.insertBefore(description, title.nextSibling);
    }
    title.id = prefix + "-title";
    description.id = prefix + "-desc";
    title.textContent = surface.dataset.mermaidTitle || "Mermaid diagram";
    description.textContent = surface.dataset.mermaidDescription || title.textContent;
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", title.id + " " + description.id);
    svg.classList.add("mermaid-diagram");
  }

  function applyEditorialTreatment(svg, surface) {
    svg.classList.add("diagram-design-mermaid");
    svg.dataset.diagramKind = surface.dataset.mermaidKind || "diagram";
    var focus = [];
    try { focus = JSON.parse(surface.dataset.mermaidFocus || "[]"); } catch (error) { focus = []; }
    focus.map(function (value) { return String(value).replace(/[_-]+/g, " ").toLowerCase(); }).forEach(function (term) {
      var candidates = Array.prototype.slice.call(svg.querySelectorAll(".node, .classGroup, g[id*='entity'], g[id*='actor']"));
      var matches = candidates.filter(function (candidate) {
        return String(candidate.textContent || "").replace(/[_-]+/g, " ").toLowerCase().includes(term);
      });
      if (!matches.length) {
        var matchingText = Array.prototype.slice.call(svg.querySelectorAll("text")).find(function (text) {
          return String(text.textContent || "").replace(/[_-]+/g, " ").toLowerCase().includes(term);
        });
        var parentGroup = matchingText && matchingText.closest("g");
        if (parentGroup) matches.push(parentGroup);
      }
      matches.sort(function (left, right) { return left.querySelectorAll("g").length - right.querySelectorAll("g").length; });
      if (matches[0]) matches[0].classList.add("aurelius-focal");
    });
  }

  function setupNavigation(surface, svg) {
    var messages = window.__AURELIUS_MESSAGES__ || {};
    var viewport = surface.querySelector("[data-mermaid-viewport]");
    var zoomOutput = surface.querySelector("[data-mermaid-zoom]");
    var rawViewBox = (svg.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
    if (!viewport || rawViewBox.length !== 4 || rawViewBox.some(function (value) { return !Number.isFinite(value); })) return;

    var original = rawViewBox.slice();
    var fitted = original.slice();
    var initialZoom = Math.max(0.5, Math.min(4, Number(surface.dataset.mermaidInitialZoom) || 1));
    var initialPosition = surface.dataset.mermaidInitialPosition === "start" ? "start" : "center";
    var analysis = {};
    try { analysis = JSON.parse(surface.dataset.mermaidAnalysis || "{}"); } catch (error) { analysis = {}; }
    var direction = String(analysis.direction || "").toUpperCase();
    var current = fitted.slice();
    var zoom = initialZoom;
    var drag = null;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.maxWidth = "none";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    function updateFitted() {
      var viewportBounds = viewport.getBoundingClientRect();
      var viewportRatio = viewportBounds.width && viewportBounds.height ? viewportBounds.width / viewportBounds.height : original[2] / original[3];
      var originalRatio = original[2] / original[3];
      fitted = original.slice();
      if (viewportRatio > originalRatio) {
        fitted[2] = original[3] * viewportRatio;
        fitted[0] = original[0] - (fitted[2] - original[2]) / 2;
      } else if (viewportRatio < originalRatio) {
        fitted[3] = original[2] / viewportRatio;
        fitted[1] = original[1] - (fitted[3] - original[3]) / 2;
      }
    }

    function clamp(x, y, width, height) {
      var minX = width <= original[2] ? original[0] : original[0] + (original[2] - width) / 2;
      var maxX = width <= original[2] ? original[0] + original[2] - width : minX;
      var minY = height <= original[3] ? original[1] : original[1] + (original[3] - height) / 2;
      var maxY = height <= original[3] ? original[1] + original[3] - height : minY;
      return [Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y)), width, height];
    }

    function setViewBox(next) {
      current = next;
      svg.setAttribute("viewBox", next.join(" "));
    }

    function updateZoom() {
      if (zoomOutput) zoomOutput.textContent = Math.round(zoom * 100) + "%";
    }

    function viewAt(nextZoom, position) {
      var width = fitted[2] / nextZoom;
      var height = fitted[3] / nextZoom;
      var x = original[0] + (original[2] - width) / 2;
      var y = original[1] + (original[3] - height) / 2;
      if (position === "start") {
        if (direction === "LR") x = original[0];
        else if (direction === "RL") x = original[0] + original[2] - width;
        else if (direction === "BT") y = original[1] + original[3] - height;
        else y = original[1];
      }
      return clamp(x, y, width, height);
    }

    function reset() {
      updateFitted();
      zoom = initialZoom;
      setViewBox(viewAt(zoom, initialPosition));
      updateZoom();
    }

    function applyZoom(nextZoom, clientX, clientY) {
      var bounds = viewport.getBoundingClientRect();
      var ratioX = clientX == null ? 0.5 : Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
      var ratioY = clientY == null ? 0.5 : Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height));
      var anchorX = current[0] + current[2] * ratioX;
      var anchorY = current[1] + current[3] * ratioY;
      zoom = Math.max(0.5, Math.min(4, nextZoom));
      var width = fitted[2] / zoom;
      var height = fitted[3] / zoom;
      setViewBox(clamp(anchorX - width * ratioX, anchorY - height * ratioY, width, height));
      updateZoom();
    }

    function panBy(dx, dy) {
      setViewBox(clamp(current[0] + dx, current[1] + dy, current[2], current[3]));
    }

    surface.querySelectorAll("[data-mermaid-control]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.dataset.mermaidControl;
        if (action === "in") applyZoom(zoom + 0.25);
        else if (action === "out") applyZoom(zoom - 0.25);
        else if (action === "reset") reset();
        else if (action === "full") {
          if (document.fullscreenElement === surface) document.exitFullscreen();
          else if (surface.requestFullscreen) surface.requestFullscreen().catch(function () {
            surface.classList.toggle("is-expanded");
            updateFullscreenControl();
            resetAfterLayoutChange();
          });
          else {
            surface.classList.toggle("is-expanded");
            updateFullscreenControl();
            resetAfterLayoutChange();
          }
        }
      });
    });

    function updateFullscreenControl() {
      var active = document.fullscreenElement === surface || surface.classList.contains("is-expanded");
      surface.querySelectorAll('[data-mermaid-control="full"]').forEach(function (button) {
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.textContent = active ? (messages.closeFullscreen || "Exit fullscreen") : (messages.fullscreen || "Fullscreen");
      });
    }

    function resetAfterLayoutChange() {
      window.requestAnimationFrame(function () { reset(); });
    }

    document.addEventListener("fullscreenchange", function () {
      updateFullscreenControl();
      resetAfterLayoutChange();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && surface.classList.contains("is-expanded")) {
        surface.classList.remove("is-expanded");
        updateFullscreenControl();
        resetAfterLayoutChange();
      }
    });
    window.addEventListener("resize", resetAfterLayoutChange);
    viewport.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch" && zoom === 1 && !document.fullscreenElement && !surface.classList.contains("is-expanded")) return;
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, viewBox: current.slice() };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-panning");
    });
    viewport.addEventListener("pointermove", function (event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      var bounds = viewport.getBoundingClientRect();
      var dx = (event.clientX - drag.x) * drag.viewBox[2] / bounds.width;
      var dy = (event.clientY - drag.y) * drag.viewBox[3] / bounds.height;
      setViewBox(clamp(drag.viewBox[0] - dx, drag.viewBox[1] - dy, drag.viewBox[2], drag.viewBox[3]));
    });
    function stopDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      viewport.classList.remove("is-panning");
    }
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);
    viewport.addEventListener("wheel", function (event) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      applyZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25), event.clientX, event.clientY);
    }, { passive: false });
    viewport.addEventListener("keydown", function (event) {
      if (event.key === "+" || event.key === "=") { event.preventDefault(); applyZoom(zoom + 0.25); }
      else if (event.key === "-") { event.preventDefault(); applyZoom(zoom - 0.25); }
      else if (event.key === "0") { event.preventDefault(); reset(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); panBy(-current[2] * 0.08, 0); }
      else if (event.key === "ArrowRight") { event.preventDefault(); panBy(current[2] * 0.08, 0); }
      else if (event.key === "ArrowUp") { event.preventDefault(); panBy(0, -current[3] * 0.08); }
      else if (event.key === "ArrowDown") { event.preventDefault(); panBy(0, current[3] * 0.08); }
    });
    reset();
    updateFullscreenControl();
  }

  if (!engine || typeof engine.render !== "function") {
    surfaces.forEach(function (surface) { showFailure(surface, new Error("Runtime Mermaid ausente.")); });
    return;
  }

  engine.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    htmlLabels: false,
    suppressErrorRendering: true,
    theme: "base",
    look: "classic",
    fontFamily: configuration.fontFamily || "Inter, system-ui, sans-serif",
    themeVariables: configuration.themeVariables || {},
    themeCSS: configuration.themeCSS || "",
    flowchart: { htmlLabels: false, curve: "stepAfter", defaultRenderer: "elk", useMaxWidth: true },
    sequence: { rightAngles: true, actorMargin: 48, messageMargin: 32, mirrorActors: false },
    class: { defaultRenderer: "elk", hideEmptyMembersBox: true, nodeSpacing: 48, rankSpacing: 64, diagramPadding: 16 },
    er: { layoutDirection: "TB", diagramPadding: 16, minEntityWidth: 120, minEntityHeight: 72, entityPadding: 12 },
  });

  surfaces.forEach(function (surface, index) {
    var sourceElement = surface.querySelector("[data-mermaid-source]");
    var target = surface.querySelector("[data-mermaid-target]");
    if (!sourceElement || !target) return;
    var source;
    try {
      source = JSON.parse(sourceElement.textContent);
    } catch (error) {
      showFailure(surface, error);
      return;
    }
    var editorialFocus = [];
    try { editorialFocus = JSON.parse(surface.dataset.mermaidFocus || "[]"); } catch (error) { editorialFocus = []; }
    var editorialAnalysis = {};
    try { editorialAnalysis = JSON.parse(surface.dataset.mermaidAnalysis || "{}"); } catch (error) { editorialAnalysis = {}; }
    var editorialLayout = {};
    try { editorialLayout = JSON.parse(surface.dataset.mermaidLayout || "{}"); } catch (error) { editorialLayout = {}; }
    var editorial = window.AureliusEditorial && window.AureliusEditorial.render && window.AureliusEditorial.render(source, surface.dataset.mermaidKind, editorialFocus.join(" "), editorialAnalysis, editorialLayout);
    if (editorial) {
      target.innerHTML = editorial;
      target.removeAttribute("aria-busy");
      var editorialSvg = target.querySelector("svg");
      if (editorialSvg) {
        ensureAccessibility(editorialSvg, surface, index);
        setupNavigation(surface, editorialSvg);
      }
      return;
    }
    engine.render("aurelius-mermaid-render-" + index, source).then(function (result) {
      target.innerHTML = result.svg;
      target.removeAttribute("aria-busy");
      var svg = target.querySelector("svg");
      if (svg) {
        ensureAccessibility(svg, surface, index);
        applyEditorialTreatment(svg, surface);
        setupNavigation(surface, svg);
      }
      if (result.bindFunctions) result.bindFunctions(target);
    }).catch(function (error) {
      showFailure(surface, error);
    });
  });
})();
