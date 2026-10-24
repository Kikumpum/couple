/* Run: node --test tests/backend.integration.cjs */
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { spawn, execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "couple-backend-"));
process.env.COUPLE_DB_PATH = path.join(temporary, "integration.sqlite");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
  return originalResolve.call(this, name, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(output, filename);
};
const routes = Object.fromEntries(
  ["auth", "data", "couple", "account", "movies", "markets", "events"].map(
    (name) => [name, require(path.join(root, "src/app/api", name, "route.ts"))],
  ),
);
const { db } = require("../src/server/db.ts");
const { hash } = require("../src/server/auth.ts");
let server;
let serverOutput = "";
const httpUrl =
  process.env.BACKEND_NEXT === "1" ? "http://127.0.0.1:3017" : null;
after(() => {
  if (server && server.exitCode === null) {
    if (process.platform === "win32")
      execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    else server.kill("SIGTERM");
  }
  db().close();
  fs.rmSync(temporary, { recursive: true, force: true });
});
async function request(
  route,
  method = "GET",
  input,
  cookie = "",
  origin = "http://localhost:3000",
) {
  const headers = { cookie, origin, "content-type": "application/json" };
  const target = httpUrl || "http://localhost:3000";
  if (httpUrl && origin === "http://localhost:3000") headers.origin = httpUrl;
  const init = {
    method,
    headers,
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  };
  const response = httpUrl
    ? await fetch(`${target}/api/${route}`, init)
    : await routes[route][method](new Request(`${target}/api/${route}`, init));
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    response,
  };
}
async function register(name) {
  const result = await request("auth", "POST", {
    action: "register",
    name,
    email: `${name}@example.com`,
    password: "Correct horse battery 9",
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.match(
    result.response.headers.get("set-cookie"),
    /HttpOnly; SameSite=Lax/,
  );
  return { cookie: result.cookie, user: result.data.user };
}
test("secure account, CRUD, couple consent and lifecycle integration", async () => {
  if (httpUrl) {
    server = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3017",
      ],
      {
        cwd: root,
        env: { ...process.env, TMDB_API_TOKEN: "" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    for (const stream of [server.stdout, server.stderr])
      stream.on("data", (value) => {
        serverOutput = (serverOutput + value).slice(-12000);
      });
    let ready = false;
    for (let i = 0; i < 90; i++) {
      try {
        const res = await fetch(`${httpUrl}/api/auth`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {}
      if (server.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.ok(ready, serverOutput);
  }
  const a = await register("alice");
  const b = await register("bob");
  const c = await register("charlie");
  const named = await request("auth", "POST", {
    action: "register",
    username: "diana",
    name: "Diana",
    password: "Testing account password!",
  });
  assert.equal(named.status, 200);
  const namedLogin = await request("auth", "POST", {
    action: "login",
    identifier: "DIANA",
    password: "Testing account password!",
  });
  assert.equal(namedLogin.status, 200);
  assert.equal(namedLogin.data.user.username, "diana");
  assert.equal(namedLogin.data.finances.length, 0);
  assert.equal((await request("data")).status, 401);
  assert.equal(
    (
      await request(
        "auth",
        "POST",
        { action: "logout" },
        a.cookie,
        "https://evil.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("auth", "POST", { action: "logout" }, a.cookie, "")).status,
    403,
  );
  assert.equal(
    (
      await request("auth", "POST", {
        action: "login",
        email: "alice@example.com",
        password: "bad password long",
      })
    ).status,
    401,
  );
  const login = await request("auth", "POST", {
    action: "login",
    email: "ALICE@example.com",
    password: "Correct horse battery 9",
  });
  assert.equal(login.status, 200);
  const token = login.cookie.split("=")[1];
  assert.ok(
    db().prepare("SELECT hash FROM sessions WHERE hash=?").get(hash(token)),
  );
  assert.equal(
    db().prepare("SELECT hash FROM sessions WHERE hash=?").get(token),
    undefined,
  );
  assert.ok(
    !db()
      .prepare("SELECT password FROM users WHERE id=?")
      .get(a.user.id)
      .password.includes("Correct"),
  );
  const fixtures = {
    goals: {
      name: "Wedding",
      targetAmount: 100000000,
      targetDate: "2027-01-31",
    },
    finances: {
      type: "saving",
      title: "Deposit",
      amount: 1000000,
      date: "2026-10-24",
      category: "Joint",
    },
    periods: {
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      cycleLength: 28,
      periodLength: 5,
      symptoms: "cramps",
      notes: "private",
    },
    books: {
      title: "Reading",
      author: "An author",
      category: "Fiction",
      status: "reading",
      rating: 4,
      totalPages: 200,
      progressPage: 10,
    },
    plans: {
      title: "Movie",
      date: "2026-11-01",
      movieId: 1,
      notes: "",
      rating: 4,
      status: "planned",
    },
    reminders: { title: "Dinner", date: "2026-11-01T19:30", done: false },
    investments: {
      name: "Gold",
      symbol: "XAU",
      type: "gold",
      units: 0.5,
      averagePrice: 1000000,
      date: "2026-10-24",
    },
    watchlist: { market: "us", symbol: "AAPL", currency: "USD" },
  };
  const ids = {};
  for (const [collection, record] of Object.entries(fixtures)) {
    const result = await request(
      "data",
      "POST",
      { collection, record },
      a.cookie,
    );
    assert.equal(result.status, 200, JSON.stringify(result.data));
    ids[collection] = result.data[collection][0].id;
  }
  for (const [collection, record] of Object.entries(fixtures)) {
    const patched = await request(
      "data",
      "PATCH",
      { collection, id: ids[collection], record },
      a.cookie,
    );
    assert.equal(patched.status, 200);
    assert.equal(
      (
        await request(
          "data",
          "PATCH",
          { collection, id: ids[collection], record },
          b.cookie,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          "data",
          "DELETE",
          { collection, id: ids[collection] },
          b.cookie,
        )
      ).status,
      404,
    );
  }
  assert.equal(
    (
      await request(
        "data",
        "POST",
        {
          collection: "periods",
          record: { ...fixtures.periods, startDate: "2026-02-30" },
        },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "data",
        "POST",
        {
          collection: "reminders",
          record: { title: "Bad", date: "2026-11-01T24:30" },
        },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "data",
        "POST",
        {
          collection: "finances",
          record: { ...fixtures.finances, amount: 1.5 },
        },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "data",
        "POST",
        {
          collection: "books",
          record: { ...fixtures.books, userId: b.user.id },
        },
        a.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "data",
        "PATCH",
        {
          collection: "finances",
          id: ids.finances,
          record: { goalId: ids.goals },
        },
        b.cookie,
      )
    ).status,
    404,
  );
  const invite = await request(
    "couple",
    "POST",
    { action: "invite" },
    a.cookie,
  );
  assert.equal(invite.status, 200);
  assert.equal(
    (
      await request(
        "couple",
        "POST",
        { action: "join", token: invite.data.token },
        b.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "couple",
        "POST",
        { action: "join", token: invite.data.token, consent: true },
        b.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "couple",
        "POST",
        { action: "join", token: invite.data.token, consent: true },
        c.cookie,
      )
    ).status,
    400,
  );
  let shared = await request("data", "GET", undefined, b.cookie);
  assert.equal(shared.data.books.length, 1);
  assert.equal(shared.data.watchlist.length, 0);
  assert.deepEqual(
    (await request("markets", "GET", undefined, b.cookie)).data.assets,
    [],
  );
  assert.equal(shared.data.periods.length, 0);
  assert.equal(shared.data.partner.email, undefined);
  assert.equal(shared.data.user.shareHealth, false);
  const strangerVersion = db()
    .prepare("SELECT version FROM user_changes WHERE userId=?")
    .get(c.user.id)?.version;
  const partnerVersion =
    db()
      .prepare("SELECT version FROM user_changes WHERE userId=?")
      .get(b.user.id)?.version ?? 0;
  await request(
    "data",
    "PATCH",
    { collection: "books", id: ids.books, record: { title: "Updated book" } },
    a.cookie,
  );
  assert.ok(
    db()
      .prepare("SELECT version FROM user_changes WHERE userId=?")
      .get(b.user.id).version > partnerVersion,
  );
  assert.equal(
    db()
      .prepare("SELECT version FROM user_changes WHERE userId=?")
      .get(c.user.id)?.version,
    strangerVersion,
  );
  await request("account", "PATCH", { theme: "dark" }, b.cookie);
  assert.equal(
    (await request("data", "GET", undefined, b.cookie)).data.user.theme,
    "dark",
  );
  assert.equal(
    (await request("data", "GET", undefined, a.cookie)).data.user.theme,
    "light",
  );
  if (!httpUrl) {
    assert.equal(
      (await routes.events.GET(new Request("http://localhost:3000/api/events")))
        .status,
      401,
    );
    const abort = new AbortController();
    const stream = await routes.events.GET(
      new Request("http://localhost:3000/api/events", {
        headers: { cookie: b.cookie },
        signal: abort.signal,
      }),
    );
    const reader = stream.body.getReader();
    assert.match(
      new TextDecoder().decode((await reader.read()).value),
      /retry: 3000/,
    );
    assert.match(
      new TextDecoder().decode((await reader.read()).value),
      /event: change\ndata: \d+/,
    );
    await request(
      "data",
      "PATCH",
      {
        collection: "books",
        id: ids.books,
        record: { title: "Realtime update" },
      },
      a.cookie,
    );
    const next = await reader.read();
    assert.match(
      new TextDecoder().decode(next.value),
      /^event: change\ndata: \d+\n\n$/,
    );
    abort.abort();
    await reader.cancel();
  }
  assert.equal(
    (
      await request(
        "data",
        "PATCH",
        { collection: "books", id: ids.books, record: { title: "Hijacked" } },
        b.cookie,
      )
    ).status,
    404,
  );
  await request(
    "couple",
    "POST",
    { action: "shareHealth", shareHealth: true },
    a.cookie,
  );
  assert.equal(
    (await request("data", "GET", undefined, b.cookie)).data.periods.length,
    1,
  );
  await request(
    "couple",
    "POST",
    { action: "shareHealth", shareHealth: false },
    a.cookie,
  );
  assert.equal(
    (await request("data", "GET", undefined, b.cookie)).data.periods.length,
    0,
  );
  const linked = await request(
    "data",
    "POST",
    {
      collection: "finances",
      record: { ...fixtures.finances, goalId: ids.goals },
    },
    b.cookie,
  );
  assert.equal(linked.status, 200);
  await request(
    "data",
    "DELETE",
    { collection: "goals", id: ids.goals },
    a.cookie,
  );
  assert.equal(
    (await request("data", "GET", undefined, b.cookie)).data.finances.find(
      (r) => r.userId === b.user.id,
    ).goalId,
    null,
  );
  await request("couple", "POST", { action: "disconnect" }, b.cookie);
  shared = await request("data", "GET", undefined, b.cookie);
  assert.equal(shared.data.partner, null);
  assert.equal(shared.data.books.length, 0);
  assert.equal(shared.data.finances.length, 1);
  assert.equal(
    (await request("data", "GET", undefined, a.cookie)).data.books.length,
    1,
  );
  const expired = await request(
    "couple",
    "POST",
    { action: "invite" },
    a.cookie,
  );
  db().prepare("UPDATE invites SET expiresAt=0 WHERE userId=?").run(a.user.id);
  assert.equal(
    (
      await request(
        "couple",
        "POST",
        { action: "join", token: expired.data.token, consent: true },
        b.cookie,
      )
    ).status,
    400,
  );
  const revoked = await request(
    "couple",
    "POST",
    { action: "invite" },
    a.cookie,
  );
  await request("couple", "POST", { action: "revoke" }, a.cookie);
  assert.equal(
    (
      await request(
        "couple",
        "POST",
        { action: "join", token: revoked.data.token, consent: true },
        b.cookie,
      )
    ).status,
    400,
  );
  const again = await request("couple", "POST", { action: "invite" }, a.cookie);
  await request(
    "couple",
    "POST",
    { action: "join", token: again.data.token, consent: true },
    b.cookie,
  );
  assert.equal(
    (
      await request(
        "account",
        "DELETE",
        { password: "wrong password" },
        a.cookie,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await request(
        "account",
        "DELETE",
        { password: "Correct horse battery 9" },
        a.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await request("data", "GET", undefined, a.cookie)).status, 401);
  const survivor = await request("data", "GET", undefined, b.cookie);
  assert.equal(survivor.data.partner, null);
  assert.equal(survivor.data.finances.length, 1);
  delete process.env.TMDB_API_TOKEN;
  assert.equal(
    (await request("movies", "GET", undefined, b.cookie)).status,
    503,
  );
  const loggedOut = await request(
    "auth",
    "POST",
    { action: "logout" },
    b.cookie,
  );
  assert.equal(loggedOut.status, 200);
  assert.equal((await request("data", "GET", undefined, b.cookie)).status, 401);
  for (let i = 0; i < 10; i++)
    await request("auth", "POST", {
      action: "login",
      email: "unknown@example.com",
      password: "incorrect password",
    });
  assert.equal(
    (
      await request("auth", "POST", {
        action: "login",
        email: "unknown@example.com",
        password: "incorrect password",
      })
    ).status,
    429,
  );
  assert.ok(
    db()
      .prepare("SELECT attempts FROM throttle WHERE key=?")
      .get(hash("auth:unknown@example.com")).attempts > 10,
  );
});
