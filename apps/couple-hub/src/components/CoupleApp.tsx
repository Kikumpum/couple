"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Heart,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import {
  request,
  type Collection,
  type Data,
  type Finance,
  type Movie,
  type RecordData,
} from "@/lib/app-types";
import {
  calendarDays,
  dateKey,
  daysUntil,
  formatDate,
  parseDateKey,
  predictCycle,
} from "@/lib/cycle";
import RecordEditor from "./RecordEditor";
import MarketWatchlist from "./MarketWatchlist";
import BookReferences from "./BookReferences";
import MovieDiscovery from "./MovieDiscovery";

type Section =
  | "overview"
  | "finance"
  | "health"
  | "library"
  | "movies"
  | "settings";
const nav: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "finance", label: "Keuangan", icon: Wallet },
  { id: "health", label: "Kesehatan", icon: Heart },
  { id: "library", label: "Perpustakaan", icon: BookOpen },
  { id: "movies", label: "Movie date", icon: Clapperboard },
  { id: "settings", label: "Pengaturan", icon: Settings },
];
const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
const displayDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value))
    : "-";
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const sum = (records: Finance[], type: Finance["type"]) =>
  records
    .filter((r) => r.type === type)
    .reduce((total, r) => total + r.amount, 0);

export default function CoupleApp() {
  const authGeneration = useRef(0);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("overview");
  const [dark, setDark] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [editor, setEditor] = useState<{
    collection: Collection;
    record?: RecordData;
  } | null>(null);
  const [remove, setRemove] = useState<{
    collection: Collection;
    record: RecordData;
  } | null>(null);
  const [day, setDay] = useState(todayKey());
  const refresh = useCallback(async () => {
    const generation = authGeneration.current;
    const result = await request<Data>("/api/auth");
    if (generation === authGeneration.current)
      setData(result.user ? result : null);
  }, []);
  useEffect(() => {
    if (!data?.user.id) return;
    const sync = () => {
      if (document.visibilityState === "visible")
        void refresh().catch(() => undefined);
    };
    const timer = setInterval(sync, 30000);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", sync);
    };
  }, [data?.user.id, refresh]);
  useEffect(() => {
    if (!data?.user.id) return;
    const events = new EventSource("/api/events");
    let refreshing = false;
    let dirty = false;
    const update = async () => {
      dirty = true;
      if (refreshing) return;
      refreshing = true;
      try {
        while (dirty) {
          dirty = false;
          await refresh();
        }
      } catch {
        setConnected(false);
      } finally {
        refreshing = false;
      }
    };
    events.onopen = () => setConnected(true);
    events.onerror = () => setConnected(false);
    events.addEventListener("change", () => void update());
    events.addEventListener("signed-out", () => {
      setData(null);
      setEditor(null);
      setRemove(null);
      events.close();
    });
    return () => {
      events.close();
      setConnected(false);
    };
  }, [data?.user.id, refresh]);
  useEffect(() => {
    request<Data>("/api/auth")
      .then((result) => setData(result.user ? result : null))
      .catch((e) => {
        if (!/masuk|login|autentikasi|Unauthorized|session/i.test(e.message))
          setError(e.message);
      })
      .finally(() => setLoading(false));
    const clock = setInterval(() => setDay(todayKey()), 60000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    setDark(data?.user.theme === "dark");
  }, [data?.user.id, data?.user.theme]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const mutate = async (path: string, method: string, body?: unknown) => {
    setError("");
    await request(path, method, body);
    await refresh();
    setNotice("Perubahan tersimpan.");
  };
  const actions = (collection: Collection, record: RecordData) =>
    record.userId === data?.user.id ? (
      <div className="row-actions">
        <button
          className="icon-button"
          title="Edit"
          aria-label="Edit"
          onClick={() => setEditor({ collection, record })}
        >
          <Pencil size={16} />
        </button>
        <button
          className="icon-button danger"
          title="Hapus"
          aria-label="Hapus"
          onClick={() => setRemove({ collection, record })}
        >
          <Trash2 size={16} />
        </button>
      </div>
    ) : (
      <span className="muted small">Pasangan</span>
    );
  const add = (collection: Collection, label: string) => (
    <button className="button" onClick={() => setEditor({ collection })}>
      <Plus size={16} />
      {label}
    </button>
  );
  const userPeriods =
    data?.periods
      .filter((p) => p.userId === data.user.id)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)) ?? [];
  const latest = userPeriods[0];
  const prediction = latest
    ? predictCycle(
        parseDateKey(latest.startDate),
        latest.cycleLength,
        latest.periodLength,
        parseDateKey(day),
      )
    : null;
  const savings = data ? sum(data.finances, "saving") : 0;
  const balance = data
    ? sum(data.finances, "income") - sum(data.finances, "expense") - savings
    : 0;
  const monthFinances =
    data?.finances.filter((f) => f.date.startsWith(day.slice(0, 7))) ?? [];
  const ownerName = (id: string) =>
    id === data?.user.id ? "Kamu" : data?.partner?.name || "Pasangan";
  const exportData = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `couple-hub-${day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  if (loading)
    return (
      <main className="loading-screen">
        <LoaderCircle className="spin" size={28} />
        <p>Memuat ruang kalian...</p>
      </main>
    );
  if (!data)
    return (
      <AuthScreen
        error={error}
        onSuccess={async () => {
          setError("");
          await refresh();
        }}
      />
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#main"
          className="brand"
          onClick={() => setSection("overview")}
        >
          <span className="brand-icon">
            <Heart size={23} fill="currentColor" />
          </span>
          couple<span className="brand-dot">.</span>
        </a>
        <div className="space-label">RUANG KALIAN</div>
        <nav aria-label="Navigasi utama">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${section === id ? "active" : ""}`}
              title={label}
              aria-label={label}
              data-label={label}
              aria-current={section === id ? "page" : undefined}
              onClick={() => {
                setSection(id);
                setError("");
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="couple-identity">
            <div className="avatar">
              {data.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{data.user.name}</strong>
              <span>
                {data.partner
                  ? `bersama ${data.partner.name}`
                  : "Ruang pribadi"}
              </span>
            </div>
          </div>
          <button
            className="text-button"
            onClick={() => setSection("settings")}
          >
            <ShieldCheck size={15} />
            {data.partner ? "Kelola privasi" : "Hubungkan pasangan"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="mobile-brand">couple.</span>
            <span className="desktop-crumb">Ruang kalian</span> <span>/</span>{" "}
            <strong>{nav.find((n) => n.id === section)?.label}</strong>
          </div>
          <div className="header-tools">
            <span
              className={`sync-status ${connected ? "online" : ""}`}
              role="status"
              title={
                connected ? "Tersinkron otomatis" : "Menghubungkan kembali"
              }
              aria-label={
                connected ? "Tersinkron otomatis" : "Menghubungkan kembali"
              }
            >
              <i />
            </span>
            <span className="date-label">{displayDate(day)}</span>
            <button
              className="icon-button"
              title={dark ? "Mode terang" : "Mode gelap"}
              aria-label={dark ? "Mode terang" : "Mode gelap"}
              onClick={async () => {
                setDark(!dark);
                try {
                  await request("/api/account", "PATCH", {
                    theme: !dark ? "dark" : "light",
                  });
                  await refresh();
                } catch (e) {
                  setDark(dark);
                  setError((e as Error).message);
                }
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              title="Pengingat"
              aria-label="Pengingat"
              onClick={() => setSection("overview")}
            >
              <Bell size={19} />
              {data.reminders.some(
                (r) => !r.done && r.date <= `${day}T23:59`,
              ) && <span className="notification-dot" />}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {section === "overview"
                  ? "SEDIKIT DEMI SEDIKIT, BERSAMA"
                  : "COUPLE HUB"}
              </p>
              <h1>
                {section === "overview"
                  ? `Halo, ${data.user.name.split(" ")[0]}.`
                  : nav.find((n) => n.id === section)?.label}
              </h1>
              <p className="muted">
                {section === "overview"
                  ? "Hal-hal kecil hari ini, untuk masa depan kalian."
                  : section === "finance"
                    ? "Setiap langkah menuju tujuan bersama."
                    : section === "health"
                      ? "Ruang untuk mengenali dan merawat diri."
                      : section === "library"
                        ? "Bertumbuh bersama, satu halaman setiap hari."
                        : section === "movies"
                          ? "Sisihkan waktu untuk cerita yang baru."
                          : "Koneksi, preferensi, dan kendali atas datamu."}
              </p>
            </div>
            {section === "overview" || section === "finance"
              ? add("finances", "Catat transaksi")
              : section === "health"
                ? add("periods", "Catat menstruasi")
                : section === "library"
                  ? add("books", "Tambah buku")
                  : section === "movies"
                    ? add("plans", "Rencanakan date")
                    : null}
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Tutup pesan"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}

          {section === "overview" && (
            <>
              <div className="summary-grid">
                <Metric
                  title="Tabungan dialokasikan"
                  value={rupiah(savings)}
                  icon={Wallet}
                  color="green"
                  detail={`${data.goals.length} target bersama`}
                />
                <Metric
                  title="Saldo tersedia"
                  value={rupiah(balance)}
                  icon={ArrowUpRight}
                  color="peach"
                  detail="Pemasukan - pengeluaran - alokasi"
                />
                <Metric
                  title="Perkiraan menstruasi"
                  value={
                    prediction
                      ? `${daysUntil(prediction.nextPeriodStart, parseDateKey(day))} hari lagi`
                      : "Belum ada catatan"
                  }
                  icon={Heart}
                  color="rose"
                  detail={
                    prediction
                      ? displayDate(dateKey(prediction.nextPeriodStart))
                      : "Mulai dengan mencatat siklusmu"
                  }
                />
                <Metric
                  title="Sedang dibaca"
                  value={`${data.books.filter((b) => b.status === "reading").length} buku`}
                  icon={BookOpen}
                  color="lavender"
                  detail={`${data.books.filter((b) => b.status === "finished").length} buku selesai`}
                />
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <PanelTitle
                    title="Tujuan kita"
                    icon={Target}
                    action={
                      <button
                        className="text-button"
                        onClick={() => setSection("finance")}
                      >
                        Lihat semua <ArrowUpRight size={15} />
                      </button>
                    }
                  />
                  {data.goals.length ? (
                    data.goals.slice(0, 3).map((g) => {
                      const current = data.finances
                        .filter((f) => f.type === "saving" && f.goalId === g.id)
                        .reduce((t, f) => t + f.amount, 0);
                      return (
                        <GoalRow
                          key={g.id}
                          name={g.name}
                          current={current}
                          target={g.targetAmount}
                        />
                      );
                    })
                  ) : (
                    <Empty
                      icon={Target}
                      title="Tujuan pertama kalian"
                      text="Belum ada target tabungan."
                      action={add("goals", "Buat target")}
                    />
                  )}
                </section>
                <section className="panel peach-panel">
                  <PanelTitle title="Saling menjaga" icon={Heart} />
                  <p className="large-note">
                    {prediction
                      ? `Perkiraan siklus berikutnya ${displayDate(dateKey(prediction.nextPeriodStart))}.`
                      : "Kenali ritme tubuhmu, dengan privasi di tanganmu."}
                  </p>
                  <p className="muted small">
                    {data.user.shareHealth
                      ? "Berbagi kesehatan dengan pasangan aktif."
                      : "Catatan kesehatanmu bersifat pribadi."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setSection("health")}
                  >
                    Buka kesehatan <ArrowUpRight size={16} />
                  </button>
                </section>
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <PanelTitle
                    title="Transaksi terakhir"
                    icon={Wallet}
                    action={
                      <button
                        className="text-button"
                        onClick={() => setSection("finance")}
                      >
                        Semua transaksi <ArrowUpRight size={15} />
                      </button>
                    }
                  />
                  {data.finances.length ? (
                    data.finances
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 5)
                      .map((f) => (
                        <TransactionRow
                          key={f.id}
                          finance={f}
                          owner={ownerName(f.userId)}
                        />
                      ))
                  ) : (
                    <Empty
                      icon={Wallet}
                      title="Belum ada transaksi"
                      text="Catatan pertama dimulai dari sini."
                    />
                  )}
                </section>
                <section className="panel">
                  <PanelTitle
                    title="Pengingat"
                    icon={Bell}
                    action={
                      <button
                        className="icon-button"
                        title="Tambah pengingat"
                        aria-label="Tambah pengingat"
                        onClick={() => setEditor({ collection: "reminders" })}
                      >
                        <Plus size={18} />
                      </button>
                    }
                  />
                  {data.reminders.length ? (
                    data.reminders
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((r) => (
                        <div className="list-row" key={r.id}>
                          <button
                            className={`check-button ${r.done ? "checked" : ""}`}
                            disabled={r.userId !== data.user.id || busy}
                            aria-label={
                              r.done ? "Tandai belum selesai" : "Tandai selesai"
                            }
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await mutate("/api/data", "PATCH", {
                                  collection: "reminders",
                                  id: r.id,
                                  record: { done: !r.done },
                                });
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {r.done && <Check size={15} />}
                          </button>
                          <div className="grow">
                            <strong className={r.done ? "completed" : ""}>
                              {r.title}
                            </strong>
                            <span>
                              {displayDate(r.date)} · {r.date.slice(11, 16)}
                            </span>
                          </div>
                          {actions("reminders", r)}
                        </div>
                      ))
                  ) : (
                    <Empty
                      icon={Bell}
                      title="Hari yang lapang"
                      text="Belum ada pengingat."
                    />
                  )}
                </section>
              </div>
            </>
          )}

          {section === "finance" && (
            <>
              <div className="summary-grid three">
                <Metric
                  title="Pemasukan bulan ini"
                  value={rupiah(sum(monthFinances, "income"))}
                  icon={ArrowDownLeft}
                  color="green"
                />
                <Metric
                  title="Pengeluaran bulan ini"
                  value={rupiah(sum(monthFinances, "expense"))}
                  icon={ArrowUpRight}
                  color="rose"
                />
                <Metric
                  title="Total tabungan"
                  value={rupiah(savings)}
                  icon={Wallet}
                  color="lavender"
                />
              </div>
              <section className="panel">
                <PanelTitle
                  title="Target tabungan"
                  icon={Target}
                  action={add("goals", "Buat target")}
                />
                {data.goals.length ? (
                  data.goals.map((g) => (
                    <div className="goal-with-actions" key={g.id}>
                      <GoalRow
                        name={g.name}
                        current={data.finances
                          .filter(
                            (f) => f.goalId === g.id && f.type === "saving",
                          )
                          .reduce((t, f) => t + f.amount, 0)}
                        target={g.targetAmount}
                        date={g.targetDate}
                      />
                      {actions("goals", g)}
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Target}
                    title="Belum ada target"
                    text="Tetapkan tujuan yang ingin kalian capai."
                  />
                )}
              </section>
              <FinanceHistory
                finances={data.finances}
                actions={(f) => actions("finances", f)}
                ownerName={ownerName}
              />
              <section className="panel">
                <PanelTitle
                  title="Portofolio tercatat"
                  icon={Wallet}
                  action={add("investments", "Tambah aset")}
                />
                {data.investments.length ? (
                  data.investments.map((asset) => (
                    <div className="list-row" key={asset.id}>
                      <span className="item-icon lavender">
                        <Wallet size={18} />
                      </span>
                      <div className="grow">
                        <strong>
                          {asset.name} · {asset.symbol}
                        </strong>
                        <span>
                          {asset.units.toLocaleString("id-ID", {
                            maximumFractionDigits: 8,
                          })}{" "}
                          unit · Harga beli rata-rata{" "}
                          {rupiah(asset.averagePrice)} ·{" "}
                          {ownerName(asset.userId)}
                        </span>
                      </div>
                      <strong className="amount">
                        {rupiah(Math.round(asset.units * asset.averagePrice))}
                      </strong>
                      {actions("investments", asset)}
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Wallet}
                    title="Belum ada aset"
                    text="Catat kepemilikan dan modal investasimu."
                  />
                )}
                <p className="source-note">
                  Nilai berdasarkan harga beli, bukan nilai pasar terkini. Tidak
                  otomatis mengubah saldo transaksi.
                </p>
              </section>
              <MarketWatchlist
                watches={data.watchlist}
                actions={(watch) => actions("watchlist", watch)}
                onAdd={(market) =>
                  setEditor({
                    collection: "watchlist",
                    record: {
                      id: "",
                      userId: data.user.id,
                      market,
                      symbol: "",
                      currency: market === "us" ? "USD" : "IDR",
                    },
                  })
                }
              />
            </>
          )}

          {section === "health" && (
            <>
              <div className="privacy-banner">
                <ShieldCheck size={19} />
                <span>
                  {data.user.shareHealth
                    ? "Catatan kesehatanmu dibagikan kepada pasangan yang terhubung."
                    : "Hanya kamu yang bisa melihat catatan kesehatanmu."}
                </span>
                <button
                  className="text-button"
                  onClick={() => setSection("settings")}
                >
                  Kelola izin
                </button>
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <PanelTitle title="Kalender siklus" icon={CalendarDays} />
                  <CycleCalendar
                    periods={userPeriods}
                    today={day}
                    prediction={prediction}
                  />
                </section>
                <section className="panel">
                  <PanelTitle title="Perkiraan siklus" icon={Heart} />
                  {prediction ? (
                    <div className="prediction-details">
                      <p className="big-number">
                        {daysUntil(
                          prediction.nextPeriodStart,
                          parseDateKey(day),
                        )}
                        <span> hari lagi</span>
                      </p>
                      <dl>
                        <dt>Menstruasi berikutnya</dt>
                        <dd>
                          {displayDate(dateKey(prediction.nextPeriodStart))}
                        </dd>
                        <dt>Perkiraan masa subur</dt>
                        <dd>
                          {formatDate(prediction.fertileWindowStart)} -{" "}
                          {formatDate(prediction.fertileWindowEnd)}
                        </dd>
                        <dt>Panjang siklus tercatat</dt>
                        <dd>{latest.cycleLength} hari</dd>
                      </dl>
                    </div>
                  ) : (
                    <Empty
                      icon={Heart}
                      title="Mulai dari catatan pertama"
                      text="Perkiraan muncul setelah kamu mencatat tanggal menstruasi."
                    />
                  )}
                  <p className="field-note">
                    Perkiraan kalender, bukan diagnosis atau metode kontrasepsi.
                    Siklus dapat berubah dan hasil tidak menjamin ovulasi.
                  </p>
                </section>
              </div>
              <section className="panel">
                <PanelTitle title="Riwayat kesehatan" icon={Heart} />
                {data.periods.length ? (
                  data.periods
                    .slice()
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))
                    .map((p) => (
                      <div className="list-row" key={p.id}>
                        <span className="item-icon rose">
                          <Heart size={18} />
                        </span>
                        <div className="grow">
                          <strong>
                            {displayDate(p.startDate)}
                            {p.endDate ? ` - ${displayDate(p.endDate)}` : ""}
                          </strong>
                          <span>
                            {ownerName(p.userId)} · Siklus {p.cycleLength} hari
                            · {p.symptoms || "Tanpa gejala tercatat"}
                          </span>
                          {p.notes && <p className="small">{p.notes}</p>}
                        </div>
                        {actions("periods", p)}
                      </div>
                    ))
                ) : (
                  <Empty
                    icon={CalendarDays}
                    title="Belum ada catatan"
                    text="Riwayat kesehatan akan tersimpan di sini."
                  />
                )}
              </section>
            </>
          )}

          {section === "library" && (
            <>
              <section className="panel">
                <PanelTitle title="Rak buku bersama" icon={BookOpen} />
                <Library data={data} actions={(b) => actions("books", b)} />
              </section>
              <BookReferences
                books={data.books}
                onAdd={(reference) =>
                  setEditor({
                    collection: "books",
                    record: {
                      id: "",
                      userId: data.user.id,
                      title: reference.title,
                      author: reference.author,
                      category: reference.category,
                      sourceUrl: reference.source,
                      status: "wishlist",
                      rating: 0,
                      progressPage: 0,
                      totalPages: reference.totalPages ?? 0,
                    },
                  })
                }
              />
            </>
          )}
          {section === "movies" && (
            <>
              <MovieDiscovery
                onPlan={(title, notes) =>
                  setEditor({
                    collection: "plans",
                    record: {
                      id: "",
                      userId: data.user.id,
                      title,
                      date: day,
                      notes,
                      rating: 0,
                      status: "planned",
                    },
                  })
                }
              >
                <MoviePanel
                  onPlan={(movie) =>
                    setEditor({
                      collection: "plans",
                      record: {
                        id: "",
                        userId: data.user.id,
                        title: movie.title,
                        movieId: movie.id,
                        date: day,
                        notes: "",
                        rating: 0,
                        status: "planned",
                      },
                    })
                  }
                />
              </MovieDiscovery>
              <section className="panel">
                <PanelTitle title="Rencana & kenangan" icon={CalendarDays} />
                {data.plans.length ? (
                  data.plans
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => (
                      <div className="list-row" key={p.id}>
                        <span className="item-icon lavender">
                          <Clapperboard size={19} />
                        </span>
                        <div className="grow">
                          <strong>{p.title}</strong>
                          <span>
                            {displayDate(p.date)} ·{" "}
                            {p.status === "watched"
                              ? "Sudah ditonton"
                              : "Direncanakan"}
                            {p.rating ? ` · ${p.rating}/5` : ""}
                          </span>
                          {p.notes && <p className="small">{p.notes}</p>}
                        </div>
                        {actions("plans", p)}
                      </div>
                    ))
                ) : (
                  <Empty
                    icon={Clapperboard}
                    title="Waktu untuk berdua"
                    text="Belum ada rencana kencan."
                  />
                )}
              </section>
            </>
          )}
          {section === "settings" && (
            <SettingsPanel
              data={data}
              onChange={refresh}
              onLogout={() => {
                authGeneration.current++;
                setData(null);
                setEditor(null);
                setRemove(null);
                setSection("overview");
              }}
              exportData={exportData}
            />
          )}
          <footer className="page-footer">
            <span>
              couple. <span className="muted">Ruang kecil untuk dua.</span>
            </span>
            <span className="muted small">
              <ShieldCheck size={13} />
              Kamu mengendalikan datamu
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <RecordEditor
          collection={editor.collection}
          record={editor.record}
          goals={data.goals}
          onClose={() => setEditor(null)}
          onSave={async (record) => {
            const existing = editor.record?.id;
            await mutate("/api/data", existing ? "PATCH" : "POST", {
              collection: editor.collection,
              ...(existing ? { id: existing } : {}),
              record,
            });
          }}
        />
      )}
      {remove && (
        <ConfirmDelete
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            await mutate("/api/data", "DELETE", {
              collection: remove.collection,
              id: remove.record.id,
            });
            setRemove(null);
          }}
        />
      )}
    </div>
  );
}

function AuthScreen({
  onSuccess,
  error: initialError,
}: {
  onSuccess: () => Promise<void>;
  error: string;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <Heart size={30} />
        couple.
      </div>
      <section className="auth-form">
        <p className="eyebrow">RUANG KECIL UNTUK DUA</p>
        <h1>{register ? "Mulai cerita kalian." : "Senang kamu kembali."}</h1>
        <p className="muted">
          {register
            ? "Buat akun pribadi. Hubungkan pasangan saat kamu siap."
            : "Masuk ke ruang pribadi kalian."}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const body = Object.fromEntries(new FormData(event.currentTarget));
            try {
              await request("/api/auth", "POST", {
                ...body,
                action: register ? "register" : "login",
              });
              await onSuccess();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <label>
              Nama
              <input name="name" required maxLength={80} autoComplete="name" />
            </label>
          )}
          {register && (
            <label>
              Nama pengguna
              <input
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]{3,30}"
              />
            </label>
          )}
          <label>
            {register ? "Email (opsional)" : "Nama pengguna atau email"}
            <input
              name={register ? "email" : "identifier"}
              type={register ? "email" : "text"}
              required={!register}
              maxLength={254}
              autoComplete={register ? "email" : "username"}
            />
          </label>
          <label>
            Kata sandi
            <input
              name="password"
              type="password"
              required
              minLength={register ? 12 : undefined}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          {register && (
            <p className="field-note">
              Minimal 12 karakter. Gunakan kata sandi yang unik.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : null}
            {busy ? "Memproses..." : register ? "Buat akun" : "Masuk"}
          </button>
        </form>
        <button
          className="text-button auth-switch"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
        </button>
        <p className="auth-privacy">
          <ShieldCheck size={16} />
          Catatan kesehatan pribadi secara default.
        </p>
      </section>
    </main>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  color,
  detail,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  detail?: string;
}) {
  return (
    <section className="metric">
      <div className="metric-label">
        <span>{title}</span>
        <span className={`item-icon ${color}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="metric-value">{value}</p>
      {detail && <p className="muted small">{detail}</p>}
    </section>
  );
}
function PanelTitle({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <h2>
        <Icon size={19} />
        {title}
      </h2>
      {action}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function GoalRow({
  name,
  current,
  target,
  date,
}: {
  name: string;
  current: number;
  target: number;
  date?: string;
}) {
  const progress = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="goal-row">
      <div className="split">
        <strong>{name}</strong>
        <span className="green-text">{progress}%</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="split small muted">
        <span>
          {rupiah(current)} <span>/ {rupiah(target)}</span>
        </span>
        {date && <span>{displayDate(date)}</span>}
      </div>
    </div>
  );
}
function TransactionRow({
  finance: f,
  owner,
  action,
}: {
  finance: Finance;
  owner: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="list-row">
      <span className={`item-icon ${f.type === "expense" ? "rose" : "green"}`}>
        {f.type === "expense" ? (
          <ArrowUpRight size={18} />
        ) : (
          <ArrowDownLeft size={18} />
        )}
      </span>
      <div className="grow">
        <strong>{f.title}</strong>
        <span>
          {f.category} · {displayDate(f.date)} · {owner}
        </span>
      </div>
      <strong className={`amount ${f.type === "income" ? "green-text" : ""}`}>
        {f.type === "income" ? "+" : "-"}
        {rupiah(f.amount)}
      </strong>
      {action}
    </div>
  );
}

function FinanceHistory({
  finances,
  actions,
  ownerName,
}: {
  finances: Finance[];
  actions: (record: Finance) => React.ReactNode;
  ownerName: (id: string) => string;
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const rows = finances
    .filter(
      (f) =>
        (filter === "all" || f.type === filter) &&
        `${f.title} ${f.category}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel">
      <PanelTitle title="Riwayat transaksi" icon={Wallet} />
      <div className="filter-row">
        <label className="search-field">
          <span className="sr-only">Cari transaksi</span>
          <input
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Jenis transaksi</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Semua jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
            <option value="saving">Alokasi tabungan</option>
          </select>
        </label>
      </div>
      {rows.length ? (
        rows.map((f) => (
          <TransactionRow
            key={f.id}
            finance={f}
            owner={ownerName(f.userId)}
            action={actions(f)}
          />
        ))
      ) : (
        <Empty
          icon={Wallet}
          title="Tidak ada transaksi"
          text="Belum ada catatan yang cocok."
        />
      )}
    </section>
  );
}

function CycleCalendar({
  periods,
  today,
  prediction,
}: {
  periods: Data["periods"];
  today: string;
  prediction: ReturnType<typeof predictCycle> | null;
}) {
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00`));
  const days = calendarDays(month.getFullYear(), month.getMonth());
  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          className="icon-button"
          aria-label="Bulan sebelumnya"
          title="Bulan sebelumnya"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft size={18} />
        </button>
        <strong>
          {month.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          className="icon-button"
          aria-label="Bulan berikutnya"
          title="Bulan berikutnya"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((s) => (
          <span className="weekday" key={s}>
            {s}
          </span>
        ))}
        {Array.from({ length: days[0].weekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const recorded = periods.some(
            (p) => d.key >= p.startDate && d.key <= (p.endDate || p.startDate),
          );
          const estimated =
            prediction &&
            d.key >= dateKey(prediction.nextPeriodStart) &&
            d.key <= dateKey(prediction.nextPeriodEnd);
          return (
            <span
              key={d.key}
              aria-current={d.key === today ? "date" : undefined}
              title={`${displayDate(d.key)}${recorded ? ": menstruasi tercatat" : estimated ? ": perkiraan menstruasi" : ""}`}
              className={`calendar-day ${recorded ? "recorded" : estimated ? "estimated" : ""} ${d.key === today ? "today" : ""}`}
            >
              {d.day}
            </span>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="recorded" />
          Tercatat
        </span>
        <span>
          <i className="estimated" />
          Perkiraan
        </span>
        <button
          className="text-button"
          onClick={() => setMonth(new Date(`${today}T12:00:00`))}
        >
          Hari ini
        </button>
      </div>
    </div>
  );
}

function Library({
  data,
  actions,
}: {
  data: Data;
  actions: (book: Data["books"][number]) => React.ReactNode;
}) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const labels = {
    wishlist: "Ingin dibaca",
    reading: "Sedang dibaca",
    finished: "Selesai",
  };
  const books = data.books.filter(
    (b) =>
      (status === "all" || b.status === status) &&
      `${b.title} ${b.author}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="filter-row">
        <label className="search-field">
          <span className="sr-only">Cari buku</span>
          <input
            placeholder="Cari judul atau penulis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Status buku</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Semua status</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {books.length ? (
        <div className="book-grid">
          {books.map((b) => (
            <article className="book-item" key={b.id}>
              <div
                className={`book-cover ${b.category === "finance" ? "green" : b.category === "health" ? "rose" : "lavender"}`}
              >
                <BookOpen size={32} />
              </div>
              <div className="grow">
                <span className="tag">{labels[b.status]}</span>
                <h3>{b.title}</h3>
                <p className="muted small">
                  {b.author || "Penulis tidak dicatat"}
                </p>
                <p className="small">
                  {b.progressPage} / {b.totalPages || "?"} halaman
                  {b.rating ? ` · ${b.rating}/5` : ""}
                </p>
                {actions(b)}
                {b.sourceUrl && (
                  <a
                    className="text-button"
                    href={b.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sumber bacaan
                    <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={BookOpen}
          title="Rak yang siap diisi"
          text="Belum ada buku yang cocok."
        />
      )}
    </>
  );
}

function MoviePanel({ onPlan }: { onPlan: (movie: Movie) => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Movie | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    request<{ movies: Movie[] }>("/api/movies")
      .then((r) => setMovies(r.movies))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  return (
    <section className="panel">
      <PanelTitle
        title="Sedang tayang · Indonesia"
        icon={Clapperboard}
        action={
          <button className="text-button" onClick={load} disabled={loading}>
            Perbarui
          </button>
        }
      />
      {loading ? (
        <div className="empty" role="status">
          <LoaderCircle className="spin" />
          Mengambil film...
        </div>
      ) : error ? (
        <div className="service-status" role="status">
          <Clapperboard size={24} />
          <h3>Radar film belum tersedia</h3>
          <p>{error}</p>
          <p className="muted small">
            Kamu tetap bisa membuat rencana date secara manual.
          </p>
        </div>
      ) : movies.length ? (
        <div className="movie-grid">
          {movies.map((m) => (
            <article key={m.id} className="movie-item">
              <button
                className="poster-button"
                onClick={() => setSelected(m)}
                aria-label={`Detail ${m.title}`}
              >
                {m.poster ? (
                  <Image
                    src={m.poster}
                    alt={`Poster ${m.title}`}
                    width={300}
                    height={450}
                    sizes="(max-width: 600px) 42vw, 180px"
                  />
                ) : (
                  <div className="poster-fallback">
                    <Clapperboard size={36} />
                  </div>
                )}
                <span className="rating">{m.rating.toFixed(1)}/10</span>
              </button>
              <h3>{m.title}</h3>
              <p className="muted small">{displayDate(m.releaseDate)}</p>
              <button className="text-button" onClick={() => onPlan(m)}>
                <Plus size={14} />
                Rencanakan
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={Clapperboard}
          title="Belum ada film"
          text="Daftar film untuk wilayah ini masih kosong."
        />
      )}
      <p className="source-note">
        Data film: TMDB. This product uses the TMDB API but is not endorsed or
        certified by TMDB.
      </p>
      {selected && (
        <NativeModal
          className="movie-detail"
          titleId="movie-title"
          onClose={() => setSelected(null)}
        >
          <div className="dialog-head">
            <h2 id="movie-title">{selected.title}</h2>
            <button
              className="icon-button"
              aria-label="Tutup detail"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
          </div>
          <p>{selected.synopsis || "Sinopsis belum tersedia."}</p>
          <p className="muted">
            Rating {selected.rating}/10 · {displayDate(selected.releaseDate)}
          </p>
          <button
            className="button"
            onClick={() => {
              onPlan(selected);
              setSelected(null);
            }}
          >
            <Plus size={16} />
            Rencanakan date
          </button>
        </NativeModal>
      )}
    </section>
  );
}

function SettingsPanel({
  data,
  onChange,
  onLogout,
  exportData,
}: {
  data: Data;
  onChange: () => Promise<void>;
  onLogout: () => void;
  exportData: () => void;
}) {
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{
    token: string;
    expiresAt: string;
  } | null>(null);
  const run = async (body: Record<string, unknown>) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await request<{ token?: string; expiresAt?: string }>(
        "/api/couple",
        "POST",
        body,
      );
      if (result.token)
        setInvite({ token: result.token, expiresAt: result.expiresAt || "" });
      else {
        await onChange();
        setNotice("Pengaturan tersimpan.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="settings-sections">
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      <section className="panel">
        <PanelTitle title="Koneksi pasangan" icon={Heart} />
        {data.partner ? (
          <>
            <p>
              Terhubung dengan <strong>{data.partner.name}</strong>.
            </p>
            <p className="muted small">
              Transaksi, target, buku, dan rencana date dibagikan. Hanya pemilik
              yang dapat mengubah catatannya.
            </p>
            <button
              className="button secondary danger"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Putuskan koneksi? Akses bersama akan dicabut. Catatan masing-masing tetap disimpan.",
                  )
                )
                  void run({ action: "disconnect" });
              }}
            >
              Putuskan koneksi
            </button>
          </>
        ) : (
          <>
            <div className="settings-row">
              <div>
                <h3>Undang pasangan</h3>
                <p className="muted small">
                  Kode sekali pakai. Bagikan hanya kepada pasanganmu.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void run({ action: "invite" })}
              >
                Buat kode undangan
              </button>
            </div>
            {invite && (
              <div className="invite-box">
                <label>
                  Kode undangan
                  <input
                    readOnly
                    value={invite.token}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p className="muted small">
                  Berlaku sampai {displayDate(invite.expiresAt)}{" "}
                  {invite.expiresAt &&
                    new Date(invite.expiresAt).toLocaleTimeString("id-ID")}
                </p>
              </div>
            )}
            <form
              className="join-form"
              onSubmit={(e) => {
                e.preventDefault();
                const token = new FormData(e.currentTarget).get("token");
                const consent = window.confirm(
                  "Dengan terhubung, seluruh transaksi, target, buku, rencana, dan pengingat kalian akan saling terlihat. Catatan kesehatan tetap pribadi. Lanjutkan?",
                );
                if (consent) void run({ action: "join", token, consent: true });
              }}
            >
              <label>
                Kode dari pasangan
                <input
                  name="token"
                  required
                  maxLength={128}
                  autoComplete="off"
                />
              </label>
              <button className="button" disabled={busy}>
                Hubungkan
              </button>
            </form>
          </>
        )}
      </section>
      <section className="panel">
        <PanelTitle title="Privasi kesehatan" icon={ShieldCheck} />
        <label className="toggle-row">
          <span>
            <strong>Bagikan catatan kesehatan</strong>
            <span className="muted small">
              Pasangan terhubung dapat membaca tanggal, gejala, dan catatan.
              Nonaktifkan kapan saja untuk mencabut akses.
            </span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(data.user.shareHealth)}
            disabled={busy || !data.partner}
            onChange={(e) => {
              if (
                !e.target.checked ||
                window.confirm(
                  "Izinkan pasangan membaca seluruh catatan kesehatanmu?",
                )
              )
                void run({
                  action: "shareHealth",
                  shareHealth: e.target.checked,
                });
            }}
          />
        </label>
      </section>
      <section className="panel">
        <PanelTitle title="Data & akun" icon={Settings} />
        <div className="settings-row">
          <div>
            <h3>{data.user.name}</h3>
            <p className="muted small">
              {data.user.username ? `@${data.user.username}` : data.user.email}
            </p>
          </div>
          <button className="button secondary" onClick={exportData}>
            <Download size={16} />
            Ekspor data
          </button>
        </div>
        <p className="field-note">
          File ekspor berisi data sensitif, termasuk data pasangan yang saat ini
          dibagikan kepadamu. Simpan secara pribadi.
        </p>
        <div className="settings-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request("/api/auth", "POST", { action: "logout" });
                onLogout();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} />
            Keluar
          </button>
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => setDeleteAccount(true)}
          >
            <Trash2 size={16} />
            Hapus akun
          </button>
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Pengingat & notifikasi" icon={Bell} />
        <p>Pengingat tersimpan dan tampil di dashboard.</p>
        <p className="muted small">
          Push notification otomatis belum diaktifkan. Tidak ada notifikasi yang
          dikirim saat aplikasi ditutup.
        </p>
      </section>
      {deleteAccount && (
        <DeleteAccount
          onClose={() => setDeleteAccount(false)}
          onDeleted={onLogout}
        />
      )}
    </div>
  );
}

function ConfirmDelete({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <NativeModal
      className="confirm-dialog"
      titleId="delete-title"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h2 id="delete-title">Hapus catatan?</h2>
      <p>Catatan yang dihapus tidak dapat dikembalikan.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Batal
        </button>
        <button
          className="button danger-fill"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <Trash2 size={16} />
          {busy ? "Menghapus..." : "Hapus"}
        </button>
      </div>
    </NativeModal>
  );
}

function NativeModal({
  children,
  className,
  titleId,
  onClose,
}: {
  children: React.ReactNode;
  className: string;
  titleId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

function DeleteAccount({
  onClose,
  onDeleted,
}: {
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <NativeModal
      className="confirm-dialog"
      titleId="delete-account-title"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h2 id="delete-account-title">Hapus akun permanen?</h2>
      <p>
        Semua catatan milikmu dihapus dan koneksi pasangan diputus. Data milik
        pasangan tidak ikut dihapus.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const password = new FormData(event.currentTarget).get("password");
          setBusy(true);
          setError("");
          try {
            await request("/api/account", "DELETE", { password });
            onDeleted();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label className="delete-password">
          Konfirmasi kata sandi
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Batal
          </button>
          <button className="button danger-fill" disabled={busy}>
            <Trash2 size={16} />
            {busy ? "Menghapus..." : "Hapus permanen"}
          </button>
        </div>
      </form>
    </NativeModal>
  );
}
