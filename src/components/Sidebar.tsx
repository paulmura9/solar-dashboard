"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Eye,
  Sliders,
  Video,
  Settings,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dirt-detection", label: "Dirt Detection", icon: Eye },
  { href: "/control", label: "Control", icon: Sliders },
  { href: "/live", label: "Live Camera", icon: Video },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function SolarLogo() {
  const rays = [0, 60, 120, 180, 240, 300].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x1: 39 + 5 * Math.sin(rad),
      y1: 7 - 5 * Math.cos(rad),
      x2: 39 + 8 * Math.sin(rad),
      y2: 7 - 8 * Math.cos(rad),
    };
  });

  return (
    <svg width="48" height="48" viewBox="0 -2 48 48" fill="none" aria-hidden="true">
      <circle cx="39" cy="7" r="4" fill="#f59e0b" />
      {rays.map((r, i) => (
        <line
          key={i}
          x1={r.x1} y1={r.y1}
          x2={r.x2} y2={r.y2}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <rect x="20" y="32" width="7" height="13" rx="1" fill="#374151" />
      <g transform="rotate(-15, 23.5, 24)">
        <rect x="6" y="18" width="35" height="12" rx="1" fill="#3b82f6" />
        <line x1="14.75" y1="18" x2="14.75" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="23.5" y1="18" x2="23.5" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="32.25" y1="18" x2="32.25" y2="30" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="6" y1="22" x2="41" y2="22" stroke="#1d4ed8" strokeWidth="0.75" />
        <line x1="6" y1="26" x2="41" y2="26" stroke="#1d4ed8" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[220px] flex-col border-r border-[#e2e8f0] bg-white z-40">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#e2e8f0]">
          <SolarLogo />
          <span className="font-bold text-xl text-[#1e293b] leading-tight tracking-tight">
            Light<span className="text-blue-600">Track</span>
          </span>
        </div>
        <nav className="flex-1 py-3 space-y-0.5" suppressHydrationWarning>
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                suppressHydrationWarning
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 text-sm rounded-xl transition-all font-medium ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-[#475569] hover:bg-[#eff6ff] hover:text-blue-700"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] z-40 flex" suppressHydrationWarning>
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              suppressHydrationWarning
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors font-medium ${
                active ? "text-blue-600" : "text-[#94a3b8] hover:text-[#475569]"
              }`}
            >
              <Icon size={19} />
              <span>{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
