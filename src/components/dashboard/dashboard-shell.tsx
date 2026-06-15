"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Bed,
  Bell,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  Coffee,
  Droplets,
  Edit2,
  HeartPulse,
  Moon,
  Newspaper,
  PenLine,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Thermometer,
  Trash2,
  TrendingUp,
  WalletCards,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { initialPeriodSettings, initialSavingsGoals } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";
import { GlassCard } from "./glass-card";

type PeriodSettings = typeof initialPeriodSettings;
type DailySymptom = PeriodSettings["dailySymptoms"][number];

type SavingsGoal = {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyChange: number;
};

type MarketQuote = {
  id: string;
  symbol: string;
  label: string;
  imageUrl: string;
  price: number | null;
  changePercent: number | null;
  currency: string;
  source: string;
  updatedAt: string;
  status: "live" | "needs-key" | "error";
  message?: string;
};

type MovieItem = {
  id: string | number;
  title: string;
  rating: number;
  genre: string;
  poster: string;
  releaseDate: string | null;
};

type NewsHeadline = {
  id: string;
  title: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
};

type NewsBuckets = {
  global: NewsHeadline[];
  indonesia: NewsHeadline[];
};

type JajanExpense = {
  id: string;
  title: string;
  amount: number;
  payer: "Aryo" | "Zhafia" | "Berdua";
  category: string;
  date: string;
};

type DashboardStateResponse = {
  exists: boolean;
  savingsGoals: unknown;
  jajanExpenses: unknown;
  periodSettings: unknown;
  journalText?: string;
  status?: "error";
  message?: string;
};

const periodStorageKey = "az-hub.period-settings";
const savingsStorageKey = "az-hub.savings-goals";
const savingsStorageVersionKey = "az-hub.savings-goals.version";
const savingsStorageVersion = "2026-06-15-zero-defaults";
const jajanStorageKey = "az-hub.jajan-expenses";
const jajanStorageVersionKey = "az-hub.jajan-expenses.version";
const jajanStorageVersion = "2026-06-15-empty-defaults";
const dayMs = 24 * 60 * 60 * 1000;

const inputClass =
  "h-11 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#1F2933] outline-none transition placeholder:text-slate-400 focus:border-[#2E7D5B] focus:ring-4 focus:ring-[#2E7D5B]/10 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-500";

const legacySavingsCurrentById: Record<string, number> = {
  wedding: 42650000,
  emergency: 18400000
};

const legacyJajanExpenseIds = new Set(["kopi-sore", "martabak"]);
const legacyJajanExpenseCount = 2;

const initialJajanExpenses: JajanExpense[] = [];

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function daysBetween(later: Date, earlier: Date) {
  const laterMidnight = parseLocalDate(toDateInputValue(later));
  const earlierMidnight = parseLocalDate(toDateInputValue(earlier));

  return Math.floor((laterMidnight.getTime() - earlierMidnight.getTime()) / dayMs);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatMarketPrice(quote: MarketQuote) {
  if (quote.price === null) {
    return "Belum aktif";
  }

  if (quote.currency === "PTS") {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 2
    }).format(quote.price);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: quote.currency || "USD",
    maximumFractionDigits: quote.price > 100 ? 2 : 4
  }).format(quote.price);
}

function formatTime(value: string) {
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

function formatDateLabel(value: string) {
  const date = parseLocalDate(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function buildMonthlyExpenseChart(expenses: JajanExpense[], today: Date) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = monthKey(date);
    const total = expenses
      .filter((expense) => expense.date.startsWith(key))
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", {
        month: "short"
      }).format(date),
      total
    };
  });
}

function getProgress(current: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

function normalizeSavingsGoals(value: unknown): SavingsGoal[] {
  if (!Array.isArray(value)) {
    return initialSavingsGoals;
  }

  return value
    .map((goal) => {
      if (!goal || typeof goal !== "object") {
        return null;
      }

      const item = goal as Partial<SavingsGoal>;

      return {
        id: String(item.id ?? crypto.randomUUID()),
        name: String(item.name ?? "").trim(),
        current: Number(item.current) || 0,
        target: Number(item.target) || 0,
        monthlyChange: Number(item.monthlyChange) || 0
      };
    })
    .filter((goal): goal is SavingsGoal => Boolean(goal?.id && goal.name));
}

function migrateSavingsGoals(goals: SavingsGoal[]) {
  return goals.map((goal) => {
    const legacyCurrent = legacySavingsCurrentById[goal.id];

    if (legacyCurrent !== undefined && goal.current === legacyCurrent) {
      return {
        ...goal,
        current: 0,
        monthlyChange: 0
      };
    }

    return goal;
  });
}

function normalizeJajanExpenses(value: unknown): JajanExpense[] {
  if (!Array.isArray(value)) {
    return initialJajanExpenses;
  }

  return value
    .map((expense) => {
      if (!expense || typeof expense !== "object") {
        return null;
      }

      const item = expense as Partial<JajanExpense>;
      const payer =
        item.payer === "Aryo" || item.payer === "Zhafia" || item.payer === "Berdua"
          ? item.payer
          : "Berdua";

      return {
        id: String(item.id ?? crypto.randomUUID()),
        title: String(item.title ?? "").trim(),
        amount: Number(item.amount) || 0,
        payer,
        category: String(item.category ?? "Jajan").trim() || "Jajan",
        date: String(item.date ?? toDateInputValue(new Date()))
      };
    })
    .filter((expense): expense is JajanExpense =>
      Boolean(expense?.id && expense.title && expense.amount > 0)
    );
}

function migrateJajanExpenses(expenses: JajanExpense[]) {
  const isLegacyDefault =
    expenses.length === legacyJajanExpenseCount &&
    expenses.every((expense) => legacyJajanExpenseIds.has(expense.id));

  return isLegacyDefault ? [] : expenses;
}

function MonthlyExpenseChart({
  data
}: {
  data: Array<{ key: string; label: string; total: number }>;
}) {
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="rounded-2xl border border-black/5 bg-[#F8FAF7] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#1F2933]">
          Pengeluaran bulanan
        </span>
        <span className="text-xs font-semibold text-slate-500">6 bulan</span>
      </div>
      <div className="mt-4 grid h-28 grid-cols-6 items-end gap-2">
        {data.map((item) => {
          const height = Math.max(8, Math.round((item.total / max) * 100));

          return (
            <div key={item.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
              <div className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-xl bg-[#2E7D5B] transition-all duration-500"
                  style={{ height: `${height}%` }}
                  title={formatCurrency(item.total)}
                />
              </div>
              <span className="truncate text-center text-[11px] font-semibold text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toGoogleCalendarDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}${month}${day}`;
}

function getCycleInfo(settings: PeriodSettings, today: Date) {
  const learnedCycleLength = getLearnedCycleLength(settings);
  const lastPeriodStart = parseLocalDate(settings.lastPeriodStart);
  const rawDaysSince = daysBetween(today, lastPeriodStart);
  const daysSince = Math.max(0, rawDaysSince);
  const cyclesElapsed = Math.floor(daysSince / learnedCycleLength);
  const currentCycleStart = addDays(
    lastPeriodStart,
    cyclesElapsed * learnedCycleLength
  );
  const cycleDay = daysBetween(today, currentCycleStart) + 1;
  const nextPeriod = addDays(currentCycleStart, learnedCycleLength);
  const nextPeriodInDays = Math.max(0, daysBetween(nextPeriod, today));
  const ovulationDay = addDays(nextPeriod, -settings.lutealLength);
  const fertileStart = addDays(ovulationDay, -5);
  const fertileEnd = addDays(ovulationDay, 1);

  return {
    cycleDay,
    learnedCycleLength,
    nextPeriod,
    nextPeriodInDays,
    fertileStart,
    fertileEnd
  };
}

function getLearnedCycleLength(settings: PeriodSettings) {
  const sortedStarts = [...(settings.cycleStartHistory ?? []), settings.lastPeriodStart]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
  const intervals = sortedStarts
    .slice(1)
    .map((start, index) =>
      daysBetween(parseLocalDate(start), parseLocalDate(sortedStarts[index]))
    )
    .filter((days) => days >= 21 && days <= 45);

  if (intervals.length === 0) {
    return settings.cycleLength;
  }

  const average =
    intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const blended = settings.cycleLength * 0.35 + average * 0.65;

  return Math.round(blended);
}

function getCycleDayForDate(settings: PeriodSettings, date: Date) {
  const learnedCycleLength = getLearnedCycleLength(settings);
  const lastPeriodStart = parseLocalDate(settings.lastPeriodStart);
  const diff = daysBetween(date, lastPeriodStart);

  if (diff < 0) {
    return null;
  }

  return (diff % learnedCycleLength) + 1;
}

function isSameDay(first: Date, second: Date) {
  return toDateInputValue(first) === toDateInputValue(second);
}

function buildMonthCells(settings: PeriodSettings, today: Date) {
  const learnedCycleLength = getLearnedCycleLength(settings);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const firstCell = addDays(monthStart, -firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstCell, index);
    const cycleDay = getCycleDayForDate(settings, date);
    const isCurrentMonth = date.getMonth() === today.getMonth();
    const isPeriod = cycleDay !== null && cycleDay <= settings.periodLength;
    const isFertile =
      cycleDay !== null &&
      cycleDay >= learnedCycleLength - settings.lutealLength - 5 &&
      cycleDay <= learnedCycleLength - settings.lutealLength + 1;

    return {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday: isSameDay(date, today),
      isPeriod,
      isFertile
    };
  });
}

function createEmptyGoal(): SavingsGoal {
  return {
    id: "",
    name: "",
    current: 0,
    target: 0,
    monthlyChange: 0
  };
}

function createEmptyExpense(): Omit<JajanExpense, "id"> {
  return {
    title: "",
    amount: 0,
    payer: "Berdua",
    category: "Jajan",
    date: toDateInputValue(new Date())
  };
}

function createEmptyDailySymptom(date = toDateInputValue(new Date())): DailySymptom {
  return {
    date,
    cramps: false,
    headache: false,
    mood: "Stabil",
    cervicalFluid: "Kering",
    basalTemperature: 36.5,
    stress: "Rendah",
    sleepHours: 7
  };
}

function normalizePeriodSettings(value: Partial<PeriodSettings>): PeriodSettings {
  const starts = [
    ...(Array.isArray(value.cycleStartHistory) ? value.cycleStartHistory : []),
    value.lastPeriodStart ?? initialPeriodSettings.lastPeriodStart
  ]
    .filter(Boolean)
    .filter((date, index, dates) => dates.indexOf(date) === index)
    .sort();

  return {
    ...initialPeriodSettings,
    ...value,
    cycleStartHistory: starts,
    dailySymptoms: Array.isArray(value.dailySymptoms)
      ? value.dailySymptoms
      : initialPeriodSettings.dailySymptoms,
    symptoms: Array.isArray(value.symptoms)
      ? value.symptoms
      : initialPeriodSettings.symptoms
  };
}

export function DashboardShell() {
  const [darkMode, setDarkMode] = useState(false);
  const [vitaminDone, setVitaminDone] = useState(false);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(
    initialPeriodSettings
  );
  const [periodLoaded, setPeriodLoaded] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(
    initialSavingsGoals
  );
  const [savingsLoaded, setSavingsLoaded] = useState(false);
  const [dashboardStateLoaded, setDashboardStateLoaded] = useState(false);
  const [dashboardStateAvailable, setDashboardStateAvailable] = useState(false);
  const [goalForm, setGoalForm] = useState<SavingsGoal>(createEmptyGoal);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [marketFlash, setMarketFlash] = useState<Record<string, "up" | "down">>(
    {}
  );
  const [marketStatus, setMarketStatus] = useState("Memuat realtime market...");
  const [lastMarketUpdate, setLastMarketUpdate] = useState<string | null>(null);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [movieStatus, setMovieStatus] = useState("Memuat film now playing...");
  const [newsBuckets, setNewsBuckets] = useState<NewsBuckets>({
    global: [],
    indonesia: []
  });
  const [newsStatus, setNewsStatus] = useState("Memuat headline ekonomi...");
  const [jajanExpenses, setJajanExpenses] =
    useState<JajanExpense[]>(initialJajanExpenses);
  const [jajanLoaded, setJajanLoaded] = useState(false);
  const [expenseForm, setExpenseForm] = useState(createEmptyExpense);
  const [symptomForm, setSymptomForm] = useState<DailySymptom>(() =>
    createEmptyDailySymptom()
  );
  const [journalText, setJournalText] = useState("");
  const [journalStatus, setJournalStatus] = useState("Belum disimpan");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const today = currentTime;

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const savedPeriod = window.localStorage.getItem(periodStorageKey);

    if (savedPeriod) {
      setPeriodSettings(
        normalizePeriodSettings(JSON.parse(savedPeriod) as Partial<PeriodSettings>)
      );
    }

    setPeriodLoaded(true);
  }, []);

  useEffect(() => {
    if (periodLoaded) {
      window.localStorage.setItem(periodStorageKey, JSON.stringify(periodSettings));
    }
  }, [periodLoaded, periodSettings]);

  useEffect(() => {
    const savedGoals = window.localStorage.getItem(savingsStorageKey);
    const savedVersion = window.localStorage.getItem(savingsStorageVersionKey);

    if (savedGoals) {
      const parsedGoals = normalizeSavingsGoals(JSON.parse(savedGoals));
      setSavingsGoals(
        savedVersion === savingsStorageVersion
          ? parsedGoals
          : migrateSavingsGoals(parsedGoals)
      );
    }

    setSavingsLoaded(true);
  }, []);

  useEffect(() => {
    if (savingsLoaded) {
      window.localStorage.setItem(savingsStorageKey, JSON.stringify(savingsGoals));
      window.localStorage.setItem(savingsStorageVersionKey, savingsStorageVersion);
    }
  }, [savingsGoals, savingsLoaded]);

  useEffect(() => {
    const savedExpenses = window.localStorage.getItem(jajanStorageKey);
    const savedVersion = window.localStorage.getItem(jajanStorageVersionKey);

    if (savedExpenses) {
      const parsedExpenses = normalizeJajanExpenses(JSON.parse(savedExpenses));
      setJajanExpenses(
        savedVersion === jajanStorageVersion
          ? parsedExpenses
          : migrateJajanExpenses(parsedExpenses)
      );
    }

    setJajanLoaded(true);
  }, []);

  useEffect(() => {
    if (jajanLoaded) {
      window.localStorage.setItem(jajanStorageKey, JSON.stringify(jajanExpenses));
      window.localStorage.setItem(jajanStorageVersionKey, jajanStorageVersion);
    }
  }, [jajanExpenses, jajanLoaded]);

  useEffect(() => {
    if (
      !periodLoaded ||
      !savingsLoaded ||
      !jajanLoaded ||
      dashboardStateLoaded
    ) {
      return;
    }

    let isMounted = true;

    async function loadDashboardState() {
      try {
        const response = await fetch("/api/dashboard/state", { cache: "no-store" });
        const data = (await response.json()) as DashboardStateResponse;

        if (!isMounted) {
          return;
        }

        if (data.status === "error") {
          setDashboardStateAvailable(false);
          return;
        }

        setDashboardStateAvailable(true);

        if (data.exists) {
          setSavingsGoals(normalizeSavingsGoals(data.savingsGoals));
          setJajanExpenses(normalizeJajanExpenses(data.jajanExpenses));
          setPeriodSettings(
            normalizePeriodSettings(data.periodSettings as Partial<PeriodSettings>)
          );

          if (typeof data.journalText === "string") {
            setJournalText(data.journalText);
          }
        } else {
          await fetch("/api/dashboard/state", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              savingsGoals,
              jajanExpenses,
              periodSettings,
              journalText
            })
          });
        }
      } catch {
        if (isMounted) {
          setDashboardStateAvailable(false);
        }
      } finally {
        if (isMounted) {
          setDashboardStateLoaded(true);
        }
      }
    }

    loadDashboardState();

    return () => {
      isMounted = false;
    };
  }, [
    dashboardStateLoaded,
    jajanExpenses,
    jajanLoaded,
    journalText,
    periodLoaded,
    periodSettings,
    savingsGoals,
    savingsLoaded
  ]);

  useEffect(() => {
    if (!dashboardStateLoaded || !dashboardStateAvailable) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      fetch("/api/dashboard/state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          savingsGoals,
          jajanExpenses,
          periodSettings,
          journalText
        })
      }).catch(() => {
        setDashboardStateAvailable(false);
      });
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [
    dashboardStateAvailable,
    dashboardStateLoaded,
    jajanExpenses,
    journalText,
    periodSettings,
    savingsGoals
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadMarketQuotes() {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });
        const data = (await response.json()) as { quotes: MarketQuote[] };

        if (!isMounted) {
          return;
        }

        setQuotes((previousQuotes) => {
          const previousById = new Map(
            previousQuotes.map((quote) => [quote.id, quote.price])
          );
          const nextFlash: Record<string, "up" | "down"> = {};

          for (const quote of data.quotes) {
            const previousPrice = previousById.get(quote.id);

            if (
              typeof previousPrice === "number" &&
              typeof quote.price === "number" &&
              previousPrice !== quote.price
            ) {
              nextFlash[quote.id] = quote.price > previousPrice ? "up" : "down";
            }
          }

          setMarketFlash(nextFlash);

          window.setTimeout(() => {
            if (isMounted) {
              setMarketFlash({});
            }
          }, 900);

          return data.quotes;
        });

        setLastMarketUpdate(new Date().toISOString());
        setMarketStatus("Realtime tiap 5 detik");
      } catch {
        if (isMounted) {
          setMarketStatus("Harga pasar gagal dimuat");
        }
      }
    }

    loadMarketQuotes();
    const intervalId = window.setInterval(loadMarketQuotes, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMovies() {
      try {
        const response = await fetch("/api/movies", { cache: "no-store" });
        const data = (await response.json()) as {
          movies: MovieItem[];
          status: "live" | "fallback";
          message?: string;
        };

        if (!isMounted) {
          return;
        }

        setMovies(data.movies);
        setMovieStatus(
          data.status === "live" ? "TMDB now playing" : "Film pilihan sementara"
        );
      } catch {
        if (isMounted) {
          setMovieStatus("Film gagal dimuat");
        }
      }
    }

    loadMovies();
    const intervalId = window.setInterval(loadMovies, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadNews() {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        const data = (await response.json()) as {
          headlines?: NewsHeadline[];
          globalHeadlines?: NewsHeadline[];
          indonesiaHeadlines?: NewsHeadline[];
          status: "live" | "fallback";
          message?: string;
        };

        if (!isMounted) {
          return;
        }

        setNewsBuckets({
          global: data.globalHeadlines ?? data.headlines ?? [],
          indonesia: data.indonesiaHeadlines ?? []
        });
        setNewsStatus(
          data.status === "live" ? "NewsAPI live" : "Headline sementara"
        );
      } catch {
        if (isMounted) {
          setNewsStatus("Berita gagal dimuat");
        }
      }
    }

    loadNews();
    const intervalId = window.setInterval(loadNews, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const totalSavings = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + goal.current, 0),
    [savingsGoals]
  );

  const totalTargets = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + goal.target, 0),
    [savingsGoals]
  );

  const monthlyExpenseData = useMemo(
    () => buildMonthlyExpenseChart(jajanExpenses, today),
    [jajanExpenses, today]
  );

  const aryoJajan = useMemo(
    () =>
      jajanExpenses
        .filter((item) => item.payer === "Aryo")
        .reduce((sum, item) => sum + item.amount, 0),
    [jajanExpenses]
  );

  const zhafiaJajan = useMemo(
    () =>
      jajanExpenses
        .filter((item) => item.payer === "Zhafia")
        .reduce((sum, item) => sum + item.amount, 0),
    [jajanExpenses]
  );

  const totalJajan = useMemo(
    () => jajanExpenses.reduce((sum, item) => sum + item.amount, 0),
    [jajanExpenses]
  );

  const cycleInfo = useMemo(
    () => getCycleInfo(periodSettings, today),
    [periodSettings, today]
  );

  const cycleProgress = Math.min(
    100,
    Math.max(0, Math.round((cycleInfo.cycleDay / cycleInfo.learnedCycleLength) * 100))
  );

  const latestSymptom = periodSettings.dailySymptoms[0];

  const wealthProgress = Math.min(
    100,
    getProgress(totalSavings, totalTargets)
  );

  const calendarCells = useMemo(
    () => buildMonthCells(periodSettings, today),
    [periodSettings, today]
  );

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric"
      }).format(new Date(today.getFullYear(), today.getMonth(), 1)),
    [today]
  );

  function handlePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const lastPeriodStart = String(formData.get("lastPeriodStart"));
    const cycleStartHistory = [
      ...periodSettings.cycleStartHistory,
      lastPeriodStart
    ]
      .filter((date, index, dates) => dates.indexOf(date) === index)
      .sort();

    setPeriodSettings({
      ...periodSettings,
      lastPeriodStart: String(formData.get("lastPeriodStart")),
      cycleLength: Number(formData.get("cycleLength")),
      periodLength: Number(formData.get("periodLength")),
      lutealLength: Number(formData.get("lutealLength")),
      cycleStartHistory,
      symptoms: String(formData.get("symptoms"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      partnerReminder: String(formData.get("partnerReminder"))
    });
  }

  function handleSymptomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPeriodSettings((settings) => ({
      ...settings,
      dailySymptoms: [
        symptomForm,
        ...settings.dailySymptoms.filter((item) => item.date !== symptomForm.date)
      ]
    }));
    setSymptomForm(createEmptyDailySymptom(symptomForm.date));
  }

  function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedGoal = {
      ...goalForm,
      id: goalForm.id || crypto.randomUUID(),
      name: goalForm.name.trim(),
      current: Number(goalForm.current),
      target: Number(goalForm.target),
      monthlyChange: Number(goalForm.monthlyChange)
    };

    if (!cleanedGoal.name || cleanedGoal.target <= 0) {
      return;
    }

    setSavingsGoals((goals) => {
      const existingGoal = goals.some((goal) => goal.id === cleanedGoal.id);

      if (existingGoal) {
        return goals.map((goal) => (goal.id === cleanedGoal.id ? cleanedGoal : goal));
      }

      return [...goals, cleanedGoal];
    });
    setGoalForm(createEmptyGoal());
  }

  function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = expenseForm.title.trim();
    const amount = Number(expenseForm.amount);

    if (!title || amount <= 0) {
      return;
    }

    setJajanExpenses((expenses) => [
      {
        ...expenseForm,
        id: crypto.randomUUID(),
        title,
        amount
      },
      ...expenses
    ]);
    setExpenseForm(createEmptyExpense());
  }

  function resetSavingsToZero() {
    setSavingsGoals((goals) =>
      goals.map((goal) => ({
        ...goal,
        current: 0,
        monthlyChange: 0
      }))
    );
  }

  function openNextPeriodCalendar() {
    const start = cycleInfo.nextPeriod;
    const end = addDays(start, periodSettings.periodLength);
    const dates = `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`;
    const url = new URL("https://calendar.google.com/calendar/render");

    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", "A&Z Cycle Care - Perkiraan mens Zhafia");
    url.searchParams.set("dates", dates);
    url.searchParams.set(
      "details",
      `Perkiraan mens berikutnya mulai ${formatFullDate(start)}. Reminder: ${periodSettings.partnerReminder}`
    );

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  function submitJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJournalStatus(
      journalText.trim()
        ? `Tersimpan ${formatTime(new Date().toISOString())}`
        : "Tulis jurnal dulu"
    );
  }

  return (
    <main
      className={
        darkMode
          ? "dark min-h-screen bg-[#050816] text-white"
          : "min-h-screen bg-[#F8FAF7] text-[#1F2933]"
      }
    >
      <div className="w-full border-b border-black/5 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-[#050816]/80">
        <header className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5 sm:h-16 sm:w-16">
              <Image
                src="/foto-berdua.jpeg"
                alt="Foto Aryo dan Zhafia"
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[#2E7D5B]">
                {formatFullDate(today)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#111827] dark:text-white">
                A&Z Life Finance
              </h1>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3">
            <Link
              href="/portfolio"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2E7D5B] px-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5"
            >
              Portfolio
              <ArrowUpRight size={16} />
            </Link>
            <button
              type="button"
              aria-label="Notifikasi kalender"
              onClick={openNextPeriodCalendar}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white text-[#1F2933] shadow-soft transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <Bell size={19} />
            </button>
            <button
              type="button"
              aria-label="Mode gelap"
              onClick={() => setDarkMode((value) => !value)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-black/5 bg-white text-[#1F2933] shadow-soft transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white"
            >
              <Moon size={19} />
            </button>
          </nav>
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-6 lg:px-10 lg:py-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-premium dark:border-white/10 dark:bg-white/8">
            <div className="grid min-h-[360px] gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
              <div className="flex flex-col justify-between gap-8">
                <div>
                  <p className="inline-flex rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-sm font-semibold text-[#2E7D5B]">
                    Couple finance command center
                  </p>
                  <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-[#111827] dark:text-white sm:text-5xl">
                    Shared wealth, cycle care, and daily life in one clean dashboard.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                    Fokus ke dua modul utama: kesehatan siklus dan kekayaan bersama,
                    dengan aktivitas harian dibuat ringkas.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#F8FAF7] p-4">
                    <p className="text-sm font-semibold text-slate-500">Total wealth</p>
                    <p className="mt-2 text-2xl font-semibold text-[#111827]">
                      {formatCurrency(totalSavings)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAF7] p-4">
                    <p className="text-sm font-semibold text-slate-500">Goal progress</p>
                    <p className="mt-2 text-2xl font-semibold text-[#111827]">
                      {wealthProgress}%
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAF7] p-4">
                    <p className="text-sm font-semibold text-slate-500">Cycle day</p>
                    <p className="mt-2 text-2xl font-semibold text-[#111827]">
                      H-{cycleInfo.cycleDay}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-[#F8FAF7] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Couple goals
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#111827]">
                      {formatCurrency(totalTargets)}
                    </p>
                  </div>
                  <Target className="text-[#FF6B81]" size={22} />
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#2E7D5B]"
                    style={{ width: `${wealthProgress}%` }}
                  />
                </div>
                <div className="mt-6 space-y-3">
                  {savingsGoals.slice(0, 3).map((goal) => {
                    const progress = getProgress(goal.current, goal.target);

                    return (
                      <div key={goal.id} className="rounded-2xl bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-[#111827]">
                            {goal.name}
                          </span>
                          <span className="text-sm font-semibold text-[#2E7D5B]">
                            {progress}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F8FAF7]">
                          <div
                            className="h-full rounded-full bg-[#2E7D5B]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <GlassCard className="flex flex-col justify-between gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#2E7D5B]">Market sync</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#111827]">
                  Live portfolio
                </h3>
              </div>
              <WalletCards className="text-[#2E7D5B]" size={24} />
            </div>
            <div className="space-y-3">
              {quotes.slice(0, 5).map((quote) => {
                const isDown =
                  typeof quote.changePercent === "number" &&
                  quote.changePercent < 0;
                const flash = marketFlash[quote.id];

                return (
                  <div
                    key={quote.id}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 transition ${
                      flash === "up"
                        ? "border-[#2E7D5B]/20 bg-[#2E7D5B]/5"
                        : flash === "down"
                          ? "border-[#FF6B81]/20 bg-[#FF6B81]/5"
                          : "border-black/5 bg-[#F8FAF7]"
                    }`}
                  >
                    <span className="relative h-10 w-10 overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                      <Image
                        src={quote.imageUrl}
                        alt={quote.label}
                        fill
                        sizes="40px"
                        className="object-cover p-1"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#111827]">
                        {quote.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {quote.symbol}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold text-[#111827]">
                        {formatMarketPrice(quote)}
                      </span>
                      <span
                        className={`block text-xs font-semibold ${
                          quote.status !== "live"
                            ? "text-slate-500"
                            : isDown
                              ? "text-[#FF6B81]"
                              : "text-[#2E7D5B]"
                        }`}
                      >
                        {quote.status === "live" && quote.changePercent !== null
                          ? `${isDown ? "" : "+"}${quote.changePercent.toFixed(2)}%`
                          : quote.message || "Setup"}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <Link
              href="/portfolio"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Open portfolio
              <ChevronRight size={17} />
            </Link>
            <p className="text-xs font-semibold text-slate-500">
              {marketStatus} {lastMarketUpdate ? `- ${formatTime(lastMarketUpdate)}` : ""}
            </p>
          </GlassCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlassCard>
            <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#FF6B81]">
                  <HeartPulse size={18} />
                  Cycle Care
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-[#111827]">
                  Hari ke-{cycleInfo.cycleDay}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Mens berikutnya diperkirakan dalam{" "}
                  <span className="font-semibold text-[#111827]">
                    {cycleInfo.nextPeriodInDays} hari
                  </span>
                  . Masa subur {formatShortDate(cycleInfo.fertileStart)}-
                  {formatShortDate(cycleInfo.fertileEnd)}.
                </p>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#F8FAF7]">
                  <div
                    className="h-full rounded-full bg-[#FF6B81]"
                    style={{ width: `${cycleProgress}%` }}
                  />
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-[#F8FAF7] p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Next mens
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {formatShortDate(cycleInfo.nextPeriod)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAF7] p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Siklus prediksi
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {cycleInfo.learnedCycleLength} hari
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openNextPeriodCalendar}
                    className="rounded-2xl bg-[#FF6B81] p-4 text-left text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    Simpan kalender
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/5 bg-white p-4">
                    <CalendarDays className="text-[#FF6B81]" size={18} />
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Kalender
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {periodSettings.cycleLength} hari + haid{" "}
                      {periodSettings.periodLength} hari
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white p-4">
                    <Brain className="text-[#2E7D5B]" size={18} />
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Learning
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {periodSettings.cycleStartHistory.length} log siklus
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white p-4">
                    <Thermometer className="text-[#111827]" size={18} />
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Gejala terakhir
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#111827]">
                      {latestSymptom?.mood ?? "Belum ada log"}
                    </p>
                  </div>
                </div>

                <form
                  key={JSON.stringify(periodSettings)}
                  onSubmit={handlePeriodSubmit}
                  className="mt-6 grid gap-3 rounded-2xl border border-black/5 bg-[#F8FAF7] p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="lastPeriodStart"
                      type="date"
                      defaultValue={periodSettings.lastPeriodStart}
                      className={inputClass}
                    />
                    <input
                      name="cycleLength"
                      type="number"
                      min={21}
                      max={45}
                      defaultValue={periodSettings.cycleLength}
                      className={inputClass}
                    />
                    <input
                      name="periodLength"
                      type="number"
                      min={2}
                      max={10}
                      defaultValue={periodSettings.periodLength}
                      className={inputClass}
                    />
                    <input
                      name="lutealLength"
                      type="number"
                      min={10}
                      max={16}
                      defaultValue={periodSettings.lutealLength}
                      className={inputClass}
                    />
                  </div>
                  <textarea
                    name="symptoms"
                    defaultValue={periodSettings.symptoms.join(", ")}
                    rows={2}
                    className={`${inputClass} min-h-20 py-3`}
                  />
                  <textarea
                    name="partnerReminder"
                    defaultValue={periodSettings.partnerReminder}
                    rows={2}
                    className={`${inputClass} min-h-20 py-3`}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    <Save size={16} />
                    Simpan
                  </button>
                </form>

                <form
                  onSubmit={handleSymptomSubmit}
                  className="mt-4 grid gap-3 rounded-2xl border border-black/5 bg-white p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2E7D5B]">
                    <HeartPulse size={16} />
                    Log gejala harian
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={symptomForm.date}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          date: event.target.value
                        }))
                      }
                      className={inputClass}
                    />
                    <select
                      value={symptomForm.mood}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          mood: event.target.value
                        }))
                      }
                      className={inputClass}
                    >
                      <option>Stabil</option>
                      <option>Mood swing ringan</option>
                      <option>Sensitif</option>
                      <option>Lelah</option>
                      <option>Bahagia</option>
                    </select>
                    <select
                      value={symptomForm.cervicalFluid}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          cervicalFluid: event.target.value
                        }))
                      }
                      className={inputClass}
                    >
                      <option>Kering</option>
                      <option>Lengket</option>
                      <option>Krim</option>
                      <option>Licin</option>
                      <option>Seperti putih telur</option>
                    </select>
                    <select
                      value={symptomForm.stress}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          stress: event.target.value
                        }))
                      }
                      className={inputClass}
                    >
                      <option>Rendah</option>
                      <option>Sedang</option>
                      <option>Tinggi</option>
                    </select>
                    <input
                      type="number"
                      step="0.1"
                      min={34}
                      max={39}
                      value={symptomForm.basalTemperature}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          basalTemperature: Number(event.target.value)
                        }))
                      }
                      className={inputClass}
                    />
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={14}
                      value={symptomForm.sleepHours}
                      onChange={(event) =>
                        setSymptomForm((form) => ({
                          ...form,
                          sleepHours: Number(event.target.value)
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex h-11 items-center gap-3 rounded-xl bg-[#F8FAF7] px-3 text-sm font-semibold text-[#111827]">
                      <input
                        type="checkbox"
                        checked={symptomForm.cramps}
                        onChange={(event) =>
                          setSymptomForm((form) => ({
                            ...form,
                            cramps: event.target.checked
                          }))
                        }
                      />
                      Kram perut
                    </label>
                    <label className="flex h-11 items-center gap-3 rounded-xl bg-[#F8FAF7] px-3 text-sm font-semibold text-[#111827]">
                      <input
                        type="checkbox"
                        checked={symptomForm.headache}
                        onChange={(event) =>
                          setSymptomForm((form) => ({
                            ...form,
                            headache: event.target.checked
                          }))
                        }
                      />
                      Sakit kepala
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2E7D5B] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    <Save size={16} />
                    Simpan gejala
                  </button>
                </form>
              </div>

              <div className="rounded-[20px] border border-black/5 bg-[#F8FAF7] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#2E7D5B]">
                      Kalender siklus
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-[#111827]">
                      {calendarMonthLabel}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    H-{cycleInfo.cycleDay}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarCells.map((cell) => (
                    <span
                      key={toDateInputValue(cell.date)}
                      className={`grid aspect-square place-items-center rounded-xl text-xs font-semibold transition ${
                        cell.isToday
                          ? "bg-[#111827] text-white"
                          : cell.isPeriod
                            ? "bg-[#FF6B81] text-white"
                            : cell.isFertile
                              ? "bg-[#2E7D5B] text-white"
                              : cell.isCurrentMonth
                                ? "bg-white text-slate-600"
                                : "bg-white/50 text-slate-300"
                      }`}
                    >
                      {cell.day}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FF6B81]" />
                    Mens
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#2E7D5B]" />
                    Subur
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#111827]" />
                    Hari ini
                  </span>
                </div>
                <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#111827]">
                      <Droplets size={16} className="text-[#2E7D5B]" />
                      Cairan serviks
                    </span>
                    <span className="text-slate-500">
                      {latestSymptom?.cervicalFluid ?? "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#111827]">
                      <Thermometer size={16} className="text-[#FF6B81]" />
                      Suhu basal
                    </span>
                    <span className="text-slate-500">
                      {latestSymptom
                        ? `${latestSymptom.basalTemperature.toFixed(1)} C`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#111827]">
                      <Bed size={16} className="text-[#111827]" />
                      Tidur & stres
                    </span>
                    <span className="text-slate-500">
                      {latestSymptom
                        ? `${latestSymptom.sleepHours} jam - ${latestSymptom.stress}`
                        : "-"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVitaminDone((value) => !value)}
                  className="mt-5 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left transition hover:-translate-y-0.5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-9 w-9 flex-none place-items-center rounded-xl transition ${
                        vitaminDone
                          ? "bg-[#2E7D5B] text-white"
                          : "bg-[#FF6B81]/10 text-[#FF6B81]"
                      }`}
                    >
                      {vitaminDone ? <Check size={17} /> : <Sparkles size={17} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#111827]">
                        Vitamin & mood booster
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {periodSettings.partnerReminder}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="flex-none text-slate-400" size={18} />
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2E7D5B]">
                  <PiggyBank size={18} />
                  Shared Wealth
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-[#111827]">
                  {formatCurrency(totalSavings)}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {wealthProgress}% dari total target {formatCurrency(totalTargets)}.
                </p>
              </div>
              <button
                type="button"
                onClick={resetSavingsToZero}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#F8FAF7] px-3 text-xs font-semibold text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                <RefreshCw size={14} />
                Mulai nol
              </button>
            </div>

            <form
              onSubmit={handleGoalSubmit}
              className="mt-6 grid gap-3 rounded-2xl border border-black/5 bg-[#F8FAF7] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={goalForm.name}
                  onChange={(event) =>
                    setGoalForm((goal) => ({ ...goal, name: event.target.value }))
                  }
                  placeholder="Nama tabungan"
                  className={inputClass}
                />
                <input
                  value={goalForm.current || ""}
                  onChange={(event) =>
                    setGoalForm((goal) => ({
                      ...goal,
                      current: Number(event.target.value)
                    }))
                  }
                  type="number"
                  min={0}
                  placeholder="Saldo sekarang"
                  className={inputClass}
                />
                <input
                  value={goalForm.target || ""}
                  onChange={(event) =>
                    setGoalForm((goal) => ({
                      ...goal,
                      target: Number(event.target.value)
                    }))
                  }
                  type="number"
                  min={1}
                  placeholder="Target"
                  className={inputClass}
                />
                <input
                  value={goalForm.monthlyChange || ""}
                  onChange={(event) =>
                    setGoalForm((goal) => ({
                      ...goal,
                      monthlyChange: Number(event.target.value)
                    }))
                  }
                  type="number"
                  step="0.1"
                  placeholder="Perubahan bulanan %"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2E7D5B] px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  <Save size={16} />
                  {goalForm.id ? "Update tabungan" : "Tambah tabungan"}
                </button>
                {goalForm.id ? (
                  <button
                    type="button"
                    aria-label="Batal edit tabungan"
                    onClick={() => setGoalForm(createEmptyGoal())}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#111827] transition hover:-translate-y-0.5"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {savingsGoals.map((goal) => {
                const progress = getProgress(goal.current, goal.target);

                return (
                  <div key={goal.id} className="rounded-2xl border border-black/5 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-[#111827]">{goal.name}</span>
                      <span className="font-semibold text-[#2E7D5B]">{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F8FAF7]">
                      <div
                        className="h-full rounded-full bg-[#2E7D5B] transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{formatCurrency(goal.current)}</span>
                      <span>Target {formatCurrency(goal.target)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGoalForm(goal)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[#F8FAF7] text-xs font-semibold text-[#111827] transition hover:-translate-y-0.5"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSavingsGoals((goals) =>
                            goals.filter((item) => item.id !== goal.id)
                          )
                        }
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B81]/10 text-xs font-semibold text-[#FF6B81] transition hover:-translate-y-0.5"
                      >
                        <Trash2 size={13} />
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#FF6B81]">
                <Coffee size={18} />
                Jajan Tracker
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full bg-[#F8FAF7] px-3 py-2 text-xs font-semibold text-slate-600">
                  Total {formatCurrency(totalJajan)}
                </span>
                <button
                  type="button"
                  onClick={() => setJajanExpenses([])}
                  disabled={jajanExpenses.length === 0}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#FF6B81]/10 px-3 text-xs font-semibold text-[#FF6B81] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Hapus semua
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">
              Aryo {formatCurrency(aryoJajan)} | Zhafia {formatCurrency(zhafiaJajan)}
            </div>
            <form
              onSubmit={handleExpenseSubmit}
              className="mt-5 grid gap-3 rounded-2xl border border-black/5 bg-[#F8FAF7] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_0.75fr]">
                <input
                  value={expenseForm.title}
                  onChange={(event) =>
                    setExpenseForm((expense) => ({
                      ...expense,
                      title: event.target.value
                    }))
                  }
                  placeholder="Jajan apa?"
                  className={inputClass}
                />
                <input
                  value={expenseForm.amount || ""}
                  onChange={(event) =>
                    setExpenseForm((expense) => ({
                      ...expense,
                      amount: Number(event.target.value)
                    }))
                  }
                  type="number"
                  min={0}
                  placeholder="Nominal"
                  className={inputClass}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={expenseForm.payer}
                  onChange={(event) =>
                    setExpenseForm((expense) => ({
                      ...expense,
                      payer: event.target.value as JajanExpense["payer"]
                    }))
                  }
                  className={inputClass}
                >
                  <option>Aryo</option>
                  <option>Zhafia</option>
                  <option>Berdua</option>
                </select>
                <input
                  value={expenseForm.category}
                  onChange={(event) =>
                    setExpenseForm((expense) => ({
                      ...expense,
                      category: event.target.value
                    }))
                  }
                  placeholder="Kategori"
                  className={inputClass}
                />
                <input
                  value={expenseForm.date}
                  onChange={(event) =>
                    setExpenseForm((expense) => ({
                      ...expense,
                      date: event.target.value
                    }))
                  }
                  type="date"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                <ReceiptText size={16} />
                Catat jajan
              </button>
            </form>
            <div className="mt-4">
              <MonthlyExpenseChart data={monthlyExpenseData} />
            </div>
            <div className="mt-4 space-y-3">
              {jajanExpenses.slice(0, 4).map((expense) => (
                <div
                  key={expense.id}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-2xl bg-[#F8FAF7] p-3"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B81]/10 text-[#FF6B81]">
                    <Coffee size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#111827]">
                      {expense.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {expense.payer} - {expense.category} -{" "}
                      {formatDateLabel(expense.date)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[#111827]">
                    {formatCurrency(expense.amount)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus ${expense.title}`}
                    onClick={() =>
                      setJajanExpenses((expenses) =>
                        expenses.filter((item) => item.id !== expense.id)
                      )
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#FF6B81] transition hover:-translate-y-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2E7D5B]">
                  <CalendarDays size={18} />
                  Date night
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {movieStatus}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3">
                {movies.slice(0, 3).map((movie) => (
                  <article key={movie.id} className="min-w-0">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-slate-200 shadow-soft">
                      <Image
                        src={movie.poster}
                        alt={`Poster ${movie.title}`}
                        fill
                        sizes="(min-width: 1024px) 15vw, (min-width: 640px) 28vw, 90vw"
                        className="object-cover transition duration-500 hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-3 truncate text-sm font-semibold text-[#111827]">
                      {movie.title}
                    </h3>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{movie.genre}</span>
                      <span>{movie.rating.toFixed(1)}/10</span>
                    </div>
                  </article>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2E7D5B]">
                  <Newspaper size={18} />
                  NewsAPI brief
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {newsStatus}
                </span>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {[
                  ["Berita Global", newsBuckets.global],
                  ["Berita Indonesia", newsBuckets.indonesia]
                ].map(([title, items]) => (
                  <div key={String(title)} className="min-w-0 rounded-2xl bg-[#F8FAF7] p-3">
                    <h3 className="px-1 text-sm font-semibold text-[#111827]">
                      {String(title)}
                    </h3>
                    <div className="mt-3 space-y-3">
                      {(items as NewsHeadline[]).slice(0, 3).map((headline) => (
                        <a
                          key={headline.id}
                          href={headline.url}
                          target="_blank"
                          rel="noreferrer"
                          className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-white p-3 transition hover:-translate-y-0.5"
                        >
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-sm font-semibold text-[#111827]">
                              {headline.title}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {headline.source} - {formatTime(headline.publishedAt)}
                            </span>
                          </span>
                          <ChevronRight size={18} className="text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <GlassCard>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2E7D5B]">
              <PenLine size={18} />
              Jurnal pribadi
            </div>
            <form onSubmit={submitJournal} className="mt-5 grid gap-3">
              <textarea
                value={journalText}
                onChange={(event) => setJournalText(event.target.value)}
                rows={7}
                placeholder="Tulis catatan singkat Aryo & Zhafia..."
                className={`${inputClass} min-h-40 resize-none py-3 leading-6`}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {journalStatus}
                </span>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  <Save size={16} />
                  Submit jurnal
                </button>
              </div>
            </form>
          </GlassCard>

          <GlassCard className="bg-[#111827] text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <TrendingUp size={18} />
              Focus Board
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Keuangan", "Review jajan mingguan", `${jajanExpenses.length} item`],
                ["Wellness", "Cycle care aktif", `H-${cycleInfo.cycleDay}`],
                ["Date", "Film bioskop", `${movies.length || 0} opsi`]
              ].map(([category, title, progress]) => (
                <div key={category} className="rounded-2xl bg-white/8 p-5">
                  <div className="text-xs font-semibold text-white/60">{category}</div>
                  <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
                  <div className="mt-3 text-xs text-white/55">{progress}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
