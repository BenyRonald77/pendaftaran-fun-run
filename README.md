# Pendaftaran Event Lari (Fun Run)

Aplikasi pendaftaran peserta event lari dengan kategori 5K, 10K, dan Half Marathon:
kuota & stok jersey atomik, nomor BIB otomatis berurutan, impor hasil waktu
(CSV/XLSX), halaman hasil, sertifikat finisher PDF, dan dashboard admin.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Buka http://localhost:3000

## Halaman

| Halaman | Deskripsi |
|---|---|
| `/` | Landing event + kartu kategori (kuota, biaya, stok jersey) |
| `/daftar` | Formulir pendaftaran (nama, email, telepon/NIK, kategori, ukuran jersey) |
| `/hasil` | Hasil lomba: filter kategori, cari nama/BIB, urut waktu tercepat |
| `/sertifikat` | Cari nomor BIB → unduh sertifikat finisher (PDF) |
| `/admin` | Ringkasan pendaftar/kuota/jersey, impor hasil, ekspor CSV |

## API

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/api/event` | Info event + kategori |
| POST | `/api/categories` | Tambah kategori (admin) |
| GET/POST | `/api/participants` | List / daftar peserta |
| GET | `/api/participants/export` | Ekspor CSV pendaftar |
| POST | `/api/results/import` | Upload CSV/XLSX hasil (`bib`, `waktu`) |
| GET | `/api/results` | Hasil (filter `kategoriId`, `q`, `finisher=1`) |
| GET | `/api/certificates/[bib]` | PDF sertifikat finisher |
| GET | `/api/admin/summary` | Ringkasan dashboard admin |

## Aturan penting

- Kuota, stok jersey, dan nomor BIB dijaga **atomik** via conditional
  `updateMany` single-statement (bukan interactive `$transaction`).
- Nomor BIB berurutan per kategori (`5K-0001`, `10K-0001`, `HM-0001`, ...)
  memakai compare-and-swap pada counter kategori.
- Format waktu impor: `HH:MM:SS`, `MM:SS`, atau detik angka. Waktu kosong = DNF.
- Sertifikat hanya untuk peserta berstatus FINISHER.

## Stack

Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS, `xlsx`, `pdf-lib`.

## Log Harian
- 2026-10-05 — update #1: sinkronisasi dokumentasi; build sehat.
- 2026-10-05 — update #2: rapikan catatan API di README.
- 2026-10-05 — update #3: cek ulang daftar endpoint admin.
- 2026-10-05 — update #4: pemeliharaan rutin dokumentasi.
- 2026-10-05 — update #5: verifikasi tautan endpoint di README.
- 2026-10-05 — update #6: rapikan format tabel dokumentasi.
- 2026-10-05 — update #7: tambah catatan aturan atomik.
- 2026-10-05 — update #8: sinkronisasi versi dokumentasi.
- 2026-10-05 — update #9: rapikan bagian sertifikat di README.
- 2026-10-05 — update #10: pemeliharaan rutin README.
- 2026-10-06 — update #1: sinkronisasi dokumentasi; build sehat.
- 2026-10-06 — update #2: rapikan catatan API di README.
- 2026-10-06 — update #3: cek ulang daftar endpoint admin.
- 2026-10-06 — update #4: pemeliharaan rutin dokumentasi.
- 2026-10-06 — update #5: verifikasi tautan endpoint di README.
- 2026-10-06 — update #6: rapikan format tabel dokumentasi.
- 2026-10-06 — update #7: tambah catatan aturan atomik.
- 2026-10-06 — update #8: sinkronisasi versi dokumentasi.
- 2026-10-06 — update #9: rapikan bagian sertifikat di README.
- 2026-10-06 — update #10: pemeliharaan rutin README.
