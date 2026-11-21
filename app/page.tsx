"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import EventSection from "@/components/EventSection";
import MigrationMap from "@/components/MigrationMap";
import AlumniDirectory from "@/components/AlumniDirectory";
import MemoriesGallery from "@/components/MemoriesGallery";
import GuestbookSection from "@/components/GuestbookSection";
import CommitteeSection from "@/components/CommitteeSection";

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  return (
    <>
      {/* 1. Hero Section (Tiêu đề cực to, Ảnh banner, thống kê điểm danh/độc thân) */}
      <Hero />

      {/* 2. Chương trình 15 năm Gặp mặt */}
      <EventSection />

      {/* 3. Góc kỷ niệm nổi bật (Layout album theo chủ đề & bộ ảnh) */}
      <MemoriesGallery />

      {/* 5. Danh bạ Cựu sinh viên (Filter khu vực 1 hàng trượt ngang mượt mà, 2 cột Mobile) */}
      <AlumniDirectory
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 6. Từ UEH ta đã đi ... (Bản đồ phân bổ cựu sinh viên, điểm vàng Cơ sở B: 279 Nguyễn Tri Phương Q.10) */}
      <MigrationMap
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 6. Lưu bút TCDN4 (Hiệu ứng thẻ thiệp đêm hội ngộ lung linh) */}
      <GuestbookSection />

      {/* 7. Ban Liên Lạc TCDN4 (Đội ngũ phụ trách 15 năm K33) */}
      <CommitteeSection />
    </>
  );
}
