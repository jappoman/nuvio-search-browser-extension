(function runOptions(global) {
  "use strict";

  const browserApi = global.NuvioBrowserApi;
  const core = global.NuvioCore;

  function settingKeys() {
    return Object.keys(core.DEFAULT_SETTINGS);
  }

  async function restoreOptions() {
    const settings = Object.assign({}, core.DEFAULT_SETTINGS, await browserApi.storage.get(core.DEFAULT_SETTINGS));
    settingKeys().forEach((key) => {
      const input = document.getElementById(key);
      if (input) {
        input.checked = Boolean(settings[key]);
      }
    });
  }

  async function saveOptions() {
    const settings = {};
    settingKeys().forEach((key) => {
      const input = document.getElementById(key);
      settings[key] = Boolean(input && input.checked);
    });
    await browserApi.storage.set(settings);
    const status = document.getElementById("status");
    status.textContent = "Settings saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1800);
  }

  document.addEventListener("DOMContentLoaded", () => {
    void restoreOptions();
    document.getElementById("save").addEventListener("click", () => {
      void saveOptions();
    });
  });
})(globalThis);
