const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadScript(filePath) {
  return fs.readFileSync(path.join(__dirname, "..", filePath), "utf8");
}

function createEnvironment(html, url, settings = {}) {
  const dom = new JSDOM(html, {
    url,
    runScripts: "outside-only"
  });
  const openCalls = [];

  dom.window.NuvioBrowserApi = {
    runtime: {
      getURL(value) {
        return `moz-extension://test/${value}`;
      }
    },
    storage: {
      get() {
        return Promise.resolve(settings);
      },
      set() {
        return Promise.resolve();
      }
    }
  };

  dom.window.__openCalls = openCalls;
  dom.window.open = (...args) => {
    openCalls.push(args);
    return ({
    document: {
      title: "",
      body: {
        innerHTML: ""
      }
    },
    location: {
      replace() {}
    },
    close() {},
    closed: false
    });
  };

  dom.window.eval(loadScript("core.js"));
  dom.window.eval(loadScript("site-modules.js"));
  dom.window.eval(loadScript("content.js"));
  return dom;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

async function waitForObserver() {
  await new Promise((resolve) => setTimeout(resolve, 325));
}

describe("content script integration", () => {
  it("injects a Nuvio button on Google IMDb results", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <div class="g">
            <a href="https://www.imdb.com/title/tt0137523/">
              <h3>Fight Club</h3>
            </a>
            <span>1999 film</span>
          </div>
        </body>
      </html>
    `, "https://www.google.com/search?q=fight+club");

    await flush();

    const button = dom.window.document.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
    expect(button.alt).toBe("Open in Nuvio");
  });

  it("injects a Nuvio button in the Google watch panel", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <div class="kp-wholepage">
            <div data-attrid="title">Interstellar</div>
            <div>
              <a href="https://www.imdb.com/title/tt0816692/">
                <h3>Interstellar - IMDb</h3>
              </a>
            </div>
            <div class="watch-chip">Guarda il film</div>
          </div>
        </body>
      </html>
    `, "https://www.google.com/search?q=interstellar");

    await flush();

    const watchChip = dom.window.document.querySelector(".watch-chip");
    const button = watchChip.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button in the Google watch panel even without an imdb result link", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <div class="kp-wholepage">
            <div data-attrid="title">Interstellar</div>
            <div class="watch-chip">Guarda il film</div>
          </div>
        </body>
      </html>
    `, "https://www.google.com/search?q=interstellar");

    await flush();

    const watchChip = dom.window.document.querySelector(".watch-chip");
    const button = watchChip.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button on a Google provider link matched through xpath", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <div id="root">
            <div></div>
            <div></div>
            <div>ignore</div>
          </div>
          <div class="kp-wholepage">
            <div data-attrid="title">Interstellar</div>
            <a class="provider-link" href="https://www.timvision.it/">TIM Vision</a>
          </div>
        </body>
      </html>
    `, "https://www.google.com/search?q=interstellar");

    const originalEvaluate = dom.window.document.evaluate.bind(dom.window.document);
    dom.window.document.evaluate = (xpath, contextNode, resolver, type, result) => {
      if (xpath === "/html/body/div[3]/div/div[11]/div[5]/div/div[1]/div[5]/div/div/div/div/div[2]/div/div/div/div[1]/div[1]/a") {
        return { singleNodeValue: dom.window.document.querySelector(".provider-link") };
      }

      return originalEvaluate(xpath, contextNode, resolver, type, result);
    };

    await flush();

    const providerLink = dom.window.document.querySelector(".provider-link");
    const button = providerLink.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button in the IMDb streaming area on localized pages", async () => {
    const dom = createEnvironment(`
      <html>
        <head><title>Interstellar (2014) - IMDb</title></head>
        <body>
          <nav>
            <a>Cosa c'è in TV e in streaming</a>
          </nav>
          <main>
          <h1>Interstellar</h1>
          <section class="streaming-box">
            <h2 class="streaming-title">STREAMING</h2>
          </section>
          </main>
        </body>
      </html>
    `, "https://www.imdb.com/it/title/tt0816692/");

    await flush();

    const heading = dom.window.document.querySelector(".streaming-title");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
    expect(dom.window.document.querySelector("nav .nuvio-open-button")).toBeFalsy();
  });

  it("injects a Nuvio button in the Letterboxd where-to-watch section", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <h1 class="headline-1">Interstellar</h1>
          <div class="watch-panel">
            <h3 class="title">Where to watch</h3>
            <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
          </div>
        </body>
      </html>
    `, "https://letterboxd.com/film/interstellar/");

    await flush();

    const heading = dom.window.document.querySelector(".watch-panel .title");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button on localized JustWatch pages in the watch section", async () => {
    const dom = createEnvironment(`
      <html>
        <head><title>Interstellar streaming: dove guardarlo online?</title></head>
        <body>
          <h1>Interstellar</h1>
          <section id="where-to-watch">
            <h2 class="watch-heading">GUARDA ORA</h2>
          </section>
          <div>tt0816692</div>
        </body>
      </html>
    `, "https://www.justwatch.com/it/film/interstellar");

    await flush();

    const heading = dom.window.document.querySelector(".watch-heading");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button on app.trakt.tv watch sections", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <h1>Interstellar</h1>
          <aside class="watch-sidebar">
            <h2 class="watch-heading">Dove Guardare</h2>
          </aside>
          <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
        </body>
      </html>
    `, "https://app.trakt.tv/movies/interstellar-2014?mode=media");

    await flush();

    const heading = dom.window.document.querySelector(".watch-heading");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button on Trakt watch sections even without an imdb id in the DOM", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <h1>Interstellar</h1>
          <div>2014</div>
          <aside class="watch-sidebar">
            <h2 class="watch-heading">Where to Watch</h2>
          </aside>
        </body>
      </html>
    `, "https://app.trakt.tv/movies/interstellar-2014?mode=media");

    await flush();

    const heading = dom.window.document.querySelector(".watch-heading");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button into DuckDuckGo quick links imdb entries", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <section class="quick-links">
            <h2>Collegamenti rapidi</h2>
            <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
          </section>
        </body>
      </html>
    `, "https://duckduckgo.com/?q=interstellar");

    await flush();

    const imdbLink = dom.window.document.querySelector(".quick-links a");
    const button = imdbLink.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("injects a Nuvio button into the Wikipedia infobox instead of only the heading", async () => {
    const dom = createEnvironment(`
      <html>
        <body>
          <h1 id="firstHeading">Interstellar</h1>
          <table class="infobox">
            <caption>Interstellar</caption>
            <tr><td>2014 film</td></tr>
          </table>
          <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
        </body>
      </html>
    `, "https://en.wikipedia.org/wiki/Interstellar_(film)");

    await flush();

    const caption = dom.window.document.querySelector(".infobox caption");
    const button = caption.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });

  it("moves the button from a fallback heading to the watch section when it appears later", async () => {
    const dom = createEnvironment(`
      <html>
        <head><title>Interstellar streaming: dove guardarlo online?</title></head>
        <body>
          <h1>Interstellar</h1>
          <div>tt0816692</div>
        </body>
      </html>
    `, "https://www.justwatch.com/it/film/interstellar");

    await flush();

    expect(Boolean(dom.window.document.querySelector("h1 .nuvio-open-button"))).toBe(true);

    const section = dom.window.document.createElement("section");
    section.id = "where-to-watch";
    section.innerHTML = "<h2 class='watch-heading'>GUARDA ORA</h2>";
    dom.window.document.body.appendChild(section);

    await waitForObserver();

    expect(Boolean(dom.window.document.querySelector("h1 .nuvio-open-button"))).toBe(false);
    expect(Boolean(dom.window.document.querySelector(".watch-heading .nuvio-open-button"))).toBe(true);
    expect(dom.window.document.querySelectorAll(".nuvio-open-button").length).toBe(1);
  });

  it("does not open about:blank before falling back to the assistant page", async () => {
    const dom = createEnvironment(`
      <html>
        <head><title>Interstellar streaming: dove guardarlo online?</title></head>
        <body>
          <h1>Interstellar</h1>
          <section id="where-to-watch">
            <h2 class="watch-heading">GUARDA ORA</h2>
          </section>
          <div>tt0816692</div>
        </body>
      </html>
    `, "https://www.justwatch.com/it/film/interstellar");

    await flush();

    const button = dom.window.document.querySelector(".nuvio-open-button");
    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1300));

    expect(dom.window.__openCalls).toEqual([]);
  });

});
