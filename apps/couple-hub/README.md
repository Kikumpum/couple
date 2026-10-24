# Couple Hub

Aplikasi pribadi untuk pasangan. Login, pencatatan, dan izin berbagi memakai backend nyata; tidak ada akun bersama atau data finansial/kesehatan contoh yang di-seed.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- SQLite melalui `node:sqlite` (Node 22.13+; API masih experimental pada Node 22)
- PostgreSQL Neon melalui Prisma untuk deployment Vercel
- TMDB, CoinGecko, dan endpoint publik Yahoo Finance melalui server

## Struktur

- `src/components/CoupleApp.tsx`: dashboard akun dan alur CRUD.
- `src/components/MarketWatchlist.tsx`: saham Indonesia, AS, dan kripto per akun.
- `src/server/db.ts`: skema SQLite aktif dan migrasi aditif, tanpa reset data.
- `src/server/cloud.ts`: autentikasi, CRUD, izin pasangan, dan SSE PostgreSQL.
- `prisma/cloud.prisma`: skema PostgreSQL aktif untuk cloud; tabel berawalan `couple_v2_`.
- `src/server/records.ts`: validasi field dan jumlah.
- `src/app/api/`: autentikasi, CRUD, koneksi pasangan, event sinkronisasi, dan provider.
- `tests/`: pengujian akses data, siklus, sinkronisasi, dan pemetaan harga.
- `src/server/CONTRACT.md`: kontrak API.
- `prisma/schema.prisma`: rancangan PostgreSQL lama untuk referensi, BUKAN database aktif aplikasi ini.

## Menjalankan Lokal

```bash
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3010
```

Lalu buka http://127.0.0.1:3010. Buat akunmu sendiri, lalu masuk dengan nama pengguna atau email. Email tidak wajib. Data disimpan di `.data/couple-hub.sqlite` dan tidak berubah ketika logout, reload, atau restart server. Jangan hapus folder `.data` jika ingin mempertahankannya.

## Environment

```bash
COUPLE_DB_PATH=".data/couple-hub.sqlite"
APP_ORIGIN=""
TMDB_API_TOKEN=""
# Cloud only: database khusus Couple Hub, bukan proyek lain.
COUPLE_DATABASE_DATABASE_URL=""
```

Gunakan `.env.local` yang tidak di-commit. Token TMDB opsional; tanpa token, rencana date manual tetap tersedia dan radar film menunjukkan konfigurasi belum siap.

## Perilaku Data

- Setiap record punya pemilik. ID dari client tidak boleh mengganti pemilik.
- Pasangan terhubung bisa membaca catatan non-kesehatan, tetapi tidak mengubah record milik orang lain.
- Catatan kesehatan pribadi secara default. Berbagi memerlukan persetujuan yang bisa dicabut.
- Watchlist pasar dan preferensi tema khusus akun, tidak ikut dibagikan.
- Undangan pasangan sekali pakai, berlaku 24 jam. Putus koneksi mempertahankan record masing-masing.
- SSE mengirim invalidasi per akun; client mengambil ulang data setelah otorisasi diperiksa. Target sinkronisasi lokal sekitar 1 detik, bukan jaminan jaringan.
- Pantauan pasar diperiksa setiap 60 detik ketika halaman aktif. USD tidak otomatis dianggap IDR. Di luar jam bursa, harga transaksi terakhir ditampilkan beserta waktu aslinya.
- Pencatatan investasi bukan eksekusi transaksi di broker dan tidak otomatis mengurangi saldo.
- Rekomendasi Netflix dan referensi buku/komik adalah pilihan editorial dengan sumber resmi, bukan katalog live. Jadwal XXI Jakarta Selatan ditautkan langsung ke halaman teater resmi; bukan jadwal yang disalin atau ditebak.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

## Batas Deployment

Lokal tanpa konfigurasi cloud memakai SQLite. Vercel wajib memakai PostgreSQL khusus melalui `COUPLE_DATABASE_DATABASE_URL`; aplikasi tidak beralih diam-diam ke SQLite atau ke `DATABASE_URL` proyek lain. Atur Root Directory Vercel ke `apps/couple-hub`, Node 22.x. Tabel cloud dibuat secara aditif, tanpa reset. Pisahkan database Preview dan Production.

Sinkronisasi cloud memakai invalidasi SSE dengan pemeriksaan revisi setiap 2 detik, bukan streaming PostgreSQL langsung. Koneksi diperbarui setiap 50 detik untuk runtime serverless. Kuota database dan fungsi perlu dipantau.

Migrasi lokal memakai `/api/transfer` dengan token sementara `COUPLE_MIGRATION_TOKEN` khusus Production. Impor hanya menerima dua akun aryo/fia, mempertahankan ID, hash kata sandi, kepemilikan, dan waktu catatan. Target harus kosong; impor dikunci setelah berhasil. Backup SQLite-aware wajib dibuat terlebih dahulu. Jangan commit token, backup, atau database. Hapus token setelah verifikasi.

Untuk server publik: gunakan HTTPS, set `APP_ORIGIN` ke origin publik persis, lindungi izin direktori data, gunakan backup SQLite-aware yang terenkripsi, uji pemulihan backup, dan konfigurasi proxy agar SSE tidak dibuffer. Database lokal belum dienkripsi at rest. Jangan anggap versi ini telah diaudit keamanan produksi.

Push notification otomatis, pemulihan kata sandi lewat email, serta harga emas dan NAB berlisensi belum tersedia. Pengingat disimpan dan ditampilkan di dashboard, bukan dikirim saat aplikasi ditutup.

Endpoint Yahoo Finance tidak merupakan API publik dengan SLA. Akses bisa dibatasi atau berubah; evaluasi lisensi data dan ganti dengan provider berlisensi untuk publikasi komersial. Rujukan: [cakupan dan jeda Yahoo](https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html), [timestamp CoinGecko](https://support.coingecko.com/hc/en-us/articles/23190569313049-How-can-I-determine-if-the-pricing-data-for-the-coin-is-outdated-or-stale).
