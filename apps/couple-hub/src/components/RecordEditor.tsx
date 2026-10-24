"use client";

import { useEffect, useRef, useState } from "react";
import { X, Save } from "lucide-react";
import type { Collection, Goal, RecordData } from "@/lib/app-types";

const titles: Record<Collection, string> = {
  finances: "Transaksi",
  goals: "Target tabungan",
  periods: "Catatan siklus",
  books: "Buku",
  plans: "Rencana kencan",
  reminders: "Pengingat",
  investments: "Investasi",
  watchlist: "Pantauan pasar",
};
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export default function RecordEditor({
  collection,
  record,
  goals,
  onClose,
  onSave,
}: {
  collection: Collection;
  record?: RecordData;
  goals: Goal[];
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const values = (record || {}) as unknown as Record<
    string,
    string | number | boolean
  >;
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const input = (
    label: string,
    name: string,
    type = "text",
    required = true,
    extra: Record<string, unknown> = {},
  ) => (
    <label key={name} htmlFor={`field-${name}`}>
      {label}
      <input
        id={`field-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={String(
          values[name] ??
            (type === "date" && name !== "endDate" && name !== "targetDate"
              ? today()
              : ""),
        )}
        maxLength={type === "text" ? 200 : undefined}
        {...extra}
      />
    </label>
  );
  const select = (label: string, name: string, options: [string, string][]) => (
    <label htmlFor={`field-${name}`}>
      {label}
      <select
        id={`field-${name}`}
        aria-label={label}
        name={name}
        defaultValue={String(values[name] ?? options[0][0])}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const number = (
    label: string,
    name: string,
    min: number,
    max: number,
    fallback: number,
  ) =>
    input(label, name, "number", true, {
      min,
      max,
      step: 1,
      defaultValue: values[name] ?? fallback,
    });
  return (
    <dialog
      ref={dialog}
      className="editor"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="editor-title"
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          const body = Object.fromEntries(new FormData(event.currentTarget));
          const numeric = [
            "amount",
            "targetAmount",
            "cycleLength",
            "periodLength",
            "rating",
            "progressPage",
            "totalPages",
            "units",
            "averagePrice",
          ];
          const normalized: Record<string, unknown> = { ...body };
          numeric.forEach((key) => {
            if (key in body) normalized[key] = Number(body[key]);
          });
          ["goalId", "endDate", "targetDate"].forEach((key) => {
            if (normalized[key] === "") normalized[key] = null;
          });
          if (collection === "plans" && values.movieId)
            normalized.movieId = Number(values.movieId);
          if (collection === "reminders")
            normalized.done = values.done ?? false;
          try {
            await onSave(normalized);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-head">
          <h2 id="editor-title">
            {record?.id ? "Edit" : "Tambah"} {titles[collection].toLowerCase()}
          </h2>
          <button
            type="button"
            disabled={busy}
            className="icon-button"
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>
        <div className="form-grid">
          {collection === "watchlist" && (
            <>
              {select("Pasar", "market", [
                ["idx", "Saham Indonesia"],
                ["us", "Saham AS"],
                ["crypto", "Kripto"],
              ])}
              {input("Kode aset", "symbol", "text", true, {
                placeholder: "BBCA, AAPL, BTC, XRP, HYPE",
                maxLength: 20,
              })}
              {select("Mata uang kripto", "currency", [
                ["IDR", "IDR"],
                ["USD", "USD"],
              ])}
            </>
          )}
          {collection === "investments" && (
            <>
              {input("Nama aset", "name")}
              {input("Simbol / kode", "symbol", "text", true, {
                maxLength: 30,
              })}
              {select("Instrumen", "type", [
                ["gold", "Emas"],
                ["stock", "Saham"],
                ["crypto", "Kripto"],
                ["fund", "Reksa dana / pasar uang"],
                ["bond", "Obligasi"],
              ])}
              {input("Jumlah unit / gram / lembar", "units", "number", true, {
                min: 0.00000001,
                max: 1000000000,
                step: 0.00000001,
                defaultValue: values.units ?? 1,
              })}
              {number(
                "Harga beli rata-rata per unit (Rp)",
                "averagePrice",
                1,
                1000000000000,
                10000,
              )}
              {input("Tanggal pembelian", "date", "date")}
              <p className="field-note">
                Jumlah saham dalam lembar, bukan lot. Pencatatan aset tidak
                otomatis mengurangi saldo transaksi.
              </p>
            </>
          )}
          {collection === "finances" && (
            <>
              {input("Judul", "title")}
              {select("Jenis", "type", [
                ["expense", "Pengeluaran"],
                ["income", "Pemasukan"],
                ["saving", "Alokasi tabungan"],
              ])}
              {number("Jumlah (Rp)", "amount", 1, 1000000000000, 10000)}
              {input("Tanggal", "date", "date")}
              {input("Kategori", "category")}
              {select("Target tabungan", "goalId", [
                ["", "Tidak dialokasikan"],
                ...goals.map((g) => [g.id, g.name] as [string, string]),
              ])}
            </>
          )}
          {collection === "goals" && (
            <>
              {input("Nama target", "name")}
              {number("Target (Rp)", "targetAmount", 1, 1000000000000, 1000000)}
              {input("Tenggat (opsional)", "targetDate", "date", false)}
            </>
          )}
          {collection === "periods" && (
            <>
              {input("Mulai menstruasi", "startDate", "date", true, {
                max: today(),
              })}
              {input("Selesai (opsional)", "endDate", "date", false, {
                max: today(),
              })}
              {number("Rata-rata siklus (hari)", "cycleLength", 15, 60, 28)}
              {number("Durasi menstruasi (hari)", "periodLength", 1, 15, 5)}
              {input("Gejala (opsional)", "symptoms", "text", false)}
              {input("Catatan pribadi (opsional)", "notes", "text", false)}
              <p className="field-note">
                Catatan pribadi kecuali kamu mengaktifkan berbagi kesehatan di
                pengaturan.
              </p>
            </>
          )}
          {collection === "books" && (
            <>
              {input("Judul buku", "title")}
              {input(
                "Sumber / tautan legal (opsional)",
                "sourceUrl",
                "url",
                false,
                { maxLength: 2000 },
              )}
              {input("Penulis", "author", "text", false)}
              {select("Kategori", "category", [
                ["finance", "Literasi finansial"],
                ["health", "Kesehatan reproduksi"],
                ["law", "Hukum & pernikahan"],
                ["growth", "Pengembangan diri"],
                ["comics", "Komik"],
              ])}
              {select("Status", "status", [
                ["wishlist", "Ingin dibaca"],
                ["reading", "Sedang dibaca"],
                ["finished", "Selesai"],
              ])}
              {number("Halaman dibaca", "progressPage", 0, 100000, 0)}
              {number(
                "Total halaman (0 = belum diketahui)",
                "totalPages",
                0,
                100000,
                0,
              )}
              {number("Rating (0 = belum dinilai)", "rating", 0, 5, 0)}
            </>
          )}
          {collection === "plans" && (
            <>
              {input("Film / acara", "title")}
              {input("Tanggal", "date", "date")}
              {select("Status", "status", [
                ["planned", "Direncanakan"],
                ["watched", "Sudah ditonton"],
              ])}
              {number("Rating (0 = belum dinilai)", "rating", 0, 5, 0)}
              {input("Catatan (opsional)", "notes", "text", false)}
            </>
          )}
          {collection === "reminders" && (
            <>
              {input("Pengingat", "title")}
              {input("Waktu", "date", "datetime-local")}
            </>
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>
          <button className="button" disabled={busy}>
            <Save size={16} />
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
