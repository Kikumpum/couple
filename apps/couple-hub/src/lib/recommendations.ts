// Editorial references, not rankings or automatic claims about live availability.
export type BookReference = {
  id: string;
  title: string;
  author: string;
  category: string;
  kind: "book" | "comic";
  source: string;
  reason: string;
  isbn?: string;
  totalPages?: number;
};
export const bookReferences: BookReference[] = [
  {
    id: "money",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "finance",
    kind: "book",
    isbn: "9780857197689",
    source:
      "https://www.panmacmillan.com/authors/morgan-housel/the-psychology-of-money/9780857197689",
    reason:
      "Bahan obrolan tentang kebiasaan dan cara masing-masing memandang uang.",
  },
  {
    id: "habits",
    title: "Atomic Habits",
    author: "James Clear",
    category: "growth",
    kind: "book",
    isbn: "9780735211292",
    source: "https://jamesclear.com/atomic-habits",
    reason:
      "Pilihan untuk membahas kebiasaan kecil yang ingin dibangun bersama.",
  },
  {
    id: "dates",
    title: "Eight Dates",
    author:
      "John Gottman, Julie Schwartz Gottman, Doug Abrams & Rachel Carlton Abrams",
    category: "growth",
    kind: "book",
    source: "https://www.gottman.com/eight-dates/",
    reason:
      "Delapan tema percakapan untuk mengenal harapan dan perbedaan pasangan.",
  },
  {
    id: "come-as-you-are",
    title: "Come As You Are: Revised and Updated",
    author: "Emily Nagoski",
    category: "health",
    kind: "book",
    isbn: "9781982165314",
    source:
      "https://www.simonandschuster.com/books/Come-As-You-Are-Revised-and-Updated/Emily-Nagoski/9781982165314",
    reason:
      "Bacaan edukasi dewasa tentang seksualitas dan komunikasi. Bukan pengganti konsultasi kesehatan.",
  },
  {
    id: "spy-family",
    title: "Spy x Family, Vol. 1",
    author: "Tatsuya Endo",
    category: "comics",
    kind: "comic",
    source: "https://www.viz.com/spy-x-family",
    reason:
      "Komedi aksi tentang keluarga dengan identitas rahasia, untuk selingan bacaan yang ringan.",
  },
  {
    id: "look-back",
    title: "Look Back",
    author: "Tatsuki Fujimoto",
    category: "comics",
    kind: "comic",
    totalPages: 144,
    isbn: "9786230314889",
    source: "https://mncgramedia.id/books/6128/look-back",
    reason:
      "Komik satu jilid tentang persahabatan dan berkarya. Nuansanya lebih emosional dan membahas kehilangan.",
  },
];

export const southJakartaCinemas = [
  {
    name: "Gandaria City XXI",
    area: "Kebayoran Lama",
    url: "https://21cineplex.com/theater/bioskop-gandaria-city-xxi,300,JKTGAND.htm",
  },
  {
    name: "Pondok Indah 2 XXI",
    area: "Pondok Indah",
    url: "https://21cineplex.com/theater/bioskop-pondok-indah-2-xxi,221,JKTPOID.htm",
  },
  {
    name: "Kemang Village XXI",
    area: "Kemang",
    url: "https://21cineplex.com/theater/bioskop-kemang-village-xxi,322,JKTKEVI.htm",
  },
  {
    name: "Blok M XXI",
    area: "Blok M",
    url: "https://21cineplex.com/theater/bioskop-blok-m-xxi,35,JKTBLOM.htm",
  },
];

export const netflixReferences = [
  {
    id: 80184100,
    title: "Set It Up",
    year: 2018,
    genre: "Komedi romantis",
    age: "18+",
    reason: "Untuk malam santai: dua asisten mencoba menjodohkan bos mereka.",
    url: "https://www.netflix.com/id/title/80184100",
  },
  {
    id: 81504327,
    title: "Love at First Sight",
    year: 2023,
    genre: "Romantis",
    age: "",
    reason:
      "Pilihan romantis tentang pertemuan singkat dalam perjalanan dan kesempatan kedua.",
    url: "https://www.netflix.com/id/title/81504327",
  },
  {
    id: 81309354,
    title: "The Adam Project",
    year: 2022,
    genre: "Fiksi ilmiah & petualangan",
    age: "13+",
    reason:
      "Untuk selingan dari romansa: perjalanan waktu, keluarga, dan aksi.",
    url: "https://www.netflix.com/id/title/81309354",
  },
];
