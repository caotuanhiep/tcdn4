import { MessageCircle } from "lucide-react";

export const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export default function ZaloWidget() {
  return (
    <a
      href={ZALO_GROUP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Zalo nhóm lớp"
      className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zalo text-white shadow-lg shadow-blue-900/30 transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle size={28} />
      <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Tham gia nhóm Zalo lớp K33
      </span>
    </a>
  );
}
