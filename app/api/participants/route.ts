import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { daftarkanPeserta, PendaftaranError } from "@/lib/registration";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kategoriId = sp.get("kategoriId");
  const q = (sp.get("q") ?? "").trim();
  const rows = await prisma.participant.findMany({
    where: {
      ...(kategoriId ? { categoryId: Number(kategoriId) } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { bib: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    include: { category: true, result: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  try {
    const peserta = await daftarkanPeserta({
      nama: String(body?.nama ?? ""),
      email: String(body?.email ?? ""),
      telepon: String(body?.telepon ?? body?.nik ?? ""),
      kategoriId: Number(body?.kategoriId),
      ukuranJersey: String(body?.ukuranJersey ?? "").toUpperCase(),
    });
    return NextResponse.json(peserta, { status: 201 });
  } catch (e) {
    if (e instanceof PendaftaranError) {
      const payload: Record<string, unknown> = { error: e.message };
      if (e.tersedia) payload.ukuranTersedia = e.tersedia;
      return NextResponse.json(payload, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Kesalahan server" }, { status: 500 });
  }
}
