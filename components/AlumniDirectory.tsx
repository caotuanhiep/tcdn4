"use client";

import { useState, useMemo, useEffect } from "react";
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
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Baby,
  Heart,
  User
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { getAvatarInitials } from "@/lib/avatar";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export interface AlumniMember {
  id: string | number;
  name: string;
  class: "TC10" | "TC11" | "TC12";
  job: string;
  company: string;
  location: string;
  region: "hcm" | "hn" | "dn" | "other" | "overseas";
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  marital_status?: string;
  children_count?: number;
  is_verified?: boolean;
  role?: string;
}

const ALUMNI_LIST: AlumniMember[] = [];

interface AlumniDirectoryProps {
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export default function AlumniDirectory({
  selectedRegion = "all",
  onSelectRegion,
}: AlumniDirectoryProps) {
  const { user, profile, openLogin, openProfile } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [viewingMember, setViewingMember] = useState<AlumniMember | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [alumniList, setAlumniList] = useState<AlumniMember[]>([]);

  // Tải danh bạ thực tế từ bảng profiles trên Supabase và danh sách đã đăng ký
  useEffect(() => {
    let active = true;

    async function loadMembers() {
      const combinedMembers: AlumniMember[] = [];
      const seenNames = new Set<string>();
      const seenIds = new Set<string | number>();

      try {
        const { data, error } = await getSupabase()
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (active && !error && data && data.length > 0) {
          data.forEach((p: any) => {
            const memberName = p.full_name || "Thành viên K33";
            const memberId = p.id;
            if (memberId && seenIds.has(memberId)) return;
            if (memberId) seenIds.add(memberId);

            combinedMembers.push({
              id: memberId,
              name: memberName,
              class: (p.class_name as any) || "TC10",
              job: p.job_title || "Cựu sinh viên",
              company: p.company || "UEH Alumni",
              location: p.specific_location || (
                p.location_region === "hn" ? "Hà Nội" :
                (p.location_region === "dn" || p.location_region === "other") ? "Tỉnh khác" :
                p.location_region === "overseas" ? "Quốc tế" : "TP. Hồ Chí Minh"
              ),
              region: (p.location_region === "dn" ? "other" : (p.location_region as any)) || "hcm",
              phone: user ? (p.phone || "") : (p.phone ? "HIDDEN" : ""),
              avatar_url: p.avatar_url || "",
              bio: p.bio || "",
              marital_status: p.marital_status || "",
              children_count: p.children_count || 0,
              is_verified: true,
              role: p.role || "member",
            });
            seenNames.add(memberName.toLowerCase().trim());
          });
        }
      } catch {}

      // Đồng thời nạp danh sách cựu sinh viên đã đăng ký tham gia họp mặt 15 năm
      try {
        const stored = localStorage.getItem("tcdn4_registrations");
        if (stored) {
          const regs = JSON.parse(stored);
          regs.forEach((r: any) => {
            const rName = (r.fullName || "").trim();
            const rId = r.id || `reg-${rName}`;
            if (seenIds.has(rId)) return;
            if (rName && !seenNames.has(rName.toLowerCase())) {
              seenIds.add(rId);
              const regRegion: "hcm" | "hn" | "other" | "overseas" = 
                /Hà Nội|hn/i.test(r.address) ? "hn" :
                /Đà Nẵng|dn|Huế|Nha Trang|Cần Thơ|Hải Phòng|Bình Dương|Đồng Nai|Vũng Tàu|Lâm Đồng|Đà Lạt|Quảng Nam|Quy Nhơn/i.test(r.address) ? "other" :
                /Úc|Mỹ|USA|Singapore|Canada|Đức|Pháp|Nhật|Hàn|Australia/i.test(r.address) ? "overseas" : "hcm";

              combinedMembers.push({
                id: rId,
                name: rName,
                class: (r.className as any) || "TC10",
                job: "Cựu sinh viên",
                company: "TCDN4 K33",
                location: r.address || "TP. Hồ Chí Minh",
                region: regRegion,
                phone: user ? (r.phone || "") : (r.phone ? "HIDDEN" : ""),
                bio: `Đã đăng ký tham gia họp mặt 15 năm (Áo size: ${r.shirtSize || "L"})`,
                is_verified: r.status === "confirmed",
              });
              seenNames.add(rName.toLowerCase());
            }
          });
        }
      } catch {}

      if (active) {
        setAlumniList(combinedMembers);
      }
    }

    loadMembers();

    const handleUpdate = () => loadMembers();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("tcdn4_registration_updated", handleUpdate);
    window.addEventListener("tcdn4_profile_updated", handleUpdate);

    return () => {
      active = false;
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("tcdn4_registration_updated", handleUpdate);
      window.removeEventListener("tcdn4_profile_updated", handleUpdate);
    };
  }, [user, profile]);

  const handleRegionClick = (r: string) => {
    if (onSelectRegion) {
      onSelectRegion(r);
    }
  };

  const classCounts = useMemo(() => {
    return {
      all: alumniList.length,
      TC10: alumniList.filter((m) => m.class === "TC10").length,
      TC11: alumniList.filter((m) => m.class === "TC11").length,
      TC12: alumniList.filter((m) => m.class === "TC12").length,
    };
  }, [alumniList]);

  const regionCounts = useMemo(() => {
    return {
      all: alumniList.length,
      hcm: alumniList.filter((m) => m.region === "hcm").length,
      hn: alumniList.filter((m) => m.region === "hn").length,
      other: alumniList.filter((m) => m.region === "other" || (m.region as any) === "dn").length,
      overseas: alumniList.filter((m) => m.region === "overseas").length,
    };
  }, [alumniList]);

  const filteredList = useMemo(() => {
    return alumniList.filter((member) => {
      if (selectedRegion !== "all") {
        if (selectedRegion === "other") {
          if (member.region !== "other" && (member.region as any) !== "dn") return false;
        } else if (member.region !== selectedRegion) {
          return false;
        }
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
  }, [alumniList, selectedRegion, selectedClass, searchTerm]);

  const displayedList = filteredList.slice(0, visibleCount);

  return (
    <section id="directory" className="scroll-mt-16 bg-gradient-to-b from-white via-slate-100/70 to-white py-16 sm:py-24">
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

        {/* Search & Executive Filter Hub (Thiết kế chuyên nghiệp, Segmented Control sắc nét) */}
        <div className="mb-8 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm">
          {/* Ô tìm kiếm */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo họ tên, chức danh, công ty hoặc nơi ở..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(8);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-24 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-ueh focus:bg-white focus:outline-none focus:ring-2 focus:ring-ueh/20 transition-all shadow-inner"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            ) : (
              <span className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-slate-200/60 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {filteredList.length} thành viên
              </span>
            )}
          </div>

          {/* DÒNG 1: LỌC THEO LỚP - Segmented Control Cao Cấp */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-ueh flex items-center gap-1.5">
                <GraduationCap size={15} className="text-ueh-orange" /> Lọc theo Lớp
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Chọn lớp muốn xem</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 whitespace-nowrap">
              {[
                { id: "all", label: "Tất cả", count: classCounts.all },
                { id: "TC10", label: "Lớp TC10", count: classCounts.TC10 },
                { id: "TC11", label: "Lớp TC11", count: classCounts.TC11 },
                { id: "TC12", label: "Lớp TC12", count: classCounts.TC12 },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClass(c.id);
                    setVisibleCount(8);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 sm:px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                    selectedClass === c.id
                      ? "bg-ueh text-white shadow-md ring-1 ring-ueh"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-black ${
                    selectedClass === c.id ? "bg-white/20 text-white" : "bg-slate-200/90 text-slate-700"
                  }`}>
                    {c.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* DÒNG 2: LỌC THEO KHU VỰC - Segmented Control Cao Cấp */}
          <div>
            <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-ueh flex items-center gap-1.5">
                <MapPin size={15} className="text-rose-500" /> Lọc theo Khu Vực
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Nơi sinh sống & làm việc</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 whitespace-nowrap">
              {[
                { id: "all", label: "Tất cả", count: regionCounts.all, icon: Globe },
                { id: "hcm", label: "TP. Hồ Chí Minh", count: regionCounts.hcm, icon: MapPin },
                { id: "hn", label: "Hà Nội", count: regionCounts.hn, icon: MapPin },
                { id: "other", label: "Tỉnh khác", count: regionCounts.other, icon: MapPin },
                { id: "overseas", label: "Xuất ngoại", count: regionCounts.overseas, icon: Globe },
              ].map((reg) => {
                const Icon = reg.icon;
                return (
                  <button
                    key={reg.id}
                    onClick={() => {
                      handleRegionClick(reg.id);
                      setVisibleCount(8);
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                      selectedRegion === reg.id
                        ? "bg-ueh-light text-white shadow-md ring-1 ring-ueh-light"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    <Icon size={13} className={selectedRegion === reg.id ? "text-ueh-gold" : "text-slate-400"} />
                    <span>{reg.label}</span>
                    <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-black ${
                      selectedRegion === reg.id ? "bg-white/20 text-white" : "bg-slate-200/90 text-slate-700"
                    }`}>
                      {reg.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Directory Grid: 2 CỘT TRÊN MOBILE, 4 CỘT TRÊN DESKTOP, VIỀN RÕ RÀNG */}
        {alumniList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-blue-200 bg-white py-14 px-4 text-center shadow-xs">
            <Users className="mx-auto h-12 w-12 text-ueh/40 mb-3" />
            <h3 className="text-base font-bold text-ueh">Danh bạ Cựu Sinh Viên TCDN4 K33</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Chưa có thành viên nào trong danh bạ. Hãy đăng ký tham gia họp mặt hoặc cập nhật hồ sơ cá nhân để kết nối cùng bạn bè toàn khóa!
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  const eventEl = document.getElementById("event");
                  if (eventEl) eventEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-ueh px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-ueh-light transition-all"
              >
                Đăng ký Họp mặt 15 Năm
              </button>
              <button
                onClick={() => (user ? openProfile() : openLogin())}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-white transition-all"
              >
                <User size={13} /> {user ? "Cập nhật hồ sơ" : "Đăng nhập cập nhật"}
              </button>
            </div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-14 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">Không tìm thấy cựu sinh viên phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thử tìm kiếm với từ khóa hoặc bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {displayedList.map((member) => {
              // Viền thẻ rõ ràng, sắc nét và có phân biệt màu lớp
              const cardBorder = member.class === "TC10"
                ? "border-2 border-blue-200/90 hover:border-ueh"
                : member.class === "TC11"
                ? "border-2 border-amber-200/90 hover:border-ueh-orange"
                : "border-2 border-emerald-200/90 hover:border-emerald-600";

              const gradientBg = member.class === "TC10"
                ? "bg-gradient-to-br from-white via-sky-50/40 to-blue-50/50"
                : member.class === "TC11"
                ? "bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40"
                : "bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40";

              return (
                <div
                  key={member.id}
                  onClick={() => setViewingMember(member)}
                  className={`group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl ${cardBorder} ${gradientBg} p-2.5 sm:p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer`}
                >
                  {/* Top section: Avatar to bên trái, Thông tin bên phải */}
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Avatar lớn bên trái */}
                    <div className="relative flex h-14 w-14 sm:h-18 sm:w-18 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-ueh via-ueh-light to-ueh-orange text-white font-black text-base sm:text-2xl shadow-xs group-hover:scale-105 transition-transform overflow-hidden border-2 border-white">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getAvatarInitials(member.name)
                      )}
                      {user && user.id === member.id && (
                        <span className="absolute bottom-0.5 right-0.5 rounded-md bg-emerald-600 px-1 py-0.2 text-[8px] font-black text-white shadow-2xs">
                          Bạn
                        </span>
                      )}
                    </div>

                    {/* Thông tin cựu sinh viên bên phải */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
                        <div className="flex items-center gap-1">
                          <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-ueh border border-slate-200/90 shadow-2xs">
                            {member.class}
                          </span>
                          {(member.role === "committee" || member.role === "admin") && (
                            <span className="rounded-md bg-amber-500 text-white px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase shadow-2xs">
                              {member.role === "admin" ? "Admin" : "Ban liên lạc"}
                            </span>
                          )}
                        </div>
                        {member.is_verified && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#0068FF]">
                            <CheckCircle2 size={11} />
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-ueh transition-colors line-clamp-1">
                        {member.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-700 line-clamp-1 mt-0.5">
                        {member.job}
                      </p>
                      <p className="text-[9px] sm:text-[11px] text-slate-500 line-clamp-1">
                        {member.company}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Vị trí & Nút Zalo / Chi tiết */}
                  <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] text-slate-500 truncate max-w-[80px] sm:max-w-[130px]">
                      <MapPin size={10} className="text-rose-500 shrink-0" />
                      <span className="truncate">{member.location}</span>
                    </span>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {member.phone && (
                        user && member.phone !== "HIDDEN" ? (
                          <a
                            href={`https://zalo.me/${member.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg bg-white px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0068FF] border border-blue-200 hover:bg-blue-50 transition-colors shadow-2xs"
                          >
                            Zalo
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.error("Vui lòng đăng nhập tài khoản cựu sinh viên để xem Zalo & SĐT thành viên!");
                              openLogin();
                            }}
                            className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-slate-500 hover:text-ueh hover:bg-blue-50 transition-colors border border-slate-200"
                            title="Đăng nhập để xem Zalo"
                          >
                            🔒 Zalo
                          </button>
                        )
                      )}
                      <span className="text-[9px] sm:text-[10px] font-bold text-ueh group-hover:underline">
                        Xem →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button: Cộng thêm 8 thẻ (2 hàng) */}
        {filteredList.length > displayedList.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 8)}
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
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ueh to-ueh-light text-white font-black text-2xl shadow-md overflow-hidden">
                {viewingMember.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewingMember.avatar_url}
                    alt={viewingMember.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getAvatarInitials(viewingMember.name)
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xl font-black text-slate-900">{viewingMember.name}</h3>
                  {viewingMember.is_verified && (
                    <CheckCircle2 size={16} className="text-[#0068FF] shrink-0" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-ueh">
                    Lớp {viewingMember.class}
                  </span>
                  {(viewingMember.role === "committee" || viewingMember.role === "admin") && (
                    <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold border border-amber-300">
                      ★ {viewingMember.role === "admin" ? "Super Admin" : "Ban liên lạc TCDN4"}
                    </span>
                  )}
                  {viewingMember.marital_status && (
                    <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-ueh-orange">
                      {viewingMember.marital_status === "married" ? "Đã kết hôn" : "Độc thân"}
                    </span>
                  )}
                  {typeof viewingMember.children_count === "number" && viewingMember.children_count > 0 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {viewingMember.children_count} F1
                    </span>
                  )}
                </div>
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

            {user ? (
              <div className="flex gap-2">
                {viewingMember.phone && viewingMember.phone !== "HIDDEN" && (
                  <a
                    href={`tel:${viewingMember.phone.replace(/[^0-9]/g, "")}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 py-2.5 text-xs font-bold text-slate-800 hover:border-ueh hover:text-ueh transition-colors shadow-2xs"
                  >
                    <Phone size={14} className="text-emerald-600" /> Gọi điện
                  </a>
                )}
                {viewingMember.phone && viewingMember.phone !== "HIDDEN" ? (
                  <a
                    href={`https://zalo.me/${viewingMember.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0068FF] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    <MessageCircle size={14} /> Nhắn Zalo
                  </a>
                ) : (
                  <a
                    href={ZALO_GROUP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0068FF] py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    <MessageCircle size={14} /> Vào Zalo Lớp
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-center">
                <p className="text-xs font-semibold text-amber-900 mb-2">
                  🔒 Số điện thoại & Zalo chỉ hiển thị cho thành viên đã đăng nhập
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setViewingMember(null);
                    openLogin();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-ueh-light"
                >
                  Đăng nhập để xem số liên hệ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
