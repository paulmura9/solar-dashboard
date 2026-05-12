import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import DashboardShell from "@/components/DashboardShell";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "LightTrack",
  description: "Real-time monitoring and control for the solar tracking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(jetbrainsMono.variable)} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
