"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useInactivitySignOut } from "@/hooks/useInactivitySignOut";
import { DashboardWSProvider } from "@/components/providers/DashboardWSProvider";

function AuthShell({ children }: { children: React.ReactNode }) {
  useInactivitySignOut();

  return (
    <>
      <Sidebar />
      <div className="md:ml-[220px] flex flex-col min-h-screen pb-16 md:pb-0">
        <TopBar />
        <main className="flex-1 p-5 bg-[#f8fafc]">{children}</main>
      </div>
    </>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth/");

  if (isAuthPage) return <>{children}</>;

  return (
    <DashboardWSProvider>
      <AuthShell>{children}</AuthShell>
    </DashboardWSProvider>
  );
}
