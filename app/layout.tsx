import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ZaloWidget from "@/components/ZaloWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const viewport: Viewport = {
  themeColor: "#003B5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "TCDN4 Alumni Hub - K33 UEH",
  description: "Mạng lưới cựu sinh viên TCDN4 - K33 UEH nhân dịp kỷ niệm 15 năm hội ngộ.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TCDN4 Hub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <ZaloWidget />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
