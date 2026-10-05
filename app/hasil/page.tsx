"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatWaktu } from "@/lib/format";

interface Hasil {
  bib: string;
  nama: string;
  kategori: string;
  kategoriId: number;
  chipTimeSeconds: number | null;
  status: string;
}
interface Kategori { id: number; name: string }

export default function HasilPage() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const [filterKat, setFilterKat] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/event").then((r) => r.json()).then((d) => setKategori(d.categories ?? [])).catch(() => {});
    muat("", "");
  }, []);

  const muat = async (kat: string, cari: string) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (kat) p.set("kategoriId", kat);
    if (cari) p.set("q", cari);
    const r = await fetch("/api/results?" + p.toString());
    setHasil(await r.json());
    setLoading(false);
  };

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <nav className="flex gap-4 text-sm mb-6">
        <Link href="/" className="text-slate-600 hover:underline">&larr; Beranda</Link>
      </nav>
      <h1 className="text-3xl font-extrabold mb-6">Hasil Lomba</h1>

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3">
        <select value={filterKat} onChange={(e) => { setFilterKat(e.target.value); muat(e.target.value, q); }}
          className="border rounded-lg px-3 py-2">
          <option value="">Semua kategori</option>
          {kategori.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && muat(filterKat, q)}
          placeholder="Cari nama / nomor BIB..." className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]" />
        <button onClick={() => muat(filterKat, q)}
          className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-emerald-700">Cari</button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">BIB</th>
              <th className="text-left p-3">Nama</th>
              <th className="text-left p-3">Kategori</th>
              <th className="text-left p-3">Chip Time</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Memuat...</td></tr>
            ) : hasil.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Belum ada hasil.</td></tr>
            ) : hasil.map((h, i) => (
              <tr key={h.bib} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 font-mono font-bold">{h.bib}</td>
                <td className="p-3">{h.nama}</td>
                <td className="p-3">{h.kategori}</td>
                <td className="p-3 font-mono">{h.chipTimeSeconds === null ? "-" : formatWaktu(h.chipTimeSeconds)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${h.status === "FINISHED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {h.status === "FINISHED" ? "Finisher" : "DNF"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
