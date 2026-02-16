import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Marketer - Visitor Analytics Dashboard",
  description: "Recover missed revenue from your existing traffic with visitor behavior insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
