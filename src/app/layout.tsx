import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Event } from "@/types/database";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Ops Automation",
  description: "Automate event vendor outreach and management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user's events for sidebar
  let events: Event[] = [];
  if (user) {
    const { data } = await supabase
      .from('events')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    events = (data || []) as Event[];
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
      >
        {user ? (
          <div className="flex h-screen">
            <Sidebar user={user} events={events} />
            <main className="flex-1 overflow-hidden bg-sidebar pt-4 pr-4">
              <div className="h-full rounded-tl-2xl rounded-tr-2xl bg-white overflow-auto overscroll-contain">
                {children}
              </div>
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
