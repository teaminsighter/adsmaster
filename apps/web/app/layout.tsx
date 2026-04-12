import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import AIAdvisorWrapper from "@/components/AIAdvisor/AIAdvisorWrapper";
import Providers from "@/lib/providers/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AdsMaster - AI-Powered Ads Management",
  description: "Manage Google Ads and Meta Ads with AI-powered recommendations",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          <div className="app-layout">
            <AppShell>
              {children}
            </AppShell>
          </div>
          <AIAdvisorWrapper />
        </Providers>
      </body>
    </html>
  );
}
