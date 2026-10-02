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
    if (svg.classList.contains("aurelius-editorial-svg")) {
      window.AureliusDiagramViewport.namespaceSvg(svg);
    }
    var title = Array.from(svg.children).find(function (element) { return element.localName === "title"; });
    var description = Array.from(svg.children).find(function (element) { return element.localName === "desc"; });
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
    var analysis = {};
    try { analysis = JSON.parse(surface.dataset.mermaidAnalysis || "{}"); } catch (_) {}
    window.AureliusDiagramViewport.mount({
      svg: svg, shell: surface, viewport: surface.querySelector("[data-mermaid-viewport]"), prefix: "mermaid",
      initialZoom: Number(surface.dataset.mermaidInitialZoom) || 1,
      initialPosition: surface.dataset.mermaidInitialPosition,
      direction: analysis.direction,
    });
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
    flowchart: { htmlLabels: false, curve: "basis", defaultRenderer: "dagre-wrapper", useMaxWidth: true, nodeSpacing: 36, rankSpacing: 56, padding: 16, wrappingWidth: 200, diagramPadding: 20 },
    sequence: { rightAngles: true, actorMargin: 48, messageMargin: 32, mirrorActors: false },
    class: { defaultRenderer: "dagre-wrapper", hideEmptyMembersBox: true, nodeSpacing: 48, rankSpacing: 64, diagramPadding: 16 },
    er: { layoutDirection: "TB", diagramPadding: 16, minEntityWidth: 120, minEntityHeight: 72, entityPadding: 12 },
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
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
  });
})();
