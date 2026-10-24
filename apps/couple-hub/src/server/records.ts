import { date, fail, integer, object, text, boolean, id } from "./http";

export const collections = [
  "finances",
  "goals",
  "periods",
  "books",
  "plans",
  "reminders",
  "investments",
  "watchlist",
] as const;
export type Collection = (typeof collections)[number];
export type RecordFields = {
  watchlist: {
    market: "idx" | "us" | "crypto";
    symbol: string;
    currency: "IDR" | "USD";
  };
  investments: {
    name: string;
    symbol: string;
    type: string;
    units: number;
    averagePrice: number;
    date: string;
  };
  finances: {
    type: "income" | "expense" | "saving";
    title: string;
    amount: number;
    date: string;
    category: string;
    goalId: string | null;
  };
  goals: { name: string; targetAmount: number; targetDate: string | null };
  periods: {
    startDate: string;
    endDate: string | null;
    cycleLength: number;
    periodLength: number;
    symptoms: string;
    notes: string;
  };
  books: {
    sourceUrl: string | null;
    title: string;
    author: string;
    category: string;
    status: "wishlist" | "reading" | "finished";
    rating: number;
    progressPage: number;
    totalPages: number;
  };
  plans: {
    title: string;
    movieId: number | null;
    date: string;
    notes: string;
    rating: number | null;
    status: "planned" | "watched";
  };
  reminders: { title: string; date: string; done: boolean };
};
export type StoredRecord<C extends Collection = Collection> =
  RecordFields[C] & {
    id: string;
    userId: string;
    coupleId: string | null;
    createdAt: string;
    updatedAt: string;
  };
export function collection(value: unknown): Collection {
  if (!collections.includes(value as Collection))
    fail(400, "VALIDATION", "Unknown collection.");
  return value as Collection;
}
const keys: Record<Collection, string[]> = {
  watchlist: ["market", "symbol", "currency"],
  investments: ["name", "symbol", "type", "units", "averagePrice", "date"],
  finances: ["type", "title", "amount", "date", "category", "goalId"],
  goals: ["name", "targetAmount", "targetDate"],
  periods: [
    "startDate",
    "endDate",
    "cycleLength",
    "periodLength",
    "symptoms",
    "notes",
  ],
  books: [
    "sourceUrl",
    "title",
    "author",
    "category",
    "status",
    "rating",
    "progressPage",
    "totalPages",
  ],
  plans: ["title", "movieId", "date", "notes", "rating", "status"],
  reminders: ["title", "date", "done"],
};
function choice(value: unknown, options: string[], field: string) {
  if (!options.includes(value as string))
    fail(400, "VALIDATION", `Invalid ${field}.`);
  return value as string;
}
function rating(value: unknown, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    fail(400, "VALIDATION", "Invalid rating.");
  return value;
}
export function validateRecord(
  c: Collection,
  input: unknown,
): Record<string, unknown> {
  const r = object(input);
  if (Object.keys(r).some((k) => !keys[c].includes(k)))
    fail(400, "VALIDATION", "Unknown or server-owned record field.");
  const title = () => text(r.title, "title", 200, 1);
  const notes = () => text(r.notes ?? "", "notes", 2000);
  switch (c) {
    case "watchlist": {
      const market = choice(r.market, ["idx", "us", "crypto"], "market");
      let symbol = text(r.symbol, "symbol", 20, 1).toUpperCase();
      if (market === "idx") symbol = symbol.replace(/\.JK$/, "");
      if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol))
        fail(400, "VALIDATION", "Invalid symbol.");
      if (
        market === "crypto" &&
        ![
          "BTC",
          "ETH",
          "XRP",
          "HYPE",
          "SOL",
          "BNB",
          "DOGE",
          "SUI",
          "ADA",
          "LINK",
        ].includes(symbol)
      )
        fail(
          400,
          "VALIDATION",
          "Kripto yang didukung: BTC, ETH, XRP, HYPE, SOL, BNB, DOGE, SUI, ADA, LINK.",
        );
      return {
        market,
        symbol,
        currency:
          market === "idx"
            ? "IDR"
            : market === "us"
              ? "USD"
              : choice(r.currency ?? "IDR", ["IDR", "USD"], "currency"),
      };
    }
    case "investments": {
      const units = r.units;
      if (
        typeof units !== "number" ||
        !Number.isFinite(units) ||
        units <= 0 ||
        units > 1000000000 ||
        Math.abs(units * 1e8 - Math.round(units * 1e8)) > 0.001
      )
        fail(400, "VALIDATION", "Jumlah unit tidak valid.");
      const averagePrice = integer(
        r.averagePrice,
        "averagePrice",
        1,
        1000000000000,
      );
      if (units * averagePrice > Number.MAX_SAFE_INTEGER)
        fail(400, "VALIDATION", "Nilai investasi terlalu besar.");
      return {
        name: text(r.name, "name", 200, 1),
        symbol: text(r.symbol, "symbol", 30, 1).toUpperCase(),
        type: choice(
          r.type,
          ["gold", "stock", "crypto", "fund", "bond"],
          "type",
        ),
        units,
        averagePrice,
        date: date(r.date, "date"),
      };
    }
    case "finances":
      return {
        type: choice(r.type, ["income", "expense", "saving"], "type"),
        title: title(),
        amount: integer(r.amount, "amount", 1, 1_000_000_000_000),
        date: date(r.date, "date"),
        category: text(r.category ?? "", "category", 80),
        goalId: r.goalId == null ? null : id(r.goalId),
      };
    case "goals":
      return {
        name: text(r.name, "name", 200, 1),
        targetAmount: integer(
          r.targetAmount,
          "targetAmount",
          1,
          1_000_000_000_000,
        ),
        targetDate:
          r.targetDate == null ? null : date(r.targetDate, "targetDate"),
      };
    case "periods": {
      const startDate = date(r.startDate, "startDate");
      const endDate = r.endDate == null ? null : date(r.endDate, "endDate");
      const cycleLength = integer(r.cycleLength ?? 28, "cycleLength", 15, 60);
      const periodLength = integer(r.periodLength ?? 5, "periodLength", 1, 15);
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
      }).format(new Date());
      if (
        startDate > today ||
        (endDate &&
          (endDate > today ||
            endDate < startDate ||
            (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 30)) ||
        periodLength > cycleLength
      )
        fail(
          400,
          "VALIDATION",
          "Rentang tanggal atau panjang siklus tidak valid.",
        );
      return {
        startDate,
        endDate,
        cycleLength,
        periodLength,
        symptoms: text(r.symptoms ?? "", "symptoms", 1000),
        notes: notes(),
      };
    }
    case "books": {
      let sourceUrl: string | null = null;
      if (r.sourceUrl) {
        sourceUrl = text(r.sourceUrl, "sourceUrl", 2000, 1);
        try {
          const url = new URL(sourceUrl);
          if (url.protocol !== "https:" || url.username || url.password)
            throw new Error();
        } catch {
          fail(400, "VALIDATION", "Tautan sumber harus HTTPS yang valid.");
        }
      }
      const totalPages = integer(r.totalPages ?? 0, "totalPages", 0, 100000);
      const progressPage = integer(
        r.progressPage ?? 0,
        "progressPage",
        0,
        totalPages,
      );
      return {
        sourceUrl,
        title: title(),
        author: text(r.author ?? "", "author", 200),
        category: text(r.category ?? "", "category", 80),
        status: choice(
          r.status ?? "wishlist",
          ["wishlist", "reading", "finished"],
          "status",
        ),
        rating: rating(r.rating ?? 0, 5),
        progressPage,
        totalPages,
      };
    }
    case "plans":
      return {
        title: title(),
        movieId:
          r.movieId == null
            ? null
            : integer(r.movieId, "movieId", 1, 2147483647),
        date: date(r.date, "date"),
        notes: notes(),
        rating: r.rating == null ? null : rating(r.rating, 5),
        status: choice(r.status ?? "planned", ["planned", "watched"], "status"),
      };
    case "reminders":
      return {
        title: title(),
        date: date(r.date, "date", true),
        done: boolean(r.done ?? false, "done"),
      };
  }
}
