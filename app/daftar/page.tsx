"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { rupiah, JERSEY_SIZES } from "@/lib/format";

interface Kategori {
  id: number;
  name: string;
  fee: number;
  quota: number;
  filled: number;
  jerseys: Array<{ size: string; stock: number }>;
}

function FormDaftar() {
  const sp = useSearchParams();
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [form, setForm] = useState({
    nama: "",
    email: "",
    telepon: "",
    kategoriId: sp.get("kategoriId") ?? "",
    ukuranJersey: "M",
  });
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string; bib?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/event")
      .then((r) => r.json())
      .then((d) => setKategori(d.categories ?? []))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasil(null);
    try {
      const r = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kategoriId: Number(form.kategoriId) }),
      });
      const d = await r.json();
      if (r.ok) {
        setHasil({ ok: true, pesan: "Pendaftaran berhasil!", bib: d.bib });
      } else {
        const extra = d.ukuranTersedia?.length ? ` Ukuran tersedia: ${d.ukuranTersedia.join(", ")}.` : "";
        setHasil({ ok: false, pesan: d.error + extra });
      }
    } catch {
      setHasil({ ok: false, pesan: "Gagal menghubungi server" });
    }
    setLoading(false);
  };

  const katAktif = kategori.find((k) => String(k.id) === form.kategoriId);

  return (
    <main className="max-w-2xl mx-auto p-6 md:p-10">
      <nav className="flex gap-4 text-sm mb-6">
        <Link href="/" className="text-slate-600 hover:underline">&larr; Beranda</Link>
      </nav>
      <h1 className="text-3xl font-extrabold mb-6">Formulir Pendaftaran</h1>

      {hasil && (
        <div className={`rounded-xl p-4 mb-6 ${hasil.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          <p className="font-bold">{hasil.pesan}</p>
          {hasil.bib && (
            <p className="mt-1">Nomor BIB Anda: <b className="text-lg">{hasil.bib}</b> — simpan baik-baik!</p>
          )}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nama lengkap</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input type="email" className="w-full border rounded-lg px-3 py-2" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">No. telepon / NIK</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.telepon}
            onChange={(e) => setForm({ ...form, telepon: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Kategori lomba</label>
          <select className="w-full border rounded-lg px-3 py-2" value={form.kategoriId}
            onChange={(e) => setForm({ ...form, kategoriId: e.target.value })} required>
            <option value="">— Pilih kategori —</option>
            {kategori.map((k) => (
              <option key={k.id} value={k.id} disabled={k.quota - k.filled <= 0}>
                {k.name} — {rupiah(k.fee)} (sisa kuota {k.quota - k.filled})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Ukuran jersey</label>
          <div className="flex gap-2">
            {JERSEY_SIZES.map((s) => {
              const stok = katAktif?.jerseys.find((j) => j.size === s)?.stock ?? 0;
              return (
                <button type="button" key={s}
                  onClick={() => setForm({ ...form, ukuranJersey: s })}
                  disabled={stok <= 0}
                  className={`flex-1 border rounded-lg py-2 font-bold ${
                    form.ukuranJersey === s ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"
                  } ${stok <= 0 ? "opacity-40 line-through" : ""}`}>
                  {s} <span className="text-xs font-normal">({stok})</span>
                </button>
              );
            })}
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
          {loading ? "Memproses..." : "Daftar"}
        </button>
      </form>
    </main>
  );
}

export default function DaftarPage() {
  return (
    <Suspense fallback={<main className="p-8">Memuat...</main>}>
      <FormDaftar />
    </Suspense>
  );
}
