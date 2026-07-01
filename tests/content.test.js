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

  dom.window.open = () => ({
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

  dom.window.eval(loadScript("core.js"));
  dom.window.eval(loadScript("content.js"));
  return dom;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 25));
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

  it("injects a Nuvio button on JustWatch detail pages", async () => {
    const dom = createEnvironment(`
      <html>
        <head><title>Game of Thrones streaming: where to watch online?</title></head>
        <body>
          <h1>Game of Thrones</h1>
          <div>tt0944947</div>
        </body>
      </html>
    `, "https://www.justwatch.com/us/tv-show/game-of-thrones");

    await flush();

    const heading = dom.window.document.querySelector("h1");
    const button = heading.querySelector(".nuvio-open-button");
    expect(button).toBeTruthy();
  });
});
