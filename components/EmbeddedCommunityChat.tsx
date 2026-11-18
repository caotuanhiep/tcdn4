"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Smile, 
  Users, 
  Lock, 
  LogIn, 
  MessageCircle, 
  Cake, 
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";

interface ChatMessage {
  id: string;
  sender: string;
  className?: string;
  avatarColor: string;
  text: string;
  time: string;
  isMe?: boolean;
}

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "Lê Hoàng Cường",
    className: "TC12",
    avatarColor: "from-blue-600 to-indigo-600",
    text: "Chào cả nhà! Anh chị em đã đăng ký áo hết chưa?",
    time: "10:15",
  },
  {
    id: "msg-2",
    sender: "Trần Thị Bích",
    className: "TC11",
    avatarColor: "from-pink-500 to-rose-600",
    text: "Mình vừa chuyển khoản đăng ký 2 vé luôn rồi nè 🎉 Hẹn gặp lại cả nhà!",
    time: "10:18",
  },
  {
    id: "msg-3",
    sender: "Nguyễn Văn An",
    className: "TC10",
    avatarColor: "from-amber-500 to-orange-600",
    text: "Hôm đó lớp mình tập trung sớm 9h30 ở sảnh Cơ sở A nha mọi người!",
    time: "10:25",
  },
];

const UPCOMING_BIRTHDAYS = [
  { name: "Trần Thị Bích", class: "TC11", date: "19/11" },
  { name: "Lê Hoàng Cường", class: "TC12", date: "24/11" },
  { name: "Đặng Quốc Hưng", class: "TC10", date: "02/12" },
  { name: "Phạm Hải Đăng", class: "TC10", date: "15/12" },
];

const EMOJIS = ["🎉", "❤️", "👍", "🍻", "🎓", "👏"];

export default function EmbeddedCommunityChat() {
  const { user, profile, openLogin } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tcdn4_community_chat");
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveMessages = (newMsgs: ChatMessage[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem("tcdn4_community_chat", JSON.stringify(newMsgs));
    } catch {}
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      toast.error("Vui lòng đăng nhập để tham gia trò chuyện!");
      openLogin();
      return;
    }

    const senderName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Alumni";

    const senderClass = profile?.class_name || "K33";

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: senderName,
      className: senderClass,
      avatarColor: "from-[#003B5C] to-[#0068FF]",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText("");

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <div className="w-full mt-6">
      <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-lg text-left">
        
        {/* Chat Box Header: Tối ưu chuyên nghiệp */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 bg-gradient-to-r from-[#003B5C] to-[#004e7a] px-4 sm:px-6 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight">Box Chat Nhanh TCDN4</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                  Trực tuyến
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-200/80 font-normal">Kênh giao lưu ngắn gọn cho cựu sinh viên K33</p>
            </div>
          </div>

          <a
            href="https://zalo.me/g/yodibu606"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25 transition-colors border border-white/10"
          >
            <MessageCircle size={13} className="text-[#0068FF]" />
            <span>Mở Nhóm Zalo Lớp</span>
          </a>
        </div>

        {/* DÒNG CHỮ CHẠY NGANG (TICKER) GOM CHUNG LỊCH SINH NHẬT THEO YÊU CẦU */}
        <div className="border-b border-amber-200/70 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 px-3.5 py-1.5 text-xs text-slate-700 flex items-center overflow-hidden">
          <div className="flex items-center gap-1 font-bold text-ueh-orange shrink-0 mr-2.5 pr-2.5 border-r border-amber-300/60">
            <Cake size={13} className="text-ueh-orange animate-bounce" />
            <span className="text-[11px] uppercase tracking-wide">Sinh nhật tháng:</span>
          </div>

          {/* Dòng chữ chạy ngang tiết kiệm không gian */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar whitespace-nowrap text-[11px]">
            {UPCOMING_BIRTHDAYS.map((person, idx) => (
              <span key={person.name} className="inline-flex items-center gap-1">
                {idx > 0 && <span className="text-amber-300 mx-1">•</span>}
                <strong className="text-slate-800 font-bold">{person.name}</strong>
                <span className="text-[10px] text-ueh font-semibold bg-white/70 px-1 rounded border border-amber-200/60">
                  {person.class}
                </span>
                <span className="text-ueh-orange font-bold">({person.date})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Chat Message List */}
        <div className="h-60 sm:h-64 overflow-y-auto p-4 space-y-2.5 bg-slate-50/70">
          {messages.map((msg) => {
            const isCurrentUser = msg.isMe || (user && profile?.full_name === msg.sender);
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${msg.avatarColor} text-[10px] font-black text-white shadow-xs`}
                >
                  {msg.sender.charAt(msg.sender.lastIndexOf(" ") + 1)}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                    isCurrentUser
                      ? "bg-[#003B5C] text-white rounded-tr-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 ${
                      isCurrentUser ? "justify-end text-blue-200" : "text-slate-400"
                    }`}
                  >
                    <span className="font-bold text-[11px]">
                      {isCurrentUser ? "Bạn" : msg.sender}
                    </span>
                    {msg.className && (
                      <span
                        className={`rounded px-1 text-[9px] font-semibold ${
                          isCurrentUser ? "bg-white/20 text-white" : "bg-blue-50 text-ueh"
                        }`}
                      >
                        {msg.className}
                      </span>
                    )}
                    <span className="text-[9px] opacity-75">• {msg.time}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap font-medium text-[11px] sm:text-xs">{msg.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input or Login Banner */}
        <div className="border-t border-slate-100 bg-white p-3">
          {user ? (
            <div>
              {/* Quick Emojis */}
              <div className="mb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Smile size={11} /> Cảm xúc:
                </span>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => addEmoji(e)}
                    className="rounded-lg p-1 text-xs hover:bg-slate-100 transition-colors shrink-0"
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn giao lưu với anh chị em..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-[#003B5C] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#003B5C] px-4 sm:px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors disabled:opacity-50 shadow-xs shrink-0"
                >
                  <Send size={13} /> Gửi
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 p-2.5">
              <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                <Lock size={15} className="text-amber-600 shrink-0" />
                <span>Đăng nhập tài khoản cựu sinh viên để nhắn tin tại Box Chat.</span>
              </div>
              <button
                onClick={openLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#003B5C] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-900 transition-all shadow-xs shrink-0"
              >
                <LogIn size={13} /> Đăng nhập ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
