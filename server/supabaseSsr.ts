import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";

export interface VerifiedSsrUser {
  uid: string;
  email: string;
  name: string;
  source: "supabase";
}

export interface RequestWithSsrUser extends Request {
  ssrSupabaseUser?: VerifiedSsrUser;
}

export function getSupabaseSsrConfig(): {
  url: string;
  publishableKey: string;
  configured: boolean;
} {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();

  const publishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  const isValidUrl = url.startsWith("https://") || url.startsWith("http://");

  return {
    url,
    publishableKey,
    configured: Boolean(url && publishableKey && isValidUrl),
  };
}

function isHttpsRequest(req: Request): boolean {
  const fwdProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  return req.secure || fwdProto.includes("https") || process.env.NODE_ENV === "production";
}

export function createSupabaseExpressServerClient(
  req: Request,
  res: Response
): SupabaseClient<any, "public", any> | null {
  const { url, publishableKey, configured } = getSupabaseSsrConfig();
  if (!configured) {
    return null;
  }

  const isHttps = isHttpsRequest(req);

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "");
      },
      setAll(cookiesToSet) {
        if (res.headersSent) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          const serialized = serializeCookieHeader(name, value, {
            ...options,
            path: options?.path || "/",
            sameSite: isHttps ? "none" : (options?.sameSite ?? "lax"),
            secure: isHttps ? true : options?.secure,
            httpOnly: options?.httpOnly ?? true,
          });
          res.appendHeader("Set-Cookie", serialized);
        });
      },
    },
    cookieOptions: {
      path: "/",
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
      httpOnly: true,
    },
  });
}

function hasSupabaseAuthCookie(cookieHeader?: string): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)sb-[a-zA-Z0-9_-]+-auth-token/.test(cookieHeader);
}

export async function supabaseSessionRefreshMiddleware(
  req: RequestWithSsrUser,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only inspect/refresh Supabase SSR cookies when auth cookies exist on non-static requests
  if (
    req.path.includes(".") ||
    !hasSupabaseAuthCookie(req.headers.cookie)
  ) {
    return next();
  }

  const supabase = createSupabaseExpressServerClient(req, res);
  if (!supabase) {
    return next();
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (!error && user?.id && user?.email) {
      const emailVerified = Boolean(
        user.email_confirmed_at ||
          user.confirmed_at ||
          user.user_metadata?.email_verified
      );
      const safeEmail = emailVerified ? String(user.email) : `unverified:${user.id}`;
      const name = String(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email.split("@")[0] ||
          "Scholar"
      );
      req.ssrSupabaseUser = {
        uid: String(user.id),
        email: safeEmail,
        name,
        source: "supabase",
      };
    }
  } catch {
    // Non-fatal: downstream auth middleware falls back cleanly
  }

  return next();
}
