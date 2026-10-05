export const rupiah = (n: number) =>
  "Rp" + Math.round(n).toLocaleString("id-ID");

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export const nowISO = () => new Date().toISOString();

/** detik -> "H:MM:SS" atau "MM:SS" */
export function formatWaktu(totalDetik: number): string {
  const h = Math.floor(totalDetik / 3600);
  const m = Math.floor((totalDetik % 3600) / 60);
  const s = totalDetik % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Parse "HH:MM:SS" | "MM:SS" | "SS" | angka detik -> detik (Int). null bila kosong. */
export function parseWaktu(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) throw new Error("format waktu salah");
    return Math.round(raw);
  }
  const s = String(raw).trim();
  if (s === "" || s === "-" || /^dnf$/i.test(s)) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3) throw new Error("format waktu salah");
  const nums = parts.map((p) => {
    if (!/^\d+(\.\d+)?$/.test(p.trim())) throw new Error("format waktu salah");
    return parseFloat(p.trim());
  });
  let total = 0;
  if (nums.length === 3) {
    const [h, m, sec] = nums;
    if (m >= 60 || sec >= 60) throw new Error("format waktu salah");
    total = h * 3600 + m * 60 + sec;
  } else {
    const [m, sec] = nums;
    if (sec >= 60) throw new Error("format waktu salah");
    total = m * 60 + sec;
  }
  return Math.round(total);
}

export const JERSEY_SIZES = ["S", "M", "L", "XL"] as const;
