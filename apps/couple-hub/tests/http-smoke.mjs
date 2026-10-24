import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3010";
const accounts = [];
async function call(account, path, method = "GET", body) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(account.cookie ? { Cookie: account.cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const next = response.headers.get("set-cookie");
  if (next) account.cookie = next.split(";")[0];
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  return value;
}
async function create() {
  const account = { password: randomBytes(24).toString("hex"), cookie: "" };
  await call(account, "/api/auth", "POST", {
    action: "register",
    name: "HTTP QA",
    username: `qa_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
    password: account.password,
  });
  accounts.push(account);
  return account;
}
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20000);
try {
  const a = await create();
  const b = await create();
  const saved = await call(a, "/api/data", "POST", {
    collection: "books",
    record: {
      title: "HTTP QA book",
      status: "reading",
      totalPages: 100,
      progressPage: 10,
    },
  });
  const id = saved.books[0].id;
  const invite = await call(a, "/api/couple", "POST", { action: "invite" });
  await call(b, "/api/couple", "POST", {
    action: "join",
    token: invite.token,
    consent: true,
  });
  const stream = await fetch(origin + "/api/events", {
    headers: { Cookie: b.cookie },
    signal: controller.signal,
  });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const readChange = async () => {
    let text = "";
    while (!text.includes("event: change")) {
      const part = await reader.read();
      assert.equal(part.done, false);
      text += new TextDecoder().decode(part.value);
    }
    assert.ok(!text.includes("book"));
    return text;
  };
  await readChange();
  const started = Date.now();
  await call(a, "/api/data", "PATCH", {
    collection: "books",
    id,
    record: { title: "Updated over HTTP" },
  });
  await readChange();
  assert.ok(Date.now() - started < 10000);
  const shared = await call(b, "/api/data");
  assert.equal(shared.books[0].title, "Updated over HTTP");
  await call(a, "/api/couple", "POST", { action: "disconnect" });
  assert.equal((await call(b, "/api/data")).books.length, 0);
  assert.equal((await call(a, "/api/data")).books.length, 1);
  controller.abort();
  await reader.cancel().catch(() => {});
  console.log(
    "PASS: real HTTP login, persistence, partner SSE update and access revocation.",
  );
} finally {
  clearTimeout(timer);
  controller.abort();
  for (const account of accounts)
    await call(account, "/api/account", "DELETE", {
      password: account.password,
    });
}
