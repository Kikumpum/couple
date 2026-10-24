"use client";

import { useState } from "react";
import { Clapperboard, ExternalLink, MapPin, Plus } from "lucide-react";
import { netflixReferences, southJakartaCinemas } from "@/lib/recommendations";

export default function MovieDiscovery({
  onPlan,
  children,
}: {
  onPlan: (title: string, notes: string) => void;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState("netflix");
  return (
    <>
      <div
        className="market-modes movie-modes"
        role="group"
        aria-label="Tempat menonton"
      >
        <button
          aria-pressed={mode === "netflix"}
          onClick={() => setMode("netflix")}
        >
          Netflix
        </button>
        <button
          aria-pressed={mode === "cinema"}
          onClick={() => setMode("cinema")}
        >
          Bioskop · Jakarta Selatan
        </button>
      </div>
      {mode === "netflix" ? (
        <section className="panel">
          <div className="panel-title">
            <h2>
              <Clapperboard size={18} />
              Pilihan untuk Netflix
            </h2>
            <a
              className="text-button"
              href="https://www.netflix.com/id/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Netflix Indonesia
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="netflix-grid">
            {netflixReferences.map((movie) => (
              <article key={movie.id} className="netflix-item">
                <span className="tag">{movie.genre}</span>
                <h3>{movie.title}</h3>
                <p className="muted small">
                  {movie.year}
                  {movie.age ? ` · ${movie.age}` : ""}
                </p>
                <p className="reference-reason">{movie.reason}</p>
                <div className="reference-actions">
                  <a
                    className="text-button"
                    href={movie.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka Netflix
                    <ExternalLink size={12} />
                  </a>
                  <button
                    className="text-button"
                    onClick={() =>
                      onPlan(movie.title, `Netflix · ${movie.url}`)
                    }
                  >
                    <Plus size={13} />
                    Jadwalkan
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="source-note">
            Pilihan editorial, bukan daftar rilis terbaru atau klaim kecocokan
            otomatis. Referensi: halaman judul resmi Netflix Indonesia.
            Ketersediaan dapat berubah menurut wilayah, akun, dan paket; periksa
            halaman Netflix sebelum menonton.
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <div className="panel-title">
              <h2>
                <MapPin size={18} />
                XXI · Jakarta Selatan
              </h2>
              <a
                className="text-button"
                href="https://21cineplex.com/nowplaying"
                target="_blank"
                rel="noopener noreferrer"
              >
                Now Playing XXI
                <ExternalLink size={12} />
              </a>
            </div>
            {southJakartaCinemas.map((cinema) => (
              <div className="list-row" key={cinema.name}>
                <span className="item-icon peach">
                  <MapPin size={18} />
                </span>
                <div className="grow">
                  <strong>{cinema.name}</strong>
                  <span>{cinema.area}</span>
                </div>
                <a
                  className="text-button"
                  href={cinema.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Jadwal resmi
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
            <p className="source-note">
              Jadwal spesifik studio hanya tersedia di situs resmi XXI atau
              m.tix dan dapat berubah. Daftar TMDB di bawah bukan konfirmasi
              film tersedia di seluruh bioskop XXI.
            </p>
          </section>
          {children}
        </>
      )}
    </>
  );
}
