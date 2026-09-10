(function () {
  var index = window.__SEARCH_INDEX__ || [];
  var messages = window.__AURELIUS_MESSAGES__ || {};
  var input = document.querySelector("[data-search-input]");
  var results = document.querySelector("[data-search-results]");
  var selectedIndex = -1;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function normalize(value) {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  }

  function rankedMatches(term) {
    var tokens = normalize(term).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return index.map(function (item) {
      var title = normalize(item.title);
      var tags = normalize((item.tags || []).join(" "));
      var content = normalize(item.search || "");
      var score = 0;
      for (var i = 0; i < tokens.length; i += 1) {
        var token = tokens[i];
        if (!content.includes(token)) return null;
        score += title.startsWith(token) ? 12 : title.includes(token) ? 7 : 0;
        score += tags.includes(token) ? 4 : 0;
        score += content.indexOf(token) < 120 ? 2 : 0;
      }
      return { item: item, score: score };
    }).filter(Boolean).sort(function (left, right) {
      return right.score - left.score || left.item.title.localeCompare(right.item.title, "pt-BR");
    }).slice(0, 8).map(function (entry) { return entry.item; });
  }

  function renderResults(items) {
    if (!results) return;
    selectedIndex = -1;
    if (!items.length) {
      results.innerHTML = "";
      results.dataset.open = "false";
      if (input) input.setAttribute("aria-expanded", "false");
      return;
    }
    results.innerHTML = items.map(function (item, itemIndex) {
      return '<a role="option" id="search-option-' + itemIndex + '" data-search-result href="' +
        escapeHtml(item.href) + '"><strong>' + escapeHtml(item.title) + "</strong><span>" +
        escapeHtml(item.description) + '</span><small>' + escapeHtml(item.type || messages.genericDocument || "document") +
        (item.tags && item.tags.length ? " · " + escapeHtml(item.tags.join(", ")) : "") + "</small></a>";
    }).join("");
    results.dataset.open = "true";
    if (input) input.setAttribute("aria-expanded", "true");
  }

  function moveSelection(direction) {
    if (!results || results.dataset.open !== "true") return;
    var options = results.querySelectorAll("[data-search-result]");
    if (!options.length) return;
    selectedIndex = (selectedIndex + direction + options.length) % options.length;
    options.forEach(function (option, optionIndex) {
      var active = optionIndex === selectedIndex;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
      if (active && input) input.setAttribute("aria-activedescendant", option.id);
    });
  }

  if (input) {
    input.addEventListener("input", function () { renderResults(rankedMatches(input.value)); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); moveSelection(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); moveSelection(-1); }
      else if (event.key === "Enter" && selectedIndex >= 0 && results) {
        var selected = results.querySelectorAll("[data-search-result]")[selectedIndex];
        if (selected) selected.click();
      } else if (event.key === "Escape") { input.value = ""; renderResults([]); input.blur(); }
    });
  }

  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("pt-BR") === "k" && input) {
      event.preventDefault(); input.focus(); input.select();
    }
  });
  document.addEventListener("click", function (event) {
    if (results && !event.target.closest(".search")) renderResults([]);
  });

  function status(message) {
    var target = document.querySelector("[data-action-status]");
    if (!target) return;
    target.textContent = message;
    window.setTimeout(function () { if (target.textContent === message) target.textContent = ""; }, 2400);
  }
  function fallbackCopy(value) {
    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove();
  }
  function copy(value, success) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { status(success); }, function () { fallbackCopy(value); status(success); });
    } else { fallbackCopy(value); status(success); }
  }
  var markdownButton = document.querySelector("[data-copy-markdown]");
  if (markdownButton) markdownButton.addEventListener("click", function () {
    var source = document.getElementById("document-markdown");
    try { copy(JSON.parse(source.textContent), messages.markdownCopied || "Markdown copied."); } catch (error) { status(messages.markdownError || "Could not read the Markdown."); }
  });
  document.querySelectorAll("[data-copy-code]").forEach(function (button) {
    button.addEventListener("click", function () {
      var code = button.closest(".code-figure").querySelector("code");
      copy(code ? code.textContent : "", messages.codeCopied || "Code copied.");
    });
  });
  document.querySelectorAll("[data-copy-svg]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest(".diagram-figure, [data-html-artifact], [data-standalone-visual]") || document;
      var source = container.querySelector("[data-artifact-svg]");
      if (source) {
        try { copy(JSON.parse(source.textContent), messages.svgCopied || "SVG copied."); }
        catch (error) { status(messages.svgSourceError || "Could not read the SVG."); }
        return;
      }
      var svg = container.querySelector("svg");
      copy(svg ? svg.outerHTML : "", messages.svgCopied || "SVG copied.");
    });
  });
  document.querySelectorAll("[data-copy-mermaid]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest(".diagram-figure, [data-standalone-visual]") || document;
      var source = container.querySelector("[data-mermaid-source]");
      if (!source) { status(messages.mermaidSourceError || "Could not read the Mermaid source."); return; }
      try { copy(JSON.parse(source.textContent), messages.mermaidCopied || "Mermaid copied."); }
      catch (error) { status(messages.mermaidSourceError || "Could not read the Mermaid source."); }
    });
  });
  document.querySelectorAll("[data-copy-html]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest("[data-html-artifact]");
      var source = container && container.querySelector("[data-artifact-html]");
      if (!source) { status(messages.htmlSourceError || "Could not read the HTML."); return; }
      try { copy(JSON.parse(source.textContent), messages.htmlCopied || "HTML copied."); } catch (error) { status(messages.htmlSourceError || "Could not read the HTML."); }
    });
  });
  document.querySelectorAll("[data-copy-link]").forEach(function (button) {
    button.addEventListener("click", function () { copy(window.location.href, messages.linkCopied || "Link copied."); });
  });
  document.querySelectorAll("[data-print]").forEach(function (button) {
    button.addEventListener("click", function () { window.print(); });
  });
  var progress = document.querySelector("[data-reading-progress]");
  if (progress) {
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
    };
    window.addEventListener("scroll", updateProgress, { passive: true }); updateProgress();
  }
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var tocById = new Map(tocLinks.map(function (link) { return [link.hash.slice(1), link]; }));
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (link) { link.removeAttribute("aria-current"); });
        var link = tocById.get(entry.target.id); if (link) link.setAttribute("aria-current", "location");
      });
    }, { rootMargin: "-18% 0px -70% 0px" });
    tocLinks.forEach(function (link) { var section = document.getElementById(link.hash.slice(1)); if (section) observer.observe(section); });
  }

  var canvases = document.querySelectorAll("[data-canvas]");
  if (!canvases.length) return;
  canvases.forEach(function (canvas) {
  var canvasShell = canvas.closest("[data-canvas-shell]");
  var detailTitle = canvasShell ? canvasShell.querySelector("[data-canvas-detail-title]") : null;
  var detailSummary = canvasShell ? canvasShell.querySelector("[data-canvas-detail-summary]") : null;
  var zoomOutput = canvasShell ? canvasShell.querySelector("[data-canvas-zoom]") : null;
  var defaultViewBox = canvas.getAttribute("viewBox").split(" ").map(Number);
  var zoom = 1;
  function setViewBox(next) { canvas.setAttribute("viewBox", next.join(" ")); }
  function updateZoomOutput() { if (zoomOutput) zoomOutput.textContent = Math.round(zoom * 100) + "%"; }
  function clampViewBoxPosition(x, y, width, height) {
    var minX = Math.min(defaultViewBox[0], defaultViewBox[0] + defaultViewBox[2] - width);
    var maxX = Math.max(defaultViewBox[0], defaultViewBox[0] + defaultViewBox[2] - width);
    var minY = Math.min(defaultViewBox[1], defaultViewBox[1] + defaultViewBox[3] - height);
    var maxY = Math.max(defaultViewBox[1], defaultViewBox[1] + defaultViewBox[3] - height);
    return [Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y)), width, height];
  }
  function resetCanvas() { zoom = 1; setViewBox(defaultViewBox); updateZoomOutput(); canvas.querySelectorAll(".canvas-node").forEach(function (node) { node.classList.remove("is-active"); }); }
  function setFullscreenPressed(value) { if (canvasShell) canvasShell.querySelectorAll('[data-canvas-control="full"]').forEach(function (button) { button.setAttribute("aria-pressed", value ? "true" : "false"); button.textContent = value ? (messages.closeFullscreen || "Exit fullscreen") : (messages.fullscreen || "Fullscreen"); }); }
  function toggleFullscreen() {
    if (!canvasShell) return;
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (canvasShell.requestFullscreen) { canvasShell.requestFullscreen().catch(function () { canvasShell.classList.toggle("is-expanded"); setFullscreenPressed(canvasShell.classList.contains("is-expanded")); }); return; }
    canvasShell.classList.toggle("is-expanded"); setFullscreenPressed(canvasShell.classList.contains("is-expanded"));
  }
  document.addEventListener("fullscreenchange", function () { setFullscreenPressed(document.fullscreenElement === canvasShell); });
  function selectNode(node) {
    canvas.querySelectorAll(".canvas-node").forEach(function (item) { item.classList.toggle("is-active", item === node); });
    if (detailTitle) detailTitle.textContent = node.dataset.title;
    if (detailSummary) detailSummary.textContent = node.dataset.summary;
  }
  var dragMoved = false;
  canvas.querySelectorAll(".canvas-node").forEach(function (node) {
    node.addEventListener("click", function () { if (!dragMoved) selectNode(node); });
    node.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } });
  });
  var canvasScroll = canvas.closest(".canvas-scroll");
  var drag = null;
  canvas.addEventListener("pointerdown", function (event) {
    var current = canvas.getAttribute("viewBox").split(" ").map(Number);
    dragMoved = false;
    drag = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY, viewBox: current,
      node: event.target.closest ? event.target.closest(".canvas-node") : null,
      scrollLeft: canvasScroll ? canvasScroll.scrollLeft : 0,
      scrollTop: canvasScroll ? canvasScroll.scrollTop : 0
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-panning");
  });
  canvas.addEventListener("pointermove", function (event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    var pixelX = event.clientX - drag.x, pixelY = event.clientY - drag.y;
    if (Math.hypot(pixelX, pixelY) < 4) return;
    dragMoved = true;
    if (zoom === 1 && canvasScroll && (canvasScroll.scrollWidth > canvasScroll.clientWidth || canvasScroll.scrollHeight > canvasScroll.clientHeight)) {
      canvasScroll.scrollLeft = drag.scrollLeft - pixelX;
      canvasScroll.scrollTop = drag.scrollTop - pixelY;
      return;
    }
    var bounds = canvas.getBoundingClientRect();
    var dx = pixelX * drag.viewBox[2] / bounds.width;
    var dy = pixelY * drag.viewBox[3] / bounds.height;
    setViewBox(clampViewBoxPosition(drag.viewBox[0] - dx, drag.viewBox[1] - dy, drag.viewBox[2], drag.viewBox[3]));
  });
  function stopPanning(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    var selectedNode = event.type === "pointerup" && !dragMoved ? drag.node : null;
    drag = null;
    canvas.classList.remove("is-panning");
    if (selectedNode) selectNode(selectedNode);
    window.setTimeout(function () { dragMoved = false; }, 0);
  }
  canvas.addEventListener("pointerup", stopPanning);
  canvas.addEventListener("pointercancel", stopPanning);
  function applyZoom(nextZoom, clientX, clientY) {
    var current = canvas.getAttribute("viewBox").split(" ").map(Number);
    var bounds = canvas.getBoundingClientRect();
    var ratioX = clientX == null ? 0.5 : Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    var ratioY = clientY == null ? 0.5 : Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height));
    var anchorX = current[0] + current[2] * ratioX, anchorY = current[1] + current[3] * ratioY;
    zoom = Math.max(0.4, Math.min(3, nextZoom));
    var width = defaultViewBox[2] / zoom, height = defaultViewBox[3] / zoom;
    setViewBox(clampViewBoxPosition(anchorX - width * ratioX, anchorY - height * ratioY, width, height));
    updateZoomOutput();
  }
  if (canvasScroll) canvasScroll.addEventListener("wheel", function (event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      applyZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2), event.clientX, event.clientY);
      return;
    }
    if (zoom !== 1) {
      var current = canvas.getAttribute("viewBox").split(" ").map(Number);
      var bounds = canvas.getBoundingClientRect();
      var dx = event.deltaX * current[2] / bounds.width;
      var dy = event.deltaY * current[3] / bounds.height;
      var next = clampViewBoxPosition(current[0] + dx, current[1] + dy, current[2], current[3]);
      if (next[0] !== current[0] || next[1] !== current[1]) {
        event.preventDefault();
        setViewBox(next);
      }
      return;
    }
    if (canvasScroll.scrollWidth > canvasScroll.clientWidth) {
      var horizontalDelta = event.deltaX || event.deltaY;
      var canMove = horizontalDelta < 0
        ? canvasScroll.scrollLeft > 0
        : canvasScroll.scrollLeft < canvasScroll.scrollWidth - canvasScroll.clientWidth - 1;
      if (canMove) {
        event.preventDefault();
        canvasScroll.scrollLeft += horizontalDelta;
      }
    }
  }, { passive: false });
  if (canvasShell) canvasShell.querySelectorAll("[data-canvas-control]").forEach(function (button) {
    button.addEventListener("click", function () {
      var action = button.dataset.canvasControl;
      if (action === "reset") return resetCanvas();
      if (action === "full") return toggleFullscreen();
      applyZoom(zoom + (action === "in" ? 0.2 : -0.2));
    });
  });
  });
})();
