import { PrismaClient } from "@prisma/client";
import { nowISO } from "../lib/format";

const prisma = new PrismaClient();

const KATEGORI = [
  {
    name: "5K",
    bibPrefix: "5K",
    fee: 75000,
    quota: 300,
    jersey: { S: 60, M: 100, L: 90, XL: 50 },
  },
  {
    name: "10K",
    bibPrefix: "10K",
    fee: 100000,
    quota: 200,
    jersey: { S: 40, M: 70, L: 60, XL: 30 },
  },
  {
    name: "Half Marathon",
    bibPrefix: "HM",
    fee: 175000,
    quota: 100,
    jersey: { S: 20, M: 35, L: 30, XL: 15 },
  },
];

const CONTOH_PESERTA: Array<{
  kategori: string;
  name: string;
  email: string;
  phone: string;
  jerseySize: string;
  chipTimeSeconds: number | null;
}> = [
  { kategori: "5K", name: "Ahmad Hidayat", email: "ahmad.h@example.com", phone: "081234567801", jerseySize: "M", chipTimeSeconds: 1523 },
  { kategori: "5K", name: "Siti Rahma", email: "siti.r@example.com", phone: "081234567802", jerseySize: "S", chipTimeSeconds: 1680 },
  { kategori: "5K", name: "Budi Santoso", email: "budi.s@example.com", phone: "081234567803", jerseySize: "L", chipTimeSeconds: null },
  { kategori: "10K", name: "Dewi Lestari", email: "dewi.l@example.com", phone: "081234567804", jerseySize: "M", chipTimeSeconds: 3245 },
  { kategori: "10K", name: "Rina Marlina", email: "rina.m@example.com", phone: "081234567805", jerseySize: "S", chipTimeSeconds: 3510 },
  { kategori: "Half Marathon", name: "Joko Prasetyo", email: "joko.p@example.com", phone: "081234567806", jerseySize: "L", chipTimeSeconds: 7230 },
];

async function main() {
  const n = await prisma.event.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }
  const event = await prisma.event.create({
    data: {
      name: "Fun Run Merdeka 2026",
      date: "2026-12-13",
      location: "Lapangan Merdeka, Jakarta",
      description: "Event lari santai tahunan dengan tiga kategori: 5K, 10K, dan Half Marathon.",
    },
  });

  for (const k of KATEGORI) {
    const cat = await prisma.category.create({
      data: {
        eventId: event.id,
        name: k.name,
        bibPrefix: k.bibPrefix,
        fee: k.fee,
        quota: k.quota,
        jerseys: {
          create: Object.entries(k.jersey).map(([size, stock]) => ({ size, stock })),
        },
      },
    });
    console.log(`kategori ${cat.name} dibuat`);
  }

  // peserta contoh memakai jalur yang sama seperti API (counter BIB atomik disimulasikan sekuensial)
  for (const p of CONTOH_PESERTA) {
    const cat = await prisma.category.findFirstOrThrow({
      where: { eventId: event.id, name: p.kategori },
    });
    const updated = await prisma.category.updateMany({
      where: { id: cat.id, filled: { lt: cat.quota } },
      data: { filled: { increment: 1 } },
    });
    if (updated.count === 0) continue;
    await prisma.jerseyStock.updateMany({
      where: { categoryId: cat.id, size: p.jerseySize, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
    await prisma.category.updateMany({ where: { id: cat.id }, data: { bibCounter: { increment: 1 } } });
    const fresh = await prisma.category.findUniqueOrThrow({ where: { id: cat.id } });
    const bib = `${fresh.bibPrefix}-${String(fresh.bibCounter).padStart(4, "0")}`;
    const participant = await prisma.participant.create({
      data: {
        categoryId: cat.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        jerseySize: p.jerseySize,
        bib,
        registeredAt: nowISO(),
      },
    });
    if (p.chipTimeSeconds !== null) {
      await prisma.result.create({
        data: {
          participantId: participant.id,
          chipTimeSeconds: p.chipTimeSeconds,
          status: "FINISHED",
          importedAt: nowISO(),
        },
      });
    }
  }
  console.log("seed selesai");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
