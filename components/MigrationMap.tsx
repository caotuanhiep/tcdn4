"use client";

import { useState } from "react";
import { 
  Compass, 
  MapPin, 
  Users, 
  Building2
} from "lucide-react";

export interface MapRegion {
  id: string;
  name: string;
  shortName: string;
  count: number;
  x: number;
  y: number;
  isCenter?: boolean;
}

const REGIONS: MapRegion[] = [
  {
    id: "hcm",
    name: "TP. Hồ Chí Minh",
    shortName: "TP.HCM",
    count: 68,
    x: 210,
    y: 280,
    isCenter: true,
  },
  {
    id: "hn",
    name: "Hà Nội",
    shortName: "Hà Nội",
    count: 22,
    x: 270,
    y: 95,
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    shortName: "Đà Nẵng",
    count: 14,
    x: 340,
    y: 190,
  },
  {
    id: "overseas",
    name: "Nước ngoài",
    shortName: "Quốc tế",
    count: 16,
    x: 580,
    y: 160,
  },
];

interface MigrationMapProps {
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export default function MigrationMap({
  selectedRegion = "all",
  onSelectRegion,
}: MigrationMapProps) {
  const [activeHover, setActiveHover] = useState<string | null>(null);

  const center = REGIONS.find((r) => r.isCenter) || REGIONS[0];
  const totalCount = REGIONS.reduce((acc, curr) => acc + curr.count, 0);

  const handleRegionClick = (regionId: string) => {
    if (onSelectRegion) {
      onSelectRegion(regionId);
    }
  };

  const calculateArc = (to: MapRegion) => {
    const mx = (center.x + to.x) / 2;
    const my = (center.y + to.y) / 2 - 70;
    return `M ${center.x} ${center.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };

  return (
    <section id="map" className="scroll-mt-16 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề Cực To */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5 border border-blue-100">
              <Compass size={14} className="text-ueh-orange" /> Mạng lưới cựu sinh viên
            </div>
            <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Dấu Chân TCDN4 K33
            </h2>
            <div className="mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
              Từ giảng đường UEH thân yêu, các thế hệ cựu sinh viên TCDN4 đã tỏa sáng khắp ba miền và quốc tế.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 shadow-2xs self-start md:self-end">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ueh text-white shadow-xs">
              <Users size={18} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ueh">
                Tổng Cựu Sinh Viên
              </div>
              <div className="text-lg sm:text-xl font-black text-ueh leading-tight">
                {totalCount}+ <span className="text-xs font-normal text-slate-500">thành viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Region Pills Filter (1 hàng trượt ngang mượt mà) */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">
            Khu vực:
          </span>
          <button
            onClick={() => handleRegionClick("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
              selectedRegion === "all"
                ? "bg-ueh text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toàn cầu ({totalCount})
          </button>
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRegionClick(r.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedRegion === r.id
                  ? "bg-ueh-light text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-ueh"
              }`}
            >
              <MapPin size={12} className={r.isCenter ? "text-ueh-gold" : "text-rose-500"} />
              {r.shortName} ({r.count})
            </button>
          ))}
        </div>

        {/* Interactive Responsive Map: Điểm vàng TP.HCM to rõ, bỏ chú thích Cơ sở B theo yêu cầu */}
        <div className="relative h-[320px] sm:h-[400px] md:h-[460px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#001D33] shadow-lg">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 720 440"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Arcs */}
            {REGIONS.filter((r) => !r.isCenter).map((region) => {
              const isHighlighted = selectedRegion === region.id || activeHover === region.id;
              return (
                <g key={`path-${region.id}`}>
                  <path
                    d={calculateArc(region)}
                    fill="none"
                    stroke={isHighlighted ? "rgba(232, 119, 34, 0.7)" : "rgba(56, 189, 248, 0.25)"}
                    strokeWidth={isHighlighted ? 3.5 : 2}
                  />
                  <path
                    d={calculateArc(region)}
                    fill="none"
                    stroke={isHighlighted ? "#E87722" : "#38bdf8"}
                    strokeWidth={isHighlighted ? 2 : 1.5}
                    className="arc-dash"
                  />
                </g>
              );
            })}

            {/* Điểm Vàng TP.HCM TO RÕ RÀNG */}
            <g
              className="cursor-pointer group"
              onClick={() => handleRegionClick(center.id)}
              onMouseEnter={() => setActiveHover(center.id)}
              onMouseLeave={() => setActiveHover(null)}
            >
              <circle
                cx={center.x}
                cy={center.y}
                r={26}
                className="fill-yellow-400 animate-ping"
                opacity="0.2"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={16}
                className="fill-ueh-orange"
                opacity="0.35"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={8}
                className="fill-yellow-400 stroke-2 stroke-white shadow-md"
              />

              {/* Thẻ Card to rõ ràng cho điểm đến TP.HCM - NẰM DƯỚI NÚT VÀNG */}
              <g transform={`translate(${center.x - 70}, ${center.y + 18})`}>
                <rect
                  width="140"
                  height="34"
                  rx="8"
                  fill="#002b4d"
                  stroke="#F5A800"
                  strokeWidth="1.5"
                  className="shadow-md"
                />
                <circle cx="20" cy="17" r="7" fill="#F5A800" />
                <text x="20" y="20.5" textAnchor="middle" fill="#001D33" fontSize="9" fontWeight="900" fontFamily="var(--font-inter), system-ui, sans-serif">
                  ★
                </text>
                <text x="36" y="16" fill="#ffffff" fontSize="12" fontWeight="800" fontFamily="var(--font-inter), system-ui, sans-serif">
                  TP. Hồ Chí Minh
                </text>
                <text x="36" y="27" fill="#F5A800" fontSize="10" fontWeight="700" fontFamily="var(--font-inter), system-ui, sans-serif">
                  {center.count} thành viên
                </text>
              </g>
            </g>

            {/* Other Nodes: Hà Nội, Đà Nẵng, Nước ngoài */}
            {REGIONS.filter((r) => !r.isCenter).map((region) => {
              const isSelected = selectedRegion === region.id;
              const isHovered = activeHover === region.id;
              const cardWidth = 124;
              const cardHeight = 32;

              return (
                <g
                  key={region.id}
                  className="cursor-pointer group"
                  onClick={() => handleRegionClick(region.id)}
                  onMouseEnter={() => setActiveHover(region.id)}
                  onMouseLeave={() => setActiveHover(null)}
                >
                  <circle
                    cx={region.x}
                    cy={region.y}
                    r={isSelected || isHovered ? 16 : 10}
                    className="fill-sky-400 animate-pulse"
                    opacity={isSelected ? "0.4" : "0.2"}
                  />
                  <circle
                    cx={region.x}
                    cy={region.y}
                    r={isSelected || isHovered ? 6 : 4}
                    className={isSelected ? "fill-white" : "fill-sky-400"}
                  />

                  {/* Card to rõ */}
                  <g transform={`translate(${region.x - cardWidth / 2}, ${region.y - 42})`}>
                    <rect
                      width={cardWidth}
                      height={cardHeight}
                      rx="8"
                      fill={isSelected ? "#004B87" : "#002440"}
                      stroke={isSelected ? "#38bdf8" : "#1e3a8a"}
                      strokeWidth={isSelected ? 1.5 : 1}
                    />
                    <text
                      x={cardWidth / 2 - 10}
                      y="20"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="800"
                      fontFamily="sans-serif"
                    >
                      {region.shortName}
                    </text>
                    <circle cx={cardWidth - 16} cy="16" r="9" fill="#38bdf8" />
                    <text
                      x={cardWidth - 16}
                      y="20"
                      textAnchor="middle"
                      fill="#001D33"
                      fontSize="9"
                      fontWeight="900"
                      fontFamily="sans-serif"
                    >
                      {region.count}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Simple Clean Legend (Bottom Left) */}
          <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white backdrop-blur-md text-[11px]">
            <span className="text-yellow-400 font-bold">Điểm đến TCDN4</span> • Lan tỏa từ giảng đường UEH
          </div>
        </div>

      </div>
    </section>
  );
}
