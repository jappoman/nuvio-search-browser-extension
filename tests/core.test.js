const { JSDOM } = require("jsdom");
const core = require("../core.js");

function makeDom(html, url) {
  return new JSDOM(html, { url });
}

describe("core helpers", () => {
  it("parses imdb ids from urls", () => {
    expect(core.parseImdbIdFromUrl("https://www.imdb.com/title/tt0137523/")).toBe("tt0137523");
  });

  it("builds the official nuvio meta deep link", () => {
    expect(core.buildNuvioAppUrl({ type: "series", imdbId: "tt0944947" }))
      .toBe("nuvio://meta?type=series&id=tt0944947");
  });

  it("infers series from descriptive text", () => {
    expect(core.inferMediaTypeFromText("Breaking Bad TV Series 2008 2013")).toBe("series");
    expect(core.inferMediaTypeFromText("Fight Club 1999")).toBe("movie");
  });
});

describe("detail page extraction", () => {
  it("extracts metadata from a letterboxd page", () => {
    const dom = makeDom(`
      <html>
        <head><title>Fight Club • Letterboxd</title></head>
        <body data-tmdb-id="550">
          <h1 class="headline-1">Fight Club</h1>
          <p>1999</p>
          <a href="https://www.imdb.com/title/tt0137523/maindetails">IMDb</a>
        </body>
      </html>
    `, "https://letterboxd.com/film/fight-club/");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0137523",
      title: "Fight Club",
      year: "1999",
      type: "movie"
    });
  });

  it("extracts metadata from a justwatch tv page", () => {
    const dom = makeDom(`
      <html>
        <head><title>Game of Thrones streaming: where to watch online?</title></head>
        <body>
          <h1>Game of Thrones</h1>
          <script type="application/ld+json">{"dateCreated":"2011-04-17"}</script>
          <div>tt0944947</div>
        </body>
      </html>
    `, "https://www.justwatch.com/us/tv-show/game-of-thrones");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0944947",
      title: "Game of Thrones",
      year: "2011",
      type: "series"
    });
  });

  it("extracts metadata from localized imdb pages", () => {
    const dom = makeDom(`
      <html>
        <head><title>Interstellar (2014) - IMDb</title></head>
        <body>
          <h1>Interstellar</h1>
        </body>
      </html>
    `, "https://www.imdb.com/it/title/tt0816692/");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0816692",
      title: "Interstellar",
      year: "2014",
      type: "movie"
    });
  });

  it("extracts metadata from localized justwatch film pages", () => {
    const dom = makeDom(`
      <html>
        <head><title>Interstellar streaming: dove guardarlo online?</title></head>
        <body>
          <h1>Interstellar</h1>
          <div>2014</div>
          <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
        </body>
      </html>
    `, "https://www.justwatch.com/it/film/interstellar");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0816692",
      title: "Interstellar",
      year: "2014",
      type: "movie"
    });
  });

  it("extracts metadata from app.trakt.tv pages", () => {
    const dom = makeDom(`
      <html>
        <body>
          <h1>Interstellar</h1>
          <div>2014</div>
          <a href="https://www.imdb.com/title/tt0816692/">IMDb</a>
        </body>
      </html>
    `, "https://app.trakt.tv/movies/interstellar-2014?mode=media");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0816692",
      title: "Interstellar",
      year: "2014",
      type: "movie"
    });
  });

  it("extracts wikipedia pages only when an imdb link exists", () => {
    const dom = makeDom(`
      <html>
        <body>
          <h1 id="firstHeading">Fight Club</h1>
          <table class="infobox"><tr><td>1999 American film</td></tr></table>
          <a href="https://www.imdb.com/title/tt0137523/">IMDb</a>
        </body>
      </html>
    `, "https://en.wikipedia.org/wiki/Fight_Club");

    expect(core.extractDetailMetadata(dom.window.document, dom.window.location)).toEqual({
      imdbId: "tt0137523",
      title: "Fight Club",
      year: "1999",
      type: "movie"
    });
  });
});
