"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { request, type Watch } from "@/lib/app-types";

type Quote = {
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
  changePercent: number | null;
  capturedAt: string | null;
  source: string;
  unavailable?: string;
};
type MarketResponse = { assets: Quote[]; source: string; checkedAt: string };
const labels = { idx: "Saham Indonesia", us: "Saham AS", crypto: "Kripto" };

export default function MarketWatchlist({
  watches,
  onAdd,
  actions,
}: {
  watches: Watch[];
  onAdd: (market: Watch["market"]) => void;
  actions: (watch: Watch) => React.ReactNode;
}) {
  const [market, setMarket] = useState<Watch["market"]>("idx");
  const [state, setState] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const watchKey = watches
    .filter((w) => w.market === market)
    .map((w) => `${w.id}:${w.symbol}:${w.currency}`)
    .sort()
    .join("|");
  useEffect(() => {
    let active = true;
    let pending = false;
    setState(null);
    const load = async () => {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      setLoading(true);
      setError("");
      try {
        const value = await request<MarketResponse>(
          `/api/markets?market=${market}`,
        );
        if (active) setState(value);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const tick = setInterval(() => void load(), 60000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      clearInterval(tick);
      window.removeEventListener("focus", focus);
    };
  }, [market, watchKey, reload]);
  const selected = watches.filter((w) => w.market === market);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>
          <ArrowUpRight size={18} />
          Pantauan pasar
        </h2>
        <div className="row-actions">
          <button
            className="icon-button"
            title="Perbarui harga"
            aria-label="Perbarui harga"
            disabled={loading}
            onClick={() => setReload((r) => r + 1)}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
          <button
            className="icon-button"
            title="Tambah pantauan"
            aria-label="Tambah pantauan"
            onClick={() => onAdd(market)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="market-modes" role="group" aria-label="Pasar aset">
        {Object.entries(labels).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={market === key}
            onClick={() => setMarket(key as Watch["market"])}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!selected.length ? (
        <div className="empty">
          <TrendingUp size={26} />
          <h3>Belum ada aset dipantau</h3>
          <p>Daftar pantauan ini hanya milik akunmu.</p>
          <button className="button secondary" onClick={() => onAdd(market)}>
            <Plus size={15} />
            Tambah pantauan
          </button>
        </div>
      ) : (
        <div className="quote-list">
          {selected.map((watch) => {
            const quote = state?.assets.find((a) => a.symbol === watch.symbol);
            return (
              <div className="quote-row" key={watch.id}>
                <div className="grow">
                  <strong>{watch.symbol}</strong>
                  <span>{quote?.name || labels[market]}</span>
                </div>
                <div className="quote-value">
                  {quote?.price != null ? (
                    <>
                      <strong>
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: quote.currency,
                          maximumFractionDigits:
                            quote.price < 1
                              ? 6
                              : quote.currency === "USD"
                                ? 2
                                : 0,
                        }).format(quote.price)}
                      </strong>
                      <span
                        className={
                          quote.changePercent != null &&
                          quote.changePercent >= 0
                            ? "green-text"
                            : "danger"
                        }
                      >
                        {quote.changePercent == null
                          ? "-"
                          : `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`}
                        {market === "crypto" ? " · 24 jam" : " · harian"}
                      </span>
                    </>
                  ) : (
                    <span className="muted small">
                      {loading ? "Mengambil harga..." : "Harga belum tersedia"}
                    </span>
                  )}
                  {quote?.capturedAt && (
                    <time className="quote-time" dateTime={quote.capturedAt}>
                      {new Date(quote.capturedAt).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </time>
                  )}
                </div>
                {actions(watch)}
              </div>
            );
          })}
        </div>
      )}
      <p className="source-note">
        {market === "crypto" ? "CoinGecko" : "Yahoo Finance"} · Pembaruan setiap
        60 detik saat halaman aktif. Harga bursa dapat tertunda; di luar jam
        bursa, harga terakhir tetap ditampilkan. Bukan rekomendasi investasi.
      </p>
    </section>
  );
}
