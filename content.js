(function runContentScript(global) {
  "use strict";

  const browserApi = global.NuvioBrowserApi;
  const core = global.NuvioCore;
  const processedNodes = new WeakSet();

  function host() {
    return window.location.hostname.toLowerCase();
  }

  function settingsKeyForHost(currentHost) {
    if (currentHost === "www.google.com") return "showOnGoogle";
    if (currentHost === "duckduckgo.com") return "showOnDuckDuckGo";
    if (currentHost === "www.imdb.com") return "showOnImdb";
    if (currentHost === "trakt.tv") return "showOnTrakt";
    if (currentHost === "letterboxd.com") return "showOnLetterboxd";
    if (currentHost === "www.justwatch.com") return "showOnJustWatch";
    if (currentHost.endsWith(".wikipedia.org")) return "showOnWikipedia";
    return null;
  }

  function makeButton(meta, settings) {
    const button = document.createElement("img");
    button.src = browserApi.runtime.getURL("icons/nuvio-32.png");
    button.alt = "Open in Nuvio";
    button.title = "Open in Nuvio";
    button.className = "nuvio-open-button";
    button.style.width = "20px";
    button.style.height = "20px";
    button.style.marginLeft = "8px";
    button.style.cursor = "pointer";
    button.style.verticalAlign = "text-bottom";
    button.style.borderRadius = "4px";

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const appUrl = core.buildNuvioAppUrl(meta);
      if (!appUrl) {
        return;
      }

      scheduleAssistantFallback(meta, settings);

      window.location.href = appUrl;
    });

    return button;
  }

  function scheduleAssistantFallback(meta, settings) {
    if (!settings.fallbackToAssistant) {
      return;
    }

    const runtimeRoot = browserApi.runtime.getURL("/");
    const assistantUrl = core.buildAssistantUrl(runtimeRoot, meta);
    let fallbackWindow = null;

    try {
      fallbackWindow = window.open("about:blank", "_blank");
      if (fallbackWindow && fallbackWindow.document) {
        fallbackWindow.document.title = "Opening Nuvio...";
        fallbackWindow.document.body.innerHTML =
          "<p style=\"font:16px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;color:#102033;\">" +
          "Trying to open Nuvio. This tab will help if the app does not launch." +
          "</p>";
      }
    } catch (_) {}

    setTimeout(() => {
      if (document.hidden) {
        try {
          fallbackWindow && fallbackWindow.close();
        } catch (_) {}
        return;
      }

      if (fallbackWindow && !fallbackWindow.closed) {
        fallbackWindow.location.replace(assistantUrl);
        return;
      }

      window.open(assistantUrl, "_blank", "noopener");
    }, 1200);
  }

  function appendButton(targetNode, meta, settings) {
    if (!targetNode || processedNodes.has(targetNode) || targetNode.querySelector(".nuvio-open-button")) {
      return;
    }
    processedNodes.add(targetNode);
    targetNode.appendChild(makeButton(meta, settings));
  }

  function enhanceGoogle(settings) {
    const links = Array.from(document.querySelectorAll("a[href*='imdb.com/title/tt']"));
    links.forEach((link) => {
      const imdbId = core.parseImdbIdFromUrl(link.href);
      const titleNode = link.querySelector("h3") || link.closest("div")?.querySelector("h3");
      if (!imdbId || !titleNode) {
        return;
      }
      const surroundingText = link.closest("[data-hveid], .g, .MjjYud")?.textContent || link.textContent;
      appendButton(titleNode, {
        imdbId,
        title: titleNode.textContent,
        type: core.inferMediaTypeFromText(surroundingText)
      }, settings);
    });
  }

  function enhanceDuckDuckGo(settings) {
    const links = Array.from(document.querySelectorAll("article a[href*='imdb.com/title/tt']"));
    links.forEach((link) => {
      const imdbId = core.parseImdbIdFromUrl(link.href);
      const article = link.closest("article");
      const titleNode = article?.querySelector("h2 a, h2");
      if (!imdbId || !titleNode) {
        return;
      }
      appendButton(titleNode, {
        imdbId,
        title: titleNode.textContent,
        type: core.inferMediaTypeFromText(article.textContent)
      }, settings);
    });
  }

  function detailTargetNode(currentHost) {
    if (currentHost === "www.imdb.com") return document.querySelector("h1");
    if (currentHost === "trakt.tv") return document.querySelector("h1");
    if (currentHost === "letterboxd.com") return document.querySelector("h1.headline-1, h1");
    if (currentHost === "www.justwatch.com") return document.querySelector("h1");
    if (currentHost.endsWith(".wikipedia.org")) return document.querySelector("#firstHeading");
    return null;
  }

  function enhanceDetailPage(settings) {
    const meta = core.extractDetailMetadata(document, window.location);
    if (!meta || !meta.imdbId) {
      return;
    }
    appendButton(detailTargetNode(host()), meta, settings);
  }

  async function applyEnhancements() {
    const currentHost = host();
    const key = settingsKeyForHost(currentHost);
    if (!key) {
      return;
    }

    const settings = Object.assign({}, core.DEFAULT_SETTINGS, await browserApi.storage.get(core.DEFAULT_SETTINGS));
    if (!settings[key]) {
      return;
    }

    if (currentHost === "www.google.com") {
      enhanceGoogle(settings);
      return;
    }

    if (currentHost === "duckduckgo.com") {
      enhanceDuckDuckGo(settings);
      return;
    }

    enhanceDetailPage(settings);
  }

  function debounce(callback, wait) {
    let timeoutId = null;
    return function debounced() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, wait);
    };
  }

  const debouncedApply = debounce(() => {
    void applyEnhancements();
  }, 250);

  void applyEnhancements();

  const observer = new MutationObserver((mutations) => {
    const changed = mutations.some((mutation) => mutation.addedNodes && mutation.addedNodes.length > 0);
    if (changed) {
      debouncedApply();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})(globalThis);
