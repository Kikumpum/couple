const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const { marketQuote } = require("../src/server/market-data.ts");

test("quotes preserve currencies, timestamps, changes and unavailable states", async () => {
  const original = global.fetch;
  const now = Math.floor(Date.now() / 1000);
  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/AAPL"))
      return Response.json({
        chart: {
          result: [
            {
              meta: {
                currency: "USD",
                regularMarketPrice: 200,
                previousClose: 190,
                regularMarketTime: now,
                shortName: "Apple",
              },
            },
          ],
        },
      });
    if (parsed.pathname.endsWith("/BBCA.JK"))
      return Response.json({
        chart: {
          result: [
            {
              meta: {
                currency: "IDR",
                regularMarketPrice: 8500,
                chartPreviousClose: 8400,
                regularMarketTime: now,
              },
            },
          ],
        },
      });
    if (parsed.searchParams.get("ids") === "bitcoin")
      return Response.json({
        bitcoin: { usd: 95000, usd_24h_change: 1.25, last_updated_at: now },
      });
    if (parsed.searchParams.get("ids") === "ripple")
      return Response.json({
        ripple: { idr: 23000, idr_24h_change: -2.5, last_updated_at: now },
      });
    return Response.json({ error: "not available" }, { status: 503 });
  };
  try {
    const us = await marketQuote({
      market: "us",
      symbol: "AAPL",
      currency: "USD",
    });
    assert.equal(us.price, 200);
    assert.equal(us.currency, "USD");
    assert.ok(Math.abs(us.changePercent - 1000 / 190) < 0.0001);
    assert.equal(us.capturedAt, new Date(now * 1000).toISOString());
    const idx = await marketQuote({
      market: "idx",
      symbol: "BBCA",
      currency: "IDR",
    });
    assert.equal(idx.price, 8500);
    assert.equal(idx.currency, "IDR");
    const btc = await marketQuote({
      market: "crypto",
      symbol: "BTC",
      currency: "USD",
    });
    assert.equal(btc.price, 95000);
    assert.equal(btc.changePercent, 1.25);
    const xrp = await marketQuote({
      market: "crypto",
      symbol: "XRP",
      currency: "IDR",
    });
    assert.equal(xrp.price, 23000);
    assert.equal(xrp.changePercent, -2.5);
    const missing = await marketQuote({
      market: "us",
      symbol: "BAD",
      currency: "USD",
    });
    assert.equal(missing.price, null);
    assert.ok(missing.unavailable);
  } finally {
    global.fetch = original;
  }
});
