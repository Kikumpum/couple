import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { cloudCall, vercel } from "./vercel-http.mjs";

const source = resolve(process.argv[2] || "");
assert.ok(
  process.argv[2] && source.endsWith("couple-hub.sqlite"),
  "Pass the local SQLite path explicitly",
);
const folder = join(dirname(source), "backups");
mkdirSync(folder, { recursive: true, mode: 0o700 });
const backup = join(folder, `before-neon-${Date.now()}.sqlite`);
const original = new DatabaseSync(source, { readOnly: true });
original.prepare("VACUUM INTO ?").run(backup);
original.close();
const db = new DatabaseSync(backup, { readOnly: true });
assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
const users = db
  .prepare(
    "SELECT id,name,email,username,password,coupleId,shareHealth,theme FROM users WHERE username IN ('aryo','fia') ORDER BY username",
  )
  .all();
assert.equal(users.length, 2);
const ids = new Set(users.map((u) => u.id));
const coupleIds = new Set(users.map((u) => u.coupleId).filter(Boolean));
for (const coupleId of coupleIds) {
  const members = db
    .prepare("SELECT id FROM users WHERE coupleId=?")
    .all(coupleId);
  assert.ok(
    members.length === 2 && members.every((u) => ids.has(u.id)),
    "Refuse partial couple migration",
  );
}
const records = db
  .prepare("SELECT * FROM records ORDER BY id")
  .all()
  .filter((r) => ids.has(r.userId))
  .map((r) => ({ ...r, data: JSON.parse(r.data) }));
const couples = [...coupleIds].map((id) => ({ id }));
db.close();
const payload = { users, couples, records };
const checksum = createHash("sha256")
  .update(JSON.stringify(payload))
  .digest("hex");
console.log(
  `Backup verified: ${backup}; ${users.length} accounts, ${records.length} records.`,
);
const token = randomBytes(48).toString("hex");
let configured = false;
try {
  vercel(
    [
      "env",
      "add",
      "COUPLE_MIGRATION_TOKEN",
      "--environment",
      "production",
      "--sensitive",
      "--yes",
      "--scope",
      "kikumpums-projects",
    ],
    token,
  );
  configured = true;
  console.log(
    "Temporary migration credential configured; staging production deployment.",
  );
  const output = vercel([
    "deploy",
    "--prod",
    "--skip-domain",
    "--yes",
    "--json",
    "--scope",
    "kikumpums-projects",
  ]);
  const parsed = JSON.parse(output.slice(output.indexOf("{")));
  const url = parsed.deployment?.url;
  assert.ok(
    url && parsed.deployment.readyState === "READY",
    "Production build must be Ready",
  );
  const imported = cloudCall(url, {}, "/api/transfer", "POST", payload, {
    Authorization: "Bearer " + token,
  });
  assert.equal(
    imported.status,
    200,
    `Import refused: ${imported.value?.error?.code}`,
  );
  assert.equal(imported.value.checksum, checksum);
  assert.equal(imported.value.records, records.length);
  assert.equal(imported.value.users, users.length);
  const repeat = cloudCall(url, {}, "/api/transfer", "POST", payload, {
    Authorization: "Bearer " + token,
  });
  assert.equal(repeat.status, 410, "Import must be sealed");
  console.log(
    JSON.stringify({
      status: "import_verified",
      deployment: url,
      accounts: users.length,
      records: records.length,
      backup,
    }),
  );
} finally {
  if (configured) {
    vercel([
      "env",
      "rm",
      "COUPLE_MIGRATION_TOKEN",
      "production",
      "--yes",
      "--scope",
      "kikumpums-projects",
    ]);
    console.log(
      "Temporary production migration credential removed. Public aliases unchanged.",
    );
  }
}
