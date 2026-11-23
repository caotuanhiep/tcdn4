"use client";

import { useState, useEffect } from "react";
import { 
  Compass, 
  MapPin, 
  Building2
} from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

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
    x: 160,
    y: 380,
    isCenter: true,
  },
  {
    id: "hn",
    name: "Hà Nội",
    shortName: "Hà Nội",
    count: 22,
    x: 330,
    y: 80,
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    shortName: "Đà Nẵng",
    count: 14,
    x: 470,
    y: 260,
  },
  {
    id: "overseas",
    name: "Nước ngoài",
    shortName: "Quốc tế",
    count: 16,
    x: 750,
    y: 150,
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
  const [regionCounts, setRegionCounts] = useState<{ [key: string]: number }>({
    hcm: 0,
    hn: 0,
    dn: 0,
    overseas: 0,
  });

  useEffect(() => {
    async function computeCounts() {
      const counts = { hcm: 0, hn: 0, dn: 0, overseas: 0 };
      const countedKeys = new Set<string>();

      // 1. Quét từ bảng profiles trên Supabase (người dùng thật đăng ký tài khoản)
      try {
        const { data: profiles, error } = await getSupabase()
          .from("profiles")
          .select("*");
        if (!error && profiles && profiles.length > 0) {
          profiles.forEach((p: any) => {
            const key = (p.full_name || p.id || "").toLowerCase().trim();
            if (key && !countedKeys.has(key)) {
              countedKeys.add(key);
              const loc = (p.location_region || "").toLowerCase();
              const specific = (p.specific_location || "").toLowerCase();
              if (loc === "hn" || specific.includes("hà nội")) counts.hn++;
              else if (loc === "dn" || specific.includes("đà nẵng")) counts.dn++;
              else if (loc === "overseas" || /úc|mỹ|usa|singapore|canada|đức|pháp|nhật|hàn|australia/i.test(specific)) counts.overseas++;
              else counts.hcm++;
            }
          });
        }
      } catch {}

      // 2. Quét từ local cache profiles (admin users cache)
      try {
        const cached = localStorage.getItem("tcdn4_admin_users_cache");
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            list.forEach((p: any) => {
              const key = (p.full_name || p.id || "").toLowerCase().trim();
              if (key && !countedKeys.has(key)) {
                countedKeys.add(key);
                const loc = (p.location_region || "").toLowerCase();
                const specific = (p.specific_location || "").toLowerCase();
                if (loc === "hn" || specific.includes("hà nội")) counts.hn++;
                else if (loc === "dn" || specific.includes("đà nẵng")) counts.dn++;
                else if (loc === "overseas" || /úc|mỹ|usa|singapore|canada|đức|pháp|nhật|hàn|australia/i.test(specific)) counts.overseas++;
                else counts.hcm++;
              }
            });
          }
        }
      } catch {}

      // 3. Quét từ danh sách đăng ký tham gia sự kiện tcdn4_registrations
      try {
        const stored = localStorage.getItem("tcdn4_registrations");
        const regs = stored ? JSON.parse(stored) : [];
        if (Array.isArray(regs)) {
          regs.forEach((r: any) => {
            const key = (r.fullName || r.phone || r.id || "").toLowerCase().trim();
            if (key && !countedKeys.has(key)) {
              countedKeys.add(key);
              const addr = r.address || "";
              if (/Hà Nội|hn/i.test(addr)) counts.hn++;
              else if (/Đà Nẵng|dn/i.test(addr)) counts.dn++;
              else if (/Úc|Mỹ|USA|Singapore|Canada|Đức|Pháp|Nhật|Hàn|Australia/i.test(addr) || r.region === "overseas") counts.overseas++;
              else counts.hcm++;
            }
          });
        }
      } catch {}

      setRegionCounts(counts);
    }

    computeCounts();
    window.addEventListener("storage", computeCounts);
    window.addEventListener("tcdn4_registration_updated", computeCounts);
    window.addEventListener("tcdn4_profile_updated", computeCounts);
    return () => {
      window.removeEventListener("storage", computeCounts);
      window.removeEventListener("tcdn4_registration_updated", computeCounts);
      window.removeEventListener("tcdn4_profile_updated", computeCounts);
    };
  }, []);

  const hasRealData = Object.values(regionCounts).some((c) => c > 0);
  const dynamicRegions = REGIONS.map((r) => ({
    ...r,
    count: hasRealData ? (regionCounts[r.id] ?? r.count) : r.count,
  }));

  const center = dynamicRegions.find((r) => r.isCenter) || dynamicRegions[0];
  const totalCount = dynamicRegions.reduce((acc, curr) => acc + curr.count, 0);

  const handleRegionClick = (regionId: string) => {
    if (onSelectRegion) {
      onSelectRegion(regionId);
    }
    const dirElement = document.getElementById("directory");
    if (dirElement) {
      dirElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const calculateArc = (to: MapRegion) => {
    let mx = (center.x + to.x) / 2;
    let my = (center.y + to.y) / 2;
    if (to.id === "hn") {
      // Đường bay Hà Nội: Hướng thẳng lên phía Bắc rồi lượn sang
      mx = 180;
      my = 150;
    } else if (to.id === "dn") {
      // Đường bay Đà Nẵng: Đi thấp bên dưới, không giao cắt
      mx = 310;
      my = 350;
    } else if (to.id === "overseas") {
      // Đường bay Quốc tế: Cánh cung bay vút lên cao sang bầu trời phía Đông
      mx = 460;
      my = 70;
    }
    return `M ${center.x} ${center.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };

  return (
    <section id="map" className="scroll-mt-16 bg-gradient-to-b from-white via-white to-slate-50/40 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề Cực To */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5 border border-blue-100">
              <Compass size={14} className="text-ueh-orange" /> Mạng lưới cựu sinh viên
            </div>
            <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Từ UEH ta đã đi ...
            </h2>
            <div className="mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
              Từ giảng đường UEH thân yêu, các thế hệ cựu sinh viên TCDN4 đã tỏa sáng khắp ba miền và quốc tế.
            </p>
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
            Tất cả ({totalCount})
          </button>
          {dynamicRegions.map((r) => (
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

        {/* Interactive Responsive Map: Không gian cực rộng, TP.HCM góc trái to rõ, thẻ & số to nổi bật */}
        <div className="relative h-[400px] sm:h-[480px] md:h-[540px] lg:h-[580px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-[#00172B] shadow-2xl">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: "radial-gradient(#38bdf8 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 880 500"
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
                    stroke={isHighlighted ? "rgba(232, 119, 34, 0.75)" : "rgba(56, 189, 248, 0.28)"}
                    strokeWidth={isHighlighted ? 4 : 2.5}
                  />
                  <path
                    d={calculateArc(region)}
                    fill="none"
                    stroke={isHighlighted ? "#E87722" : "#38bdf8"}
                    strokeWidth={isHighlighted ? 2.5 : 1.8}
                    className="arc-dash"
                  />
                </g>
              );
            })}

            {/* Điểm Vàng TP.HCM TO RÕ RÀNG Ở GÓC TRÁI */}
            <g
              className="cursor-pointer group"
              onClick={() => handleRegionClick(center.id)}
              onMouseEnter={() => setActiveHover(center.id)}
              onMouseLeave={() => setActiveHover(null)}
            >
              <circle
                cx={center.x}
                cy={center.y}
                r={36}
                className="fill-yellow-400 animate-ping"
                opacity="0.2"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={22}
                className="fill-ueh-orange"
                opacity="0.35"
              />
              <circle
                cx={center.x}
                cy={center.y}
                r={11}
                className="fill-yellow-400 stroke-[3] stroke-white shadow-xl"
              />

              {/* Thẻ Card to rõ ràng cho điểm đến TP.HCM - NẰM DƯỚI NÚT VÀNG */}
              <g transform={`translate(${center.x - 90}, ${center.y + 20})`}>
                <rect
                  width="180"
                  height="46"
                  rx="10"
                  fill="#002b4d"
                  stroke="#F5A800"
                  strokeWidth="2"
                  className="shadow-xl"
                />
                <circle cx="24" cy="23" r="10" fill="#F5A800" />
                <text x="24" y="27" textAnchor="middle" fill="#001D33" fontSize="11" fontWeight="900" fontFamily="var(--font-inter), system-ui, sans-serif">
                  ★
                </text>
                <text x="44" y="20" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="var(--font-inter), system-ui, sans-serif">
                  TP. Hồ Chí Minh
                </text>
                <text x="44" y="36" fill="#F5A800" fontSize="12" fontWeight="800" fontFamily="var(--font-inter), system-ui, sans-serif">
                  {center.count} thành viên
                </text>
              </g>
            </g>

            {/* Other Nodes: Hà Nội, Đà Nẵng, Nước ngoài - To rõ, số to hẳn */}
            {dynamicRegions.filter((r) => !r.isCenter).map((region) => {
              const isSelected = selectedRegion === region.id;
              const isHovered = activeHover === region.id;
              const cardWidth = 160;
              const cardHeight = 44;

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
                    r={isSelected || isHovered ? 20 : 12}
                    className="fill-sky-400 animate-pulse"
                    opacity={isSelected ? "0.4" : "0.2"}
                  />
                  <circle
                    cx={region.x}
                    cy={region.y}
                    r={isSelected || isHovered ? 8 : 5}
                    className={isSelected ? "fill-white" : "fill-sky-400"}
                  />

                  {/* Card to rõ hơn, số to hẳn */}
                  <g transform={`translate(${region.x - cardWidth / 2}, ${region.y - 54})`}>
                    <rect
                      width={cardWidth}
                      height={cardHeight}
                      rx="10"
                      fill={isSelected ? "#004B87" : "#002440"}
                      stroke={isSelected ? "#38bdf8" : "#1e3a8a"}
                      strokeWidth={isSelected ? 2 : 1.2}
                      className="shadow-xl"
                    />
                    <text
                      x={cardWidth / 2 - 16}
                      y="27"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="900"
                      fontFamily="var(--font-inter), system-ui, sans-serif"
                    >
                      {region.shortName}
                    </text>
                    <circle cx={cardWidth - 22} cy="22" r="14" fill={isSelected ? "#38bdf8" : "#0284c7"} />
                    <text
                      x={cardWidth - 22}
                      y="27"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="900"
                      fontFamily="var(--font-inter), system-ui, sans-serif"
                    >
                      {region.count}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Simple Clean Legend (Top Right / Bottom Right) */}
          <div className="absolute bottom-4 right-4 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-white backdrop-blur-md text-xs">
            <span className="text-yellow-400 font-bold">Điểm đến TCDN4</span> • Lan tỏa từ giảng đường UEH
          </div>
        </div>

      </div>
    </section>
  );
}
