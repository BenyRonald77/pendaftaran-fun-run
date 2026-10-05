"use client";
import { useState } from "react";
import Link from "next/link";

export default function SertifikatPage() {
  const [bib, setBib] = useState("");
  const [pesan, setPesan] = useState("");

  const unduh = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan("");
    const b = bib.trim().toUpperCase();
    if (!b) return;
    const r = await fetch(`/api/certificates/${encodeURIComponent(b)}`);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setPesan(d.error ?? "Gagal mengunduh sertifikat");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sertifikat-${b}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setPesan(`Sertifikat ${b} berhasil diunduh.`);
  };

  return (
    <main className="max-w-xl mx-auto p-6 md:p-10">
      <nav className="flex gap-4 text-sm mb-6">
        <Link href="/" className="text-slate-600 hover:underline">&larr; Beranda</Link>
      </nav>
      <h1 className="text-3xl font-extrabold mb-2">Unduh Sertifikat Finisher</h1>
      <p className="text-slate-600 mb-6">Masukkan nomor BIB Anda untuk mengunduh sertifikat finisher (PDF).</p>
      <form onSubmit={unduh} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nomor BIB</label>
          <input value={bib} onChange={(e) => setBib(e.target.value)} placeholder="cth: 5K-0001"
            className="w-full border rounded-lg px-3 py-2 font-mono uppercase" required />
        </div>
        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">
          Unduh Sertifikat (PDF)
        </button>
        {pesan && <p className="text-sm text-slate-700">{pesan}</p>}
      </form>
    </main>
  );
}
