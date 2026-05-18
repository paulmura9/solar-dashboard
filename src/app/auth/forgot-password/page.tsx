"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SolarLogo } from "@/components/SolarLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Request failed. Please try again.");
      setLoading(false);
    }
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
            Reset your password
          </p>

          {submitted ? (
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-3 text-xs text-green-700 text-center">
              If an account exists for {email}, a reset link has been sent.
              <br />
              <span className="text-[#94a3b8]">Check your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#1e293b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-all placeholder:text-[#cbd5e1]"
                  placeholder="you@example.com"
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
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#64748b]">
        Remembered it?{" "}
        <Link href="/login" className="text-[#3b82f6] hover:underline font-medium">
          Back to sign in
        </Link>
      </p>

      <p className="mt-3 text-[10px] text-[#94a3b8] tracking-wide">
        Solar Tracker IoT Dashboard — Authorised access only
      </p>
    </div>
  );
}
