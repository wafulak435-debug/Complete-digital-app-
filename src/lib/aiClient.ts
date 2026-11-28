import { saveUserHistory } from "./supabaseClient";
import { auth } from "./firebase";

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
  } else if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
    } catch {
      // Ignore token fetch errors
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
 * Directly invokes the authenticated Express AI proxy backend endpoints using secureApiFetch,
 * and saves user generation records to Cloud Firestore.
 */
export async function invokeGeminiAction<T = any>(
  action: string,
  legacyEndpoint: string,
  payload: Record<string, any>,
  options?: { saveHistory?: boolean; historyTitle?: string; historyCategory?: string }
): Promise<T> {
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

  // Persist AI generation into Firestore userHistory
  if (
    options?.saveHistory &&
    parsed?.success &&
    typeof parsed?.text === "string" &&
    parsed.text.trim()
  ) {
    const uid = auth.currentUser?.uid;
    saveUserHistory({
      userId: uid,
      title: options.historyTitle || payload.prompt?.slice(0, 80) || action,
      category: options.historyCategory || payload.category || action,
      prompt: String(payload.prompt || payload.topic || payload.message || action),
      response: parsed.text,
      metadata: { action },
    }).catch(() => {});
  }

  return parsed as T;
}
