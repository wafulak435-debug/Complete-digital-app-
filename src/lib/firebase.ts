import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google OAuth Provider for Gmail Workspace Integration
export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");
provider.addScope("https://www.googleapis.com/auth/chat.spaces.readonly");
provider.addScope("https://www.googleapis.com/auth/documents.readonly");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
provider.addScope("https://www.googleapis.com/auth/meetings.space.created");
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
provider.addScope("https://www.googleapis.com/auth/forms.body");
provider.addScope("https://www.googleapis.com/auth/calendar");

// In-memory access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes authentication listener
 */
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might have cleared, reset to null
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Performs Google Pop-up authentication to fetch credentials and Gmail access token
 */
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to extract Google Gmail access token from Web credentials.");
    }

    cachedAccessToken = credential.accessToken;
    // Store in session storage temporarily or coordinate memory
    try {
      sessionStorage.setItem("GMAIL_ACCESS_TOKEN", cachedAccessToken);
    } catch (_) {
      // Ignore sessionStorage block in third-party contexts
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google sign in error code:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the currently active Google Gmail access token
 */
export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    return sessionStorage.getItem("GMAIL_ACCESS_TOKEN");
  } catch (_) {
    return null;
  }
};

/**
 * Perform manual logout and clear token
 */
export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem("GMAIL_ACCESS_TOKEN");
  } catch (_) {}
};

/**
 * Helper to construct a raw base64url encoded MIME email message
 */
export function buildMimeMessage(to: string, subject: string, body: string) {
  const emailLines = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body
  ];
  const email = emailLines.join("\r\n");
  
  // Encode as base64url standard (no padding, replace + with -, / with _)
  const base64 = btoa(unescape(encodeURIComponent(email)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Gmail Send Mail Action using live Fetch interface and authorization
 */
export async function sendGmailMessage(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No valid Gmail auth credentials found. Authenticate first.");
  }

  const raw = buildMimeMessage(to, subject, htmlContent);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gmail Send API failure:", errText);
    throw new Error(`Gmail API Error: ${response.statusText}. details: ${errText}`);
  }

  return true;
}

/**
 * Gmail List Messages Action
 */
export async function listGmailMessages(maxResults = 10): Promise<any[]> {
  const token = getAccessToken();
  if (!token) return [];

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Gmail API list failure: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.messages) return [];

  // Fetch details for each message to display user-friendly view list info
  const detailPromises = data.messages.map(async (msg: any) => {
    try {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
        const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "(Unknown)";
        const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
        return {
          id: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          date,
          snippet: detail.snippet || ""
        };
      }
    } catch (e) {
      console.warn("Could not load message headers for snippet:", msg.id, e);
    }
    return { id: msg.id, threadId: msg.threadId, subject: "(Loading Error)", from: "(Error)", snippet: "..." };
  });

  return Promise.all(detailPromises);
}
