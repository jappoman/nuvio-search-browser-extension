(function runLaunchPage() {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const title = params.get("title") || "Selected title";
  const year = params.get("year") || "";
  const type = params.get("type") || "movie";
  const imdbId = params.get("imdbId") || "";
  const appUrl = params.get("appUrl") || "";
  const query = params.get("query") || [title, year, imdbId].filter(Boolean).join(" ");

  document.getElementById("summary").textContent =
    [title, year && "(" + year + ")", "•", type, imdbId && "• " + imdbId].filter(Boolean).join(" ");
  document.getElementById("queryBox").textContent = query;

  if (navigator.clipboard && query) {
    navigator.clipboard.writeText(query).catch(() => {});
  }

  document.getElementById("openApp").addEventListener("click", () => {
    if (appUrl) {
      window.location.href = appUrl;
    }
  });

  document.getElementById("openSite").addEventListener("click", () => {
    window.open("https://nuvio.tv/", "_blank", "noopener");
  });
})();
