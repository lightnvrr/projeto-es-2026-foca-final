import type { Metadata } from "next";
import Navbar from "./components/Navbar"; // <-- Import do menu
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foca",
  description: "Plataforma de gestão de rotina acadêmica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surfaceVariant`}
      >
        <Navbar />

        {children}
      </body>
    </html>
  );
}
