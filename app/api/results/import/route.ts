import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWaktu, nowISO } from "@/lib/format";
import * as XLSX from "xlsx";

interface BarisError {
  baris: number;
  bib: string;
  pesan: string;
}

function normalisasiHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/[\s_]+/g, "");
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file || file.size === 0)
    return NextResponse.json({ error: "File CSV/XLSX wajib diunggah (field 'file')" }, { status: 400 });

  let rows: Record<string, unknown>[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  } catch {
    return NextResponse.json({ error: "File tidak bisa dibaca sebagai CSV/XLSX" }, { status: 400 });
  }
  if (rows.length === 0)
    return NextResponse.json({ error: "File tidak berisi baris data" }, { status: 400 });

  // petakan kolom: cari header bib & waktu
  const headers = Object.keys(rows[0]);
  const norm = new Map(headers.map((h) => [normalisasiHeader(h), h]));
  const colBib = norm.get("bib") ?? norm.get("nobib") ?? norm.get("nomorbib");
  const colWaktu =
    norm.get("waktu") ?? norm.get("waktufinish") ?? norm.get("chiptime") ??
    norm.get("chip") ?? norm.get("time") ?? norm.get("finish");
  if (!colBib || !colWaktu)
    return NextResponse.json(
      { error: "Kolom 'bib' dan 'waktu' tidak ditemukan di file" },
      { status: 400 }
    );

  let berhasil = 0;
  let diperbarui = 0;
  const errors: BarisError[] = [];
  const kini = nowISO();

  for (let i = 0; i < rows.length; i++) {
    const barisNo = i + 2; // +1 header, +1 basis-1
    const bib = String(rows[i][colBib] ?? "").trim().toUpperCase();
    const waktuRaw = rows[i][colWaktu];
    if (!bib && (waktuRaw === "" || waktuRaw === null || waktuRaw === undefined)) continue; // baris kosong
    if (!bib) {
      errors.push({ baris: barisNo, bib: "", pesan: "Nomor BIB kosong" });
      continue;
    }
    const peserta = await prisma.participant.findUnique({ where: { bib } });
    if (!peserta) {
      errors.push({ baris: barisNo, bib, pesan: "Nomor BIB tidak dikenal" });
      continue;
    }
    let detik: number | null;
    try {
      detik = parseWaktu(waktuRaw);
    } catch {
      errors.push({ baris: barisNo, bib, pesan: `Format waktu tidak valid: ${String(waktuRaw)}` });
      continue;
    }
    const status = detik === null ? "DNF" : "FINISHED";
    const ada = await prisma.result.findUnique({ where: { participantId: peserta.id } });
    if (ada) {
      await prisma.result.update({
        where: { participantId: peserta.id },
        data: { chipTimeSeconds: detik, status, importedAt: kini },
      });
      diperbarui++;
    } else {
      await prisma.result.create({
        data: { participantId: peserta.id, chipTimeSeconds: detik, status, importedAt: kini },
      });
      berhasil++;
    }
  }

  return NextResponse.json({ berhasil, diperbarui, gagal: errors.length, errors });
}
