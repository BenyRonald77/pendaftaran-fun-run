import { prisma } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import Link from "next/link";

export default async function Home() {
  const event = await prisma.event.findFirst({
    include: { categories: { include: { jerseys: true }, orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  });

  if (!event) {
    return (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl font-bold">Event belum dibuat</h1>
        <p>Jalankan <code>npm run seed</code> terlebih dahulu.</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <nav className="flex gap-4 text-sm mb-8">
        <Link href="/" className="font-semibold">Beranda</Link>
        <Link href="/daftar" className="text-slate-600 hover:underline">Daftar</Link>
        <Link href="/hasil" className="text-slate-600 hover:underline">Hasil</Link>
        <Link href="/sertifikat" className="text-slate-600 hover:underline">Sertifikat</Link>
        <Link href="/admin" className="text-slate-600 hover:underline">Admin</Link>
      </nav>

      <header className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8 md:p-12 mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold mb-2">{event.name}</h1>
        <p className="text-emerald-100">{event.date} &middot; {event.location}</p>
        <p className="mt-3 max-w-2xl text-emerald-50">{event.description}</p>
        <Link
          href="/daftar"
          className="inline-block mt-6 bg-white text-emerald-700 font-bold px-6 py-3 rounded-xl hover:bg-emerald-50"
        >
          Daftar Sekarang
        </Link>
      </header>

      <h2 className="text-xl font-bold mb-4">Kategori Lomba</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {event.categories.map((c) => {
          const sisa = c.quota - c.filled;
          const totalJersey = c.jerseys.reduce((a, j) => a + j.stock, 0);
          return (
            <div key={c.id} className="bg-white rounded-xl shadow p-6 flex flex-col">
              <h3 className="text-2xl font-extrabold">{c.name}</h3>
              <p className="text-slate-500 text-sm">Prefix BIB: {c.bibPrefix}</p>
              <p className="mt-3 text-3xl font-bold text-emerald-700">{rupiah(c.fee)}</p>
              <div className="mt-3 text-sm space-y-1">
                <p>Kuota: <b>{c.filled}</b> / {c.quota} terisi</p>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (c.filled / c.quota) * 100)}%` }}
                  />
                </div>
                <p className={sisa === 0 ? "text-red-600 font-semibold" : ""}>
                  {sisa === 0 ? "Kuota habis" : `Sisa kuota: ${sisa}`}
                </p>
                <p>Stok jersey tersisa: {totalJersey} ({c.jerseys.map((j) => `${j.size}:${j.stock}`).join(" ")})</p>
              </div>
              <Link
                href={`/daftar?kategoriId=${c.id}`}
                className={`mt-4 text-center font-bold px-4 py-2 rounded-lg ${
                  sisa === 0
                    ? "bg-slate-200 text-slate-400 pointer-events-none"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {sisa === 0 ? "Penuh" : "Daftar"}
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
