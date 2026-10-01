import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
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
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Interview Prep" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Apply saved theme before paint to avoid a flash of the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <DataProvider>
          <AuthGate>
            <div className="flex min-h-screen flex-col">
              <TopNav />
              <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
                <div className="fade-in mx-auto w-full max-w-[1600px]">{children}</div>
              </main>
            </div>
          </AuthGate>
        </DataProvider>
      </body>
    </html>
  );
}
