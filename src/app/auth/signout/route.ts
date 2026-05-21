import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_COOKIE_PREFIX,
  POST_SIGNOUT_REDIRECT,
} from "@/config/auth";

export const dynamic = "force-dynamic";

const EPOCH = new Date(0);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const origin = new URL(request.url).origin;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    }
  );

  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("signout: supabase.auth.signOut failed", err);
    }
  }

  for (const { name } of cookieStore.getAll()) {
    if (!name.startsWith(AUTH_COOKIE_PREFIX)) continue;
    try {
      cookieStore.set(name, "", {
        path: "/",
        maxAge: 0,
        expires: EPOCH,
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`signout: failed to clear cookie ${name}`, err);
      }
    }
  }

  const response = NextResponse.redirect(`${origin}${POST_SIGNOUT_REDIRECT}`, {
    status: 303,
  });
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
