import { requireUser, throttle } from "@/server/auth";
import { fail, handle, text } from "@/server/http";
import { providerJSON } from "@/server/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    throttle(`movies:${user.id}`, 60, 60000);
    const token = process.env.TMDB_API_TOKEN;
    if (!token)
      fail(503, "PROVIDER_NOT_CONFIGURED", "TMDB_API_TOKEN is not configured.");
    const query = new URL(request.url).searchParams.get("q");
    const url = new URL(
      query
        ? "https://api.themoviedb.org/3/search/movie"
        : "https://api.themoviedb.org/3/movie/now_playing",
    );
    url.searchParams.set("language", "id-ID");
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("region", "ID");
    if (query) url.searchParams.set("query", text(query, "query", 100, 1));
    const data = (await providerJSON(url.toString(), token)) as {
      results?: {
        id: number;
        title: string;
        poster_path: string | null;
        overview: string;
        vote_average: number;
        release_date: string;
        adult: boolean;
      }[];
    };
    if (!Array.isArray(data.results))
      fail(503, "PROVIDER_UNAVAILABLE", "Invalid movie provider response.");
    return {
      source: "TMDB",
      fetchedAt: new Date().toISOString(),
      movies: data.results
        .filter(
          (m) =>
            !m.adult &&
            Number.isSafeInteger(m.id) &&
            typeof m.title === "string",
        )
        .slice(0, 20)
        .map((m) => ({
          id: m.id,
          title: m.title.slice(0, 300),
          poster:
            typeof m.poster_path === "string" &&
            /^\/[a-zA-Z0-9._-]+$/.test(m.poster_path)
              ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
              : null,
          synopsis:
            typeof m.overview === "string" ? m.overview.slice(0, 3000) : "",
          rating: Number.isFinite(m.vote_average) ? m.vote_average : 0,
          releaseDate: typeof m.release_date === "string" ? m.release_date : "",
        })),
    };
  });
}
