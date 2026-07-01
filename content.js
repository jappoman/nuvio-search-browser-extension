(function runContentScript(global) {
  "use strict";

  const browserApi = global.NuvioBrowserApi;
  const core = global.NuvioCore;
  const siteModulesApi = global.NuvioSiteModules;

  function host() {
    return window.location.hostname.toLowerCase();
  }

  function normalizedText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function nodeText(node) {
    return normalizedText(node && node.textContent);
  }

  function textMatches(node, pattern) {
    return pattern.test(nodeText(node));
  }

  function firstVisible(nodes) {
    return nodes.find(Boolean) || null;
  }

  function findNodeByText(selectors, pattern) {
    const nodes = Array.from(document.querySelectorAll(selectors));
    return nodes.find((node) => textMatches(node, pattern)) || null;
  }

  function findHeadingByText(pattern) {
    return findNodeByText("h1, h2, h3, h4, strong, span, a, button, [role='heading']", pattern);
  }

  function findNodeByTextWithin(rootNode, selectors, pattern) {
    if (!rootNode) {
      return null;
    }
    const nodes = Array.from(rootNode.querySelectorAll(selectors));
    return nodes.find((node) => textMatches(node, pattern)) || null;
  }

  function findNodeByTextExcluding(selectors, pattern, excludedPattern) {
    const nodes = Array.from(document.querySelectorAll(selectors));
    return nodes.find((node) => {
      const content = nodeText(node);
      return pattern.test(content) && !(excludedPattern && excludedPattern.test(content));
    }) || null;
  }

  function findNodeByXPath(xpath) {
    if (!xpath) {
      return null;
    }

    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue || null;
  }

  function closestSectionLike(node) {
    return node?.closest("section, article, aside, div, li") || node || null;
  }

  function findSectionByHeading(pattern) {
    const heading = findHeadingByText(pattern);
    return closestSectionLike(heading);
  }

  function makeButton(meta, settings, siteId) {
    const button = document.createElement("img");
    button.src = browserApi.runtime.getURL("icons/nuvio-32.png");
    button.alt = "Open in Nuvio";
    button.title = "Open in Nuvio";
    button.className = "nuvio-open-button";
    button.dataset.siteId = siteId;
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
        if (settings.fallbackToAssistant) {
          openAssistantTab(meta);
        }
        return;
      }

      scheduleAssistantFallback(meta, settings);
      window.location.href = appUrl;
    });

    return button;
  }

  function openAssistantTab(meta) {
    const runtimeRoot = browserApi.runtime.getURL("/");
    const assistantUrl = core.buildAssistantUrl(runtimeRoot, meta);
    window.location.href = assistantUrl;
  }

  function scheduleAssistantFallback(meta, settings) {
    if (!settings.fallbackToAssistant) {
      return;
    }

    setTimeout(() => {
      if (document.hidden) {
        return;
      }

      openAssistantTab(meta);
    }, 1200);
  }

  function existingButtonForSite(siteId) {
    return document.querySelector(`.nuvio-open-button[data-site-id="${siteId}"]`);
  }

  function appendButton(targetNode, meta, settings, siteId) {
    if (!targetNode || !siteId) {
      return;
    }

    const existingButton = existingButtonForSite(siteId);
    if (existingButton && targetNode.contains(existingButton)) {
      return;
    }

    if (existingButton) {
      existingButton.remove();
      targetNode.appendChild(existingButton);
      return;
    }

    targetNode.appendChild(makeButton(meta, settings, siteId));
  }

  function siteHelpers() {
    return {
      firstVisible,
      findNodeByText,
      findNodeByTextWithin,
      findNodeByTextExcluding,
      findNodeByXPath,
      findHeadingByText,
      findSectionByHeading,
      nodeText
    };
  }

  async function applyEnhancements() {
    const siteModule = siteModulesApi.getSiteModuleForHost(host());
    if (!siteModule) {
      return;
    }

    const settings = Object.assign({}, core.DEFAULT_SETTINGS, await browserApi.storage.get(core.DEFAULT_SETTINGS));
    if (!settings[siteModule.settingKey]) {
      return;
    }

    siteModule.enhance({
      appendButton(targetNode, meta, currentSettings) {
        appendButton(targetNode, meta, currentSettings, siteModule.id);
      },
      browserApi,
      core,
      document,
      helpers: siteHelpers(),
      settings,
      window
    });
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

  [500, 1500, 3000, 5000].forEach((delay) => {
    setTimeout(() => {
      void applyEnhancements();
    }, delay);
  });

  const observer = new MutationObserver((mutations) => {
    const changed = mutations.some((mutation) => (
      (mutation.addedNodes && mutation.addedNodes.length > 0) ||
      mutation.type === "attributes" ||
      mutation.type === "characterData"
    ));
    if (changed) {
      debouncedApply();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  });
})(globalThis);
