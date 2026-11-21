import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "EUDRPass", template: "%s · EUDRPass" },
  description:
    "Ketertelusuran kopi petani kecil yang patuh EUDR: setiap kilogram terikat ke lahan terdaftar dan dapat diverifikasi siapa pun.",
};

export const viewport: Viewport = {
  themeColor: "#2f662c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">{children}</main>
          <footer className="border-t border-coffee-200 py-4 text-center text-xs text-coffee-600 print:hidden">
            EUDRPass · data dibaca langsung dari blockchain
          </footer>
        </Providers>
      </body>
    </html>
  );
}
