"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Hero() {
  const { user, openLogin } = useAuth();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 to-white px-4 pb-20 pt-20 md:pb-28 md:pt-28">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-ueh shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-ueh" />
          </span>
          Kỷ niệm 15 năm - K33 UEH
        </div>
        <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-ueh md:text-7xl">
          15 Năm Hội Ngộ <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">TCDN4</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-slate-500 md:text-xl">
          Hành trình 15 năm từ những cô cậu sinh viên đến những chuyên gia. Nơi kết nối, chia sẻ ký ức và mở ra
          những cơ hội hợp tác mới cho tập thể TCDN4.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="#map"
            className="flex items-center justify-center gap-2 rounded-full bg-ueh px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            Khám phá hành trình <ChevronRight size={20} />
          </a>
          {user ? (
            <Link
              href="/directory"
              className="rounded-full border-2 border-slate-200 bg-white px-8 py-4 text-center text-lg font-bold text-slate-700 transition-all hover:border-ueh hover:text-ueh"
            >
              Mở danh bạ
            </Link>
          ) : (
            <button
              onClick={openLogin}
              className="rounded-full border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-700 transition-all hover:border-ueh hover:text-ueh"
            >
              Tham gia ngay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
