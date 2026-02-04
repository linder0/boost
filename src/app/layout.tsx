import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VRM",
  description: "Vendor discovery and management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
        suppressHydrationWarning
      >
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-hidden bg-sidebar pt-4 pr-4">
            <div className="h-full rounded-t-2xl bg-white overflow-auto overscroll-contain">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
