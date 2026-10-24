"use client";
import { useState } from "react";
import Image from "next/image";
import { BookOpen, ExternalLink, Plus, Check } from "lucide-react";
import { bookReferences, type BookReference } from "@/lib/recommendations";
import type { Book } from "@/lib/app-types";

export default function BookReferences({
  books,
  onAdd,
}: {
  books: Book[];
  onAdd: (reference: BookReference) => void;
}) {
  const [filter, setFilter] = useState("all");
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>
          <BookOpen size={18} />
          Referensi bacaan
        </h2>
      </div>
      <div className="market-modes" role="group" aria-label="Jenis referensi">
        {[
          ["all", "Semua"],
          ["book", "Buku"],
          ["comic", "Komik"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="reference-grid">
        {bookReferences
          .filter((b) => filter === "all" || b.kind === filter)
          .map((book) => (
            <BookSuggestion
              key={book.id}
              book={book}
              saved={books.some(
                (b) => b.title.toLowerCase() === book.title.toLowerCase(),
              )}
              onAdd={() => onAdd(book)}
            />
          ))}
      </div>
      <p className="source-note">
        Pilihan editorial dengan sumber penerbit atau penulis. Tautan mengarah
        ke referensi dan akses legal, bukan file bajakan. Bahasa, edisi, harga,
        dan ketersediaan berbeda menurut penyedia. Sampul: Open Library.
      </p>
    </section>
  );
}
function BookSuggestion({
  book,
  saved,
  onAdd,
}: {
  book: BookReference;
  saved: boolean;
  onAdd: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <article className="reference-item">
      <div className="reference-cover">
        {book.isbn && !broken ? (
          <Image
            src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`}
            alt={`Sampul ${book.title}`}
            width={100}
            height={150}
            onError={() => setBroken(true)}
          />
        ) : (
          <BookOpen size={28} />
        )}
      </div>
      <div className="grow">
        <span className="tag">{book.kind === "comic" ? "Komik" : "Buku"}</span>
        <h3>{book.title}</h3>
        <p className="muted small">{book.author}</p>
        <p className="reference-reason">{book.reason}</p>
        <div className="reference-actions">
          <a
            className="text-button"
            href={book.source}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sumber resmi
            <ExternalLink size={12} />
          </a>
          <button className="text-button" disabled={saved} onClick={onAdd}>
            {saved ? <Check size={13} /> : <Plus size={13} />}{" "}
            {saved ? "Di rak kalian" : "Tambah ke rak"}
          </button>
        </div>
      </div>
    </article>
  );
}
