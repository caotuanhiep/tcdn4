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
  PartyPopper
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface GuestbookEntry {
  id: string;
  name: string;
  className: string;
  time: string;
  message: string;
  likes: number;
}

const INITIAL_MESSAGES: GuestbookEntry[] = [
  {
    id: "gb-1",
    name: "Lê Hoàng Cường",
    className: "TC12",
    time: "Hôm qua",
    message:
      "Tiếc quá đợt này mình đang công tác tại Hà Nội không bay về dự kịp ngày 12/12. Chúc tập thể lớp mình có một buổi họp mặt 15 năm thật ý nghĩa và nhiều niềm vui nhé! Mọi người đi nhớ quay chụp thật nhiều hình dìm hàng up lên nha!",
    likes: 14,
  },
  {
    id: "gb-2",
    name: "Hoàng Minh Em",
    className: "TC11",
    time: "2 ngày trước",
    message:
      "Gửi lời chào thân thương từ Sydney đến toàn thể anh chị em TC10 - TC11 - TC12! 15 năm trôi qua nhanh như một cái chớp mắt, vẫn nhớ như in những buổi trưa ngồi chép bài tại Canteen Cơ sở B. Chúc các bạn luôn dồi dào sức khỏe!",
    likes: 21,
  },
  {
    id: "gb-3",
    name: "Vũ Khánh Phương",
    className: "TC12",
    time: "3 ngày trước",
    message:
      "Dù cách xa nửa vòng trái đất ở California nhưng trái tim vẫn luôn hướng về UEH và TCDN4. Hẹn dịp kỷ niệm 20 năm mình nhất định sẽ có mặt đông đủ!",
    likes: 19,
  },
];

export default function GuestbookSection() {
  const toast = useToast();
  const [messages, setMessages] = useState<GuestbookEntry[]>(INITIAL_MESSAGES);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("TC10");
  const [message, setMessage] = useState("");
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [isHoveredForm, setIsHoveredForm] = useState(false);

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
    <section id="guestbook" className="scroll-mt-16 relative overflow-hidden bg-gradient-to-b from-slate-900 via-[#002244] to-[#001122] py-16 sm:py-24 text-white">
      {/* Background Subtle Sparkle Effects */}
      <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-ueh-orange/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Header: Tiêu đề to nổi bật */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1 text-xs font-bold text-sky-300 uppercase tracking-wider mb-3 backdrop-blur-md">
            <Feather size={14} className="text-ueh-gold animate-bounce" /> Lưu Giữ Kỷ Niệm 15 Năm
          </div>
          <h2 className="text-3xl font-black text-white sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Sổ Lưu Bút TCDN4
          </h2>
          <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-sky-400 via-ueh-gold to-ueh-orange" />
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-300">
            Dành cho anh chị em ở xa hoặc không thể về dự họp mặt gửi lời chúc, tâm tình và lời nhắn gửi đến lớp cũ.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          
          {/* CỘT TRÁI: FORM GỬI LƯU BÚT ĐƯỢC THIẾT KẾ HIỆU ỨNG THẺ PHONG THƯ */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 sm:p-7 backdrop-blur-xl shadow-2xl transition-all hover:border-white/30">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ueh-gold text-slate-900 shadow-md">
                  <PenTool size={18} />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">Gửi Lưu Bút & Lời Chúc</h3>
                  <p className="text-xs text-sky-200">Lời nhắn sẽ lưu trữ mãi mãi trên website</p>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Họ và tên của bạn:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:bg-black/50 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
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
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-300 shadow-md scale-102"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        Lớp {cls}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tâm tư, lời chúc hoặc kỷ niệm xưa:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Viết vài dòng nhắn nhủ gửi tới bạn bè TC10, TC11, TC12..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-black/30 p-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:bg-black/50 focus:outline-none transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ueh-orange to-amber-500 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 hover:scale-[1.01] transition-all"
                >
                  <Send size={15} /> Gửi lời nhắn vào sổ lưu bút
                </button>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH LƯU BÚT DẠNG THẺ CARD GỖ HIỆN ĐẠI CÓ HIỆU ỨNG HOVER */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs text-sky-200 px-1">
              <span>Đang hiển thị {messages.length} tâm tình từ cựu sinh viên</span>
              <span className="flex items-center gap-1 font-semibold text-ueh-gold">
                <Sparkles size={13} /> Lưu giữ thanh xuân
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3.5 no-scrollbar">
              {messages.map((item, idx) => {
                const isLiked = likedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md transition-all duration-300 hover:border-sky-400/40 hover:bg-white/10 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {/* Top: Name & Class & Time */}
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-black text-white shadow-xs">
                          {item.name.charAt(item.name.lastIndexOf(" ") + 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white group-hover:text-sky-300 transition-colors">
                              {item.name}
                            </span>
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-white/10">
                              {item.className}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{item.time}</span>
                        </div>
                      </div>

                      {/* Nút Like thả tim */}
                      <button
                        onClick={() => handleToggleLike(item.id)}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                          isLiked
                            ? "bg-rose-500 text-white shadow-xs"
                            : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
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
                    <div className="relative pl-3 border-l-2 border-sky-400/40 my-2">
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                        "{item.message}"
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
