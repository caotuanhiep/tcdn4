export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-[#001428] py-10 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-footer.png"
            alt="TCDN4 Alumni Hub Logo"
            className="h-10 sm:h-12 w-auto max-w-[220px] object-contain brightness-110"
          />
        </div>
        <p className="text-center text-xs sm:text-sm text-slate-400 md:text-right max-w-md">
          Dành riêng cho cựu sinh viên TCDN4 - K33 UEH (TC10 • TC11 • TC12). Mạng lưới lưu giữ thanh xuân và kết nối tương lai.
        </p>
      </div>
    </footer>
  );
}
