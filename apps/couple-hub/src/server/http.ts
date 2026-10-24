export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export async function handle(fn: () => unknown | Promise<unknown>) {
  try {
    const result = await fn();
    return result instanceof Response ? result : json(result);
  } catch (error) {
    if (error instanceof ApiError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    console.error(
      "Backend operation failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to complete request.",
        },
      },
      500,
    );
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  let expected = process.env.APP_ORIGIN || url.origin;
  // Next's internal URL hostname may differ from the browser-visible HTTP Host.
  if (!process.env.APP_ORIGIN && request.headers.has("host")) {
    const host = request.headers.get("host")!;
    if (!/^[a-zA-Z0-9.\-\[\]:]+$/.test(host))
      fail(403, "ORIGIN_REJECTED", "Invalid request host.");
    try {
      expected = new URL(`${url.protocol}//${host}`).origin;
    } catch {
      fail(403, "ORIGIN_REJECTED", "Invalid request host.");
    }
  }
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    fail(403, "ORIGIN_REJECTED", "Same-origin request required.");
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  sameOrigin(request);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    fail(415, "CONTENT_TYPE", "JSON required.");
  const reader = request.body?.getReader();
  if (!reader) fail(400, "INVALID_BODY", "JSON object required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      fail(413, "BODY_TOO_LARGE", "Request exceeds 16 KB.");
    }
    chunks.push(value);
  }
  try {
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return fail(400, "INVALID_JSON", "Invalid JSON object.");
  }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(400, "VALIDATION", "Object required.");
  return value as Record<string, unknown>;
}
export function text(
  value: unknown,
  field: string,
  max = 200,
  min = 0,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    fail(400, "VALIDATION", `Invalid ${field}.`);
  return value.trim();
}
export function integer(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    fail(400, "VALIDATION", `Invalid ${field}.`);
  return value;
}
export function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") fail(400, "VALIDATION", `Invalid ${field}.`);
  return value;
}
export function date(value: unknown, field: string, time = false): string {
  const result = text(value, field, time ? 16 : 10, time ? 16 : 10);
  const pattern = time
    ? /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/
    : /^\d{4}-\d{2}-\d{2}$/;
  const day = result.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  if (
    !pattern.test(result) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== day ||
    day < "1900-01-01" ||
    day > "2200-12-31"
  )
    fail(400, "VALIDATION", `Invalid ${field}.`);
  return result;
}
export function id(value: unknown): string {
  const result = text(value, "id", 36, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      result,
    )
  )
    fail(400, "VALIDATION", "Invalid id.");
  return result;
}
