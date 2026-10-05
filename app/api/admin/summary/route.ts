import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const event = await prisma.event.findFirst({
    include: {
      categories: {
        include: { jerseys: true, _count: { select: { runners: true } } },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });
  if (!event) return NextResponse.json({ error: "Event belum dibuat" }, { status: 404 });

  const totalHasil = await prisma.result.count();
  const totalFinisher = await prisma.result.count({ where: { status: "FINISHED" } });

  return NextResponse.json({
    event: { id: event.id, name: event.name, date: event.date, location: event.location },
    kategori: event.categories.map((c) => ({
      id: c.id,
      name: c.name,
      bibPrefix: c.bibPrefix,
      fee: c.fee,
      quota: c.quota,
      filled: c.filled,
      sisaKuota: c.quota - c.filled,
      pendaftar: c._count.runners,
      jerseys: c.jerseys.map((j) => ({ size: j.size, stock: j.stock })),
      totalJersey: c.jerseys.reduce((a, j) => a + j.stock, 0),
    })),
    totalPendaftar: event.categories.reduce((a, c) => a + c._count.runners, 0),
    totalHasil,
    totalFinisher,
    totalDNF: totalHasil - totalFinisher,
  });
}
