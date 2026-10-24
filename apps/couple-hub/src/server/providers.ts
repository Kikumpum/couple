import { fail } from "./http";

type Entry = {
  expires: number;
  value?: unknown;
  pending?: Promise<unknown>;
  failed?: boolean;
};
const cache = new Map<string, Entry>();
export async function providerJSON(
  url: string,
  token?: string,
): Promise<unknown> {
  const old = cache.get(url);
  if (old && old.expires > Date.now()) {
    if (old.failed)
      fail(
        503,
        "PROVIDER_UNAVAILABLE",
        "Provider temporarily unavailable. Please retry later.",
      );
    return old.pending ?? old.value;
  }
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const pending = (async () => {
    try {
      const response = await fetch(url, {
        headers: token
          ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
          : { Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) throw new Error("Provider status");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty provider response");
      const chunks: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 1024 * 1024) {
          await reader.cancel();
          throw new Error("Oversized provider response");
        }
        chunks.push(value);
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      cache.set(url, { expires: Date.now() + 60000, value });
      return value;
    } catch {
      cache.set(url, { expires: Date.now() + 15000, failed: true });
      fail(
        503,
        "PROVIDER_UNAVAILABLE",
        "Provider temporarily unavailable. Please retry later.",
      );
    }
  })();
  cache.set(url, { expires: Date.now() + 10000, pending });
  return pending;
}
