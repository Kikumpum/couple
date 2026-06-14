"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bitcoin,
  Building2,
  Check,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "crypto" | "stocks";
type StockExchange = "idx" | "us";
type Timeframe = "1h" | "1d" | "1w" | "1m" | "6m" | "1y";

type CryptoAsset = {
  id: string;
  symbol: string;
  label: string;
  price: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  imageUrl: string;
};

type StockMarket = {
  id: string;
  symbol: string;
  label: string;
  exchange: StockExchange;
  currency: string;
  price: number | null;
  changePercent: number | null;
  chart: number[];
  imageUrl: string;
  source: string;
  status: "live" | "error";
};

type StockSearchResult = {
  id: string;
  symbol: string;
  label: string;
  exchange: StockExchange;
  currency: string;
  imageUrl: string;
  exchangeLabel: string;
};

type CryptoResponse = {
  assets: CryptoAsset[];
  priority: CryptoAsset | null;
  chart: number[];
  timeframe: Timeframe;
  updatedAt: string;
  status: "live" | "error";
};

type StocksResponse = {
  exchange: StockExchange;
  exchangeLabel: string;
  exchangeImage: string;
  markets: StockMarket[];
  priority: StockMarket | null;
  chart: number[];
  timeframe: Timeframe;
  updatedAt: string;
  status: "live" | "error";
};

const cryptoPriorityKey = "az-hub.portfolio.crypto-priority";
const stockPriorityKey = "az-hub.portfolio.stock-priority";
const stockLabelKey = "az-hub.portfolio.stock-label";
const stockExchangeKey = "az-hub.portfolio.stock-exchange";

const modeOptions: Array<{
  value: Mode;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: "crypto", label: "Crypto", Icon: Bitcoin },
  { value: "stocks", label: "Saham", Icon: Building2 }
];

const timeframeOptions: Array<{ value: Timeframe; label: string }> = [
  { value: "1h", label: "1J" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1Mgg" },
  { value: "1m", label: "1Bln" },
  { value: "6m", label: "6Bln" },
  { value: "1y", label: "1Thn" }
];

function formatNumber(value: number | null, currency: string) {
  if (value === null) {
    return "Belum aktif";
  }

  if (currency === "PTS") {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2
    }).format(value);
  }

  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value > 100 ? 2 : 4
  }).format(value);
}

function formatVolume(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

function formatTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function chartPath(values: number[], width = 880, height = 300) {
  if (values.length < 2) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;

      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MarketChart({
  values,
  positive
}: {
  values: number[];
  positive: boolean;
}) {
  const path = chartPath(values);
  const stroke = positive ? "#34D399" : "#FB7185";

  return (
    <div className="relative h-[360px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.2),transparent_30%)]" />
      <svg
        viewBox="0 0 880 300"
        role="img"
        aria-label="Realtime market chart"
        className="relative h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="portfolioChartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="portfolioChartStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="48%" stopColor={stroke} />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <g opacity="0.18">
          {Array.from({ length: 6 }, (_, index) => (
            <line
              key={`h-${index}`}
              x1="0"
              x2="880"
              y1={index * 60}
              y2={index * 60}
              stroke="white"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <line
              key={`v-${index}`}
              x1={index * 146.66}
              x2={index * 146.66}
              y1="0"
              y2="300"
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </g>
        {path ? (
          <>
            <path d={`${path} L 880 300 L 0 300 Z`} fill="url(#portfolioChartFill)" />
            <path
              d={path}
              fill="none"
              stroke="url(#portfolioChartStroke)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          </>
        ) : (
          <text x="440" y="150" textAnchor="middle" className="fill-white/60 text-sm">
            Chart belum tersedia
          </text>
        )}
      </svg>
    </div>
  );
}

export function PortfolioTerminal() {
  const [mode, setMode] = useState<Mode>("crypto");
  const [stockExchange, setStockExchange] = useState<StockExchange>("idx");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [cryptoPriority, setCryptoPriority] = useState("BTCUSDT");
  const [stockPriority, setStockPriority] = useState("^JKSE");
  const [selectedStockLabel, setSelectedStockLabel] = useState("");
  const [cryptoData, setCryptoData] = useState<CryptoResponse | null>(null);
  const [stocksData, setStocksData] = useState<StocksResponse | null>(null);
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>(
    []
  );
  const [stockSearchStatus, setStockSearchStatus] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Memuat portfolio market...");

  useEffect(() => {
    const savedCrypto = window.localStorage.getItem(cryptoPriorityKey);
    const savedStock = window.localStorage.getItem(stockPriorityKey);
    const savedStockLabel = window.localStorage.getItem(stockLabelKey);
    const savedExchange = window.localStorage.getItem(stockExchangeKey);

    if (savedCrypto) {
      setCryptoPriority(savedCrypto);
    }

    if (savedStock) {
      setStockPriority(savedStock);
    }

    if (savedStockLabel) {
      setSelectedStockLabel(savedStockLabel);
    }

    if (savedExchange === "idx" || savedExchange === "us") {
      setStockExchange(savedExchange);
      if (!savedStock) {
        setStockPriority(savedExchange === "idx" ? "^JKSE" : "^GSPC");
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(cryptoPriorityKey, cryptoPriority);
  }, [cryptoPriority]);

  useEffect(() => {
    window.localStorage.setItem(stockPriorityKey, stockPriority);
  }, [stockPriority]);

  useEffect(() => {
    window.localStorage.setItem(stockLabelKey, selectedStockLabel);
  }, [selectedStockLabel]);

  useEffect(() => {
    window.localStorage.setItem(stockExchangeKey, stockExchange);
  }, [stockExchange]);

  useEffect(() => {
    let isMounted = true;

    async function loadCrypto() {
      try {
        const response = await fetch(
          `/api/portfolio/crypto?priority=${encodeURIComponent(
            cryptoPriority
          )}&timeframe=${timeframe}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as CryptoResponse;

        if (!isMounted) {
          return;
        }

        setCryptoData(data);
        setStatus(`Realtime sync tiap 5 detik - ${timeframe.toUpperCase()}`);
      } catch {
        if (isMounted) {
          setStatus("Crypto market gagal dimuat");
        }
      }
    }

    loadCrypto();
    const intervalId = window.setInterval(loadCrypto, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [cryptoPriority, timeframe]);

  useEffect(() => {
    let isMounted = true;

    async function loadStocks() {
      try {
        const response = await fetch(
          `/api/portfolio/stocks?exchange=${stockExchange}&priority=${encodeURIComponent(
            stockPriority
          )}&timeframe=${timeframe}&label=${encodeURIComponent(selectedStockLabel)}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as StocksResponse;

        if (!isMounted) {
          return;
        }

        setStocksData(data);
        setStatus(`Realtime sync tiap 5 detik - ${timeframe.toUpperCase()}`);
      } catch {
        if (isMounted) {
          setStatus("Stock market gagal dimuat");
        }
      }
    }

    loadStocks();
    const intervalId = window.setInterval(loadStocks, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [stockExchange, stockPriority, selectedStockLabel, timeframe]);

  useEffect(() => {
    if (mode !== "stocks") {
      return;
    }

    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      setStockSearchResults([]);
      setStockSearchStatus("");
      return;
    }

    let isMounted = true;
    setStockSearchStatus("Mencari saham...");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/portfolio/stocks/search?exchange=${stockExchange}&q=${encodeURIComponent(
            cleanQuery
          )}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as {
          results: StockSearchResult[];
          status: "idle" | "live" | "error";
          message?: string;
        };

        if (!isMounted) {
          return;
        }

        setStockSearchResults(data.results ?? []);
        setStockSearchStatus(
          data.status === "live"
            ? `${data.results?.length ?? 0} saham ditemukan`
            : data.message ?? "Saham tidak ditemukan"
        );
      } catch {
        if (isMounted) {
          setStockSearchResults([]);
          setStockSearchStatus("Pencarian saham gagal");
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [mode, query, stockExchange]);

  const cryptoAssets = useMemo(() => cryptoData?.assets ?? [], [cryptoData]);
  const stockMarkets = useMemo(() => stocksData?.markets ?? [], [stocksData]);

  const filteredCrypto = useMemo(
    () =>
      cryptoAssets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
          asset.label.toLowerCase().includes(query.toLowerCase())
      ),
    [cryptoAssets, query]
  );

  const filteredStocks = useMemo(
    () =>
      stockMarkets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
          asset.label.toLowerCase().includes(query.toLowerCase())
      ),
    [stockMarkets, query]
  );

  const activeCrypto = cryptoData?.priority;
  const activeStock = stocksData?.priority;
  const activeSymbol =
    mode === "crypto" ? activeCrypto?.symbol ?? "Memuat..." : activeStock?.symbol ?? "Memuat...";
  const activeLabel =
    mode === "crypto"
      ? activeCrypto?.label ?? "Digital asset"
      : activeStock?.label ?? stocksData?.exchangeLabel ?? "Stock market";
  const activePrice =
    mode === "crypto"
      ? formatNumber(activeCrypto?.price ?? null, "USD")
      : formatNumber(activeStock?.price ?? null, activeStock?.currency ?? "USD");
  const activeImage =
    mode === "crypto"
      ? activeCrypto?.imageUrl ?? "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
      : activeStock?.imageUrl ?? stocksData?.exchangeImage ?? "/idx.png";
  const activeChange =
    mode === "crypto"
      ? activeCrypto?.changePercent ?? 0
      : activeStock?.changePercent ?? 0;
  const activeChart = mode === "crypto" ? cryptoData?.chart ?? [] : stocksData?.chart ?? [];
  const activeUpdatedAt =
    mode === "crypto" ? cryptoData?.updatedAt ?? null : stocksData?.updatedAt ?? null;
  const topMarkets = mode === "crypto" ? cryptoAssets.slice(0, 5) : stockMarkets.slice(0, 5);
  const hasStockSearch = mode === "stocks" && query.trim().length >= 2;
  const displayedStocks = hasStockSearch ? stockSearchResults : filteredStocks;

  function changeExchange(nextExchange: StockExchange) {
    setStockExchange(nextExchange);
    setStockPriority(nextExchange === "idx" ? "^JKSE" : "^GSPC");
    setSelectedStockLabel(nextExchange === "idx" ? "IDX Composite" : "S&P 500");
    setStockSearchResults([]);
    setStockSearchStatus("");
    setQuery("");
  }

  function selectStock(symbol: string, label: string) {
    setStockPriority(symbol);
    setSelectedStockLabel(label);
    setQuery("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 portfolio-aurora" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-sky-500/15 blur-[120px]" />

      <div className="relative w-full border-b border-white/10 bg-[#050816]/70 backdrop-blur-2xl">
        <header className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Kembali ke dashboard"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-sm font-semibold text-purple-200">
                A&Z Portfolio Pulse
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Premium market dashboard
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modeOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                  mode === value
                    ? "bg-white text-[#050816] shadow-[0_20px_60px_rgba(255,255,255,0.18)]"
                    : "border border-white/10 bg-white/8 text-white/72 hover:-translate-y-0.5 hover:bg-white/12"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
            <div className="flex rounded-2xl border border-white/10 bg-white/8 p-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeframe(option.value)}
                  className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${
                    timeframe === option.value
                      ? "bg-white text-[#050816]"
                      : "text-white/58 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6 lg:px-10 lg:py-8">
        <section className="grid min-h-[560px] gap-6 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-semibold text-white/78">
                <Sparkles size={14} />
                TradingView meets Apple meets Linear
              </p>
              <h2 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                Market clarity for every decision.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/62 sm:text-lg">
                Pantau crypto dan saham dengan chart besar, prioritas aset,
                sinyal harga, dan pengalaman dark luxury yang fokus.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setMode("crypto")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#050816] shadow-[0_24px_80px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5"
                >
                  Explore crypto
                  <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("stocks")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/14"
                >
                  View stocks
                  <BarChart3 size={16} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Asset</p>
                <p className="mt-2 truncate text-lg font-semibold">{activeSymbol}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Price</p>
                <p className="mt-2 truncate text-lg font-semibold">{activePrice}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/45">Change</p>
                <p
                  className={`mt-2 flex items-center gap-1 text-lg font-semibold ${
                    activeChange < 0 ? "text-rose-300" : "text-emerald-300"
                  }`}
                >
                  {activeChange < 0 ? (
                    <TrendingDown size={18} />
                  ) : (
                    <TrendingUp size={18} />
                  )}
                  {activeChange >= 0 ? "+" : ""}
                  {activeChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          <div className="relative grid content-between gap-5">
            <div className="absolute -right-3 -top-3 z-10 hidden rounded-[22px] border border-white/10 bg-white/10 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:block">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white/50">Sync status</p>
                  <p className="mt-1 text-sm font-semibold">{status}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[#060A1D]/70 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                    <BarChart3 size={18} />
                    {mode === "crypto"
                      ? "Crypto exchange"
                      : stocksData?.exchangeLabel ?? "Stock exchange"}
                  </div>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <span className="relative h-14 w-14 flex-none overflow-hidden rounded-2xl bg-white ring-1 ring-white/20">
                      <Image
                        src={activeImage}
                        alt={activeLabel}
                        fill
                        sizes="56px"
                        className="object-cover p-1.5"
                      />
                    </span>
                    <span className="min-w-0">
                      <h3 className="truncate text-4xl font-semibold tracking-normal">
                        {activeSymbol}
                      </h3>
                      <p className="mt-2 max-w-xl truncate text-sm text-white/54">
                        {activeLabel}
                      </p>
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right">
                  <p className="text-xs font-semibold text-white/45">Last update</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatTime(activeUpdatedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <MarketChart values={activeChart} positive={activeChange >= 0} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-purple-200">Priority market</p>
                <h2 className="mt-2 text-2xl font-semibold">Watchlist focus</h2>
              </div>
              {mode === "stocks" ? (
                <div className="flex rounded-2xl border border-white/10 bg-white/8 p-1">
                  {[
                    ["idx", "IDX"],
                    ["us", "US"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => changeExchange(value as StockExchange)}
                      className={`h-9 rounded-xl px-4 text-xs font-semibold transition ${
                        stockExchange === value
                          ? "bg-white text-[#050816]"
                          : "text-white/58 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3">
              {topMarkets.map((asset) => {
                const active =
                  mode === "crypto"
                    ? cryptoPriority === asset.symbol
                    : stockPriority === asset.symbol;
                const change =
                  "changePercent" in asset ? asset.changePercent ?? 0 : 0;

                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    onClick={() =>
                      mode === "crypto"
                        ? setCryptoPriority(asset.symbol)
                        : selectStock(asset.symbol, asset.label)
                    }
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[20px] border p-4 text-left transition ${
                      active
                        ? "border-white/20 bg-white text-[#050816] shadow-[0_24px_80px_rgba(255,255,255,0.12)]"
                        : "border-white/10 bg-white/8 text-white hover:-translate-y-0.5 hover:bg-white/12"
                    }`}
                  >
                    <span className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white ring-1 ring-white/20">
                      <Image
                        src={asset.imageUrl}
                        alt={asset.label}
                        fill
                        sizes="44px"
                        className="object-cover p-1.5"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {asset.symbol}
                        </span>
                        {active ? <Check size={15} /> : null}
                      </span>
                      <span
                        className={`mt-1 block truncate text-xs ${
                          active ? "text-slate-500" : "text-white/45"
                        }`}
                      >
                        {asset.label}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        change < 0
                          ? active
                            ? "text-rose-600"
                            : "text-rose-300"
                          : active
                            ? "text-emerald-700"
                            : "text-emerald-300"
                      }`}
                    >
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-200">
                  {mode === "crypto" ? "Crypto universe" : "Equity markets"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Market board</h2>
              </div>
              <label className="relative block md:w-80">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    mode === "stocks"
                      ? stockExchange === "idx"
                        ? "Cari saham IDX: BBNI, ADRO..."
                        : "Cari saham US: AAPL, JPM..."
                      : "Cari crypto"
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/8 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-purple-300/60 focus:ring-4 focus:ring-purple-400/10"
                />
              </label>
            </div>
            {mode === "stocks" ? (
              <p className="mt-3 text-xs font-semibold text-white/45">
                {stockSearchStatus ||
                  `Mode ${stockExchange === "idx" ? "IDX Indonesia" : "US market"}`}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {mode === "crypto"
                ? filteredCrypto.map((asset) => (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => setCryptoPriority(asset.symbol)}
                      className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/12"
                    >
                      <span className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white ring-1 ring-white/20">
                        <Image
                          src={asset.imageUrl}
                          alt={asset.label}
                          fill
                          sizes="44px"
                          className="object-cover p-1.5"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {asset.symbol}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              asset.changePercent < 0
                                ? "text-rose-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {asset.changePercent >= 0 ? "+" : ""}
                            {asset.changePercent.toFixed(2)}%
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-white/45">
                          {formatNumber(asset.price, "USD")} | Vol{" "}
                          {formatVolume(asset.volume)}
                        </span>
                      </span>
                    </button>
                  ))
                : displayedStocks.map((asset) => {
                    const changePercent =
                      "changePercent" in asset ? asset.changePercent ?? 0 : null;
                    const price = "price" in asset ? asset.price : null;

                    return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => selectStock(asset.symbol, asset.label)}
                      className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/12"
                    >
                      <span className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white ring-1 ring-white/20">
                        <Image
                          src={asset.imageUrl}
                          alt={asset.label}
                          fill
                          sizes="44px"
                          className="object-cover p-1.5"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {asset.symbol}
                            </span>
                            <span className="mt-1 block truncate text-xs text-white/45">
                              {asset.label}
                            </span>
                          </span>
                          {changePercent === null ? (
                            <span className="text-xs font-semibold text-purple-200">
                              {"exchangeLabel" in asset ? asset.exchangeLabel : asset.source}
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-semibold ${
                                changePercent < 0
                                  ? "text-rose-300"
                                  : "text-emerald-300"
                              }`}
                            >
                              {changePercent >= 0 ? "+" : ""}
                              {changePercent.toFixed(2)}%
                            </span>
                          )}
                        </span>
                        <span className="mt-3 block text-sm font-semibold">
                          {price === null && hasStockSearch
                            ? "Klik untuk buka chart"
                            : formatNumber(price, asset.currency)}
                        </span>
                      </span>
                    </button>
                    );
                  })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <RefreshCw className="text-sky-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Realtime cadence</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Data polling tetap sinkron setiap 5 detik dengan status ringkas.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <Star className="text-purple-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Priority-first</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Asset pilihan disimpan otomatis dan selalu muncul sebagai fokus utama.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-2xl">
            <ShieldCheck className="text-emerald-300" size={22} />
            <h3 className="mt-5 text-lg font-semibold">Clean signal</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Layout mengurangi kartu kecil dan memberi ruang untuk chart besar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
