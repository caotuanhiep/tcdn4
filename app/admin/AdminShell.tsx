"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ImagesPanel from "./ImagesPanel";
import UsersPanel from "./UsersPanel";

type Tab = "images" | "users";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "images", label: "Quản lý hình ảnh", icon: ImageIcon },
  { id: "users", label: "Quản lý user", icon: Users },
];

export default function AdminShell() {
  const { user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("images");

  // Client-side guard (proxy.ts already enforces this on the server).
  useEffect(() => {
    if (!loading && (!user || (profile && !isAdmin) || (!profile && user))) router.replace("/");
  }, [loading, user, profile, isAdmin, router]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ueh">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="md:w-60 md:shrink-0">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:sticky md:top-24">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Admin Dashboard</p>
          <nav className="flex gap-2 md:flex-col">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition md:flex-none ${
                  tab === id ? "bg-ueh text-white shadow" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <section className="min-w-0 flex-1">{tab === "images" ? <ImagesPanel /> : <UsersPanel />}</section>
    </div>
  );
}
