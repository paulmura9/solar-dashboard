"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Sliders,
  Video,
  Settings,
} from "lucide-react";
import { SolarLogo } from "@/components/SolarLogo";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dirt-detection", label: "Dirt Detection", icon: Video },
  { href: "/control", label: "Control", icon: Sliders },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

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
