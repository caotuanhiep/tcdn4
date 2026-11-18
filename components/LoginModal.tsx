"use client";

import { useState } from "react";
import { GraduationCap, Loader2, X, ShieldCheck } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) {
        toast.error(`Không thể kết nối Google: ${error.message}`);
        setBusy(false);
      }
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message || "Vui lòng thử lại"}`);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 sm:p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-lg bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-xl bg-ueh shadow-md">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Đăng Nhập Alumni Hub</h3>
          <p className="mt-1 text-xs text-slate-500">Dành riêng cho cựu sinh viên TCDN4 - K33 UEH</p>
        </div>

        <div className="space-y-4">
          {/* Nút đăng nhập duy nhất bằng Google - Đơn giản & chuẩn xác */}
          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400 disabled:opacity-60 shadow-xs"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-ueh" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Tiếp tục với Google
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Đăng nhập bảo mật qua Google Workspace / Gmail</span>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400 leading-relaxed">
          Bằng việc đăng nhập, bạn đồng ý với Quy chế hoạt động của Mạng lưới Cựu sinh viên TCDN4 K33 UEH.
        </p>
      </div>
    </div>
  );
}
