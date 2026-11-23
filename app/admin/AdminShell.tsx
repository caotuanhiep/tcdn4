"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ImageIcon, Loader2, Users, ArrowLeft, Bot, CreditCard, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ImagesPanel from "./ImagesPanel";
import UsersPanel from "./UsersPanel";
import RegistrationsPanel from "./RegistrationsPanel";
import ZaloBotSettings from "./ZaloBotSettings";
import PaymentSettingsPanel from "./PaymentSettingsPanel";
import CommitteePanel from "./CommitteePanel";

type Tab = "registrations" | "users" | "zalobot" | "payment" | "committee" | "images";

const TABS = [
  { id: "registrations" as Tab, label: "Đăng ký 15 Năm", icon: CalendarCheck },
  { id: "users" as Tab, label: "Danh bạ cựu sinh viên", icon: Users },
  { id: "zalobot" as Tab, label: "Đấu nối Bot Zalo", icon: Bot },
  { id: "payment" as Tab, label: "Cấu hình Ngân hàng & QR", icon: CreditCard },
  { id: "committee" as Tab, label: "Ban Liên Lạc", icon: HeartHandshake },
  { id: "images" as Tab, label: "Quản lý hình ảnh", icon: ImageIcon },
];

export default function AdminShell() {
  const { user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("registrations");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set<Tab>([tab]));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  // Client-side guard
  useEffect(() => {
    if (!mounted) return;
    if (!loading && (!user || (profile && !isAdmin) || (!profile && user))) {
      router.replace("/");
    }
  }, [mounted, loading, user, profile, isAdmin, router]);

  if (!mounted || loading || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ueh">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3.5 sm:px-4 py-6 md:py-8 md:flex-row w-full overflow-x-hidden md:overflow-x-visible">
      {/* Sidebar / Mobile Tabs */}
      <aside className="w-full md:w-64 md:shrink-0">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm md:sticky md:top-24">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trang Quản Trị</p>
              <h2 className="text-base font-black text-ueh">TCDN4 Admin Hub</h2>
            </div>
            <Link
              href="/"
              className="p-1.5 text-slate-400 hover:text-ueh hover:bg-slate-50 rounded-lg transition-colors"
              title="Về trang chủ"
            >
              <ArrowLeft size={16} />
            </Link>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 md:mx-0 md:px-0 md:pb-0 md:flex-col md:overflow-visible">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all whitespace-nowrap md:w-full md:shrink ${
                  tab === id
                    ? "bg-ueh text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 bg-slate-50/70 md:bg-transparent"
                }`}
              >
                <Icon size={16} className={tab === id ? "text-ueh-gold" : "text-slate-400"} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <section className="min-w-0 flex-1">
        {visitedTabs.has("registrations") && (
          <div className={tab === "registrations" ? "block" : "hidden"}>
            <RegistrationsPanel />
          </div>
        )}
        {visitedTabs.has("users") && (
          <div className={tab === "users" ? "block" : "hidden"}>
            <UsersPanel />
          </div>
        )}
        {visitedTabs.has("zalobot") && (
          <div className={tab === "zalobot" ? "block" : "hidden"}>
            <ZaloBotSettings />
          </div>
        )}
        {visitedTabs.has("payment") && (
          <div className={tab === "payment" ? "block" : "hidden"}>
            <PaymentSettingsPanel />
          </div>
        )}
        {visitedTabs.has("committee") && (
          <div className={tab === "committee" ? "block" : "hidden"}>
            <CommitteePanel />
          </div>
        )}
        {visitedTabs.has("images") && (
          <div className={tab === "images" ? "block" : "hidden"}>
            <ImagesPanel />
          </div>
        )}
      </section>
    </div>
  );
}
