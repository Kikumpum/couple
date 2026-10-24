import { randomUUID, randomBytes } from "node:crypto";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3010";
const password = randomBytes(24).toString("hex");
let cookie;
async function call(path, method = "GET", body) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const next = response.headers.get("set-cookie");
  if (next) cookie = next.split(";")[0];
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error?.message || `HTTP ${response.status}`);
  return value;
}
try {
  await call("/api/auth", "POST", {
    action: "register",
    name: "QA Pasar",
    email: `qa-${randomUUID()}@example.test`,
    password,
  });
  for (const [market, symbol, currency] of [
    ["idx", "BBCA", "IDR"],
    ["us", "AAPL", "USD"],
    ["crypto", "XRP", "IDR"],
    ["crypto", "HYPE", "USD"],
  ]) {
    await call("/api/data", "POST", {
      collection: "watchlist",
      record: { market, symbol, currency },
    });
  }
  for (const market of ["idx", "us", "crypto"]) {
    const value = await call(`/api/markets?market=${market}`);
    console.log(JSON.stringify({ market, assets: value.assets }));
  }
} finally {
  if (cookie) await call("/api/account", "DELETE", { password });
}
