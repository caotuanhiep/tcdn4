"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GraduationCap, ImageIcon, LayoutDashboard, LogIn, LogOut, Menu, Users, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const LINKS = [
  { href: "/#map", label: "Hành trình" },
  { href: "/#business", label: "Doanh nghiệp" },
  { href: "/directory", label: "Danh bạ" },
  { href: "/gallery", label: "Ký ức" },
];

export default function Navbar() {
  const { user, profile, loading, isAdmin, openLogin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const name = profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Alumni";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ueh shadow-md transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-ueh">
            TCDN4<span className="ml-1 font-light text-blue-500">Hub</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium text-slate-600 transition-colors hover:text-ueh">
              {l.label}
            </Link>
          ))}

          {loading ? (
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu tài khoản"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ueh font-bold text-white ring-2 ring-white shadow-md"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  initial
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white py-2 shadow-xl">
                  <div className="border-b border-slate-100 px-4 pb-3 pt-1">
                    <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <MenuLink href="/directory" icon={<Users size={16} />} onClick={() => setMenuOpen(false)}>Danh bạ</MenuLink>
                  <MenuLink href="/gallery" icon={<ImageIcon size={16} />} onClick={() => setMenuOpen(false)}>Ký ức</MenuLink>
                  {isAdmin && (
                    <MenuLink href="/admin" icon={<LayoutDashboard size={16} />} onClick={() => setMenuOpen(false)}>Quản trị</MenuLink>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLogin}
              className="flex items-center gap-2 rounded-full bg-ueh px-5 py-2.5 font-semibold text-white shadow-md shadow-blue-900/20 transition-all hover:bg-blue-800"
            >
              <LogIn size={18} /> Đăng nhập
            </button>
          )}
        </div>

        <button
          className="text-ueh md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Mở menu"
        >
          {mobileOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute w-full border-t border-slate-100 bg-white shadow-lg md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-4 py-3 font-medium text-slate-700 hover:bg-slate-50">
                Quản trị
              </Link>
            )}
            {user ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-left font-bold text-rose-600"
              >
                <LogOut size={18} /> Đăng xuất ({name})
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  openLogin();
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-left font-bold text-ueh"
              >
                <LogIn size={18} /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
      {icon} {children}
    </Link>
  );
}
