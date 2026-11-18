"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import EventSection from "@/components/EventSection";
import MigrationMap from "@/components/MigrationMap";
import AlumniDirectory from "@/components/AlumniDirectory";
import MemoriesGallery from "@/components/MemoriesGallery";
import GuestbookSection from "@/components/GuestbookSection";
import CommitteeSection from "@/components/CommitteeSection";
import BusinessKiosk from "@/components/BusinessKiosk";

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  return (
    <>
      {/* 1. Hero Section (Tiêu đề cực to, Ảnh Cơ sở A lên trên nút, thống kê vui con cái/độc thân, Box Chat nhúng cân đối) */}
      <Hero />

      {/* 2. Chương trình 15 năm Tốt nghiệp (Đăng ký áo, VietQR/SePay, Đấu nối Bot Zalo tự động) */}
      <EventSection />

      {/* 3. Dấu chân TCDN4 (Bản đồ di cư, điểm vàng Cơ sở B: 279 Nguyễn Tri Phương Q.10) */}
      <MigrationMap
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 4. Danh bạ Cựu sinh viên (Filter khu vực 1 hàng trượt ngang mượt mà, 2 cột Mobile) */}
      <AlumniDirectory
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 5. Góc kỷ niệm nổi bật (Layout cân đối so le, nén ảnh tự động, hiển thị người đóng góp + caption) */}
      <MemoriesGallery />

      {/* 6. Lưu bút TCDN4 (Hiệu ứng thẻ thiệp đêm hội ngộ lung linh) */}
      <GuestbookSection />

      {/* 7. Ban Liên Lạc TCDN4 (Được đưa xuống dưới cùng, chỉ nằm trên Kiosk) */}
      <CommitteeSection />

      {/* 8. Kiosk Doanh nghiệp (2 cột trên Mobile, ưu đãi nội bộ độc quyền) */}
      <BusinessKiosk />
    </>
  );
}
