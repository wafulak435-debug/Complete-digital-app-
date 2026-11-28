import { auth } from "./firebase";

export async function sqlApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please sign in with Google to save and sync your data.");
  }

  const idToken = await user.getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
    ...(init.headers as Record<string, string> | undefined),
  };

  return fetch(path, {
    ...init,
    headers,
  });
}

export async function syncSqlProfile(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await sqlApiFetch("/api/sql/profile", {
      method: "POST",
      body: JSON.stringify({
        displayName: user.displayName || user.email?.split("@")[0] || "Zion Member",
        photoUrl: user.photoURL || undefined,
      }),
    });
  } catch {
    // Silent fallback when user has not signed in with Firebase Auth
  }
}

export async function saveSqlCreationRecord(payload: {
  mode: string;
  model: string;
  title: string;
  prompt: string;
  outputText?: string;
  svgArtwork?: string;
  groundingSources?: Array<{ title: string; uri: string; type?: string }>;
}) {
  if (!auth.currentUser) return null;
  try {
    const res = await sqlApiFetch("/api/sql/creations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSqlCreationRecords() {
  if (!auth.currentUser) return [];
  try {
    const res = await sqlApiFetch("/api/sql/creations", { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function deleteSqlCreationRecord(id: number) {
  if (!auth.currentUser) return false;
  try {
    const res = await sqlApiFetch(`/api/sql/creations/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveSqlSchoolEnrollment(payload: {
  studentName: string;
  schoolTrack: string;
  programTitle: string;
  campus?: string;
  status?: string;
  progressPercent?: number;
  feeStatus?: string;
}) {
  if (!auth.currentUser) return null;
  try {
    const res = await sqlApiFetch("/api/sql/school-enrollments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSqlSchoolEnrollments() {
  if (!auth.currentUser) return [];
  try {
    const res = await sqlApiFetch("/api/sql/school-enrollments", { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function saveSqlGameScore(payload: {
  playerName: string;
  gameKey?: string;
  score: number;
  scrollsCollected?: number;
  waveReached?: number;
}) {
  if (!auth.currentUser) return null;
  try {
    const res = await sqlApiFetch("/api/sql/game-scores", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSqlTopGameScores(gameKey = "zion-quest-3d") {
  try {
    const res = await fetch(`/api/sql/game-scores?gameKey=${encodeURIComponent(gameKey)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}
