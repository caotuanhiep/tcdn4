"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  ImageIcon, 
  MessageSquare, 
  UserCircle2, 
  LogIn 
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProfileModal from "@/components/ProfileModal";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export default function MobileBottomNav() {
  const { user, openLogin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("directory");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      const sections = [
        { id: "business", key: "guestbook" },
        { id: "committee", key: "guestbook" },
        { id: "guestbook", key: "guestbook" },
        { id: "memories", key: "memories" },
        { id: "directory", key: "directory" },
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
      {/* Thanh Menu điều hướng cố định chân trang (App Bottom Navigation Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-lg shadow-lg md:hidden">
        <div className="flex items-center justify-around">
          
          {/* 1. Danh bạ K33 */}
          <button
            onClick={() => scrollTo("directory")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "directory"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <Users size={19} className={activeTab === "directory" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Danh bạ</span>
          </button>

          {/* 2. Kỷ niệm */}
          <button
            onClick={() => scrollTo("memories")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "memories"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <ImageIcon size={19} className={activeTab === "memories" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Kỷ niệm</span>
          </button>

          {/* 3. Lưu bút */}
          <button
            onClick={() => scrollTo("guestbook")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              activeTab === "guestbook"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <MessageSquare size={19} className={activeTab === "guestbook" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Lưu bút</span>
          </button>

          {/* 4. Vào Zalo (Link trực tiếp nhóm Zalo K33) */}
          <a
            href={ZALO_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[#0068FF] hover:opacity-90 font-bold transition-all group"
          >
            <div className="relative">
              <svg className="w-[19px] h-[19px] text-[#0068FF] drop-shadow-sm transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.93.55 3.73 1.5 5.25L2.2 21.8c-.14.42.25.81.67.67l4.55-1.3c1.52.95 3.32 1.5 5.25 1.5 5.52 0 10-4.48 10-10S17.52 2 12 2zm1.6 13.5h-4.2c-.55 0-1-.45-1-1v-.2c0-.26.11-.52.29-.71l3.21-3.29H9.4c-.55 0-1-.45-1-1v-.3c0-.55.45-1 1-1h4.2c.55 0 1 .45 1 1v.2c0 .26-.11.52-.29.71l-3.21 3.29h2.5c.55 0 1 .45 1 1v.3c0 .55-.45 1-1 1z"/>
              </svg>
              <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <span className="text-[10px] mt-0.5 font-bold text-[#0068FF]">Vào Zalo</span>
          </a>

          {/* 5. Tài khoản / Đăng nhập */}
          {user ? (
            <button
              onClick={() => setProfileOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-ueh-orange font-bold transition-all"
            >
              <UserCircle2 size={19} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5">Hồ sơ</span>
            </button>
          ) : (
            <button
              onClick={openLogin}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-ueh font-bold transition-all"
            >
              <LogIn size={19} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5">Đăng nhập</span>
            </button>
          )}

        </div>
      </nav>

      {/* Profile Modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
}
