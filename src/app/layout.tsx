import type { Metadata } from "next";
import { Geist_Mono, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSans = Noto_Sans_SC({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_SC({
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI随记",
  description: "AI驱动的个人日记与周报管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistMono.variable} ${notoSans.variable} ${notoSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
