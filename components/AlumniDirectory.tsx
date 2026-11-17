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
    job: "Senior Financial Advisor",
    company: "KPMG Australia",
    location: "Sydney, Úc",
    region: "overseas",
    phone: "+61412345678",
    bio: "Định cư tại Úc từ 2017, cố vấn chiến lược thuế và cấu trúc vốn xuyên biên giới.",
  },
  {
    id: 6,
    name: "Vũ Khánh Phương",
    class: "TC12",
    job: "Giám đốc Quản trị Rủi ro",
    company: "Tech Bank SV",
    location: "California, Mỹ",
    region: "overseas",
    phone: "+14155552671",
    bio: "Chuyên gia định lượng mô hình rủi ro tín dụng tại thung lũng Silicon.",
  },
  {
    id: 7,
    name: "Đặng Quốc Hưng",
    class: "TC10",
    job: "Phó Tổng Giám đốc",
    company: "Chứng khoán SSI",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0908776655",
    bio: "15 năm gắn bó với thị trường tài chính chứng khoán từ ngày tốt nghiệp UEH.",
  },
  {
    id: 8,
    name: "Mai Thảo Vy",
    class: "TC11",
    job: "GĐ Khối KHDN",
    company: "Vietcombank Sở Giao Dịch",
    location: "Hà Nội",
    region: "hn",
    phone: "0977443322",
    bio: "Phụ trách các gói tài trợ vốn dự án cơ sở hạ tầng lớn khu vực phía Bắc.",
  },
  {
    id: 9,
    name: "Bùi Tuấn Kiệt",
    class: "TC12",
    job: "Quản lý Dự án Đầu tư",
    company: "Sun Group Central",
    location: "Đà Nẵng",
    region: "dn",
    phone: "0933221100",
    bio: "Tham gia triển khai các đại dự án bất động sản nghỉ dưỡng tại Đà Nẵng - Hội An.",
  },
  {
    id: 10,
    name: "Ngô Thanh Trúc",
    class: "TC10",
    job: "Chuyên gia Tư vấn Thuế",
    company: "PwC Vietnam",
    location: "TP. Hồ Chí Minh",
    region: "hcm",
    phone: "0912334455",
    bio: "Hỗ trợ các doanh nghiệp FDI tối ưu hóa chính sách thuế và chuyển giá.",
  },
  {
    id: 11,
    name: "Võ Minh Đức",
    class: "TC11",
    job: "Trưởng nhóm Đầu tư mạo hiểm",
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
    <section id="directory" className="scroll-mt-16 bg-slate-100/60 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5">
            <Users size={13} className="text-ueh" /> Mạng lưới cựu sinh viên
          </div>
          <h2 className="text-2xl font-extrabold text-ueh sm:text-3xl md:text-4xl tracking-tight">
            Danh Bạ Cựu Sinh Viên
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
          <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
            Tìm kiếm và kết nối lại với bạn bè cùng khóa TC10, TC11, TC12.
          </p>
        </div>

        {/* Search & Single-row Scrollable Filter Tabs */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs">
          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm theo họ tên, chức danh, công ty hoặc nơi ở..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(6);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ueh focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Single-row Horizontal Scrollable Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Filter size={12} /> Lớp:
            </span>
            {(["all", "TC10", "TC11", "TC12"] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setVisibleCount(6);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all shrink-0 ${
                  selectedClass === cls
                    ? "bg-ueh text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cls === "all" ? "Tất cả lớp" : cls}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

            <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0 mr-1">
              Khu vực:
            </span>
            {[
              { id: "all", label: "Toàn cầu" },
              { id: "hcm", label: "TP.HCM" },
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
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shrink-0 ${
                  selectedRegion === reg.id
                    ? "bg-ueh-light text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-ueh"
                }`}
              >
                {reg.id === "overseas" ? <Globe size={11} /> : <MapPin size={11} />}
                {reg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid - Cards with warm grey background for clear contrast & easy reading */}
        {filteredList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy thành viên phù hợp</h3>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedClass("all");
                handleRegionClick("all");
              }}
              className="mt-3 rounded-lg bg-ueh px-4 py-1.5 text-xs font-bold text-white hover:bg-ueh-light"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
              {displayedList.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setViewingMember(member)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/90 p-3 sm:p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:border-ueh/50 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* Top: Avatar & Class */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-ueh to-ueh-light text-sm sm:text-base font-black text-white shadow-xs">
                        {member.name.trim().charAt(member.name.trim().lastIndexOf(" ") + 1)}
                      </div>
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-ueh">
                        {member.class}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-xs sm:text-base font-bold text-slate-900 group-hover:text-ueh transition-colors truncate">
                      {member.name}
                    </h3>

                    {/* Job & Company */}
                    <div className="mt-1 sm:mt-2 space-y-1 text-[11px] sm:text-xs text-slate-600">
                      <div className="flex items-center gap-1 font-medium text-slate-800 truncate">
                        <Briefcase size={12} className="text-ueh-orange shrink-0" />
                        <span className="truncate">{member.job}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 truncate">
                        <Building size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{member.company}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 truncate">
                        <MapPin size={12} className="text-rose-500 shrink-0" />
                        <span className="truncate">{member.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside card: Direct Zalo & Phone */}
                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ueh group-hover:underline">
                      Xem hồ sơ
                    </span>
                    {member.phone && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {member.phone.slice(0, 4)}***
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {filteredList.length > visibleCount && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-ueh hover:text-ueh transition-all"
                >
                  <ChevronDown size={14} />
                  Xem thêm ({filteredList.length - visibleCount} cựu sinh viên còn lại)
                </button>
              </div>
            )}
          </>
        )}

      </div>

      {/* Modal Profile with Direct Zalo Link & Phone Call */}
      {viewingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewingMember(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingMember(null)}
              className="absolute right-3.5 top-3.5 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ueh to-ueh-light text-2xl font-black text-white shadow-md">
                {viewingMember.name.trim().charAt(viewingMember.name.trim().lastIndexOf(" ") + 1)}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{viewingMember.name}</h3>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-ueh border border-blue-100">
                <GraduationCap size={13} /> Lớp {viewingMember.class} - K33 UEH
              </div>
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Chức danh:</span>
                <p className="font-bold text-slate-800">{viewingMember.job}</p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Công ty:</span>
                <p className="font-bold text-slate-800">{viewingMember.company}</p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Nơi ở:</span>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <MapPin size={12} className="text-rose-500" /> {viewingMember.location}
                </p>
              </div>

              {viewingMember.phone && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Số điện thoại / Zalo:</span>
                  <p className="font-bold text-slate-900 font-mono">{viewingMember.phone}</p>
                </div>
              )}

              {viewingMember.bio && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Giới thiệu:</span>
                  <p className="text-slate-600 italic mt-0.5 leading-relaxed">
                    "{viewingMember.bio}"
                  </p>
                </div>
              )}
            </div>

            {/* Direct Zalo Link & Phone Call Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <a
                href={
                  viewingMember.phone
                    ? `https://zalo.me/${viewingMember.phone.replace(/[^0-9]/g, "")}`
                    : ZALO_GROUP_URL
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zalo py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <MessageCircle size={15} /> Nhắn Zalo
              </a>

              {viewingMember.phone && (
                <a
                  href={`tel:${viewingMember.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  <Phone size={14} /> Gọi Điện
                </a>
              )}
            </div>

            <div className="mt-2 text-center">
              <button
                onClick={() => setViewingMember(null)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
