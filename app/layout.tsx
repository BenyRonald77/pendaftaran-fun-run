import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pendaftaran Fun Run",
  description: "Pendaftaran event lari: 5K, 10K, Half Marathon",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">{children}</body>
    </html>
  );
}
