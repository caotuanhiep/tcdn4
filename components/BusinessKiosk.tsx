import { Armchair, Coffee, Globe2, Megaphone, Tag, type LucideIcon } from "lucide-react";

interface Business {
  name: string;
  tagline: string;
  perk: string;
  icon: LucideIcon;
  gradient: string;
}

const BUSINESSES: Business[] = [
  { name: "SMLIFE", tagline: "Nội thất & Không gian", perk: "Giảm 15%", icon: Armchair, gradient: "from-orange-500 to-amber-500" },
  { name: "Gowise", tagline: "eSIM Du lịch Quốc tế", perk: "Tặng data 1GB", icon: Globe2, gradient: "from-sky-500 to-cyan-500" },
  { name: "Bamos Coffee", tagline: "Chuỗi Cà phê 24/7", perk: "Freesize", icon: Coffee, gradient: "from-emerald-500 to-teal-500" },
  { name: "Viwise", tagline: "Digital Marketing", perk: "Miễn phí tư vấn 1:1", icon: Megaphone, gradient: "from-violet-500 to-indigo-500" },
];

export default function BusinessKiosk() {
  return (
    <section id="business" className="scroll-mt-16 bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center md:text-left">
          <h2 className="mb-4 text-3xl font-extrabold text-ueh md:text-4xl">Hệ sinh thái Doanh nghiệp</h2>
          <p className="max-w-xl text-lg text-slate-500">
            Ủng hộ doanh nghiệp của alumni TCDN4 và nhận ưu đãi nội bộ độc quyền.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {BUSINESSES.map((b) => {
            const Icon = b.icon;
            return (
              <article
                key={b.name}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${b.gradient}`} />
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">
                  <Tag size={12} /> Ưu đãi nội bộ
                </span>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${b.gradient} text-white shadow-sm`}>
                  <Icon size={24} />
                </div>
                <h3 className="mb-1 text-xl font-extrabold text-slate-900">{b.name}</h3>
                <p className="mb-6 text-sm font-medium text-slate-500">{b.tagline}</p>
                <div className="mt-auto rounded-xl bg-ueh px-4 py-3 text-center text-sm font-bold text-white">{b.perk}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
