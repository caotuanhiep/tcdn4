"use client";

import { useMemo, useState } from "react";
import { Compass, Globe, MapPin, Sparkles } from "lucide-react";
import { useAlumniData } from "@/components/AlumniDataProvider";

interface MapNode {
  id: string;
  filterKey: string;
  name: string;
  shortName: string;
  count: number;
  memberNames: string[];
  x: number;
  y: number;
  kind: "center" | "hn" | "province" | "overseas";
  isCenter?: boolean;
}

interface ProvinceBucket {
  key: string;
  label: string;
  shortLabel: string;
  northOrder: number; // Thứ tự địa lý Bắc -> Trung -> Nam để đặt lên bản đồ hợp lý
  count: number;
  memberNames: string[];
}

function classifyProfileRegion(
  region?: string | null,
  specificLocation?: string | null
): "hcm" | "hn" | "other" | "overseas" {
  const r = (region || "").trim().toLowerCase();
  const s = (specificLocation || "").trim().toLowerCase();

  if (r === "hcm" || r.includes("hồ chí minh") || r.includes("sài gòn")) return "hcm";
  if (r === "hn" || r.includes("hà nội")) return "hn";
  if (r === "overseas" || r.includes("nước ngoài") || r.includes("ngoại") || r.includes("quốc tế")) {
    return "overseas";
  }
  if (r === "dn" || r === "other" || r.includes("đà nẵng") || r.includes("tỉnh")) {
    return "other";
  }

  if (s.includes("hà nội")) return "hn";
  if (s.includes("hồ chí minh") || s.includes("sài gòn") || s.includes("thủ đức")) return "hcm";
  if (
    /quốc tế|nước ngoài|australia|singapore|canada|nhật bản|hàn quốc|châu âu|hoa kỳ|united states|\b(usa|uk|us|germany|france|japan|korea)\b/i.test(
      s
    )
  ) {
    return "overseas";
  }
  if (
    /đà nẵng|nha trang|khánh hòa|huế|cần thơ|hải phòng|bình dương|đồng nai|vũng tàu|đà lạt|lâm đồng|quảng nam|quy nhơn|bình định/i.test(
      s
    )
  ) {
    return "other";
  }
  return "hcm";
}

function normalizeProvinceInfo(raw?: string | null): {
  key: string;
  label: string;
  shortLabel: string;
  northOrder: number;
} {
  const cleaned = (raw || "").trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return { key: "tinh-khac", label: "Tỉnh khác", shortLabel: "Tỉnh khác", northOrder: 50 };
  }

  const lower = cleaned.toLowerCase();
  const presets: { test: RegExp; label: string; shortLabel: string; northOrder: number }[] = [
    { test: /hải phòng/i, label: "Hải Phòng", shortLabel: "Hải Phòng", northOrder: 10 },
    { test: /thanh hóa/i, label: "Thanh Hóa", shortLabel: "Thanh Hóa", northOrder: 15 },
    { test: /nghệ an|vinh/i, label: "Nghệ An", shortLabel: "Nghệ An", northOrder: 18 },
    { test: /huế|thừa thiên/i, label: "Thừa Thiên Huế", shortLabel: "Thừa Thiên Huế", northOrder: 25 },
    { test: /đà nẵng/i, label: "Đà Nẵng", shortLabel: "Đà Nẵng", northOrder: 28 },
    { test: /quảng nam|hội an/i, label: "Quảng Nam", shortLabel: "Quảng Nam", northOrder: 30 },
    { test: /quy nhơn|bình định/i, label: "Bình Định", shortLabel: "Quy Nhơn", northOrder: 35 },
    { test: /gia lai/i, label: "Gia Lai", shortLabel: "Gia Lai", northOrder: 38 },
    { test: /đắk lắk|buôn ma thuột/i, label: "Đắk Lắk", shortLabel: "Đắk Lắk", northOrder: 42 },
    { test: /nha trang|khánh hòa/i, label: "Khánh Hòa", shortLabel: "Nha Trang", northOrder: 45 },
    { test: /đà lạt|lâm đồng/i, label: "Lâm Đồng", shortLabel: "Đà Lạt", northOrder: 48 },
    { test: /bình dương/i, label: "Bình Dương", shortLabel: "Bình Dương", northOrder: 60 },
    { test: /đồng nai|biên hòa/i, label: "Đồng Nai", shortLabel: "Đồng Nai", northOrder: 62 },
    { test: /vũng tàu|bà rịa/i, label: "Bà Rịa - Vũng Tàu", shortLabel: "Vũng Tàu", northOrder: 68 },
    { test: /long an/i, label: "Long An", shortLabel: "Long An", northOrder: 72 },
    { test: /tiền giang|mỹ tho/i, label: "Tiền Giang", shortLabel: "Tiền Giang", northOrder: 75 },
    { test: /bến tre/i, label: "Bến Tre", shortLabel: "Bến Tre", northOrder: 78 },
    { test: /cần thơ/i, label: "Cần Thơ", shortLabel: "Cần Thơ", northOrder: 82 },
    { test: /an giang/i, label: "An Giang", shortLabel: "An Giang", northOrder: 85 },
    { test: /kiên giang|phú quốc/i, label: "Kiên Giang", shortLabel: "Kiên Giang", northOrder: 88 },
  ];

  for (const p of presets) {
    if (p.test.test(lower)) {
      return {
        key: p.label.toLowerCase(),
        label: p.label,
        shortLabel: p.shortLabel,
        northOrder: p.northOrder,
      };
    }
  }

  // Bỏ phần ngoặc giải thích nếu quá dài để thẻ trên bản đồ cân đối
  const shortLabel = cleaned.length > 18 ? `${cleaned.slice(0, 16).trim()}…` : cleaned;
  return { key: lower, label: cleaned, shortLabel, northOrder: 50 };
}

/**
 * Tạo bộ tọa độ cân đối trên canvas 920x520 cho N tỉnh thành riêng biệt
 * nằm trong vùng trung tâm - đông nam (không bao giờ đè lên TP.HCM, Hà Nội hay Quốc tế).
 */
function getProvinceCoordinates(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 525, y: 280 }];
  if (count === 2) {
    return [
      { x: 525, y: 232 },
      { x: 560, y: 382 },
    ];
  }
  if (count === 3) {
    return [
      { x: 485, y: 195 },
      { x: 695, y: 278 },
      { x: 500, y: 395 },
    ];
  }
  if (count === 4) {
    return [
      { x: 470, y: 185 },
      { x: 705, y: 245 },
      { x: 475, y: 345 },
      { x: 700, y: 405 },
    ];
  }
  if (count === 5) {
    return [
      { x: 465, y: 175 },
      { x: 715, y: 230 },
      { x: 565, y: 295 },
      { x: 455, y: 405 },
      { x: 715, y: 410 },
    ];
  }
  return [
    { x: 465, y: 180 },
    { x: 715, y: 215 },
    { x: 465, y: 295 },
    { x: 715, y: 320 },
    { x: 465, y: 410 },
    { x: 715, y: 425 },
  ];
}

interface MigrationMapProps {
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export default function MigrationMap({
  selectedRegion = "all",
  onSelectRegion,
}: MigrationMapProps) {
  const [activeHover, setActiveHover] = useState<string | null>(null);
  const { profiles } = useAlumniData();

  // Tổng hợp trực tiếp từ danh sách profiles trong Database (tách riêng từng Tỉnh/Thành phố)
  const { nodes, allProvinces, totalCount } = useMemo(() => {
    const hcmNames: string[] = [];
    const hnNames: string[] = [];
    const overseasNames: string[] = [];
    const provinceMap = new Map<string, ProvinceBucket>();

    for (const p of profiles) {
      const displayName = (p.full_name || "Thành viên K33").trim();
      const region = classifyProfileRegion(p.location_region, p.specific_location);

      if (region === "hcm") {
        hcmNames.push(displayName);
      } else if (region === "hn") {
        hnNames.push(displayName);
      } else if (region === "overseas") {
        overseasNames.push(displayName);
      } else {
        const prov = normalizeProvinceInfo(p.specific_location);
        const existing = provinceMap.get(prov.key);
        if (existing) {
          existing.count += 1;
          existing.memberNames.push(displayName);
        } else {
          provinceMap.set(prov.key, {
            key: prov.key,
            label: prov.label,
            shortLabel: prov.shortLabel,
            northOrder: prov.northOrder,
            count: 1,
            memberNames: [displayName],
          });
        }
      }
    }

    // Sắp xếp các tỉnh theo địa lý Bắc -> Trung -> Nam (và đông thành viên hơn lên trước khi nhiều hơn 6 tỉnh)
    const sortedProvinces = Array.from(provinceMap.values()).sort((a, b) => {
      if (a.northOrder !== b.northOrder) return a.northOrder - b.northOrder;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "vi");
    });

    const builtNodes: MapNode[] = [
      {
        id: "hcm",
        filterKey: "hcm",
        name: "TP. Hồ Chí Minh",
        shortName: "TP.HCM",
        count: hcmNames.length,
        memberNames: hcmNames,
        x: 155,
        y: 375,
        kind: "center",
        isCenter: true,
      },
      {
        id: "hn",
        filterKey: "hn",
        name: "Hà Nội",
        shortName: "Hà Nội",
        count: hnNames.length,
        memberNames: hnNames,
        x: 335,
        y: 92,
        kind: "hn",
      },
    ];

    // Hiển thị tối đa 6 tỉnh thành riêng biệt trên đồ họa SVG (nếu nhiều hơn sẽ gom phần dư vào nút thứ 6)
    const mapProvinces: ProvinceBucket[] =
      sortedProvinces.length <= 6
        ? sortedProvinces
        : [
            ...sortedProvinces.slice(0, 5),
            {
              key: "other-rest",
              label: "Các tỉnh khác",
              shortLabel: `+${sortedProvinces.length - 5} tỉnh khác`,
              northOrder: 99,
              count: sortedProvinces.slice(5).reduce((sum, item) => sum + item.count, 0),
              memberNames: sortedProvinces.slice(5).flatMap((item) => item.memberNames),
            },
          ];

    const coords = getProvinceCoordinates(mapProvinces.length);
    mapProvinces.forEach((prov, idx) => {
      const pt = coords[idx] || { x: 525, y: 280 };
      builtNodes.push({
        id: `prov-${prov.key}`,
        filterKey: prov.key === "other-rest" ? "other" : `province:${prov.label}`,
        name: prov.label,
        shortName: prov.shortLabel,
        count: prov.count,
        memberNames: prov.memberNames,
        x: pt.x,
        y: pt.y,
        kind: "province",
      });
    });

    builtNodes.push({
      id: "overseas",
      filterKey: "overseas",
      name: "Quốc tế",
      shortName: "Quốc tế",
      count: overseasNames.length,
      memberNames: overseasNames,
      x: 785,
      y: 118,
      kind: "overseas",
    });

    return {
      nodes: builtNodes,
      allProvinces: sortedProvinces,
      totalCount: profiles.length,
    };
  }, [profiles]);

  const center = nodes.find((r) => r.isCenter) || nodes[0];
  const destinationNodes = nodes.filter((r) => !r.isCenter);
  const hoveredNode = nodes.find((n) => n.id === activeHover) || null;

  const handleRegionClick = (filterKey: string) => {
    if (onSelectRegion) {
      onSelectRegion(filterKey);
    }
    const dirElement = document.getElementById("directory");
    if (dirElement) {
      dirElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const calculateArc = (to: MapNode) => {
    const dx = to.x - center.x;
    const dy = to.y - center.y;
    let mx = center.x + dx * 0.48;
    let my = center.y + dy * 0.48;

    if (to.kind === "hn") {
      mx = 185;
      my = 165;
    } else if (to.kind === "overseas") {
      mx = 455;
      my = 42;
    } else {
      // Uốn cánh cung mềm mại hướng ra ngoài để các đường bay tỉnh thành không cắt chéo nhau
      const curveLift = to.y < center.y ? -52 : 42;
      mx = center.x + dx * 0.45;
      my = center.y + dy * 0.45 + curveLift;
    }

    return `M ${center.x} ${center.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };

  // Danh sách nút lọc khu vực (tách từng tỉnh cụ thể đang có thành viên)
  const filterPills = useMemo(() => {
    const hcmNode = nodes.find((n) => n.id === "hcm");
    const hnNode = nodes.find((n) => n.id === "hn");
    const overseasNode = nodes.find((n) => n.id === "overseas");

    const list: Array<{ filterKey: string; label: string; count: number; kind: MapNode["kind"] }> = [
      { filterKey: "hcm", label: "TP.HCM", count: hcmNode?.count || 0, kind: "center" },
    ];

    if ((hnNode?.count || 0) > 0) {
      list.push({ filterKey: "hn", label: "Hà Nội", count: hnNode?.count || 0, kind: "hn" });
    }

    for (const prov of allProvinces) {
      list.push({
        filterKey: `province:${prov.label}`,
        label: prov.shortLabel,
        count: prov.count,
        kind: "province",
      });
    }

    list.push({
      filterKey: "overseas",
      label: "Quốc tế",
      count: overseasNode?.count || 0,
      kind: "overseas",
    });

    return list;
  }, [nodes, allProvinces]);

  return (
    <section
      id="map"
      className="scroll-mt-16 bg-gradient-to-b from-white via-white to-slate-50/40 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5 border border-blue-100">
              <Compass size={14} className="text-ueh-orange" /> Mạng lưới cựu sinh viên
            </div>
            <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Từ UEH ta đã đi ...
            </h2>
            <div className="mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
              Từ giảng đường Cơ sở B thân yêu, cựu sinh viên TCDN4 K33 đang tỏa sáng tại TP.HCM, các tỉnh thành khắp cả nước và quốc tế.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start md:self-auto rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-2xs">
            <Sparkles size={14} className="text-ueh-orange" />
            <span>
              Đã kết nối <strong className="text-ueh font-black">{totalCount}</strong> thành viên tại{" "}
              <strong className="text-ueh font-black">
                {nodes.filter((n) => n.count > 0).length}
              </strong>{" "}
              điểm đến
            </span>
          </div>
        </div>

        {/* Filter Pills theo từng Tỉnh / Thành phố cụ thể */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">
            Điểm đến:
          </span>
          <button
            onClick={() => handleRegionClick("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedRegion === "all"
                ? "bg-ueh text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({totalCount})
          </button>
          {filterPills.map((pill) => {
            const isSelected = selectedRegion === pill.filterKey;
            return (
              <button
                key={pill.filterKey}
                onClick={() => handleRegionClick(pill.filterKey)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-ueh-light text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-ueh"
                }`}
              >
                {pill.kind === "overseas" ? (
                  <Globe size={12} className={isSelected ? "text-ueh-gold" : "text-emerald-600"} />
                ) : (
                  <MapPin
                    size={12}
                    className={
                      pill.kind === "center"
                        ? "text-ueh-gold"
                        : isSelected
                        ? "text-white"
                        : "text-rose-500"
                    }
                  />
                )}
                <span>
                  {pill.label} ({pill.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Responsive Constellation Map */}
        <div className="relative h-[380px] sm:h-[470px] md:h-[520px] lg:h-[560px] w-full overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#001428] via-[#001C36] to-[#001122] shadow-2xl">
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: "radial-gradient(#38bdf8 1.4px, transparent 1.4px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Soft ambient glow around UEH center & international sky */}
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 920 520"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Flight Arcs */}
            {destinationNodes.map((region) => {
              const isHighlighted = selectedRegion === region.filterKey || activeHover === region.id;
              const isEmpty = region.count === 0;
              const isOverseas = region.kind === "overseas";
              const baseStroke = isHighlighted
                ? "rgba(245, 168, 0, 0.85)"
                : isEmpty
                ? "rgba(148, 163, 184, 0.16)"
                : isOverseas
                ? "rgba(52, 211, 153, 0.35)"
                : "rgba(56, 189, 248, 0.30)";
              const dashStroke = isHighlighted
                ? "#F5A800"
                : isEmpty
                ? "rgba(148, 163, 184, 0.25)"
                : isOverseas
                ? "#34d399"
                : "#38bdf8";

              return (
                <g key={`path-${region.id}`}>
                  <path
                    d={calculateArc(region)}
                    fill="none"
                    stroke={baseStroke}
                    strokeWidth={isHighlighted ? 4 : isEmpty ? 1.5 : 2.5}
                  />
                  {!isEmpty && (
                    <path
                      d={calculateArc(region)}
                      fill="none"
                      stroke={dashStroke}
                      strokeWidth={isHighlighted ? 2.5 : 1.8}
                      className="arc-dash"
                    />
                  )}
                </g>
              );
            })}

            {/* Center Node: TP. Hồ Chí Minh (UEH Cơ sở B) */}
            <g
              className="cursor-pointer group"
              onClick={() => handleRegionClick(center.filterKey)}
              onMouseEnter={() => setActiveHover(center.id)}
              onMouseLeave={() => setActiveHover(null)}
            >
              <circle
                cx={center.x}
                cy={center.y}
                r={38}
                className="fill-yellow-400 animate-ping"
                opacity="0.18"
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
                className="fill-yellow-400 stroke-[3] stroke-white"
              />

              <g transform={`translate(${center.x - 95}, ${center.y + 20})`}>
                <rect
                  width="190"
                  height="48"
                  rx="12"
                  fill="#002b4d"
                  stroke="#F5A800"
                  strokeWidth="2"
                />
                <circle cx="24" cy="24" r="11" fill="#F5A800" />
                <text
                  x="24"
                  y="28"
                  textAnchor="middle"
                  fill="#001D33"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="var(--font-inter), system-ui, sans-serif"
                >
                  ★
                </text>
                <text
                  x="44"
                  y="21"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="900"
                  fontFamily="var(--font-inter), system-ui, sans-serif"
                >
                  TP. Hồ Chí Minh
                </text>
                <text
                  x="44"
                  y="37"
                  fill="#F5A800"
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="var(--font-inter), system-ui, sans-serif"
                >
                  {center.count} thành viên
                </text>
              </g>
            </g>

            {/* Destination Nodes: Hà Nội, từng Tỉnh cụ thể, Quốc tế */}
            {destinationNodes.map((region) => {
              const isSelected = selectedRegion === region.filterKey;
              const isHovered = activeHover === region.id;
              const isActive = isSelected || isHovered;
              const isEmpty = region.count === 0;
              const isOverseas = region.kind === "overseas";

              // Tự động cân chiều rộng thẻ theo độ dài tên tỉnh để chữ luôn cân đối, không bị chèn số
              const estimatedTextWidth = region.shortName.length * 8.6;
              const cardWidth = Math.max(146, Math.min(212, Math.round(estimatedTextWidth + 56)));
              const cardHeight = 44;

              const dotColor = isActive
                ? "#F5A800"
                : isEmpty
                ? "#64748b"
                : isOverseas
                ? "#34d399"
                : "#38bdf8";
              const badgeFill = isActive
                ? "#E87722"
                : isEmpty
                ? "#334155"
                : isOverseas
                ? "#059669"
                : "#0284c7";
              const cardFill = isActive
                ? "#003B6F"
                : isEmpty
                ? "#0b2238"
                : isOverseas
                ? "#052e2b"
                : "#002440";
              const cardStroke = isActive
                ? "#F5A800"
                : isEmpty
                ? "#1e3a5f"
                : isOverseas
                ? "#10b981"
                : "#1d4ed8";

              return (
                <g
                  key={region.id}
                  className="cursor-pointer group"
                  opacity={isEmpty && !isActive ? 0.65 : 1}
                  onClick={() => handleRegionClick(region.filterKey)}
                  onMouseEnter={() => setActiveHover(region.id)}
                  onMouseLeave={() => setActiveHover(null)}
                >
                  {!isEmpty && (
                    <circle
                      cx={region.x}
                      cy={region.y}
                      r={isActive ? 20 : 12}
                      fill={dotColor}
                      className="animate-pulse"
                      opacity={isActive ? "0.35" : "0.2"}
                    />
                  )}
                  <circle
                    cx={region.x}
                    cy={region.y}
                    r={isActive ? 7.5 : 5}
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth={isActive ? 2 : 1}
                  />

                  <g transform={`translate(${region.x - cardWidth / 2}, ${region.y - 54})`}>
                    <rect
                      width={cardWidth}
                      height={cardHeight}
                      rx="12"
                      fill={cardFill}
                      stroke={cardStroke}
                      strokeWidth={isActive ? 2 : 1.2}
                    />
                    <text
                      x={(cardWidth - 36) / 2 + 4}
                      y="27"
                      textAnchor="middle"
                      fill={isEmpty ? "#94a3b8" : "#ffffff"}
                      fontSize="13.5"
                      fontWeight="800"
                      fontFamily="var(--font-inter), system-ui, sans-serif"
                    >
                      {region.shortName}
                    </text>
                    <circle cx={cardWidth - 22} cy="22" r="13.5" fill={badgeFill} />
                    <text
                      x={cardWidth - 22}
                      y="26.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12.5"
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

          {/* Hover Preview Tooltip (hiển thị tên thành viên tại tỉnh/khu vực đang rê chuột) */}
          {hoveredNode && hoveredNode.count > 0 && (
            <div className="pointer-events-none absolute top-4 left-4 max-w-xs rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-2.5 text-white shadow-xl backdrop-blur-md animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-black text-yellow-400">
                <MapPin size={13} />
                <span>
                  {hoveredNode.name} ({hoveredNode.count} thành viên)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                {hoveredNode.memberNames.slice(0, 6).join(", ")}
                {hoveredNode.memberNames.length > 6
                  ? ` và ${hoveredNode.memberNames.length - 6} bạn khác`
                  : ""}
              </p>
            </div>
          )}

          {/* Clean Legend */}
          <div className="absolute bottom-3.5 right-3.5 rounded-xl border border-white/10 bg-black/55 px-3.5 py-2 text-white backdrop-blur-md text-[11px] sm:text-xs">
            <span className="text-yellow-400 font-bold">Điểm đến TCDN4</span> • Chạm vào từng tỉnh/khu vực để lọc danh bạ
          </div>
        </div>

        {/* Thẻ tóm tắt cân đối từng điểm đến (tự động chia cột đều 100% chiều ngang) */}
        <div
          className={`mt-4 grid gap-2.5 ${
            filterPills.length <= 2
              ? "grid-cols-2"
              : filterPills.length === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : filterPills.length === 4
              ? "grid-cols-2 lg:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          }`}
        >
          {filterPills.map((pill) => {
            const isSelected = selectedRegion === pill.filterKey;
            const matchingNode = nodes.find((n) => n.filterKey === pill.filterKey);
            const namesPreview = matchingNode?.memberNames.slice(0, 2).join(", ");
            return (
              <button
                key={`card-${pill.filterKey}`}
                type="button"
                onClick={() => handleRegionClick(pill.filterKey)}
                className={`group flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-ueh bg-blue-50/80 ring-2 ring-ueh/20 shadow-xs"
                    : "border-slate-200/80 bg-white hover:border-ueh/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                    {pill.kind === "overseas" ? (
                      <Globe size={13} className="text-emerald-600 shrink-0" />
                    ) : (
                      <MapPin
                        size={13}
                        className={
                          pill.kind === "center"
                            ? "text-ueh-orange shrink-0"
                            : "text-rose-500 shrink-0"
                        }
                      />
                    )}
                    <span className="truncate">{pill.label}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black shrink-0 ${
                      pill.kind === "center"
                        ? "bg-amber-100 text-amber-800"
                        : pill.kind === "overseas"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-50 text-ueh"
                    }`}
                  >
                    {pill.count}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-slate-500 truncate">
                  {namesPreview || "Chưa có thành viên"}
                  {matchingNode && matchingNode.memberNames.length > 2
                    ? ` +${matchingNode.memberNames.length - 2}`
                    : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
