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
    name: "Cơ sở B - UEH",
    shortName: "TP.HCM",
    count: 68,
    x: 210,
    y: 330,
    isCenter: true,
  },
  {
    id: "hn",
    name: "Hà Nội",
    shortName: "Hà Nội",
    count: 22,
    x: 270,
    y: 100,
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    shortName: "Đà Nẵng",
    count: 14,
    x: 340,
    y: 210,
  },
  {
    id: "overseas",
    name: "Nước ngoài",
    shortName: "Quốc tế",
    count: 18,
    x: 580,
    y: 170,
  },
];

interface MigrationMapProps {
  selectedRegion?: string;
  onSelectRegion?: (regionId: string) => void;
}

export default function MigrationMap({ selectedRegion = "all", onSelectRegion }: MigrationMapProps) {
  const [activeHover, setActiveHover] = useState<string | null>(null);

  const center = REGIONS.find((r) => r.isCenter) || REGIONS[0];
  const totalCount = REGIONS.reduce((acc, curr) => acc + curr.count, 0);

  const handleRegionClick = (id: string) => {
    if (onSelectRegion) {
      onSelectRegion(id);
    }
    const elem = document.getElementById("directory");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
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
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5 border border-blue-100">
              <Compass size={13} className="text-ueh-orange" /> Mạng lưới cựu sinh viên
            </div>
            <h2 className="text-2xl font-extrabold text-ueh sm:text-3xl md:text-4xl tracking-tight">
              Dấu Chân TCDN4 K33
            </h2>
            <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-2.5 max-w-xl text-xs sm:text-sm text-slate-600">
              Từ 279 Nguyễn Tri Phương, các thế hệ cựu sinh viên TCDN4 đã tỏa sáng khắp ba miền và quốc tế.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 shadow-2xs self-start md:self-end">
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

        {/* Region Pills Filter (Horizontal scrollable, no font breakage) */}
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">
            Khu vực:
          </span>
          <button
            onClick={() => handleRegionClick("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
              selectedRegion === "all"
                ? "bg-ueh text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Toàn cầu ({totalCount})
          </button>
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => handleRegionClick(r.id)}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedRegion === r.id
                  ? "bg-ueh-light text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-ueh"
              }`}
            >
              {r.isCenter ? <Building2 size={12} className="text-ueh-gold" /> : <MapPin size={12} className="text-rose-500" />}
              {r.shortName} ({r.count})
            </button>
          ))}
        </div>

        {/* Interactive Responsive Map Visual */}
        <div className="relative h-[320px] sm:h-[400px] md:h-[460px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[#001D33] shadow-xl">
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

            {/* Center Node: Cơ sở B - UEH (No duplicate label!) */}
            <g
              className="cursor-pointer group"
              onClick={() => handleRegionClick(center.id)}
              onMouseEnter={() => setActiveHover(center.id)}
              onMouseLeave={() => setActiveHover(null)}
            >
              <circle
                cx={center.x}
                cy={center.y}
                r={24}
                className="fill-blue-500 animate-ping"
                opacity="0.25"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={14}
                className="fill-ueh-orange"
                opacity="0.4"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={6}
                className="fill-ueh-gold stroke-2 stroke-white"
              />

              {/* Clean Pin Card */}
              <g transform={`translate(${center.x - 75}, ${center.y - 58})`}>
                <rect
                  width="150"
                  height="36"
                  rx="8"
                  fill="#002b4d"
                  stroke="#E87722"
                  strokeWidth="1.5"
                />
                <g transform="translate(6, 6)">
                  <rect width="24" height="24" rx="5" fill="#003B5C" stroke="#F5A800" strokeWidth="1" />
                  <text x="12" y="15" textAnchor="middle" fill="#F5A800" fontSize="8" fontWeight="900" fontFamily="sans-serif">
                    UEH
                  </text>
                </g>
                <text x="36" y="16" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="sans-serif">
                  Cơ sở B - UEH
                </text>
                <text x="36" y="28" fill="#93c5fd" fontSize="9" fontWeight="500" fontFamily="sans-serif">
                  279 NTP • {center.count} bạn
                </text>
              </g>
            </g>

            {/* Other Nodes */}
            {REGIONS.filter((r) => !r.isCenter).map((region) => {
              const isSelected = selectedRegion === region.id;
              const isHovered = activeHover === region.id;
              const cardWidth = 110;

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

                  <g transform={`translate(${region.x - cardWidth / 2}, ${region.y - 40})`}>
                    <rect
                      width={cardWidth}
                      height="26"
                      rx="6"
                      fill={isSelected ? "#004B87" : "#002440"}
                      stroke={isSelected ? "#38bdf8" : "#1e3a8a"}
                      strokeWidth={1}
                    />
                    <text
                      x={cardWidth / 2 - 8}
                      y="17"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="sans-serif"
                    >
                      {region.shortName}
                    </text>
                    <circle cx={cardWidth - 12} cy="13" r="7" fill="#38bdf8" />
                    <text
                      x={cardWidth - 12}
                      y="16"
                      textAnchor="middle"
                      fill="#001D33"
                      fontSize="8"
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
          <div className="absolute bottom-3 left-3 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-white backdrop-blur-md text-[10px] sm:text-xs">
            <span className="text-ueh-gold font-bold">279 Nguyễn Tri Phương, Q.10</span> • Điểm kết nối TCDN4
          </div>
        </div>

      </div>
    </section>
  );
}
