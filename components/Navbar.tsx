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
  X 
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProfileModal from "@/components/ProfileModal";

const NAV_ITEMS = [
  { href: "#event", label: "Sự kiện", icon: Calendar },
  { href: "#directory", label: "Danh bạ", icon: Users },
  { href: "#memories", label: "Kỷ niệm", icon: ImageIcon },
  { href: "#guestbook", label: "Lưu bút", icon: MessageSquare },
  { href: "#business", label: "Kiosk", icon: Store, isSubtle: true },
];

export default function Navbar() {
  const { user, profile, loading, isAdmin, openLogin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="group flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ueh shadow-md transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-ueh leading-tight sm:text-xl">
                TCDN4<span className="ml-1 font-semibold text-blue-500">K33</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-slate-400">
                UEH Alumni Hub
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden items-center gap-5 md:flex lg:gap-6">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => scrollTo(item.href)}
                  className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                    item.isSubtle
                      ? "text-slate-400 hover:text-ueh"
                      : "text-slate-600 hover:text-ueh"
                  }`}
                >
                  <Icon size={15} className={item.isSubtle ? "opacity-60" : "text-blue-500"} />
                  {item.label}
                </button>
              );
            })}

            <div className="h-4 w-px bg-slate-200" />

            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Menu tài khoản"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ueh font-bold text-white ring-2 ring-white shadow-md hover:ring-blue-200 transition-all"
                >
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
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="border-b border-slate-100 px-4 pb-3 pt-1">
                      <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setProfileOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <UserCircle2 size={16} className="text-blue-600" /> Hồ sơ & Đổi Avatar
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        scrollTo("#directory");
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Users size={16} /> Danh bạ cựu sinh viên
                    </button>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <LayoutDashboard size={16} className="text-purple-600" /> Trang quản trị
                      </Link>
                    )}

                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="flex items-center gap-1.5 rounded-full bg-ueh px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition-all hover:bg-blue-800"
              >
                <LogIn size={15} /> Đăng nhập
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            {!user ? (
              <button
                onClick={openLogin}
                className="flex items-center gap-1 rounded-full bg-ueh px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                <LogIn size={13} /> Đăng nhập
              </button>
            ) : (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ueh text-xs font-bold text-white shadow-xs"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </button>
            )}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle Menu"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-ueh"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-xl md:hidden animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => scrollTo(item.href)}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-ueh"
                  >
                    <Icon size={16} className="text-blue-500" />
                    {item.label}
                  </button>
                );
              })}
              {user ? (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <div className="px-4 py-1 text-xs font-bold uppercase text-slate-400">
                    Tài khoản: {name}
                  </div>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setProfileOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle2 size={16} className="text-blue-600" /> Hồ sơ cá nhân
                  </button>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard size={16} className="text-purple-600" /> Quản trị viên
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </nav>

      {/* Modal Profile */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  );
}
