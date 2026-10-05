import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JERSEY_SIZES } from "@/lib/format";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const bibPrefix = String(body?.bibPrefix ?? "").trim().toUpperCase();
  const fee = Number(body?.fee ?? 0);
  const quota = Number(body?.quota ?? 0);
  const jersey = body?.jersey as Record<string, number> | undefined;

  if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
  if (!bibPrefix) return NextResponse.json({ error: "Prefix BIB wajib diisi" }, { status: 400 });
  if (!Number.isInteger(quota) || quota <= 0)
    return NextResponse.json({ error: "Kuota harus bilangan bulat positif" }, { status: 400 });
  if (!Number.isInteger(fee) || fee < 0)
    return NextResponse.json({ error: "Biaya tidak valid" }, { status: 400 });

  const event = await prisma.event.findFirst({ orderBy: { id: "asc" } });
  if (!event) return NextResponse.json({ error: "Event belum dibuat" }, { status: 404 });

  const ada = await prisma.category.findFirst({ where: { eventId: event.id, name } });
  if (ada) return NextResponse.json({ error: `Kategori ${name} sudah ada` }, { status: 409 });

  const stok: Array<{ size: string; stock: number }> = JERSEY_SIZES.map((size) => ({
    size,
    stock: Math.max(0, Math.floor(Number(jersey?.[size] ?? 0))),
  }));

  const cat = await prisma.category.create({
    data: {
      eventId: event.id,
      name,
      bibPrefix,
      fee,
      quota,
      jerseys: { create: stok },
    },
    include: { jerseys: true },
  });
  return NextResponse.json(cat, { status: 201 });
}
