import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatWaktu } from "@/lib/format";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(
  _req: NextRequest,
  { params }: { params: { bib: string } }
) {
  const bib = decodeURIComponent(params.bib).trim().toUpperCase();
  const peserta = await prisma.participant.findUnique({
    where: { bib },
    include: { category: { include: { event: true } }, result: true },
  });
  if (!peserta)
    return NextResponse.json({ error: `Peserta dengan BIB ${bib} tidak ditemukan` }, { status: 404 });
  if (!peserta.result || peserta.result.status !== "FINISHED" || peserta.result.chipTimeSeconds === null)
    return NextResponse.json(
      { error: `Sertifikat belum tersedia: ${peserta.name} (${bib}) belum memiliki hasil finish yang valid` },
      { status: 404 }
    );

  const event = peserta.category.event;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape (pt)
  const { width, height } = page.getSize();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const emas = rgb(0.72, 0.53, 0.16);
  const hijau = rgb(0.04, 0.42, 0.27);
  const abu = rgb(0.35, 0.35, 0.35);

  // bingkai ganda
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: emas, borderWidth: 3 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: emas, borderWidth: 1 });

  const tengah = (teks: string, y: number, font: typeof helv, ukuran: number, warna = rgb(0, 0, 0)) => {
    const w = font.widthOfTextAtSize(teks, ukuran);
    page.drawText(teks, { x: (width - w) / 2, y, font, size: ukuran, color: warna });
  };

  tengah("SERTIFIKAT FINISHER", height - 120, helvBold, 38, hijau);
  tengah(event.name, height - 160, helv, 18, abu);
  tengah("diberikan dengan bangga kepada", height - 210, helv, 14, abu);
  tengah(peserta.name.toUpperCase(), height - 265, helvBold, 34);
  tengah(
    `telah menyelesaikan lomba kategori ${peserta.category.name}`,
    height - 310,
    helv,
    15,
    abu
  );

  const waktu = formatWaktu(peserta.result.chipTimeSeconds);
  tengah("CHIP TIME", height - 355, helvBold, 13, emas);
  tengah(waktu, height - 400, helvBold, 44, hijau);

  const kiri = `Nomor BIB: ${peserta.bib}`;
  const kanan = `${event.date} · ${event.location}`;
  page.drawText(kiri, { x: 90, y: 80, font: helv, size: 13, color: abu });
  const wKanan = helv.widthOfTextAtSize(kanan, 13);
  page.drawText(kanan, { x: width - 90 - wKanan, y: 80, font: helv, size: 13, color: abu });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sertifikat-${peserta.bib}.pdf"`,
    },
  });
}
