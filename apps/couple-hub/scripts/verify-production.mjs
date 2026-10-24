import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { cloudCall, vercel } from "./vercel-http.mjs";

const [origin, backup] = process.argv.slice(2);
assert.ok(/^https:\/\/couple-[a-z0-9-]+\.vercel\.app$/.test(origin || ""));
assert.ok(backup);
process.stdout.write("Account verification password (hidden): ");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const secret = await new Promise((resolve) => {
  let value = "";
  process.stdin.resume();
  const listener = (chunk) => {
    for (const char of chunk.toString()) {
      if (char === "\u0003") process.exit(130);
      if (char === "\r" || char === "\n") {
        process.stdin.off("data", listener);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(value);
        return;
      }
      value += char;
    }
  };
  process.stdin.on("data", listener);
});
console.log();
const db = new DatabaseSync(backup, { readOnly: true });
try {
  for (const username of ["aryo", "fia"]) {
    const account = {};
    try {
      const login = cloudCall(origin, account, "/api/auth", "POST", {
        action: "login",
        identifier: username,
        password: secret,
      });
      assert.ok(
        login.status === 200 && login.value.user?.username === username,
        "Account login failed",
      );
      const source = db
        .prepare("SELECT id FROM users WHERE username=?")
        .get(username);
      assert.ok(source?.id === login.value.user.id, "Account identity changed");
      const rows = db
        .prepare("SELECT * FROM records WHERE userId=?")
        .all(source.id);
      const fresh = cloudCall(origin, account, "/api/data");
      assert.ok(fresh.status === 200, "Authenticated data request failed");
      const owned = Object.values(fresh.value)
        .filter(Array.isArray)
        .flat()
        .filter((r) => r.userId === source.id);
      assert.ok(owned.length === rows.length, "Record count mismatch");
      for (const r of rows) {
        const remote = fresh.value[r.collection]?.find((v) => v.id === r.id);
        assert.ok(
          remote &&
            remote.userId === r.userId &&
            remote.coupleId === r.coupleId,
          "Record ownership mismatch",
        );
        assert.ok(
          remote.createdAt === new Date(r.createdAt).toISOString() &&
            remote.updatedAt === new Date(r.updatedAt).toISOString(),
          "Record timestamp mismatch",
        );
        for (const [key, value] of Object.entries(JSON.parse(r.data))) {
          assert.ok(
            JSON.stringify(remote[key]) === JSON.stringify(value),
            "Record content mismatch",
          );
        }
      }
      console.log(
        `Verified ${username}: login, identity, ${rows.length} owned records and original timestamps.`,
      );
    } finally {
      if (account.cookie)
        cloudCall(origin, account, "/api/auth", "POST", { action: "logout" });
    }
  }
  const html = vercel([
    "curl",
    "/",
    "--deployment",
    origin,
    "--scope",
    "kikumpums-projects",
    "--",
    "--silent",
    "--show-error",
  ]);
  assert.ok(
    html.includes("Couple") && html.includes("/_next/"),
    "New app HTML verification failed",
  );
  console.log("PASS: new app HTML and production account migration verified.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Verification failed");
  process.exitCode = 1;
} finally {
  db.close();
}
