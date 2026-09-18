import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DataProvider from "@/components/DataProvider";
import AuthGate from "@/components/AuthGate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interview Prep",
  description: "Personal interview preparation workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <DataProvider>
          <AuthGate>
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar />
              <main className="flex-1 px-5 py-8 md:px-10 md:py-10">
                <div className="mx-auto max-w-4xl">{children}</div>
              </main>
            </div>
          </AuthGate>
        </DataProvider>
      </body>
    </html>
  );
}
