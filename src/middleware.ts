import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_PREFIX,
  LOGIN_ROUTE,
  PUBLIC_EXACT_PATHS,
  PUBLIC_PATH_PREFIXES,
} from "@/config/auth";

const EPOCH = new Date(0);

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT_PATHS.includes(pathname as (typeof PUBLIC_EXACT_PATHS)[number]) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user) {
    const orphanCookies = request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith(AUTH_COOKIE_PREFIX));

    if (orphanCookies.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `middleware: clearing ${orphanCookies.length} orphan auth cookies on ${pathname}`
        );
      }
      const target = isPublic
        ? supabaseResponse
        : NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
      for (const { name } of orphanCookies) {
        target.cookies.set(name, "", {
          path: "/",
          maxAge: 0,
          expires: EPOCH,
        });
      }
      if (!isPublic) return applyNoStore(target);
      supabaseResponse = target;
    }

    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_ROUTE;
      return applyNoStore(NextResponse.redirect(url));
    }
  }

  if (!isPublic) applyNoStore(supabaseResponse);
  return supabaseResponse;
}

function applyNoStore(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
