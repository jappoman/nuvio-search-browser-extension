(function initNuvioSiteModules(global) {
  "use strict";

  function enhanceDetailPage(context, targetResolver) {
    const meta = context.core.extractDetailMetadata(context.document, context.window.location);
    if (!meta || !meta.title) {
      return;
    }

    const targetNode = targetResolver(context);
    context.appendButton(targetNode, meta, context.settings);
  }

  const siteModules = [
    {
      id: "google",
      settingKey: "showOnGoogle",
      matchesHost(host) {
        return host === "www.google.com";
      },
      enhance(context) {
        const { document, core, helpers, settings, appendButton } = context;
        const links = Array.from(document.querySelectorAll("a[href*='imdb.com/title/tt'], a[href*='imdb.com/title/']"));
        const googleWatchProviderXPath = "/html/body/div[3]/div/div[11]/div[5]/div/div[1]/div[5]/div/div/div/div/div[2]/div/div/div/div[1]/div[1]/a";

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

        const imdbId = core.parseImdbIdFromUrl(links[0]?.href);
        const panelTarget = helpers.firstVisible([
          helpers.findNodeByXPath(googleWatchProviderXPath),
          helpers.findNodeByText("button, a, span, div", /^\s*guarda il film\s*$/i),
          helpers.findNodeByText("button, a, span, div", /^\s*dove guardare\s*$/i),
          helpers.findNodeByText("button, a, span, div", /^\s*guarda ora\s*$/i),
          helpers.findNodeByTextExcluding("button, [role='button'], span, div", /\b(guarda il film|guarda la serie|where to watch|watch now|dove guardare)\b/i, /\bimdb\b/i),
          helpers.findSectionByHeading(/\b(guarda il film|guardare|where to watch|watch now|dove guardare)\b/i)
        ]);

        if (!panelTarget) {
          return;
        }

        const titleNode = helpers.firstVisible([
          document.querySelector('[data-attrid="title"]'),
          document.querySelector('[role="heading"]'),
          document.querySelector("h2"),
          document.querySelector("h3")
        ]);

        appendButton(panelTarget, {
          imdbId,
          title: helpers.nodeText(titleNode),
          type: core.inferMediaTypeFromText(document.body.textContent)
        }, settings);
      }
    },
    {
      id: "duckduckgo",
      settingKey: "showOnDuckDuckGo",
      matchesHost(host) {
        return host === "duckduckgo.com";
      },
      enhance(context) {
        const { document, core, settings, appendButton } = context;
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

        const quickLinksSection = context.helpers.findSectionByHeading(/\b(collegamenti rapidi|quick links)\b/i);
        const imdbQuickLink = context.helpers.firstVisible([
          quickLinksSection && context.helpers.findNodeByTextWithin(quickLinksSection, "a, button, span, div", /^\s*IMDb\s*$/i),
          document.querySelector("[href*='imdb.com/title/tt']")
        ]);
        const quickLinksImdbId = core.parseImdbIdFromUrl(imdbQuickLink?.href);

        if (!quickLinksSection || !imdbQuickLink || !quickLinksImdbId) {
          return;
        }

        appendButton(imdbQuickLink, {
          imdbId: quickLinksImdbId,
          title: imdbQuickLink.textContent || document.title,
          type: core.inferMediaTypeFromText(document.body.textContent)
        }, settings);
      }
    },
    {
      id: "imdb",
      settingKey: "showOnImdb",
      matchesHost(host) {
        return host === "www.imdb.com";
      },
      enhance(context) {
        enhanceDetailPage(context, ({ document, helpers }) => {
          const main = document.querySelector("main") || document.body;
          return helpers.firstVisible([
            helpers.findNodeByTextWithin(main, "div, span, h2, h3, h4", /^\s*STREAMING\s*$/i),
            helpers.findNodeByTextWithin(main, "div, span, h2, h3, h4", /^\s*RENT\/BUY\s*$/i),
            document.querySelector('main [data-testid*="stream"] h2, main [data-testid*="stream"] h3'),
            document.querySelector('main [data-testid*="watch"] h2, main [data-testid*="watch"] h3'),
            helpers.findNodeByTextWithin(main, "div, span, h2, h3, h4, a, button", /\b(streaming|rent\/buy|watch options)\b/i),
            helpers.findSectionByHeading(/\b(streaming|rent\/buy|watch options|watch now|guarda il film|dove guardare)\b/i),
          document.querySelector('[data-testid="tm-box-wl"]'),
          document.querySelector('[data-testid="hero-subnav-bar-all-topics"]'),
          document.querySelector("h1")
          ]);
        });
      }
    },
    {
      id: "trakt",
      settingKey: "showOnTrakt",
      matchesHost(host) {
        return host === "trakt.tv" || host === "app.trakt.tv";
      },
      enhance(context) {
        enhanceDetailPage(context, ({ document, helpers }) => helpers.firstVisible([
          helpers.findHeadingByText(/\b(dove guardare|where to watch|watch now|streaming)\b/i),
          helpers.findSectionByHeading(/\b(dove guardare|where to watch|watch now|streaming)\b/i),
          document.querySelector("aside h2, aside h3"),
          document.querySelector("aside"),
          document.querySelector("h1")
        ]));
      }
    },
    {
      id: "letterboxd",
      settingKey: "showOnLetterboxd",
      matchesHost(host) {
        return host === "letterboxd.com";
      },
      enhance(context) {
        enhanceDetailPage(context, ({ document, helpers }) => helpers.firstVisible([
          document.querySelector(".watch-panel .title"),
          document.querySelector("#watch h2, #watch h3, .watch-panel h2, .watch-panel h3"),
          helpers.findHeadingByText(/\b(where to watch|watch|dove guardare)\b/i),
          helpers.findSectionByHeading(/\b(where to watch|watch|dove guardare)\b/i),
          document.querySelector("#tab-watch"),
          document.querySelector('[data-tab="watch"]'),
          document.querySelector("h1.headline-1, h1")
        ]));
      }
    },
    {
      id: "justwatch",
      settingKey: "showOnJustWatch",
      matchesHost(host) {
        return host === "www.justwatch.com";
      },
      enhance(context) {
        enhanceDetailPage(context, ({ document, helpers }) => helpers.firstVisible([
          document.querySelector("#where-to-watch h1, #where-to-watch h2, #where-to-watch h3"),
          document.querySelector("#where-to-watch"),
          helpers.findHeadingByText(/\b(guarda ora|where to watch|watch now|stream)\b/i),
          helpers.findSectionByHeading(/\b(guarda ora|where to watch|watch now|stream)\b/i),
          document.querySelector("h1")
        ]));
      }
    },
    {
      id: "wikipedia",
      settingKey: "showOnWikipedia",
      matchesHost(host) {
        return host.endsWith(".wikipedia.org");
      },
      enhance(context) {
        enhanceDetailPage(context, ({ document, helpers }) => helpers.firstVisible([
          document.querySelector(".infobox caption"),
          document.querySelector(".infobox th"),
          document.querySelector(".infobox"),
          document.querySelector("#firstHeading")
        ]));
      }
    }
  ];

  function getSiteModuleForHost(host) {
    return siteModules.find((siteModule) => siteModule.matchesHost(host)) || null;
  }

  global.NuvioSiteModules = {
    getSiteModuleForHost,
    siteModules
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
