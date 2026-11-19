"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  ImageIcon, 
  Calendar, 
  UserCircle2, 
  LogIn,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export default function MobileBottomNav() {
  const { user, openLogin, openProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("directory");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      const sections = [
        { id: "committee", key: "committee" },
        { id: "guestbook", key: "guestbook" },
        { id: "memories", key: "memories" },
        { id: "directory", key: "directory" },
        { id: "event", key: "event" },
      ];

      for (const sec of sections) {
        const el = document.getElementById(sec.id);
        if (el && scrollPos >= el.offsetTop) {
          setActiveTab(sec.key);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveTab(id);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Thanh Menu điều hướng cố định chân trang (Nền cam nhẹ ấm cúng) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-200/90 bg-[#FFF7ED]/95 px-2 py-1.5 backdrop-blur-lg shadow-lg md:hidden">
        <div className="flex items-center justify-around">
          
          {/* 1. Danh bạ K33 */}
          <button
            onClick={() => scrollTo("directory")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "directory"
                ? "text-ueh font-black scale-105"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            <Users size={18} className={activeTab === "directory" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Danh bạ</span>
          </button>

          {/* 2. Kỷ niệm */}
          <button
            onClick={() => scrollTo("memories")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "memories"
                ? "text-ueh font-black scale-105"
                : "text-slate-600 hover:text-slate-900 font-semibold"
            }`}
          >
            <ImageIcon size={18} className={activeTab === "memories" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Kỷ niệm</span>
          </button>

          {/* 3. Gặp mặt 15 năm (Gọn gàng trong thanh menu, màu cam ấm nhẹ hài hòa) */}
          <button
            onClick={() => scrollTo("event")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "event"
                ? "text-ueh-orange font-black bg-orange-100/70 scale-105"
                : "text-ueh-orange font-bold hover:bg-orange-100/50"
            }`}
          >
            <Calendar size={18} className="stroke-[2.2] text-ueh-orange" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">Gặp mặt 15N</span>
          </button>

          {/* 4. Vào Zalo (Thiết kế thanh lịch, không quá nổi bật) */}
          <a
            href={ZALO_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-600 hover:text-[#0068FF] font-semibold transition-all group"
          >
            <svg className="w-[18px] h-[18px] text-[#0068FF]/80 transition-transform group-hover:scale-105" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.93.55 3.73 1.5 5.25L2.2 21.8c-.14.42.25.81.67.67l4.55-1.3c1.52.95 3.32 1.5 5.25 1.5 5.52 0 10-4.48 10-10S17.52 2 12 2zm1.6 13.5h-4.2c-.55 0-1-.45-1-1v-.2c0-.26.11-.52.29-.71l3.21-3.29H9.4c-.55 0-1-.45-1-1v-.3c0-.55.45-1 1-1h4.2c.55 0 1 .45 1 1v.2c0 .26-.11.52-.29.71l-3.21 3.29h2.5c.55 0 1 .45 1 1v.3c0 .55-.45 1-1 1z"/>
            </svg>
            <span className="text-[10px] mt-0.5">Zalo</span>
          </a>

          {/* 5. Tài khoản / Đăng nhập */}
          {user ? (
            <button
              onClick={openProfile}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-700 font-semibold transition-all"
            >
              <UserCircle2 size={18} className="stroke-[2.2] text-ueh" />
              <span className="text-[10px] mt-0.5">Hồ sơ</span>
            </button>
          ) : (
            <button
              onClick={openLogin}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-700 font-semibold transition-all"
            >
              <LogIn size={18} className="stroke-[2.2] text-ueh" />
              <span className="text-[10px] mt-0.5">Đăng nhập</span>
            </button>
          )}

        </div>
      </nav>
    </>
  );
}
