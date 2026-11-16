import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query-provider";
import { ProjectHubStoreProvider } from "@/mocks/ProjectHubStore";
import { ToastContainer } from "@/design-system/components/ToastContainer";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
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
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
        <QueryProvider>
          <ProjectHubStoreProvider>{children}</ProjectHubStoreProvider>
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
