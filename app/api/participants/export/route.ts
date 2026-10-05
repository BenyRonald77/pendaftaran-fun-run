import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function selCSV(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const rows = await prisma.participant.findMany({
    include: { category: true, result: true },
    orderBy: [{ categoryId: "asc" }, { id: "asc" }],
  });
  const header = ["BIB", "Nama", "Email", "Telepon", "Kategori", "Ukuran Jersey", "Waktu Daftar", "Status", "Chip Time (detik)"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.bib, r.name, r.email, r.phone, r.category.name, r.jerseySize,
        r.registeredAt,
        r.result ? r.result.status : "BELUM ADA HASIL",
        r.result?.chipTimeSeconds ?? "",
      ]
        .map(selCSV)
        .join(",")
    );
  }
  return new NextResponse("\uFEFF" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pendaftar-fun-run.csv"',
    },
  });
}
