import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App safely (avoid duplicate initialization across HMR/module reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable persistent local authentication across sessions
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Could not set browserLocalPersistence for Firebase Auth:", err);
  });
}
const configuredDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db = configuredDatabaseId
  ? getFirestore(app, configuredDatabaseId)
  : getFirestore(app);

export const firebaseConfigInfo = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  databaseId: configuredDatabaseId || "(default)",
};

export interface FirebaseConnectionResult {
  connected: boolean;
  offline: boolean;
  projectId: string;
  databaseId: string;
}

/**
 * Verifies live reachability to the provisioned Cloud Firestore database.
 */
export async function testConnection(): Promise<FirebaseConnectionResult> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return {
      connected: true,
      offline: false,
      projectId: firebaseConfigInfo.projectId,
      databaseId: firebaseConfigInfo.databaseId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "");
    const offline =
      message.includes("the client is offline") ||
      message.includes("unavailable") ||
      message.includes("Could not reach Cloud Firestore backend");
    if (offline) {
      console.error("Please check your Firebase configuration.");
    }
    return {
      connected: !offline,
      offline,
      projectId: firebaseConfigInfo.projectId,
      databaseId: firebaseConfigInfo.databaseId,
    };
  }
}

// Enable offline persistence gracefully for local caching when connection is lost or unavailable
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence failed-precondition: multiple tabs open");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence unimplemented: browser does not support persistence");
    } else {
      console.warn("Firestore persistence failed to enable:", err);
    }
  });
  void testConnection();
}

// Standard Google OAuth Provider for Firebase Auth sign-in
export const firebaseGoogleProvider = new GoogleAuthProvider();
firebaseGoogleProvider.setCustomParameters({ prompt: "select_account" });

// Configure Google OAuth Provider for Google Workspace School & Hub Integration
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");
provider.addScope("https://www.googleapis.com/auth/chat.spaces.readonly");
provider.addScope("https://www.googleapis.com/auth/documents.readonly");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
provider.addScope("https://www.googleapis.com/auth/meetings.space.created");
provider.addScope("https://www.googleapis.com/auth/meetings.space.readonly");
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
provider.addScope("https://www.googleapis.com/auth/forms.body");
provider.addScope("https://www.googleapis.com/auth/calendar");
provider.addScope("https://www.googleapis.com/auth/classroom.courses");
provider.addScope("https://www.googleapis.com/auth/classroom.announcements");
provider.addScope("https://www.googleapis.com/auth/classroom.coursework.me");
provider.addScope("https://www.googleapis.com/auth/classroom.coursework.students");
provider.addScope("https://www.googleapis.com/auth/classroom.courseworkmaterials");
provider.addScope("https://www.googleapis.com/auth/classroom.rosters.readonly");

// Strictly in-memory OAuth access token cache (never written to localStorage/sessionStorage)
let cachedOAuthAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes authentication listener with persistent Firebase session support
 */
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    sessionStorage.removeItem("GMAIL_ACCESS_TOKEN");
  } catch {}

  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      try {
        const idToken = await user.getIdToken();
        try {
          localStorage.setItem("WAFULA_LOGIN_TIMESTAMP", String(Date.now()));
          localStorage.setItem("WAFULA_LAST_ACTIVE_TIME", String(Date.now()));
        } catch {}
        if (onAuthSuccess) onAuthSuccess(user, idToken);
      } catch {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedOAuthAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Performs standard Firebase Google Sign-In and returns user + ID token
 */
export const firebaseGoogleSignIn = async (): Promise<{ user: FirebaseUser; idToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, firebaseGoogleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Performs Google Pop-up authentication to fetch credentials and Workspace OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to extract Google Workspace access token from credentials.");
    }

    cachedOAuthAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedOAuthAccessToken };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the currently active in-memory Google Workspace OAuth access token
 */
export const getAccessToken = (): string | null => {
  return cachedOAuthAccessToken;
};

/**
 * Perform manual logout and clear in-memory token
 */
export const googleLogout = async () => {
  await signOut(auth);
  cachedOAuthAccessToken = null;
  try {
    sessionStorage.removeItem("GMAIL_ACCESS_TOKEN");
    sessionStorage.removeItem("GMAIL_CONNECTED_USER");
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
