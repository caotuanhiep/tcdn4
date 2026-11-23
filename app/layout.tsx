import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AlumniDataProvider } from "@/components/AlumniDataProvider";
import { ToastProvider } from "@/components/ToastProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ZaloWidget from "@/components/ZaloWidget";
import MobileBottomNav from "@/components/MobileBottomNav";
import TeacherSecurityModal from "@/components/TeacherSecurityModal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  themeColor: "#003B5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tcdn4.top"),
  title: {
    default: "TCDN4 K33 UEH - 15 Năm Hội Ngộ | Alumni Hub",
    template: "%s | TCDN4 K33 UEH",
  },
  description:
    "Cổng thông tin & mạng lưới kết nối cựu sinh viên TCDN4 - K33 Đại học Kinh Tế TP.HCM (UEH) nhân dịp kỷ niệm 15 năm tốt nghiệp. Đăng ký tham gia họp mặt, nhận áo đồng phục kỷ niệm, kết nối danh bạ toàn khóa và lưu bút bạn bè.",
  keywords: [
    "TCDN4",
    "TCDN4 K33",
    "K33 UEH",
    "Đại học Kinh tế TP.HCM",
    "Cựu sinh viên UEH",
    "Hội ngộ 15 năm",
    "TCDN4 Alumni Hub",
    "Tài chính doanh nghiệp UEH",
    "TC10",
    "TC11",
    "TC12",
  ],
  authors: [{ name: "Ban Liên Lạc Cựu Sinh Viên TCDN4 K33 UEH" }],
  creator: "Ban Liên Lạc TCDN4 K33 UEH",
  publisher: "TCDN4 Alumni Hub",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TCDN4 Hub",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://tcdn4.top",
    siteName: "TCDN4 Alumni Hub - K33 UEH",
    title: "TCDN4 K33 UEH - 15 Năm Hội Ngộ | Alumni Hub",
    description:
      "Hành trình 15 năm gắn kết cựu sinh viên Tài chính Doanh nghiệp 4 - K33 UEH. Đăng ký họp mặt, nhận áo đồng phục kỷ niệm và kết nối danh bạ bạn bè.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "15 Năm Hội Ngộ TCDN4 K33 UEH Alumni Hub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TCDN4 K33 UEH - 15 Năm Hội Ngộ | Alumni Hub",
    description:
      "Hành trình 15 năm gắn kết cựu sinh viên TCDN4 - K33 UEH. Đăng ký tham gia họp mặt, nhận áo đồng phục và kết nối danh bạ.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} font-sans flex min-h-full flex-col pb-16 md:pb-0`}>
        <ToastProvider>
          <AlumniDataProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              {/* Lớp bảo vệ vui vẻ: Xác thực đúng thầy giáo K33 */}
              <TeacherSecurityModal />
              {/* Thanh menu định hướng phong cách App ở chân trang trên Mobile */}
              <MobileBottomNav />
            </AuthProvider>
          </AlumniDataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
