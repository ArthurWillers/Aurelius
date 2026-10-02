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

  document.querySelectorAll("[data-nav-drawer]").forEach(function (drawer) {
    var key = "aurelius:nav:drawer";
    var mobile = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
    try {
      var saved = window.localStorage.getItem(key);
      drawer.open = mobile ? saved === "open" : true;
    } catch (error) {
      if (mobile) drawer.open = false;
    }
    drawer.addEventListener("toggle", function () {
      if (!mobile) return;
      try { window.localStorage.setItem(key, drawer.open ? "open" : "closed"); } catch (error) {}
    });
  });

  document.querySelectorAll("[data-nav-group]").forEach(function (group) {
    var key = "aurelius:nav:" + group.dataset.navGroup;
    var containsCurrent = !!group.querySelector('[aria-current="page"]');
    try {
      var saved = window.localStorage.getItem(key);
      if (saved !== null && !containsCurrent) group.open = saved === "open";
    } catch (error) {}
    group.addEventListener("toggle", function () {
      try { window.localStorage.setItem(key, group.open ? "open" : "closed"); } catch (error) {}
    });
  });

  function status(message, trigger) {
    var scope = trigger && trigger.closest(".article-actions, .diagram-actions, .code-figure, [data-html-artifact], [data-standalone-visual]");
    var target = scope && scope.querySelector("[data-action-status]");
    if (!target) target = document.querySelector(".article-actions [data-action-status], [data-action-status]");
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
  function copy(value, success, trigger) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { status(success, trigger); }, function () { fallbackCopy(value); status(success, trigger); });
    } else { fallbackCopy(value); status(success, trigger); }
  }
  var markdownButton = document.querySelector("[data-copy-markdown]");
  if (markdownButton) markdownButton.addEventListener("click", function () {
    var source = document.getElementById("document-markdown");
    try { copy(JSON.parse(source.textContent), messages.markdownCopied || "Markdown copied.", markdownButton); } catch (error) { status(messages.markdownError || "Could not read the Markdown.", markdownButton); }
  });
  document.querySelectorAll("[data-copy-code]").forEach(function (button) {
    button.addEventListener("click", function () {
      var code = button.closest(".code-figure").querySelector("code");
      copy(code ? code.textContent : "", messages.codeCopied || "Code copied.", button);
    });
  });
  document.querySelectorAll("[data-copy-svg]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest(".diagram-figure, [data-html-artifact], [data-standalone-visual]") || document;
      var source = container.querySelector("[data-artifact-svg]");
      if (source) {
        try { copy(JSON.parse(source.textContent), messages.svgCopied || "SVG copied.", button); }
        catch (error) { status(messages.svgSourceError || "Could not read the SVG.", button); }
        return;
      }
      var svg = container.querySelector("svg");
      copy(svg ? window.AureliusDiagramViewport.exportSvg(svg) : "", messages.svgCopied || "SVG copied.", button);
    });
  });
  document.querySelectorAll("[data-copy-mermaid]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest(".diagram-figure, [data-standalone-visual]") || document;
      var source = container.querySelector("[data-mermaid-source]");
      if (!source) { status(messages.mermaidSourceError || "Could not read the Mermaid source.", button); return; }
      try { copy(JSON.parse(source.textContent), messages.mermaidCopied || "Mermaid copied.", button); }
      catch (error) { status(messages.mermaidSourceError || "Could not read the Mermaid source.", button); }
    });
  });
  document.querySelectorAll("[data-copy-html]").forEach(function (button) {
    button.addEventListener("click", function () {
      var container = button.closest("[data-html-artifact]");
      var source = container && container.querySelector("[data-artifact-html]");
      if (!source) { status(messages.htmlSourceError || "Could not read the HTML.", button); return; }
      try { copy(JSON.parse(source.textContent), messages.htmlCopied || "HTML copied.", button); } catch (error) { status(messages.htmlSourceError || "Could not read the HTML.", button); }
    });
  });
  document.querySelectorAll("[data-copy-link]").forEach(function (button) {
    button.addEventListener("click", function () { copy(window.location.href, messages.linkCopied || "Link copied.", button); });
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

  var printedDetails = [];
  window.addEventListener("beforeprint", function () {
    document.querySelectorAll("details.mermaid-summary:not([open])").forEach(function (details) { printedDetails.push(details); details.open = true; });
  });
  window.addEventListener("afterprint", function () { printedDetails.forEach(function (details) { details.open = false; }); printedDetails = []; });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    document.querySelectorAll("[data-native-diagram]").forEach(function (shell) {
      window.AureliusDiagramViewport.mount({ svg: shell.querySelector("svg"), shell: shell, viewport: shell.querySelector("[data-native-viewport]"), prefix: "native", namespace: true });
    });

    document.querySelectorAll("[data-canvas]").forEach(function (canvas) {
      var shell = canvas.closest("[data-canvas-shell]");
      function selectNode(target) {
        var node = target.closest && target.closest(".canvas-node");
        if (!node) return;
        canvas.querySelectorAll(".canvas-node").forEach(function (item) { item.classList.toggle("is-active", item === node); });
        shell.querySelector("[data-canvas-detail-title]").textContent = node.dataset.title;
        shell.querySelector("[data-canvas-detail-summary]").textContent = node.dataset.detail || node.dataset.summary;
      }
      canvas.querySelectorAll(".canvas-node").forEach(function (node) {
        node.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } });
      });
      window.AureliusDiagramViewport.mount({ svg: canvas, shell: shell, viewport: canvas.closest(".canvas-scroll"), prefix: "canvas", namespace: true, onSelect: selectNode,
        onReset: function () { canvas.querySelectorAll(".canvas-node").forEach(function (node) { node.classList.remove("is-active"); }); }
      });
    });
  });
})();
