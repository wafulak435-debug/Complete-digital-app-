import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseBrowserEnv() {
  const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();

  const supabaseKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  const isValidHttpUrl =
    supabaseUrl.startsWith("https://") || supabaseUrl.startsWith("http://");

  const configured = Boolean(
    supabaseUrl &&
      supabaseKey &&
      isValidHttpUrl &&
      !supabaseUrl.includes("your-project") &&
      !supabaseKey.includes("your-anon-key")
  );

  return {
    supabaseUrl,
    supabaseKey,
    configured,
  };
}

export function createClient(): SupabaseClient<any, "public", any> | null {
  const { supabaseUrl, supabaseKey, configured } = getSupabaseBrowserEnv();
  if (!configured) {
    return null;
  }

  const isHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      path: "/",
      sameSite: isHttps ? "none" : "lax",
      secure: isHttps,
    },
  });
}
