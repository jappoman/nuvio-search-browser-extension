(function initBrowserApi(global) {
  "use strict";

  const extensionApi = global.browser || global.chrome;

  function wrapCall(invoker, fallbackValue) {
    return new Promise((resolve) => {
      try {
        invoker((value) => {
          const error = extensionApi && extensionApi.runtime && extensionApi.runtime.lastError;
          if (error) {
            resolve(fallbackValue);
            return;
          }
          resolve(value);
        });
      } catch (_) {
        resolve(fallbackValue);
      }
    });
  }

  const browserApi = {
    runtime: extensionApi.runtime,
    storage: {
      get(keys) {
        return wrapCall((done) => extensionApi.storage.local.get(keys, done), {});
      },
      set(values) {
        return wrapCall((done) => extensionApi.storage.local.set(values, done), undefined);
      }
    }
  };

  global.NuvioBrowserApi = browserApi;
})(globalThis);
