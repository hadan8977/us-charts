import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "US Charts · Alpaca + Vela",
  description: "US equities charting MVP: Alpaca IEX bars, Vela charts, Vercel-ready.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
