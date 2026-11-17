import { MessageCircle } from "lucide-react";

// Replace with the real Zalo group / OA link.
const ZALO_URL = "https://zalo.me";

export default function ZaloWidget() {
  return (
    <a
      href={ZALO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Zalo"
      className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-zalo text-white shadow-lg shadow-blue-900/30 transition-transform hover:scale-110"
    >
      <MessageCircle size={28} />
      <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Chat Zalo nhóm lớp
      </span>
    </a>
  );
}
