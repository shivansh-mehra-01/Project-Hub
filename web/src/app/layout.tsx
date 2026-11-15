import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import { ProjectHubStoreProvider } from "@/mocks/ProjectHubStore";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Hub — Academic Project & NBA Compliance SaaS",
  description:
    "Production-grade, multi-tenant B2B SaaS platform for engineering colleges to manage Minor & Major academic projects and automate NBA Criterion 2 & 3 compliance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
        <QueryProvider>
          <ProjectHubStoreProvider>{children}</ProjectHubStoreProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
