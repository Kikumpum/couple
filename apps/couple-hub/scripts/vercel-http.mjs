import { spawnSync } from "node:child_process";

// Native CLI handles deployment protection; credentials and payload use stdin only.
export function vercel(args, input = "") {
  const result = spawnSync(
    "cmd.exe",
    ["/d", "/s", "/c", "npx.cmd --yes vercel@latest " + args.join(" ")],
    {
      cwd: new URL("../../../", import.meta.url),
      input,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: 240000,
    },
  );
  if (result.status !== 0)
    throw new Error(
      `Vercel command failed (${result.status}); inspect deployment logs.`,
    );
  return result.stdout;
}
export function cloudCall(
  origin,
  account,
  path,
  method = "GET",
  data,
  extra = {},
) {
  const lines = [
    "silent",
    "show-error",
    "include",
    "max-time = 60",
    `request = ${JSON.stringify(method)}`,
    `header = ${JSON.stringify("Origin: " + origin)}`,
    'header = "Content-Type: application/json"',
    ...Object.entries(extra).map(
      ([k, v]) => `header = ${JSON.stringify(k + ": " + v)}`,
    ),
  ];
  if (account.cookie)
    lines.push(`header = ${JSON.stringify("Cookie: " + account.cookie)}`);
  if (data !== undefined)
    lines.push(`data = ${JSON.stringify(JSON.stringify(data))}`);
  const raw = vercel(
    [
      "curl",
      path,
      "--deployment",
      origin,
      "--scope",
      "kikumpums-projects",
      "--",
      "--config",
      "-",
    ],
    lines.join("\n"),
  );
  const start = raw.lastIndexOf("HTTP/");
  const response = raw.slice(start);
  const split = response.search(/\r?\n\r?\n/);
  if (start < 0 || split < 0) throw new Error("Invalid HTTP response");
  const headers = response.slice(0, split);
  const status = Number(headers.match(/^HTTP\/\S+ (\d+)/)?.[1]);
  const cookie = headers.match(/^set-cookie:\s*(couple_session=[^;]*)/im)?.[1];
  if (cookie) account.cookie = cookie;
  const body = response.slice(split).trim();
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON, received HTTP ${status}`);
  }
  return { status, value };
}
