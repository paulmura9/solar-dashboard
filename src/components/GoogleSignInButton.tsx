"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  className?: string;
}

export function GoogleSignInButton({ className = "" }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent): void {
      if (e.persisted) setLoading(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleClick() {
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full h-10 rounded-lg bg-white border border-[#dadce0] hover:bg-[#f8f9fa] hover:shadow-[0_1px_3px_rgba(0,0,0,0.12)] active:bg-[#f1f3f4] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4285F4] focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:shadow-none disabled:active:scale-100 transition-all duration-150 flex items-center justify-center gap-2 text-sm font-medium text-[#3c4043]"
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="w-[18px] h-[18px] rounded-full border-2 border-[#dadce0] border-t-[#3c4043] animate-spin"
          />
        ) : (
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
          >
            <path
              fill="#4285F4"
              d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            />
          </svg>
        )}
        <span>Sign in with Google</span>
      </button>

      {error && (
        <p className="mt-2 text-xs text-[#ef4444]">{error}</p>
      )}
    </div>
  );
}
