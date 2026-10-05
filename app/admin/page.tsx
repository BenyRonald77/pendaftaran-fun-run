"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { rupiah } from "@/lib/format";

interface Ringkasan {
  event: { name: string; date: string; location: string };
  kategori: Array<{
    id: number; name: string; fee: number; quota: number; filled: number;
    sisaKuota: number; pendaftar: number;
    jerseys: Array<{ size: string; stock: number }>; totalJersey: number;
  }>;
  totalPendaftar: number; totalHasil: number; totalFinisher: number; totalDNF: number;
}

export default function AdminPage() {
  const [data, setData] = useState<Ringkasan | null>(null);
  const [impor, setImpor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const muat = () => {
    fetch("/api/admin/summary").then((r) => r.json()).then(setData).catch(() => {});
  };
  useEffect(muat, []);

  const uploadHasil = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input.files?.[0]) return;
    setUploading(true);
    setImpor(null);
    const fd = new FormData();
    fd.append("file", input.files[0]);
    try {
      const r = await fetch("/api/results/import", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        setImpor(`Gagal: ${d.error}`);
      } else {
        setImpor(`Impor selesai: ${d.berhasil} baru, ${d.diperbarui} diperbarui, ${d.gagal} gagal.`);
        if (d.errors?.length) {
          setImpor(
            (p) => p + "\n" + d.errors.slice(0, 10).map((x: { baris: number; bib: string; pesan: string }) =>
              `Baris ${x.baris} (BIB ${x.bib || "-"}): ${x.pesan}`).join("\n")
          );
        }
        muat();
      }
    } catch {
      setImpor("Gagal menghubungi server");
    }
    setUploading(false);
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-10">
      <nav className="flex gap-4 text-sm mb-6">
        <Link href="/" className="text-slate-600 hover:underline">&larr; Beranda</Link>
      </nav>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold">Dashboard Admin</h1>
        <a href="/api/participants/export"
          className="bg-slate-800 text-white font-bold px-4 py-2 rounded-lg hover:bg-slate-700">
          Ekspor CSV Pendaftar
        </a>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              ["Total Pendaftar", data.totalPendaftar],
              ["Finisher", data.totalFinisher],
              ["DNF", data.totalDNF],
              ["Hasil Diimpor", data.totalHasil],
            ].map(([label, v]) => (
              <div key={label as string} className="bg-white rounded-xl shadow p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-extrabold">{v as number}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-3">Per Kategori</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {data.kategori.map((k) => (
              <div key={k.id} className="bg-white rounded-xl shadow p-5">
                <h3 className="text-lg font-extrabold">{k.name}</h3>
                <p className="text-sm text-slate-500">{rupiah(k.fee)} / peserta</p>
                <div className="mt-2 text-sm space-y-1">
                  <p>Pendaftar: <b>{k.pendaftar}</b> / {k.quota} (sisa {k.sisaKuota})</p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (k.filled / k.quota) * 100)}%` }} />
                  </div>
                  <p>Jersey tersisa: <b>{k.totalJersey}</b> ({k.jerseys.map((j) => `${j.size}:${j.stock}`).join(" ")})</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-xl font-bold mb-3">Impor Hasil Waktu</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm text-slate-600 mb-3">
          Unggah file CSV/XLSX dengan kolom <code className="bg-slate-100 px-1 rounded">bib</code> dan{" "}
          <code className="bg-slate-100 px-1 rounded">waktu</code> (format HH:MM:SS, MM:SS, atau detik).
          Waktu kosong = DNF. Baris bermasalah dilaporkan tanpa menggagalkan impor.
        </p>
        <form onSubmit={uploadHasil} className="flex flex-wrap gap-3 items-center">
          <input type="file" accept=".csv,.xlsx,.xls" className="text-sm" required />
          <button disabled={uploading} className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {uploading ? "Mengimpor..." : "Impor Hasil"}
          </button>
        </form>
        {impor && <pre className="mt-3 text-sm bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{impor}</pre>}
      </div>
    </main>
  );
}
