"use client";

import { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Globe, 
  Filter, 
  MessageCircle, 
  Building, 
  Phone,
  X,
  ChevronDown
} from "lucide-react";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export interface AlumniMember {
  id: number;
  name: string;
  class: "TC10" | "TC11" | "TC12";
  job: string;
  company: string;
  location: string;
  region: "hcm" | "hn" | "dn" | "overseas";
  email?: string;
  phone?: string;
  bio?: string;
}

const ALUMNI_LIST: AlumniMember[] = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    class: "TC10",
    job: "Giám đốc Tài chính",
    company: "Tập đoàn Hòa Bình",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0903123456",
    bio: "Chuyên gia hoạch định tài chính và M&A với hơn 14 năm kinh nghiệm tại các tập đoàn lớn.",
  },
  {
    id: 2,
    name: "Trần Thị Bích",
    class: "TC11",
    job: "Trưởng phòng Kế toán",
    company: "Deloitte Vietnam",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0918654321",
    bio: "Thành viên ACCA, tư vấn thuế và kiểm toán doanh nghiệp niêm yết.",
  },
  {
    id: 3,
    name: "Lê Hoàng Cường",
    class: "TC12",
    job: "Quản lý Quỹ Đầu tư",
    company: "VinaCapital",
    location: "Hà Nội",
    region: "hn",
    phone: "0982112233",
    bio: "Phụ trách danh mục đầu tư cổ phiếu ngành năng lượng và công nghệ.",
  },
  {
    id: 4,
    name: "Phạm Hải Đăng",
    class: "TC10",
    job: "CEO & Founder",
    company: "FinTech Alpha",
    location: "Đà Nẵng",
    region: "dn",
    phone: "0934998877",
    bio: "Khởi nghiệp giải pháp thanh toán số và ví điện tử cho thị trường du lịch miền Trung.",
  },
  {
    id: 5,
    name: "Hoàng Minh Em",
    class: "TC11",
    job: "Cố vấn Tài chính Cao cấp",
    company: "KPMG Australia",
    location: "Sydney, Úc",
    region: "overseas",
    phone: "+61412345678",
    bio: "Định cư tại Sydney, chuyên tư vấn cấu trúc vốn và thuế doanh nghiệp xuyên biên giới.",
  },
  {
    id: 6,
    name: "Vũ Khánh Phương",
    class: "TC12",
    job: "Giám đốc Quản lý Rủi ro",
    company: "Wells Fargo Bank",
    location: "San Francisco, Mỹ",
    region: "overseas",
    phone: "+14155552671",
    bio: "Thạc sĩ Tài chính tại Mỹ, nghiên cứu thuật toán đánh giá rủi ro tín dụng ngân hàng.",
  },
  {
    id: 7,
    name: "Đặng Quốc Hưng",
    class: "TC10",
    job: "Trưởng phòng Tín dụng Doanh nghiệp",
    company: "Vietcombank HCM",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0909887766",
    bio: "Tài trợ vốn lưu động và dự án bất động sản công nghiệp phía Nam.",
  },
  {
    id: 8,
    name: "Ngô Mỹ Linh",
    class: "TC11",
    job: "Giám đốc Khối Phân tích",
    company: "SSI Securities",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0912334455",
    bio: "Thường xuyên xuất hiện trên các diễn đàn kinh tế, nhận định thị trường chứng khoán Việt Nam.",
  },
  {
    id: 9,
    name: "Bùi Thanh Nam",
    class: "TC12",
    job: "Phó Tổng Giám đốc",
    company: "Bamos Coffee Group",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0945667788",
    bio: "Vận hành chuỗi cà phê F&B phục vụ không gian học tập và làm việc 24/7.",
  },
  {
    id: 10,
    name: "Võ Thùy Trang",
    class: "TC10",
    job: "CFO",
    company: "Gowise Global",
    location: "Đà Nẵng",
    region: "dn",
    phone: "0971223344",
    bio: "Phát triển công nghệ eSIM viễn thông quốc tế cho du khách toàn cầu.",
  },
  {
    id: 11,
    name: "Nguyễn Quang Vinh",
    class: "TC11",
    job: "Giám đốc Đầu tư Mạo hiểm",
    company: "Nextrans Capital",
    location: "Hà Nội",
    region: "hn",
    phone: "0988776611",
    bio: "Đầu tư hạt giống và Series A cho các startup công nghệ Việt Nam.",
  },
  {
    id: 12,
    name: "Đỗ Gia Huy",
    class: "TC12",
    job: "Chuyên viên Tài chính Quốc tế",
    company: "DBS Bank",
    location: "Singapore",
    region: "overseas",
    phone: "+6591234567",
    bio: "Làm việc tại trung tâm tài chính Marina Bay, quản lý danh mục tài sản cá nhân cao cấp.",
  },
];

interface AlumniDirectoryProps {
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export default function AlumniDirectory({
  selectedRegion = "all",
  onSelectRegion,
}: AlumniDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [viewingMember, setViewingMember] = useState<AlumniMember | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const handleRegionClick = (r: string) => {
    if (onSelectRegion) {
      onSelectRegion(r);
    }
  };

  const filteredList = useMemo(() => {
    return ALUMNI_LIST.filter((member) => {
      if (selectedRegion !== "all" && member.region !== selectedRegion) {
        return false;
      }
      if (selectedClass !== "all" && member.class !== selectedClass) {
        return false;
      }
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        return (
          member.name.toLowerCase().includes(query) ||
          member.job.toLowerCase().includes(query) ||
          member.company.toLowerCase().includes(query) ||
          member.location.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [selectedRegion, selectedClass, searchTerm]);

  const displayedList = filteredList.slice(0, visibleCount);

  return (
    <section id="directory" className="scroll-mt-16 bg-slate-100/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Header với Tiêu đề Cực To */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-3">
            <Users size={14} className="text-ueh" /> Mạng lưới cựu sinh viên
          </div>
          <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Danh Bạ Cựu Sinh Viên
          </h2>
          <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600">
            Tìm kiếm và kết nối lại với bạn bè cùng khóa TC10, TC11, TC12.
          </p>
        </div>

        {/* Search & 2 DÒNG FILTER RIÊNG BIỆT (DÒNG KHU VỰC NẰM TRÊN 1 HÀNG TRƯỢT SANG PHẢI KHÔNG NHẢY DÒNG) */}
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          {/* Ô tìm kiếm */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo họ tên, chức danh, công ty hoặc nơi ở..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(6);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ueh focus:bg-white focus:outline-none focus:ring-2 focus:ring-ueh/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* DÒNG 1: LỌC THEO LỚP */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 min-w-[70px]">
              <GraduationCap size={14} className="text-ueh" /> Lớp:
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(["all", "TC10", "TC11", "TC12"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => {
                    setSelectedClass(cls);
                    setVisibleCount(6);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    selectedClass === cls
                      ? "bg-ueh text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cls === "all" ? "Tất cả các lớp" : cls}
                </button>
              ))}
            </div>
          </div>

          {/* 5. DÒNG 2: LỌC THEO KHU VỰC (BẮT BUỘC NẰM TRÊN 1 HÀNG, TRƯỢT SANG PHẢI XEM THÊM, KO NHẢY DÒNG) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 whitespace-nowrap pt-3 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 min-w-[70px]">
              <MapPin size={14} className="text-rose-500" /> Khu vực:
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {[
                { id: "all", label: "Toàn cầu (Tất cả)" },
                { id: "hcm", label: "TP. Hồ Chí Minh" },
                { id: "hn", label: "Hà Nội" },
                { id: "dn", label: "Đà Nẵng" },
                { id: "overseas", label: "Nước ngoài" },
              ].map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => {
                    handleRegionClick(reg.id);
                    setVisibleCount(6);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                    selectedRegion === reg.id
                      ? "bg-ueh-light text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-ueh"
                  }`}
                >
                  {reg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Grid: 2 cột trên Mobile */}
        {filteredList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">Không tìm thấy cựu sinh viên phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thử tìm kiếm với từ khóa hoặc bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {displayedList.map((member) => (
              <div
                key={member.id}
                onClick={() => setViewingMember(member)}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-ueh/40 hover:shadow-md cursor-pointer"
              >
                <div>
                  {/* Top: Avatar & Class */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-ueh to-ueh-light text-white font-black text-base sm:text-lg shadow-xs group-hover:scale-105 transition-transform">
                      {member.name.charAt(member.name.lastIndexOf(" ") + 1)}
                    </div>
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-ueh border border-blue-100/60">
                      {member.class}
                    </span>
                  </div>

                  {/* Name & Job */}
                  <h3 className="text-xs sm:text-base font-black text-slate-900 group-hover:text-ueh transition-colors line-clamp-1">
                    {member.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600 line-clamp-1 mt-0.5">
                    {member.job}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                    {member.company}
                  </p>
                </div>

                {/* Bottom: Location & Action */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 line-clamp-1">
                    <MapPin size={12} className="text-rose-500 shrink-0" />
                    <span className="truncate">{member.location}</span>
                  </span>
                  <span className="text-[10px] font-bold text-ueh group-hover:underline hidden sm:inline">
                    Chi tiết →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {filteredList.length > displayedList.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:border-ueh hover:text-ueh shadow-xs transition-all"
            >
              Xem thêm cựu sinh viên ({filteredList.length - displayedList.length})
              <ChevronDown size={16} />
            </button>
          </div>
        )}

      </div>

      {/* Modal xem chi tiết Profile */}
      {viewingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setViewingMember(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingMember(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ueh to-ueh-light text-white font-black text-2xl shadow-md">
                {viewingMember.name.charAt(viewingMember.name.lastIndexOf(" ") + 1)}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{viewingMember.name}</h3>
                <span className="inline-block mt-0.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-ueh">
                  Lớp {viewingMember.class}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 mb-5">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-ueh shrink-0" />
                <span className="font-bold">{viewingMember.job}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building size={16} className="text-slate-400 shrink-0" />
                <span>{viewingMember.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-rose-500 shrink-0" />
                <span>{viewingMember.location}</span>
              </div>
              {viewingMember.bio && (
                <div className="pt-2 border-t border-slate-200/60 text-slate-600 text-xs italic">
                  "{viewingMember.bio}"
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {viewingMember.phone && (
                <a
                  href={`tel:${viewingMember.phone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 py-2.5 text-xs font-bold text-slate-800 hover:border-ueh hover:text-ueh transition-colors shadow-2xs"
                >
                  <Phone size={14} className="text-emerald-600" /> Gọi điện
                </a>
              )}
              <a
                href={ZALO_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0068FF] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <MessageCircle size={14} /> Nhóm Zalo
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
