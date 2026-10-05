import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kategoriId = sp.get("kategoriId");
  const q = (sp.get("q") ?? "").trim();
  const hanyaFinisher = sp.get("finisher") === "1";

  const rows = await prisma.result.findMany({
    where: {
      ...(hanyaFinisher ? { status: "FINISHED" } : {}),
      participant: {
        ...(kategoriId ? { categoryId: Number(kategoriId) } : {}),
        ...(q
          ? { OR: [{ name: { contains: q } }, { bib: { contains: q } }] }
          : {}),
      },
    },
    include: { participant: { include: { category: true } } },
  });

  // urut: finisher tercepat dulu, DNF paling bawah; lalu nama
  rows.sort((a, b) => {
    const at = a.chipTimeSeconds;
    const bt = b.chipTimeSeconds;
    if (at === null && bt === null) return a.participant.name.localeCompare(b.participant.name);
    if (at === null) return 1;
    if (bt === null) return -1;
    return at - bt;
  });

  return NextResponse.json(
    rows.map((r) => ({
      bib: r.participant.bib,
      nama: r.participant.name,
      kategori: r.participant.category.name,
      kategoriId: r.participant.categoryId,
      chipTimeSeconds: r.chipTimeSeconds,
      status: r.status,
    }))
  );
}
