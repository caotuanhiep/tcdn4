"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import EventSection from "@/components/EventSection";
import MigrationMap from "@/components/MigrationMap";
import AlumniDirectory from "@/components/AlumniDirectory";
import MemoriesGallery from "@/components/MemoriesGallery";
import GuestbookSection from "@/components/GuestbookSection";
import BusinessKiosk from "@/components/BusinessKiosk";

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  return (
    <>
      {/* 1. Hero Section (Đã bao gồm ảnh lớn Cơ sở B và Lịch sinh nhật gọn nhẹ bên dưới) */}
      <Hero />

      {/* 2. Chương trình 15 năm Tốt nghiệp (Đăng ký áo, VietQR, Thứ tự cột chuẩn, Đấu nối Bot Zalo) */}
      <EventSection />

      {/* 3. Dấu chân TCDN4 (Bản đồ di cư, Cơ sở B UEH tinh tế) */}
      <MigrationMap
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 4. Danh bạ Cựu sinh viên (Thẻ màu xám nhẹ, 2 cột Mobile, Link Zalo & Gọi điện) */}
      <AlumniDirectory
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 5. Góc kỷ niệm nổi bật (Album ảnh & video, Thả tim, Bình luận) */}
      <MemoriesGallery />

      {/* 6. Lưu bút TCDN4 (Ghi lại lời nhắn phương xa) */}
      <GuestbookSection />

      {/* 7. Kiosk Doanh nghiệp (Mục bổ sung nhẹ nhàng) */}
      <BusinessKiosk />
    </>
  );
}
