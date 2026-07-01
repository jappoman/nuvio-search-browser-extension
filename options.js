(function runOptions(global) {
  "use strict";

  const browserApi = global.NuvioBrowserApi;
  const core = global.NuvioCore;

  function settingKeys() {
    return Object.keys(core.DEFAULT_SETTINGS);
  }

  function siteSettingKeys() {
    return settingKeys().filter((key) => key !== "fallbackToAssistant");
  }

  function setChecked(keys, value) {
    keys.forEach((key) => {
      const input = document.getElementById(key);
      if (input) {
        input.checked = value;
      }
    });
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
    document.getElementById("enableAllSites").addEventListener("click", () => {
      setChecked(siteSettingKeys(), true);
    });
    document.getElementById("disableAllSites").addEventListener("click", () => {
      setChecked(siteSettingKeys(), false);
    });
    document.getElementById("save").addEventListener("click", () => {
      void saveOptions();
    });
  });
})(globalThis);
