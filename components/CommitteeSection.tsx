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
import { CommitteeMember, DEFAULT_COMMITTEE_MEMBERS, getCommitteeMembers } from "@/lib/committee";

export default function CommitteeSection() {
  const [members, setMembers] = useState<CommitteeMember[]>(DEFAULT_COMMITTEE_MEMBERS);

  useEffect(() => {
    setMembers(getCommitteeMembers());
  }, []);
  return (
    <section id="committee" className="scroll-mt-16 bg-white py-14 sm:py-20 border-t border-slate-200/80">
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
            Đội ngũ đại diện kết nối cho 3 lớp <strong className="text-[#003B5C]">TC10 - TC11 - TC12</strong>. Mọi thắc mắc về chương trình 15 năm, đóng góp kỷ niệm hoặc đăng ký kiosk, xin vui lòng liên hệ ban liên lạc.
          </p>
        </div>

        {/* Grid Ban Liên Lạc 2 CỘT TRÊN MOBILE - Bo góc vừa vặn rounded-2xl */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:border-[#003B5C]/30 hover:shadow-lg"
            >
              <div>
                {/* Badge top */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#003B5C]/10 px-2 py-0.5 text-[10px] font-bold text-[#003B5C]">
                    <GraduationCap size={11} /> {member.className}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 border border-amber-200/60">
                    {member.badge}
                  </span>
                </div>

                {/* Avatar & Info */}
                <div className="text-center mb-2.5">
                  <div className={`mx-auto mb-2 flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl ${member.avatarColor || "bg-gradient-to-br from-[#003B5C] to-[#0068FF]"} text-white font-black text-base sm:text-xl shadow-xs group-hover:scale-105 transition-transform overflow-hidden`}>
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      member.name.charAt(member.name.lastIndexOf(" ") + 1)
                    )}
                  </div>
                  <h3 className="text-xs sm:text-base font-black text-slate-900 group-hover:text-[#003B5C] transition-colors line-clamp-1">
                    {member.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-[#E06D53] mt-0.5 uppercase tracking-wide line-clamp-1">
                    {member.role}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2 hidden sm:block">
                    {member.duty}
                  </p>
                </div>
              </div>

              {/* 2 Nút Gọi điện & Zalo NẰM CHUNG 1 HÀNG TRÊN CẢ MOBILE LẪN DESKTOP */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center gap-1.5">
                <a
                  href={`tel:${member.phone.replace(/\s+/g, "")}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-white border border-slate-200 py-1.5 px-1.5 text-[10px] sm:text-xs font-bold text-slate-700 hover:border-[#003B5C] hover:text-[#003B5C] transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Phone size={11} className="text-[#003B5C]" /> Gọi điện
                </a>
                <a
                  href={`https://zalo.me/${member.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#0068FF] py-1.5 px-1.5 text-[10px] sm:text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <MessageCircle size={11} /> Nhắn Zalo
                </a>
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
