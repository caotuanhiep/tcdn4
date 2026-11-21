"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Sparkles, 
  Quote,
  Feather,
  PenTool,
  PartyPopper,
  Lock,
  LogIn
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";

interface GuestbookEntry {
  id: string;
  name: string;
  className: string;
  time: string;
  message: string;
  likes: number;
}

const INITIAL_MESSAGES: GuestbookEntry[] = [];

export default function GuestbookSection() {
  const toast = useToast();
  const { user, profile, openLogin } = useAuth();
  const [messages, setMessages] = useState<GuestbookEntry[]>(INITIAL_MESSAGES);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("TC10");
  const [message, setMessage] = useState("");
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isHoveredForm, setIsHoveredForm] = useState(false);

  // Tự động điền Họ và tên và Lớp theo tài khoản đăng nhập
  useEffect(() => {
    if (user) {
      const autoName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      if (autoName) setName(autoName);
      if (profile?.class_name) setClassName(profile.class_name);
    }
  }, [user, profile]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tcdn4_guestbook");
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveMessages = (newMessages: GuestbookEntry[]) => {
    setMessages(newMessages);
    try {
      localStorage.setItem("tcdn4_guestbook", JSON.stringify(newMessages));
    } catch {}
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Vui lòng nhập tên của bạn và nội dung lời nhắn!");
      return;
    }

    const newEntry: GuestbookEntry = {
      id: `gb-${Date.now()}`,
      name: name.trim(),
      className,
      time: "Vừa xong",
      message: message.trim(),
      likes: 1,
    };

    const updated = [newEntry, ...messages];
    saveMessages(updated);
    toast.success("Đã ghi lời nhắn vào sổ lưu bút thành công!");

    setName("");
    setMessage("");
  };

  const handleToggleLike = (id: string) => {
    const isLiked = likedIds.includes(id);
    const updated = messages.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          likes: isLiked ? m.likes - 1 : m.likes + 1,
        };
      }
      return m;
    });

    saveMessages(updated);
    if (isLiked) {
      setLikedIds(likedIds.filter((item) => item !== id));
    } else {
      setLikedIds([...likedIds, id]);
    }
  };

  return (
    <section id="guestbook" className="scroll-mt-16 bg-slate-50/70 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Khung Card xanh lá đậm nổi bật, không tràn viền toàn trang */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#043E30] to-[#022C22] p-6 sm:p-10 md:p-12 border border-emerald-500/30 shadow-2xl text-white">
          {/* Background Subtle Leaf/Sparkle Pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#34d399 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
          <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />

          {/* Section Header */}
          <div className="relative mb-10 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2.5 backdrop-blur-md">
              <Feather size={14} className="text-amber-300 animate-bounce" /> Lưu Giữ Kỷ Niệm 15 Năm
            </div>
            <h2 className="text-3xl font-black text-white sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Sổ Lưu Bút TCDN4
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400" />
            <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Dành cho anh chị em ở xa hoặc không thể về dự họp mặt gửi lời chúc, tâm tình và lời nhắn gửi đến lớp cũ.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            
            {/* CỘT TRÁI: FORM GỬI LƯU BÚT ĐƯỢC THIẾT KẾ HIỆU ỨNG THẺ PHONG THƯ */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-emerald-400/25 bg-emerald-950/50 p-6 sm:p-7 backdrop-blur-xl shadow-xl transition-all hover:border-emerald-400/40">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-900 shadow-md">
                    <PenTool size={18} />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">Gửi Lưu Bút & Lời Chúc</h3>
                    <p className="text-xs text-emerald-300/80">Lời nhắn sẽ lưu trữ mãi mãi trên website</p>
                  </div>
                </div>

                {!user ? (
                  /* Yêu cầu đăng nhập để gửi lưu bút theo yêu cầu */
                  <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-6 text-center backdrop-blur-md">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-inner">
                      <Lock size={22} />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      Yêu cầu đăng nhập để gửi lưu bút
                    </h4>
                    <p className="text-xs text-emerald-100/80 leading-relaxed mb-4 max-w-xs mx-auto">
                      Vui lòng đăng nhập để hệ thống tự động xác thực Họ Tên, Lớp của bạn và lưu giữ tâm tình vào sổ lưu bút 15 năm.
                    </p>
                    <button
                      onClick={openLogin}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all hover:scale-102"
                    >
                      <LogIn size={15} /> Đăng nhập tài khoản cựu sinh viên
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                        Họ và tên của bạn:
                      </label>
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-black/40 px-3.5 py-2.5 text-xs sm:text-sm text-white">
                        <span className="font-bold">{name || "Cựu sinh viên"}</span>
                        <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40">
                          ✓ Tự động điền theo tài khoản
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                        Lớp cựu sinh viên:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["TC10", "TC11", "TC12"] as const).map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setClassName(cls)}
                            className={`rounded-xl py-2 text-xs font-bold transition-all border ${
                              className === cls
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-300 shadow-md scale-102"
                                : "bg-white/5 text-emerald-100 border-white/10 hover:bg-white/10"
                            }`}
                          >
                            Lớp {cls}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-200 mb-1.5">
                        Tâm tư, lời chúc hoặc kỷ niệm xưa:
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Viết vài dòng nhắn nhủ gửi tới bạn bè TC10, TC11, TC12..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full rounded-xl border border-emerald-500/30 bg-black/30 p-3 text-xs sm:text-sm text-white placeholder-emerald-200/50 focus:border-emerald-400 focus:bg-black/50 focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs sm:text-sm font-bold text-slate-950 font-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 hover:scale-[1.01] transition-all"
                    >
                      <Send size={15} /> Gửi lời nhắn vào sổ lưu bút
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: DANH SÁCH LƯU BÚT */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between text-xs text-emerald-200 px-1">
                <span>Đang hiển thị {messages.length} tâm tình từ cựu sinh viên</span>
                <span className="flex items-center gap-1 font-semibold text-amber-300">
                  <Sparkles size={13} /> Lưu giữ thanh xuân
                </span>
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3.5 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-8 text-center text-emerald-100/80 backdrop-blur-md">
                    <Feather className="mx-auto h-8 w-8 text-emerald-400/60 mb-2" />
                    <p className="text-sm font-semibold text-white">Chưa có lời nhắn nào</p>
                    <p className="text-xs text-emerald-200/70 mt-1">Hãy là người đầu tiên gửi lời chúc và chia sẻ kỷ niệm vào sổ lưu bút!</p>
                  </div>
                ) : (
                  messages.map((item) => {
                    const isLiked = likedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl border border-emerald-500/20 bg-emerald-950/35 p-4 sm:p-5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-950/50 hover:shadow-xl hover:-translate-y-0.5"
                      >
                        {/* Top: Name & Class & Time */}
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-xs font-black text-white shadow-xs">
                              {item.name.charAt(item.name.lastIndexOf(" ") + 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors">
                                  {item.name}
                                </span>
                                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                                  {item.className}
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-200/70">{item.time}</span>
                            </div>
                          </div>

                          {/* Nút Like thả tim */}
                          <button
                            onClick={() => handleToggleLike(item.id)}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                              isLiked
                                ? "bg-rose-500 text-white shadow-xs"
                                : "bg-emerald-900/40 text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
                            }`}
                          >
                            <Heart
                              size={13}
                              className={isLiked ? "fill-white text-white" : "text-rose-400"}
                            />
                            <span>{item.likes}</span>
                          </button>
                        </div>

                        {/* Nội dung lưu bút */}
                        <div className="relative pl-3 border-l-2 border-emerald-400/40 my-2">
                          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-normal">
                            "{item.message}"
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
