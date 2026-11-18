"use client";

import { useEffect, useState } from "react";
import { 
  Home, 
  Calendar, 
  Users, 
  ImageIcon, 
  MessageSquare, 
  UserCircle2, 
  LogIn 
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProfileModal from "@/components/ProfileModal";

export default function MobileBottomNav() {
  const { user, openLogin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      const sections = [
        { id: "business", key: "business" },
        { id: "guestbook", key: "guestbook" },
        { id: "memories", key: "memories" },
        { id: "directory", key: "directory" },
        { id: "event", key: "event" },
        { id: "home", key: "home" },
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
          
          {/* Trang chủ */}
          <button
            onClick={() => scrollTo("home")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "home"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <Home size={19} className={activeTab === "home" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Trang chủ</span>
          </button>

          {/* Sự kiện 15 Năm */}
          <button
            onClick={() => scrollTo("event")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "event"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <Calendar size={19} className={activeTab === "event" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Sự kiện</span>
          </button>

          {/* Danh bạ K33 */}
          <button
            onClick={() => scrollTo("directory")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "directory"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <Users size={19} className={activeTab === "directory" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Danh bạ</span>
          </button>

          {/* Kỷ niệm */}
          <button
            onClick={() => scrollTo("memories")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "memories"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <ImageIcon size={19} className={activeTab === "memories" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Kỷ niệm</span>
          </button>

          {/* Lưu bút */}
          <button
            onClick={() => scrollTo("guestbook")}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === "guestbook"
                ? "text-ueh font-black scale-105"
                : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
          >
            <MessageSquare size={19} className={activeTab === "guestbook" ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="text-[10px] mt-0.5">Lưu bút</span>
          </button>

          {/* Tài khoản / Đăng nhập */}
          {user ? (
            <button
              onClick={() => setProfileOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-ueh-orange font-bold transition-all"
            >
              <UserCircle2 size={19} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5">Hồ sơ</span>
            </button>
          ) : (
            <button
              onClick={openLogin}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-ueh font-bold transition-all"
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
