import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DataProvider from "@/components/DataProvider";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Interview Prep",
  description: "Personal interview preparation dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <DataProvider>
          <AuthGate>
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-5xl">{children}</div>
              </main>
            </div>
          </AuthGate>
        </DataProvider>
      </body>
    </html>
  );
}
