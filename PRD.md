# PRD — Pendaftaran Event Lari (Fun Run)

Aplikasi pendaftaran peserta event lari (fun run) dengan kuota kategori,
stok jersey, nomor BIB otomatis, impor hasil waktu, halaman hasil,
sertifikat finisher PDF, dan dashboard admin.

## Stack

- Next.js 14.2 (App Router) + TypeScript + Tailwind CSS
- Prisma 5.22 + SQLite
- `xlsx` (impor hasil waktu CSV/XLSX), `pdf-lib` (sertifikat PDF)
- Bahasa UI: Indonesia

## Model Data

- **Event**: nama event, tanggal (TEXT `YYYY-MM-DD`), lokasi, deskripsi.
- **Category** (kategori lomba): milik event; nama (`5K`, `10K`, `Half Marathon`),
  kode prefix BIB (`5K`, `10K`, `HM`), biaya pendaftaran (Int, rupiah),
  `quota` (kuota total), `filled` (terisi), `bibCounter` (counter atomik BIB).
- **JerseyStock**: stok jersey per kategori per ukuran (S/M/L/XL).
- **Participant**: nama, email, telepon/NIK, kategori, ukuran jersey, nomor BIB
  (unik, format `<PREFIX>-<NNNN>`, mis. `5K-0001`), waktu daftar (TEXT ISO).
- **Result**: 1–1 dengan Participant; `chipTimeSeconds` (Int, null = DNF),
  `status` (`FINISHED`/`DNF`).

## Aturan Bisnis

1. **Kuota atomik**: pendaftaran memakai conditional `updateMany`
   (`filled < quota` → `increment(1)`) single-statement + cek row terpengaruh.
   Kuota habis → `409 { error: "Kuota kategori ... sudah habis" }`.
   BUKAN interactive `$transaction` (terbukti bocor di SQLite).
2. **Stok jersey atomik**: `updateMany` (`stock > 0` → `decrement(1)`) per
   (kategori, ukuran). Habis → `409` + daftar ukuran yang masih tersedia.
3. **Nomor BIB atomik & berurutan**: counter per kategori via `updateMany`
   `increment(1)` lalu baca nilai baru; format `<PREFIX>-NNNN` (zero-pad 4).
   Unik dan berurutan walau request paralel.
4. Validasi: nama wajib, email format valid & unik per event, telepon/NIK
   wajib, kategori harus ada, ukuran jersey harus S/M/L/XL.
5. **Impor hasil**: upload CSV/XLSX berisi kolom `bib` dan `waktu`
   (chip time). Format waktu: `HH:MM:SS`, `MM:SS`, atau detik angka.
   Baris dengan BIB tidak dikenal / format waktu salah dilaporkan per baris
   (`errors: [{baris, bib, pesan}]`) tanpa menggagalkan seluruh impor.
   Baris kosong waktu → status DNF. Impor bersifat upsert per BIB.
6. **Sertifikat**: PDF nyata (pdf-lib) berisi nama peserta, kategori, waktu
   finish, nomor BIB, nama event. Hanya untuk peserta yang punya hasil
   `FINISHED`; belum ada hasil → `404` dengan pesan jelas.
7. **Hasil**: filter per kategori, urut waktu tercepat dulu (DNF di bawah),
   pencarian nama/BIB.
8. **Admin**: ringkasan pendaftar per kategori, kuota terisi, stok jersey
   tersisa, impor hasil, ekspor CSV pendaftar.

## Endpoint API

| Method | Path | Deskripsi |
|---|---|---|
| GET | /api/event | Info event + kategori (kuota, biaya, stok) |
| POST | /api/categories | (admin) tambah kategori |
| GET/POST | /api/participants | list (+filter kategori) / daftar peserta |
| GET | /api/participants/export | ekspor CSV pendaftar |
| POST | /api/results/import | upload CSV/XLSX hasil waktu (multipart) |
| GET | /api/results | hasil per kategori + pencarian |
| GET | /api/certificates/[bib] | unduh PDF sertifikat finisher |

## Halaman UI

- `/` — landing event + daftar kategori & tombol daftar
- `/daftar` — formulir pendaftaran
- `/hasil` — halaman hasil (filter kategori, cari, sortir waktu)
- `/sertifikat` — cari BIB → unduh sertifikat
- `/admin` — dashboard admin (ringkasan, impor hasil, ekspor CSV)

## Keterbatasan (jujur)

- Semua berjalan nyata di VM ini (SQLite, pdf-lib, xlsx) — tidak ada bagian
  yang dimock. Pembayaran pendaftaran tidak diimplementasikan (di luar scope);
  kolom `fee` hanya informatif.
