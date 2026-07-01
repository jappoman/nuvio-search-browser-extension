const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadScript(filePath) {
  return fs.readFileSync(path.join(__dirname, "..", filePath), "utf8");
}

function createEnvironment(savedSettings = {}) {
  const dom = new JSDOM(`
    <html>
      <body>
        <input type="checkbox" id="fallbackToAssistant">
        <input type="checkbox" id="showOnGoogle">
        <input type="checkbox" id="showOnDuckDuckGo">
        <input type="checkbox" id="showOnImdb">
        <input type="checkbox" id="showOnTrakt">
        <input type="checkbox" id="showOnLetterboxd">
        <input type="checkbox" id="showOnJustWatch">
        <input type="checkbox" id="showOnWikipedia">
        <button id="enableAllSites" type="button"></button>
        <button id="disableAllSites" type="button"></button>
        <button id="save" type="button"></button>
        <span id="status"></span>
      </body>
    </html>
  `, {
    url: "moz-extension://test/options.html",
    runScripts: "outside-only"
  });

  const savedPayloads = [];
  dom.window.NuvioBrowserApi = {
    storage: {
      get() {
        return Promise.resolve(savedSettings);
      },
      set(value) {
        savedPayloads.push(value);
        return Promise.resolve();
      }
    }
  };

  dom.window.eval(loadScript("core.js"));
  dom.window.eval(loadScript("options.js"));
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

  return { dom, savedPayloads };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

describe("options page", () => {
  it("can enable and disable all site toggles without changing fallback", async () => {
    const { dom } = createEnvironment({ fallbackToAssistant: false, showOnGoogle: false });
    await flush();

    dom.window.document.getElementById("enableAllSites").click();

    expect(dom.window.document.getElementById("showOnGoogle").checked).toBe(true);
    expect(dom.window.document.getElementById("showOnTrakt").checked).toBe(true);
    expect(dom.window.document.getElementById("fallbackToAssistant").checked).toBe(false);

    dom.window.document.getElementById("disableAllSites").click();

    expect(dom.window.document.getElementById("showOnGoogle").checked).toBe(false);
    expect(dom.window.document.getElementById("showOnWikipedia").checked).toBe(false);
    expect(dom.window.document.getElementById("fallbackToAssistant").checked).toBe(false);
  });

  it("saves the selected settings", async () => {
    const { dom, savedPayloads } = createEnvironment();
    await flush();

    dom.window.document.getElementById("fallbackToAssistant").checked = true;
    dom.window.document.getElementById("showOnGoogle").checked = true;
    dom.window.document.getElementById("showOnImdb").checked = true;
    dom.window.document.getElementById("save").click();
    await flush();

    expect(savedPayloads.length).toBeGreaterThan(0);
    const latestPayload = savedPayloads.at(-1);
    expect(latestPayload.fallbackToAssistant).toBe(true);
    expect(latestPayload.showOnGoogle).toBe(true);
    expect(latestPayload.showOnImdb).toBe(true);
    expect(dom.window.document.getElementById("status").textContent).toBe("Settings saved.");
  });
});
