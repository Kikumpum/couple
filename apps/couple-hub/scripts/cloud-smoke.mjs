import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { cloudCall } from "./vercel-http.mjs";
const origin = process.env.TEST_ORIGIN;
assert.ok(
  /^https:\/\/couple-[a-z0-9-]+\.vercel\.app$/.test(origin || ""),
  "Set TEST_ORIGIN to a Couple preview",
);
const accounts = [];
function call(a, path, method, body, expected = 200) {
  const r = cloudCall(origin, a, path, method, body);
  assert.equal(
    r.status,
    expected,
    `HTTP ${r.status}: ${r.value?.error?.code || "unexpected"}`,
  );
  return r.value;
}
try {
  for (let i = 0; i < 2; i++) {
    const a = { cookie: "", password: randomBytes(24).toString("hex") };
    const registered = call(a, "/api/auth", "POST", {
      action: "register",
      name: "Cloud QA",
      username: "qa_" + randomUUID().replaceAll("-", "").slice(0, 20),
      password: a.password,
    });
    a.id = registered.user.id;
    accounts.push(a);
  }
  const [a, b] = accounts;
  const saved = call(a, "/api/data", "POST", {
    collection: "books",
    record: {
      title: "Disposable cloud QA",
      status: "reading",
      totalPages: 100,
      progressPage: 10,
    },
  });
  const book = saved.books[0];
  assert.equal(call(b, "/api/data").books.length, 0);
  const invite = call(a, "/api/couple", "POST", { action: "invite" });
  call(b, "/api/couple", "POST", {
    action: "join",
    token: invite.token,
    consent: true,
  });
  assert.equal(call(b, "/api/data").books[0].id, book.id);
  call(
    b,
    "/api/data",
    "PATCH",
    { collection: "books", id: book.id, record: { title: "Forbidden" } },
    404,
  );
  call(a, "/api/data", "PATCH", {
    collection: "books",
    id: book.id,
    record: { title: "Cloud persistence verified" },
  });
  assert.equal(
    call(b, "/api/data").books[0].title,
    "Cloud persistence verified",
  );
  call(a, "/api/data", "POST", {
    collection: "periods",
    record: { startDate: "2026-10-01", endDate: "2026-10-05", symptoms: "" },
  });
  assert.equal(call(b, "/api/data").periods.length, 0);
  call(a, "/api/couple", "POST", { action: "shareHealth", shareHealth: true });
  assert.equal(call(b, "/api/data").periods.length, 1);
  call(a, "/api/couple", "POST", { action: "shareHealth", shareHealth: false });
  assert.equal(call(b, "/api/data").periods.length, 0);
  call(a, "/api/couple", "POST", { action: "disconnect" });
  assert.equal(call(b, "/api/data").books.length, 0);
  assert.equal(call(a, "/api/data").books.length, 1);
  console.log(
    "PASS cloud: auth, persistence, pairing, owner authorization, health consent and revocation.",
  );
} finally {
  for (const a of accounts)
    call(a, "/api/account", "DELETE", { password: a.password });
  console.log("Disposable QA accounts removed.");
}
