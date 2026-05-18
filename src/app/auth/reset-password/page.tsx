"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SolarLogo } from "@/components/SolarLogo";

const INVALID_LINK_CHECK_DELAY_MS = 1500;
const REDIRECT_TO_LOGIN_DELAY_MS = 3000;

export default function ResetPasswordPage() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setLinkChecked(true);
      }
    });

    const timer = setTimeout(() => setLinkChecked(true), INVALID_LINK_CHECK_DELAY_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      window.location.replace("/login");
    }, REDIRECT_TO_LOGIN_DELAY_MS);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <SolarLogo />
          <span className="font-bold text-4xl text-[#1e293b] leading-tight tracking-tight">
            Light<span className="text-blue-600">Track</span>
          </span>
        </div>
        <p className="text-xs text-[#94a3b8] tracking-wide">Always on the Bright Side.</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-green-600 to-green-400" />

        <div className="px-7 py-8">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#94a3b8] mb-6">
            Choose a new password
          </p>

          {!linkChecked ? (
            <p className="text-xs text-[#64748b] text-center py-4">Verifying reset link…</p>
          ) : !recoveryReady ? (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-3 text-xs text-[#ef4444] text-center">
              This link is invalid or has expired.
              <br />
              <Link href="/auth/forgot-password" className="mt-2 inline-block text-[#3b82f6] hover:underline font-medium">
                Request a new reset link
              </Link>
            </div>
          ) : success ? (
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-3 text-xs text-green-700 text-center">
              Password updated successfully.
              <br />
              <span className="text-[#94a3b8]">Redirecting to sign in…</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all placeholder:text-[#cbd5e1]"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all placeholder:text-[#cbd5e1]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#ef4444]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-[#94a3b8] tracking-wide">
        Solar Tracker IoT Dashboard — Authorised access only
      </p>
    </div>
  );
}
