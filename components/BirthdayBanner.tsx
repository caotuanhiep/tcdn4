"use client";

import { Cake } from "lucide-react";

interface BirthdayPerson {
  id: string;
  name: string;
  class: string;
  dateStr: string; // e.g. "19/11"
  daysLeft: number;
}

const UPCOMING_BIRTHDAYS: BirthdayPerson[] = [
  {
    id: "b1",
    name: "Trần Thị Bích",
    class: "TC11",
    dateStr: "19/11",
    daysLeft: 1,
  },
  {
    id: "b2",
    name: "Lê Hoàng Cường",
    class: "TC12",
    dateStr: "24/11",
    daysLeft: 6,
  },
  {
    id: "b3",
    name: "Đặng Quốc Hưng",
    class: "TC10",
    dateStr: "02/12",
    daysLeft: 14,
  },
];

export default function BirthdayBanner() {
  return (
    <div className="mx-auto max-w-4xl px-4 mt-6">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 px-4 py-2 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-ueh-orange">
          <Cake size={14} className="text-ueh-orange animate-bounce" />
          <span>Sinh nhật sắp tới:</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600">
          {UPCOMING_BIRTHDAYS.map((person, idx) => (
            <div key={person.id} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-slate-300">•</span>}
              <span className="font-semibold text-slate-800">
                {person.name}{" "}
                <span className="text-[10px] font-bold text-ueh bg-blue-50 px-1 py-0.2 rounded border border-blue-100">
                  {person.class}
                </span>
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                ({person.dateStr} - {person.daysLeft === 0 ? "Hôm nay" : `còn ${person.daysLeft} ngày`})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
