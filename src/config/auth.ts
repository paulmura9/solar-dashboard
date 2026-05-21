export const AUTH_COOKIE_PREFIX = "sb-";
export const APP_STORAGE_PREFIX = "lighttrack-";
export const LEGACY_APP_STORAGE_PREFIX = "lighttrack_";

export const SIGNED_OUT_QUERY_PARAM = "signedout";
export const SIGNED_OUT_QUERY_VALUE = "1";

export const SIGNOUT_ROUTE = "/auth/signout";
export const LOGIN_ROUTE = "/login";
export const POST_SIGNOUT_REDIRECT = `${LOGIN_ROUTE}?${SIGNED_OUT_QUERY_PARAM}=${SIGNED_OUT_QUERY_VALUE}`;

export const PUBLIC_PATH_PREFIXES = ["/login", "/auth"] as const;
export const PUBLIC_EXACT_PATHS = ["/"] as const;
