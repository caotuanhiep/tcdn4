"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { 
  Calendar, 
  GraduationCap, 
  ImageIcon, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Store, 
  UserCircle2, 
  Users, 
  X,
  Smartphone,
  HeartHandshake
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import ProfileModal from "@/components/ProfileModal";

const NAV_ITEMS = [
  { href: "#event", label: "Sự kiện", icon: Calendar },
  { href: "#directory", label: "Danh bạ", icon: Users },
  { href: "#committee", label: "Ban liên lạc", icon: HeartHandshake },
  { href: "#memories", label: "Ký niệm", icon: ImageIcon },
  { href: "#guestbook", label: "Lưu bút", icon: MessageSquare },
  { href: "#business", label: "Kiosk", icon: Store, isSubtle: true },
];

export default function Navbar() {
  const { user, profile, loading, isAdmin, openLogin, openProfile, signOut } = useAuth();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      toast.success("Để cài đặt trên iPhone/iPad: Nhấn nút Chia sẻ (Share) trên Safari -> chọn 'Thêm vào MH chính' (Add to Home Screen)!");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      toast.success("Đã cài đặt TCDN4 Alumni Hub vào màn hình chính!");
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 15);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const scrollTo = (hash: string) => {
    setMobileOpen(false);
    const id = hash.replace("#", "");
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const name =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Alumni";
  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? "border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs"
            : "border-b border-slate-100 bg-white/85 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          
          {/* Logo Brand */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ueh shadow-md shadow-blue-900/20 transition-transform group-hover:scale-105">
              <GraduationCap className="h-6 w-6 text-white" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-ueh leading-none">
                TCDN4<span className="ml-1 font-bold text-ueh-orange">Hub</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                K33 • UEH 15 Năm
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden items-center gap-5 md:flex lg:gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className={`text-xs lg:text-sm font-bold transition-colors ${
                  item.isSubtle
                    ? "text-slate-400 hover:text-ueh"
                    : "text-slate-700 hover:text-ueh"
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* 8. Nút Icon Cài Đặt PWA trên Header cực kỳ gọn gàng */}
            <button
              onClick={handleInstallApp}
              title="Cài đặt App lên màn hình điện thoại / máy tính"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh hover:bg-white transition-all shadow-2xs"
            >
              <Smartphone size={14} className="text-[#0068FF]" />
              <span className="hidden lg:inline">Cài App</span>
            </button>

            {/* User Auth Info or Login Button */}
            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu tài khoản"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 hover:border-ueh transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ueh font-bold text-xs text-white shadow-xs">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      initial
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {name}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="border-b border-slate-100 px-4 pb-3 pt-1">
                      <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                      {profile?.class_name && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-ueh bg-blue-50 px-2 py-0.5 rounded">
                          Lớp {profile.class_name}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openProfile();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCircle2 size={16} className="text-ueh" /> Điểm danh & Hồ sơ
                    </button>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard size={16} className="text-ueh-orange" /> Quản trị Admin
                      </Link>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="flex items-center gap-2 rounded-full bg-ueh px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-900/20 transition-all hover:bg-ueh-light hover:shadow-lg"
              >
                <LogIn size={15} /> Đăng nhập
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Install Icon + Login Icon/Avatar + Hamburger */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={handleInstallApp}
              title="Cài đặt App"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[#0068FF] shadow-2xs"
            >
              <Smartphone size={17} />
            </button>

            {/* Icon Login hoặc Avatar trên Mobile Header */}
            {user ? (
              <button
                onClick={openProfile}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-ueh text-white font-bold text-xs shadow-2xs"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </button>
            ) : (
              <button
                onClick={openLogin}
                title="Đăng nhập"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-ueh text-white shadow-2xs"
              >
                <LogIn size={17} />
              </button>
            )}

            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-ueh focus:outline-none"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Mở menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl md:hidden">
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => scrollTo(item.href)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Icon size={17} className="text-ueh" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="my-2 border-t border-slate-100" />

              {user ? (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      openProfile();
                    }}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle2 size={17} className="text-ueh" />
                    <span>Hồ sơ cá nhân ({name})</span>
                  </button>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard size={17} className="text-ueh-orange" />
                      <span>Trang Quản trị Admin</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-left text-sm font-bold text-rose-600"
                  >
                    <LogOut size={17} />
                    <span>Đăng xuất</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    openLogin();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-ueh py-3 text-center text-sm font-bold text-white shadow-md shadow-blue-900/20"
                >
                  <LogIn size={17} />
                  <span>Đăng nhập Alumni Hub</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
