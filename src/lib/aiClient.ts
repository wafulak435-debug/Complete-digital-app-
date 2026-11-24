import { supabase, isSupabaseConfigured, saveUserHistory } from "./supabaseClient";

let activeSessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  activeSessionToken = token && token.trim() ? token.trim() : null;
}

export function getSessionToken(): string | null {
  return activeSessionToken;
}

export async function getAuthHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    ...(extraHeaders || {}),
  };

  if (activeSessionToken) {
    headers["Authorization"] = `Bearer ${activeSessionToken}`;
  } else if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Ignore Supabase token lookup failures during fallback
    }
  }

  return headers;
}

export async function secureApiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const incomingHeaders =
    init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init.headers)
      ? Object.fromEntries(init.headers)
      : (init.headers as Record<string, string> | undefined);

  const authHeaders = await getAuthHeaders(incomingHeaders);
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: authHeaders,
  });
}

/**
 * Unified AI invocation client:
 * - In production (when Supabase is configured and the user has an authenticated session),
 *   invokes the secure `call-gemini` Supabase Edge Function (`supabase.functions.invoke('call-gemini', ...)`).
 * - In the Google AI Studio local preview sandbox (before Supabase env vars are set),
 *   falls back to the authenticated local Express backend endpoint (`/api/...`) using secureApiFetch.
 */
export async function invokeGeminiAction<T = any>(
  action: string,
  legacyEndpoint: string,
  payload: Record<string, any>,
  options?: { saveHistory?: boolean; historyTitle?: string; historyCategory?: string }
): Promise<T> {
  let resultData: any = null;

  if (isSupabaseConfigured && supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const { data, error } = await supabase.functions.invoke("call-gemini", {
        body: {
          action,
          ...payload,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed calling secure Gemini Edge Function.");
      }
      resultData = data;
    }
  }

  // Fallback to authenticated local Express backend endpoint
  if (!resultData) {
    const response = await secureApiFetch(legacyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const parsed = await response.json().catch(() => ({
      success: false,
      error: `Request failed with status ${response.status}.`,
    }));
    if (!response.ok && !parsed.error) {
      parsed.error = `Request rejected (${response.status}).`;
    }
    resultData = parsed;
  }

  // Optionally persist meaningful AI text output into user_history
  if (
    options?.saveHistory &&
    resultData?.success &&
    typeof resultData?.text === "string" &&
    resultData.text.trim()
  ) {
    let uid: string | undefined;
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getUser();
      uid = data?.user?.id;
    }
    saveUserHistory({
      userId: uid,
      title: options.historyTitle || payload.prompt?.slice(0, 80) || action,
      category: options.historyCategory || payload.category || action,
      prompt: String(payload.prompt || payload.topic || payload.message || action),
      response: resultData.text,
      metadata: { action },
    }).catch(() => {});
  }

  return resultData as T;
}
