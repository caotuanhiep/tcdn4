"use client";

import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Smile, 
  Users, 
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

const INITIAL_CHAT: ChatMessage[] = [];

const EMOJIS = ["🎉", "❤️", "👍", "🍻", "🎓", "👏"];

export default function QuickCommunityChat() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [inputText, setInputText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestClass, setGuestClass] = useState("TC10");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tcdn4_quick_chat");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (m: any) =>
              m.id !== "msg-1" &&
              m.id !== "msg-2" &&
              m.id !== "msg-3" &&
              !m.text?.includes("Chào cả nhà! Anh chị em đã đăng ký áo hết chưa?") &&
              !m.text?.includes("Mình vừa chuyển khoản đăng ký 2 vé luôn rồi nè") &&
              !m.text?.includes("Cơ sở A nha mọi người")
          );
          setMessages(cleaned);
          localStorage.setItem("tcdn4_quick_chat", JSON.stringify(cleaned));
        }
      }
    } catch {}
  }, []);

  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem("tcdn4_quick_chat", JSON.stringify(msgs));
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    let senderName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0];
    let senderClass = profile?.class_name || "TC10";

    if (!user) {
      if (!guestName.trim()) {
        toast.error("Vui lòng nhập tên của bạn để trò chuyện!");
        return;
      }
      senderName = guestName.trim();
      senderClass = guestClass;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: senderName,
      className: senderClass,
      avatarColor: "from-ueh to-ueh-orange",
      text: inputText.trim(),
      time: timeStr,
      isMe: true,
    };

    const updated = [...messages, newMsg];
    saveMessages(updated);
    setInputText("");
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-ueh px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-900/30 hover:bg-ueh-light hover:scale-105 active:scale-95 transition-all"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <MessageSquare size={17} />
          <span>Chat Nhanh</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
            {messages.length}
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-4 sm:left-6 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col h-[480px] animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-ueh p-3.5 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-ueh-gold">
                <MessageSquare size={17} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold leading-tight flex items-center gap-1.5">
                  Trò Chuyện TCDN4 K33
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </h3>
                <span className="text-[10px] text-blue-200">
                  Cộng đồng trực tuyến TC10 • TC11 • TC12
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Guest Identity Form (If not logged in) */}
          {!user && (
            <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-2 flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Tên bạn (VD: Hùng)..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs focus:border-ueh focus:outline-none"
              />
              <select
                value={guestClass}
                onChange={(e) => setGuestClass(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-ueh focus:outline-none font-bold text-ueh"
              >
                <option value="TC10">TC10</option>
                <option value="TC11">TC11</option>
                <option value="TC12">TC12</option>
              </select>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8">
                <MessageSquare className="h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">Chưa có tin nhắn</p>
                <p className="text-[11px] text-slate-400">Gửi tin nhắn đầu tiên để chào mọi người!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                    <span className="font-bold text-slate-700">{msg.sender}</span>
                    {msg.className && (
                      <span className="rounded bg-blue-100 text-ueh font-bold px-1 py-0.2 text-[9px]">
                        {msg.className}
                      </span>
                    )}
                    <span>• {msg.time}</span>
                  </div>

                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] break-words shadow-2xs leading-relaxed ${
                      msg.isMe
                        ? "bg-ueh text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Toolbar */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="text-sm hover:scale-125 transition-transform px-1 py-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Nhập tin nhắn nhanh..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-ueh focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-ueh px-3.5 py-2 text-white hover:bg-ueh-light transition-colors flex items-center justify-center shadow-xs"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
