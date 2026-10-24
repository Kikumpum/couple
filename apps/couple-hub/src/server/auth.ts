import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { db } from "./db";
import { fail, text } from "./http";

export type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  password: string;
  coupleId: string | null;
  shareHealth: number;
  theme: "light" | "dark";
};
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const cookieName = "couple_session";
const sessionLifetime = 7 * 86400;
export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  username: u.username,
  coupleId: u.coupleId,
  shareHealth: Boolean(u.shareHealth),
  theme: u.theme,
});
export function email(value: unknown) {
  const result = text(value, "email", 254, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    fail(400, "VALIDATION", "Invalid email.");
  return result;
}
export function username(value: unknown): string {
  const result = text(value, "username", 30, 3).toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(result))
    fail(
      400,
      "VALIDATION",
      "Nama pengguna hanya boleh berisi huruf, angka, atau garis bawah.",
    );
  return result;
}
export function password(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    fail(400, "VALIDATION", "Kata sandi harus 12 sampai 128 karakter.");
  return value;
}
let hashJobs = 0;
function derive(value: string, salt: string, legacy = false): Promise<Buffer> {
  if (hashJobs >= 4)
    fail(429, "RATE_LIMITED", "Server sedang sibuk. Coba lagi.");
  hashJobs++;
  return new Promise((resolve, reject) =>
    scrypt(
      value,
      salt,
      64,
      {
        N: legacy ? 16384 : 32768,
        r: 8,
        p: legacy ? 1 : 3,
        maxmem: 64 * 1024 * 1024,
      },
      (error, result) => {
        hashJobs--;
        return error ? reject(error) : resolve(result);
      },
    ),
  );
}
export async function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `s2:${salt}:${(await derive(value, salt)).toString("hex")}`;
}
export async function verify(value: string, stored: string) {
  const parts = stored.split(":");
  const legacy = parts.length === 2;
  const [salt, key] = legacy ? parts : parts.slice(1);
  if (
    !salt ||
    !key ||
    !/^[0-9a-f]{32}$/.test(salt) ||
    !/^[0-9a-f]{128}$/.test(key)
  )
    return false;
  const actual = await derive(value, salt, legacy);
  const expected = Buffer.from(key, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function throttle(key: string, limit = 10, windowMs = 15 * 60000) {
  const now = Date.now();
  const hashed = hash(key);
  db().prepare("DELETE FROM throttle WHERE expiresAt <= ?").run(now);
  const row = db()
    .prepare(
      `INSERT INTO throttle(key,attempts,expiresAt) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts`,
    )
    .get(hashed, now + windowMs) as { attempts: number };
  if (row.attempts > limit)
    fail(429, "RATE_LIMITED", "Too many attempts. Please try again later.");
}
export function currentUser(request: Request): User | null {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return (
    (db()
      .prepare(
        "SELECT u.* FROM users u JOIN sessions s ON s.userId=u.id WHERE s.hash=? AND s.expiresAt>?",
      )
      .get(hash(token), Date.now()) as User | undefined) ?? null
  );
}
export function requireUser(request: Request) {
  const u = currentUser(request);
  if (!u) fail(401, "UNAUTHENTICATED", "Please sign in.");
  return u;
}
function cookie(request: Request, token: string, age: number) {
  const secure =
    process.env.NODE_ENV === "production" ||
    new URL(request.url).protocol === "https:";
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
}
export function createSession(request: Request, userId: string) {
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expiresAt<=?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions(hash,userId,expiresAt) VALUES(?,?,?)")
    .run(hash(token), userId, Date.now() + sessionLifetime * 1000);
  // Bound retained sessions per account without storing bearer tokens.
  db()
    .prepare(
      "DELETE FROM sessions WHERE userId=? AND hash NOT IN (SELECT hash FROM sessions WHERE userId=? ORDER BY expiresAt DESC LIMIT 10)",
    )
    .run(userId, userId);
  return cookie(request, token, sessionLifetime);
}
export function logout(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (token) db().prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));
  return cookie(request, "", 0);
}
export const newId = randomUUID;
