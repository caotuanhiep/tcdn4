"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import EventSection from "@/components/EventSection";
import EmbeddedCommunityChat from "@/components/EmbeddedCommunityChat";
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

      {/* 2. Chương trình 15 năm Gặp mặt (Đưa lên thế chỗ cho box chat ngay sau Hero) */}
      <EventSection />

      {/* 3. Box Chat Cộng Đồng & Chúc Mừng Sinh Nhật (Độ rộng chuẩn max-w-6xl đồng bộ toàn trang) */}
      <section className="bg-gradient-to-b from-white via-slate-50/70 to-slate-100/60 py-8 sm:py-12 border-b border-slate-200/60 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <EmbeddedCommunityChat />
        </div>
      </section>

      {/* 4. Góc kỷ niệm nổi bật (Layout xòe bài theo chủ đề, nén ảnh tự động, đóng góp nhiều ảnh) */}
      <MemoriesGallery />

      {/* 5. Danh bạ Cựu sinh viên (Filter khu vực 1 hàng trượt ngang mượt mà, 2 cột Mobile) */}
      <AlumniDirectory
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
      />

      {/* 6. Dấu chân TCDN4 (Bản đồ phân bổ cựu sinh viên, điểm vàng Cơ sở B: 279 Nguyễn Tri Phương Q.10) */}
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
