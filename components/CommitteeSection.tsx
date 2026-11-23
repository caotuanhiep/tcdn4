"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  HeartHandshake, 
  Phone, 
  Mail, 
  MessageCircle, 
  ShieldCheck, 
  GraduationCap
} from "lucide-react";
import { CommitteeMember, DEFAULT_COMMITTEE_MEMBERS } from "@/lib/committee";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { DATA_UPDATED_EVENT } from "@/lib/api";
import { getAvatarInitials } from "@/lib/avatar";

export default function CommitteeSection() {
  const { user, openLogin } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState<CommitteeMember[]>(DEFAULT_COMMITTEE_MEMBERS);

  useEffect(() => {
    let active = true;
    async function loadCommittee() {
      try {
        const res = await fetch(`/api/settings/committee?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.success && Array.isArray(data.members) && data.members.length > 0) {
          setMembers(data.members);
        }
      } catch {}
    }

    void loadCommittee();
    const onUpdate = () => void loadCommittee();
    window.addEventListener(DATA_UPDATED_EVENT, onUpdate);
    return () => {
      active = false;
      window.removeEventListener(DATA_UPDATED_EVENT, onUpdate);
    };
  }, []);
  return (
    <section id="committee" className="scroll-mt-16 bg-gradient-to-b from-white via-slate-50/50 to-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề Cực To */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-bold text-[#003B5C] uppercase tracking-wider mb-2.5">
            <HeartHandshake size={14} className="text-[#E06D53]" /> Đại diện cựu sinh viên
          </div>
          <h2 className="text-3xl font-black text-[#003B5C] sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Ban Liên Lạc TCDN4
          </h2>
          <div className="mx-auto mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-[#003B5C] via-[#0068FF] to-[#E06D53]" />
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
            Đội ngũ đại diện kết nối cho 3 lớp <strong className="text-[#003B5C]">TC10 - TC11 - TC12</strong>. Mọi thắc mắc về chương trình 15 năm hoặc đóng góp kỷ niệm, xin vui lòng liên hệ ban liên lạc.
          </p>
        </div>

        {/* Grid Ban Liên Lạc: Ảnh vuông ở trên, Tên và Vai trò bên dưới */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border-2 border-slate-200/90 bg-white p-2.5 sm:p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-ueh/50 hover:shadow-xl shadow-xs"
            >
              <div>
                {/* 1. Ảnh vuông nằm ở trên cùng của thẻ */}
                <div className={`relative aspect-square w-full rounded-xl sm:rounded-2xl ${member.avatarColor || "bg-gradient-to-br from-[#003B5C] to-[#0068FF]"} text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-inner group-hover:scale-[1.02] transition-transform overflow-hidden mb-3 border border-slate-100`}>
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getAvatarInitials(member.name)}</span>
                  )}

                  {/* Floating Badges trên ảnh vuông */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-ueh/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      <GraduationCap size={11} /> {member.className}
                    </span>
                  </div>
                  {member.badge && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-lg bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-white shadow-xs">
                        {member.badge}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Bên dưới là Tên, Vai trò và Nhiệm vụ */}
                <div className="text-left px-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-ueh transition-colors line-clamp-1">
                    {member.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-ueh-orange mt-0.5 uppercase tracking-wide line-clamp-1">
                    {member.role}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {member.duty}
                  </p>
                </div>
              </div>

              {/* 3. Nút Gọi điện & Nhắn Zalo ở chân thẻ */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                {member.phone ? (
                  user ? (
                    <>
                      <a
                        href={`tel:${member.phone.replace(/\s+/g, "")}`}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 border border-slate-200 py-2 px-1 text-[11px] sm:text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh transition-colors shadow-2xs whitespace-nowrap"
                      >
                        <Phone size={12} className="text-ueh" /> Gọi điện
                      </a>
                      <a
                        href={`https://zalo.me/${member.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#0068FF] py-2 px-1 text-[11px] sm:text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap"
                      >
                        <MessageCircle size={12} /> Nhắn Zalo
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        toast.error("Vui lòng đăng nhập tài khoản cựu sinh viên để xem liên hệ Ban liên lạc!");
                        openLogin();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-1 text-[10px] font-bold text-slate-500 hover:text-ueh hover:bg-blue-50 transition-colors"
                    >
                      <span>🔒 Đăng nhập xem liên hệ</span>
                    </button>
                  )
                ) : (
                  <span className="w-full text-center py-2 text-[11px] font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                    SĐT đang cập nhật
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ghi chú chân trang */}
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-center text-xs text-slate-600 sm:flex sm:items-center sm:justify-between sm:text-left shadow-2xs">
          <div className="flex items-center justify-center gap-2 mb-2 sm:mb-0">
            <ShieldCheck size={16} className="text-[#003B5C] shrink-0" />
            <span>Ban liên lạc cam kết minh bạch thu chi và bảo mật tuyệt đối danh bạ cựu sinh viên.</span>
          </div>
          <a
            href="https://zalo.me/g/yodibu606"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#0068FF] hover:underline shrink-0"
          >
            Tham gia Nhóm Zalo K33 →
          </a>
        </div>

      </div>
    </section>
  );
}
