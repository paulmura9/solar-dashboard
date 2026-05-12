"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = getSupabaseBrowserClient();

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
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
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

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (email.trim() === "") {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({ email, password });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.replace("/login");
      }, 3000);
    } catch {
      setError("Sign-up failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2.5 mb-2">
        <SolarLogo />
        <span className="font-bold text-3xl text-[#1e293b] leading-tight tracking-tight">
          Light<span className="text-blue-600">Track</span>
        </span>
      </div>
      <p className="text-xs text-[#94a3b8] mb-8 tracking-wide">Always on the Bright Side.</p>

      <div className="w-full max-w-sm bg-white rounded-xl border-2 border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-green-600 to-green-400" />

        <div className="px-7 py-8">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#94a3b8] mb-6">
            Create an account
          </p>

          {success ? (
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-3 text-xs text-green-700 text-center">
              Check your email to confirm your account.
              <br />
              <span className="text-[#94a3b8]">Redirecting to sign in…</span>
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

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748b]"
                >
                  Password
                </label>
                <input
                  id="password"
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-[#64748b]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#3b82f6] hover:underline font-medium">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-[10px] text-[#94a3b8] tracking-wide">
        Solar Tracker IoT Dashboard — Authorised access only
      </p>
    </div>
  );
}
