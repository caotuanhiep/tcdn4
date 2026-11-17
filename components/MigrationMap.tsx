import { MapPin, Users } from "lucide-react";

interface MapNode {
  id: string;
  x: number;
  y: number;
  name: string;
  count: number;
  center?: boolean;
}

const NODES: MapNode[] = [
  { id: "hcm", x: 260, y: 360, name: "Cơ sở B - UEH (TP.HCM)", count: 58, center: true },
  { id: "hn", x: 330, y: 110, name: "Hà Nội", count: 21 },
  { id: "dn", x: 400, y: 230, name: "Đà Nẵng", count: 12 },
  { id: "intl", x: 660, y: 190, name: "Nước ngoài", count: 14 },
];

const center = NODES[0];

function arc(to: MapNode) {
  const mx = (center.x + to.x) / 2;
  const my = (center.y + to.y) / 2 - 90;
  return `M ${center.x} ${center.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export default function MigrationMap() {
  const total = NODES.reduce((s, n) => s + n.count, 0);
  return (
    <section id="map" className="scroll-mt-16 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 items-end justify-between md:flex">
          <div>
            <h2 className="mb-4 text-3xl font-extrabold text-ueh md:text-4xl">Dấu chân TCDN4</h2>
            <p className="max-w-xl text-lg text-slate-500">
              Từ Cơ sở B - UEH, các thành viên TCDN4 đã tỏa đi khắp mọi miền và vươn ra thế giới. (Số liệu minh họa)
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 md:mt-0">
            <Users className="text-blue-600" size={20} />
            <div>
              <div className="text-xs font-semibold uppercase text-blue-800">Tổng Alumni</div>
              <div className="text-xl font-bold leading-none text-ueh">{total}+</div>
            </div>
          </div>
        </div>

        <div className="relative h-[380px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[#001122] shadow-2xl md:h-[500px]">
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(#1e3a5f 1px, transparent 1px)", backgroundSize: "30px 30px" }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bản đồ hành trình alumni">
            {NODES.filter((n) => !n.center).map((n) => (
              <g key={`p-${n.id}`}>
                <path d={arc(n)} fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="4" />
                <path d={arc(n)} fill="none" stroke="#38bdf8" strokeWidth="2" className="arc-dash" />
              </g>
            ))}
            {NODES.map((n) => {
              const w = n.center ? 170 : 110;
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={n.center ? 16 : 11} className="animate-pulse fill-blue-500" opacity="0.35" />
                  <circle cx={n.x} cy={n.y} r={n.center ? 7 : 5} className={n.center ? "fill-white" : "fill-sky-400"} />
                  <rect x={n.x - w / 2} y={n.y - 52} width={w} height="28" rx="6" fill="#002244" stroke="#3b82f6" />
                  <text x={n.x} y={n.y - 34} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
                    {n.name}
                  </text>
                  <circle cx={n.x + w / 2} cy={n.y - 52} r="11" fill="#3b82f6" />
                  <text x={n.x + w / 2} y={n.y - 48} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
                    {n.count}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-4 left-4 max-w-[210px] rounded-xl border border-white/20 bg-white/10 p-4 text-sm font-light text-white backdrop-blur-md">
            <MapPin className="mb-2 text-blue-400" size={22} />
            Mạng lưới không ngừng mở rộng. Cập nhật vị trí của bạn ngay hôm nay!
          </div>
        </div>
      </div>
    </section>
  );
}
