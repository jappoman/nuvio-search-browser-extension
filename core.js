(function initNuvioCore(global) {
  "use strict";

  const imdbIdRegex = /\b(tt\d{6,10})\b/i;

  const DEFAULT_SETTINGS = {
    fallbackToAssistant: true,
    showOnGoogle: true,
    showOnDuckDuckGo: true,
    showOnImdb: true,
    showOnTrakt: true,
    showOnLetterboxd: true,
    showOnJustWatch: true,
    showOnWikipedia: true
  };

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function parseImdbIdFromText(value) {
    const match = text(value).match(imdbIdRegex);
    return match ? match[1].toLowerCase() : null;
  }

  function parseImdbIdFromUrl(value) {
    try {
      return parseImdbIdFromText(new URL(String(value)).href);
    } catch (_) {
      return parseImdbIdFromText(value);
    }
  }

  function inferMediaTypeFromText(value) {
    const haystack = text(value).toLowerCase();
    if (!haystack) {
      return "movie";
    }
    if (/(tv series|tv show|series|mini[- ]series|season|episode|showrunner)/i.test(haystack)) {
      return "series";
    }
    return "movie";
  }

  function extractYear(value) {
    const match = text(value).match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "";
  }

  function buildNuvioAppUrl(meta) {
    const type = meta && meta.type === "series" ? "series" : "movie";
    const imdbId = parseImdbIdFromText(meta && meta.imdbId);
    if (!imdbId) {
      return "";
    }
    return "nuvio://meta?type=" + encodeURIComponent(type) + "&id=" + encodeURIComponent(imdbId);
  }

  function buildAssistantQuery(meta) {
    return [text(meta && meta.title), extractYear(meta && meta.year), parseImdbIdFromText(meta && meta.imdbId)]
      .filter(Boolean)
      .join(" ");
  }

  function buildAssistantUrl(runtimeBaseUrl, meta) {
    const url = new URL("launch.html", runtimeBaseUrl);
    url.searchParams.set("title", text(meta && meta.title));
    url.searchParams.set("year", extractYear(meta && meta.year));
    url.searchParams.set("type", meta && meta.type === "series" ? "series" : "movie");
    url.searchParams.set("imdbId", parseImdbIdFromText(meta && meta.imdbId) || "");
    url.searchParams.set("appUrl", buildNuvioAppUrl(meta));
    url.searchParams.set("query", buildAssistantQuery(meta));
    return url.toString();
  }

  function hostnameFromLocation(locationLike) {
    return text(locationLike && locationLike.hostname).toLowerCase();
  }

  function pathnameFromLocation(locationLike) {
    return text(locationLike && locationLike.pathname);
  }

  function isImdbHost(host) {
    return host === "www.imdb.com";
  }

  function isTraktHost(host) {
    return host === "trakt.tv" || host === "app.trakt.tv";
  }

  function isJustWatchHost(host) {
    return host === "www.justwatch.com";
  }

  function titleFromMeta(documentRef) {
    const ogTitle = documentRef.querySelector("meta[property='og:title']")?.getAttribute("content");
    if (ogTitle) {
      return text(ogTitle.replace(/\s+streaming:.*$/i, ""));
    }
    return text(documentRef.title);
  }

  function findImdbLink(documentRef) {
    return documentRef.querySelector("a[href*='imdb.com/title/tt']");
  }

  function findImdbIdInDocument(documentRef) {
    const imdbAnchor = findImdbLink(documentRef);
    if (imdbAnchor) {
      return parseImdbIdFromUrl(imdbAnchor.href);
    }
    return parseImdbIdFromText(documentRef.documentElement ? documentRef.documentElement.innerHTML : "");
  }

  function detectImdbType(documentRef) {
    const jsonLdNodes = Array.from(documentRef.querySelectorAll("script[type='application/ld+json']"));
    for (const node of jsonLdNodes) {
      try {
        const payload = JSON.parse(node.textContent);
        const type = Array.isArray(payload) ? payload[0]?.["@type"] : payload?.["@type"];
        if (type === "TVSeries" || type === "TVEpisode") {
          return "series";
        }
      } catch (_) {}
    }
    if (documentRef.querySelector("a[href*='episodes']")) {
      return "series";
    }
    return inferMediaTypeFromText(documentRef.title);
  }

  function detectWikipediaType(documentRef) {
    const categories = Array.from(documentRef.querySelectorAll("#mw-normal-catlinks a"))
      .map((node) => text(node.textContent))
      .join(" ");
    const infobox = text(documentRef.querySelector(".infobox")?.textContent);
    return inferMediaTypeFromText(categories + " " + infobox);
  }

  function extractDetailMetadata(documentRef, locationLike) {
    const host = hostnameFromLocation(locationLike);
    const path = pathnameFromLocation(locationLike);

    if (isImdbHost(host) && /\/title\/tt\d{6,10}/i.test(path)) {
      return {
        imdbId: parseImdbIdFromText(path),
        title: text(documentRef.querySelector("h1")?.textContent) || titleFromMeta(documentRef),
        year: extractYear(documentRef.title),
        type: detectImdbType(documentRef)
      };
    }

    if (isTraktHost(host) && (/^\/movies\//.test(path) || /^\/shows\//.test(path))) {
      return {
        imdbId: findImdbIdInDocument(documentRef),
        title: text(documentRef.querySelector("h1")?.textContent) || titleFromMeta(documentRef),
        year: extractYear(documentRef.body?.textContent),
        type: path.startsWith("/shows/") ? "series" : "movie"
      };
    }

    if (host === "letterboxd.com" && path.startsWith("/film/")) {
      return {
        imdbId: findImdbIdInDocument(documentRef),
        title: text(documentRef.querySelector("h1.headline-1, h1")?.textContent) || titleFromMeta(documentRef),
        year: extractYear(documentRef.body?.textContent),
        type: "movie"
      };
    }

    if (isJustWatchHost(host) && /\/(movie|film|tv-show)\//.test(path)) {
      return {
        imdbId: findImdbIdInDocument(documentRef),
        title: text(documentRef.querySelector("h1")?.textContent) || titleFromMeta(documentRef),
        year: extractYear(documentRef.documentElement?.innerHTML),
        type: path.includes("/tv-show/") ? "series" : "movie"
      };
    }

    if (host.endsWith(".wikipedia.org") && path.startsWith("/wiki/")) {
      const imdbId = findImdbIdInDocument(documentRef);
      if (!imdbId) {
        return null;
      }
      return {
        imdbId,
        title: text(documentRef.querySelector("#firstHeading")?.textContent) || titleFromMeta(documentRef),
        year: extractYear(documentRef.body?.textContent),
        type: detectWikipediaType(documentRef)
      };
    }

    return null;
  }

  const NuvioCore = {
    DEFAULT_SETTINGS,
    parseImdbIdFromText,
    parseImdbIdFromUrl,
    inferMediaTypeFromText,
    extractYear,
    buildNuvioAppUrl,
    buildAssistantUrl,
    buildAssistantQuery,
    extractDetailMetadata
  };

  global.NuvioCore = NuvioCore;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = NuvioCore;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
