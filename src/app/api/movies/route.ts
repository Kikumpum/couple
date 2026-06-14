import { NextResponse } from "next/server";
import { movies } from "@/lib/dashboard-data";

type TmdbMovie = {
  id?: number;
  title?: string;
  poster_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
  release_date?: string;
};

const genreNames: Record<number, string> = {
  12: "Adventure",
  16: "Animation",
  18: "Drama",
  28: "Action",
  35: "Comedy",
  53: "Thriller",
  878: "Sci-Fi",
  10749: "Romance"
};

function fallbackMovies(message: string) {
  return NextResponse.json(
    {
      movies: movies.map((movie, index) => ({
        id: `fallback-${index}`,
        ...movie,
        releaseDate: null
      })),
      updatedAt: new Date().toISOString(),
      status: "fallback",
      message
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return fallbackMovies("Film pilihan sementara");
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=id-ID&region=ID&page=1`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(6500)
      }
    );

    if (!response.ok) {
      return fallbackMovies("TMDB gagal dimuat.");
    }

    const data = (await response.json()) as { results?: TmdbMovie[] };
    const results = Array.isArray(data.results) ? data.results : [];

    const nowPlaying = results.slice(0, 6).map((movie) => ({
      id: movie.id ?? movie.title,
      title: movie.title ?? "Untitled",
      rating: movie.vote_average ?? 0,
      genre: genreNames[movie.genre_ids?.[0] ?? 0] ?? "Now Playing",
      releaseDate: movie.release_date ?? null,
      poster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
        : "https://image.tmdb.org/t/p/w342/q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg"
    }));

    return NextResponse.json(
      {
        movies: nowPlaying,
        updatedAt: new Date().toISOString(),
        status: "live"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return fallbackMovies("TMDB gagal dimuat.");
  }
}
