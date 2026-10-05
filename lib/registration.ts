import { prisma } from "./prisma";
import { JERSEY_SIZES, nowISO } from "./format";
import { Prisma } from "@prisma/client";

export class PendaftaranError extends Error {
  status: number;
  tersedia?: string[];
  constructor(status: number, message: string, tersedia?: string[]) {
    super(message);
    this.status = status;
    this.tersedia = tersedia;
  }
}

export interface DataPendaftaran {
  nama: string;
  email: string;
  telepon: string;
  kategoriId: number;
  ukuranJersey: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validasiInput(d: DataPendaftaran) {
  if (!d.nama || !d.nama.trim()) throw new PendaftaranError(400, "Nama wajib diisi");
  if (!EMAIL_RE.test(d.email || ""))
    throw new PendaftaranError(400, "Format email tidak valid");
  if (!d.telepon || !d.telepon.trim())
    throw new PendaftaranError(400, "Nomor telepon/NIK wajib diisi");
  if (!(JERSEY_SIZES as readonly string[]).includes(d.ukuranJersey))
    throw new PendaftaranError(400, "Ukuran jersey harus S, M, L, atau XL");
  if (!Number.isInteger(d.kategoriId))
    throw new PendaftaranError(400, "Kategori tidak valid");
}

function isBibConflict(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    Array.isArray((e.meta as { target?: string[] } | undefined)?.target) &&
    ((e.meta as { target?: string[] }).target ?? []).includes("bib")
  );
}

/**
 * Daftarkan peserta dengan operasi ATOMIK:
 * 1. kuota: conditional updateMany (filled < quota) single-statement
 * 2. stok jersey: conditional updateMany (stock > 0) single-statement
 * 3. counter BIB: updateMany increment + baca nilai baru; bila dua request
 *    membaca nilai yang sama (tabrakan BIB), ulangi increment (maks 5x).
 * Tidak memakai interactive $transaction (bocor di SQLite).
 */
export async function daftarkanPeserta(d: DataPendaftaran) {
  validasiInput(d);
  const email = d.email.trim().toLowerCase();
  const nama = d.nama.trim();
  const telepon = d.telepon.trim();

  const kategori = await prisma.category.findUnique({ where: { id: d.kategoriId } });
  if (!kategori) throw new PendaftaranError(404, "Kategori tidak ditemukan");

  const duplikat = await prisma.participant.findFirst({
    where: { categoryId: kategori.id, email },
  });
  if (duplikat)
    throw new PendaftaranError(409, "Email sudah terdaftar pada kategori ini");

  // 1. klaim kuota atomik
  const klaimKuota = await prisma.category.updateMany({
    where: { id: kategori.id, filled: { lt: kategori.quota } },
    data: { filled: { increment: 1 } },
  });
  if (klaimKuota.count === 0)
    throw new PendaftaranError(409, `Kuota kategori ${kategori.name} sudah habis`);

  const rollback = () =>
    Promise.all([
      prisma.category.updateMany({
        where: { id: kategori.id, filled: { gt: 0 } },
        data: { filled: { decrement: 1 } },
      }),
      prisma.jerseyStock.updateMany({
        where: { categoryId: kategori.id, size: d.ukuranJersey },
        data: { stock: { increment: 1 } },
      }),
    ]);

  try {
    // 2. klaim stok jersey atomik
    const klaimJersey = await prisma.jerseyStock.updateMany({
      where: { categoryId: kategori.id, size: d.ukuranJersey, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
    if (klaimJersey.count === 0) {
      const sisa = await prisma.jerseyStock.findMany({
        where: { categoryId: kategori.id, stock: { gt: 0 } },
        select: { size: true },
        orderBy: { size: "asc" },
      });
      throw new PendaftaranError(
        409,
        `Stok jersey ukuran ${d.ukuranJersey} untuk kategori ${kategori.name} sudah habis`,
        sisa.map((s) => s.size)
      );
    }

    // 3. nomor BIB atomik & berurutan per kategori (compare-and-swap agar
    // tidak ada nomor yang terlewat walau request paralel)
    for (let attempt = 0; attempt < 10; attempt++) {
      const cur = await prisma.category.findUniqueOrThrow({
        where: { id: kategori.id },
        select: { bibCounter: true, bibPrefix: true },
      });
      const klaim = await prisma.category.updateMany({
        where: { id: kategori.id, bibCounter: cur.bibCounter },
        data: { bibCounter: { increment: 1 } },
      });
      if (klaim.count === 0) continue; // kalah lomba, baca ulang & coba lagi
      const bib = `${cur.bibPrefix}-${String(cur.bibCounter + 1).padStart(4, "0")}`;
      try {
        const peserta = await prisma.participant.create({
          data: {
            categoryId: kategori.id,
            name: nama,
            email,
            phone: telepon,
            jerseySize: d.ukuranJersey,
            bib,
            registeredAt: nowISO(),
          },
          include: { category: true },
        });
        return peserta;
      } catch (e) {
        if (isBibConflict(e)) continue; // sangat jarang; nomor sudah terpakai, coba berikut
        throw e;
      }
    }
    throw new PendaftaranError(500, "Gagal mengalokasikan nomor BIB, silakan coba lagi");
  } catch (e) {
    if (!(e instanceof PendaftaranError)) {
      await rollback();
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new PendaftaranError(409, "Email sudah terdaftar pada kategori ini");
      }
    } else if (e.status === 409 && e.tersedia) {
      // stok jersey habis: kembalikan kuota saja (jersey tidak terpakai)
      await prisma.category.updateMany({
        where: { id: kategori.id, filled: { gt: 0 } },
        data: { filled: { decrement: 1 } },
      });
    } else if (e.status !== 409) {
      await rollback();
    }
    throw e;
  }
}
