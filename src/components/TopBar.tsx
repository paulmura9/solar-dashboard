"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutCompletely } from "@/lib/auth/signOut";
import ConnectionStatusBadge from "@/components/ConnectionStatusBadge";

const supabase = getSupabaseBrowserClient();

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":      "Overview",
  "/analytics":      "Analytics",
  "/dirt-detection": "Dirt Detection",
  "/control":        "Control",
  "/live":           "Live Camera",
  "/settings":       "Settings",
};

export default function TopBar() {
  const [open, setOpen]           = useState(false);
  const [userName, setUserName]   = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname    = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const user = data.session?.user;
      if (user) {
        setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null);
        setUserEmail(user.email ?? null);
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSignOut() {
    await signOutCompletely();
  }

  const title    = PAGE_TITLES[pathname] ?? "LightTrack";
  const initials = userName ? userName.charAt(0).toUpperCase() : "P";

  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b border-[#e2e8f0] bg-white sticky top-0 z-30"
      suppressHydrationWarning
    >
      <h2 className="text-base font-bold text-[#1e293b]" suppressHydrationWarning>{title}</h2>

      <div className="flex items-center gap-4">
        <ConnectionStatusBadge />

        <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b] text-xs font-bold select-none hover:bg-[#cbd5e1] transition-colors focus:outline-none"
        >
          {initials}
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-56 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-50 py-2">
            <div className="px-4 py-2">
              {userName && (
                <p className="text-xs font-semibold text-[#1e293b] truncate">{userName}</p>
              )}
              {userEmail && (
                <p className="text-xs text-[#64748b] truncate">{userEmail}</p>
              )}
              {!userName && !userEmail && (
                <p className="text-xs text-[#94a3b8]">Not signed in</p>
              )}
            </div>
            <div className="border-t border-[#e2e8f0] my-1" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
