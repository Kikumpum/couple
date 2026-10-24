export type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  coupleId: string | null;
  shareHealth: boolean;
  theme: "light" | "dark";
};
export type BaseRecord = { id: string; userId: string };
export type Watch = BaseRecord & {
  market: "idx" | "us" | "crypto";
  symbol: string;
  currency: "IDR" | "USD";
};
export type Investment = BaseRecord & {
  name: string;
  symbol: string;
  type: "gold" | "stock" | "crypto" | "fund" | "bond";
  units: number;
  averagePrice: number;
  date: string;
};
export type Finance = BaseRecord & {
  type: "income" | "expense" | "saving";
  title: string;
  amount: number;
  date: string;
  category: string;
  goalId?: string;
};
export type Goal = BaseRecord & {
  name: string;
  targetAmount: number;
  targetDate?: string;
};
export type Period = BaseRecord & {
  startDate: string;
  endDate?: string;
  cycleLength: number;
  periodLength: number;
  symptoms: string;
  notes: string;
};
export type Book = BaseRecord & {
  sourceUrl?: string | null;
  title: string;
  author: string;
  category: string;
  status: "wishlist" | "reading" | "finished";
  rating: number;
  progressPage: number;
  totalPages: number;
};
export type Plan = BaseRecord & {
  title: string;
  movieId?: number;
  date: string;
  notes: string;
  rating?: number;
  status: "planned" | "watched";
};
export type Reminder = BaseRecord & {
  title: string;
  date: string;
  done: boolean;
};
export type Data = {
  user: User;
  partner: Pick<User, "id" | "name" | "shareHealth"> | null;
  finances: Finance[];
  goals: Goal[];
  periods: Period[];
  books: Book[];
  plans: Plan[];
  reminders: Reminder[];
  investments: Investment[];
  watchlist: Watch[];
};
export type Collection =
  | "finances"
  | "goals"
  | "periods"
  | "books"
  | "plans"
  | "reminders"
  | "investments"
  | "watchlist";
export type RecordData =
  | Finance
  | Goal
  | Period
  | Book
  | Plan
  | Reminder
  | Investment
  | Watch;
export type Movie = {
  id: number;
  title: string;
  poster: string | null;
  synopsis: string;
  rating: number;
  releaseDate: string;
  genres?: string[];
};

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (!response.ok) {
    const messages: Record<string, string> = {
      UNAUTHENTICATED: "Sesi berakhir. Silakan masuk kembali.",
      INVALID_CREDENTIALS: "Nama pengguna, email, atau kata sandi tidak cocok.",
      REGISTRATION_FAILED:
        "Akun tidak dapat dibuat. Periksa email atau coba masuk.",
      RATE_LIMITED: "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
      INVALID_INVITE: "Kode undangan tidak berlaku atau sudah kedaluwarsa.",
      ALREADY_LINKED: "Akun sudah terhubung dengan pasangan.",
      PROVIDER_NOT_CONFIGURED:
        "Koneksi TMDB belum dikonfigurasi oleh pengelola.",
      PROVIDER_UNAVAILABLE:
        "Penyedia data sedang tidak tersedia. Coba perbarui nanti.",
      VALIDATION:
        "Data belum valid. Periksa tanggal, jumlah, dan kolom yang diisi.",
      NOT_FOUND: "Catatan tidak ditemukan atau bukan milikmu.",
      INVALID_GOAL: "Target tabungan sudah tidak tersedia.",
      DUPLICATE: "Catatan ini sudah ada. Edit catatan yang tersimpan.",
      RECORD_LIMIT:
        "Batas jumlah catatan tercapai. Hapus catatan yang tidak diperlukan.",
      INTERNAL_ERROR: "Perubahan belum berhasil disimpan. Coba lagi.",
    };
    throw new Error(
      messages[value.error?.code] ||
        (typeof value.error === "string"
          ? value.error
          : value.error?.message || "Permintaan gagal. Coba lagi."),
    );
  }
  return value as T;
}
