"use client";

import { useEffect, useState } from "react";
import { Download, Bell, X, Smartphone, Check } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function PWAInstaller() {
  const toast = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // registered
        })
        .catch((err) => {
          console.log("SW registration error:", err);
        });
    }

    // Check notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Listen for beforeinstallprompt event
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.success("Để cài đặt trên iOS: Bấm nút Chia sẻ (Share) -> chọn 'Thêm vào MH chính' (Add to Home Screen)!");
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

  const handleEnablePush = async () => {
    if (!("Notification" in window)) {
      toast.error("Trình duyệt không hỗ trợ thông báo đẩy!");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast.success("Đã bật thông báo đẩy thành công! Bạn sẽ nhận tin khi có sự kiện mới.");
      // Trigger a test notification via Service Worker
      if (navigator.serviceWorker.controller) {
        new Notification("TCDN4 Alumni Hub", {
          body: "Chào mừng bạn! Thông báo đẩy đã được kích hoạt thành công.",
          icon: "/favicon.ico",
        });
      }
    } else {
      toast.error("Bạn đã từ chối nhận thông báo.");
    }
  };

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative flex items-center gap-2.5 rounded-2xl border border-blue-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 text-xs shadow-2xs"
          title="Đóng"
        >
          ✕
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ueh text-white shadow-2xs">
          <Smartphone size={18} />
        </div>

        <div className="flex-1 text-left">
          <div className="text-[11px] font-bold text-slate-900 leading-tight">
            Cài đặt App TCDN4
          </div>
          <div className="text-[10px] text-slate-500">
            Truy cập nhanh & nhận tin đẩy
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 rounded-xl bg-ueh px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-ueh-light transition-colors"
          >
            <Download size={12} /> Cài đặt
          </button>

          {notificationPermission !== "granted" && (
            <button
              onClick={handleEnablePush}
              title="Bật nhận thông báo"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
            >
              <Bell size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
