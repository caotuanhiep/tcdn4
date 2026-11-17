"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Sparkles, 
  Quote 
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
    likes: 12,
  },
  {
    id: "gb-2",
    name: "Hoàng Minh Em",
    className: "TC11",
    time: "2 ngày trước",
    message:
      "Gửi lời chào thân thương từ Sydney đến toàn thể anh chị em TC10 - TC11 - TC12! 15 năm trôi qua nhanh như một cái chớp mắt, vẫn nhớ như in những buổi trưa ngồi chép bài tại Canteen Cơ sở B. Chúc các bạn luôn dồi dào sức khỏe!",
    likes: 18,
  },
  {
    id: "gb-3",
    name: "Vũ Khánh Phương",
    className: "TC12",
    time: "3 ngày trước",
    message:
      "Dù cách xa nửa vòng trái đất ở California nhưng trái tim vẫn luôn hướng về UEH và TCDN4. Hẹn dịp kỷ niệm 20 năm mình nhất định sẽ có mặt đông đủ!",
    likes: 15,
  },
];

export default function GuestbookSection() {
  const toast = useToast();
  const [messages, setMessages] = useState<GuestbookEntry[]>(INITIAL_MESSAGES);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("TC10");
  const [message, setMessage] = useState("");
  const [likedIds, setLikedIds] = useState<string[]>([]);

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
    toast.success("Đã đăng lời nhắn lưu bút thành công!");

    setName("");
    setMessage("");
  };

  const handleToggleLike = (id: string) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter((item) => item !== id));
      const updated = messages.map((m) =>
        m.id === id ? { ...m, likes: Math.max(0, m.likes - 1) } : m
      );
      saveMessages(updated);
    } else {
      setLikedIds([...likedIds, id]);
      const updated = messages.map((m) =>
        m.id === id ? { ...m, likes: m.likes + 1 } : m
      );
      saveMessages(updated);
      toast.success("Đã thả tim lưu bút!");
    }
  };

  return (
    <section id="guestbook" className="scroll-mt-16 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5 border border-blue-100">
            <Quote size={13} className="text-blue-500" /> Sổ lưu niệm trực tuyến
          </div>
          <h2 className="text-2xl font-extrabold text-ueh sm:text-3xl md:text-4xl tracking-tight">
            Lưu Bút TCDN4
          </h2>
          <div className="mx-auto mt-2.5 h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
          <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
            Gửi lại những lời nhắn và tâm tư từ phương xa của các bạn không thể về dự buổi gặp mặt 15 năm.
          </p>
        </div>

        {/* 2-Cols Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          
          {/* Form */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 p-5 sm:p-7 shadow-2xs">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-ueh flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={18} /> Gửi lời nhắn phương xa
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lời nhắn của bạn sẽ được hiển thị ngay lập tức trên sổ lưu bút.
              </p>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Họ tên của bạn *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Nam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Lớp sinh viên *
                </label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                >
                  <option value="TC10">Lớp TC10 - K33 UEH</option>
                  <option value="TC11">Lớp TC11 - K33 UEH</option>
                  <option value="TC12">Lớp TC12 - K33 UEH</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Lời nhắn gửi tập thể lớp *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Chia sẻ lý do không về được hoặc gửi lời chúc ấm áp tới bạn bè..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-ueh focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-ueh py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
              >
                <Send size={14} /> Đăng Lời Nhắn Lưu Bút
              </button>
            </form>
          </div>

          {/* Feed */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                Lưu bút mới nhất ({messages.length})
              </span>
              <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <Sparkles size={12} /> Lưu giữ vĩnh viễn
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {messages.map((item) => {
                const isLiked = likedIds.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-ueh text-sm font-bold text-white shadow-2xs">
                          {item.name.trim().charAt(item.name.trim().lastIndexOf(" ") + 1)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="rounded bg-blue-50 px-1.5 py-0.2 font-bold text-ueh border border-blue-100 text-[10px]">
                              {item.className}
                            </span>
                            <span>• {item.time}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleLike(item.id)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                          isLiked
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <Heart
                          size={12}
                          className={isLiked ? "fill-rose-500 text-rose-500" : ""}
                        />
                        {item.likes}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      "{item.message}"
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
