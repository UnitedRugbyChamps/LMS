import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";
import { ModeBanner } from "@/components/ModeBanner";

export const metadata: Metadata = {
  title: "Rugby LMS",
  description: "Last Man Standing, predictors and fantasy for URC, Premiership, Six Nations, tests and the 2027 World Cup.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f6b3a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <StoreProvider>
          <header className="border-b border-line bg-surface">
            <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand text-brand-ink text-sm">LMS</span>
                Rugby LMS
              </Link>
              <div className="flex gap-4 text-sm font-medium">
                <Link href="/play" className="hover:text-brand">Play</Link>
                <Link href="/rules" className="hover:text-brand">Rules</Link>
                <Link href="/admin" className="text-muted hover:text-brand">Admin</Link>
              </div>
            </nav>
          </header>
          <ModeBanner />
          <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
