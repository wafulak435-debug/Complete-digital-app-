import { and, desc, eq } from "drizzle-orm";
import { db } from "./index.ts";
import {
  sqlAiCreations,
  sqlCampusCheckins,
  sqlGameScores,
  sqlSchoolEnrollments,
  sqlUsers,
} from "./schema.ts";

export interface UpsertSqlUserInput {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
}

export async function getOrCreateSqlUser(input: UpsertSqlUserInput) {
  try {
    const safeEmail = input.email?.trim() || `${input.uid}@users.zion.local`;
    const [row] = await db
      .insert(sqlUsers)
      .values({
        id: input.uid,
        email: safeEmail,
        displayName: input.displayName || safeEmail.split("@")[0],
        photoUrl: input.photoUrl || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sqlUsers.id,
        set: {
          email: safeEmail,
          displayName: input.displayName || safeEmail.split("@")[0],
          photoUrl: input.photoUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error("Failed to sync user profile in database", { cause: error });
  }
}

export async function listSqlCreations(userId: string, limitCount = 25) {
  try {
    return await db
      .select()
      .from(sqlAiCreations)
      .where(eq(sqlAiCreations.userId, userId))
      .orderBy(desc(sqlAiCreations.createdAt))
      .limit(limitCount);
  } catch (error) {
    throw new Error("Failed to fetch AI studio history", { cause: error });
  }
}

export async function createSqlCreation(input: {
  userId: string;
  mode: string;
  model: string;
  title: string;
  prompt: string;
  outputText?: string;
  svgArtwork?: string;
  groundingSources?: Array<{ title: string; uri: string; type?: string }>;
}) {
  try {
    const [row] = await db
      .insert(sqlAiCreations)
      .values({
        userId: input.userId,
        mode: input.mode,
        model: input.model,
        title: input.title.slice(0, 140),
        prompt: input.prompt,
        outputText: input.outputText || null,
        svgArtwork: input.svgArtwork || null,
        groundingSources: input.groundingSources || [],
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error("Failed to save AI studio record", { cause: error });
  }
}

export async function deleteSqlCreation(userId: string, id: number) {
  try {
    const deleted = await db
      .delete(sqlAiCreations)
      .where(and(eq(sqlAiCreations.id, id), eq(sqlAiCreations.userId, userId)))
      .returning();
    return deleted.length > 0;
  } catch (error) {
    throw new Error("Failed to delete AI studio record", { cause: error });
  }
}

export async function listSqlEnrollments(userId: string) {
  try {
    return await db
      .select()
      .from(sqlSchoolEnrollments)
      .where(eq(sqlSchoolEnrollments.userId, userId))
      .orderBy(desc(sqlSchoolEnrollments.enrolledAt));
  } catch (error) {
    throw new Error("Failed to fetch school enrollments", { cause: error });
  }
}

export async function createSqlEnrollment(input: {
  userId: string;
  studentName: string;
  schoolTrack: string;
  programTitle: string;
  campus?: string;
  status?: string;
  progressPercent?: number;
  feeStatus?: string;
}) {
  try {
    const [row] = await db
      .insert(sqlSchoolEnrollments)
      .values({
        userId: input.userId,
        studentName: input.studentName,
        schoolTrack: input.schoolTrack,
        programTitle: input.programTitle,
        campus: input.campus || "Bungoma Main Campus",
        status: input.status || "enrolled",
        progressPercent: input.progressPercent ?? 0,
        feeStatus: input.feeStatus || "pending",
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error("Failed to save school enrollment", { cause: error });
  }
}

export async function listSqlCheckins(userId: string) {
  try {
    return await db
      .select()
      .from(sqlCampusCheckins)
      .where(eq(sqlCampusCheckins.userId, userId))
      .orderBy(desc(sqlCampusCheckins.createdAt))
      .limit(20);
  } catch (error) {
    throw new Error("Failed to fetch campus check-ins", { cause: error });
  }
}

export async function createSqlCheckin(input: {
  userId: string;
  campusName: string;
  note?: string;
  latitude?: string;
  longitude?: string;
}) {
  try {
    const [row] = await db
      .insert(sqlCampusCheckins)
      .values({
        userId: input.userId,
        campusName: input.campusName,
        note: input.note || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error("Failed to save campus check-in", { cause: error });
  }
}

export async function listTopGameScores(gameKey = "zion-quest-3d", limitCount = 10) {
  try {
    return await db
      .select()
      .from(sqlGameScores)
      .where(eq(sqlGameScores.gameKey, gameKey))
      .orderBy(desc(sqlGameScores.score))
      .limit(limitCount);
  } catch (error) {
    throw new Error("Failed to load leaderboard scores", { cause: error });
  }
}

export async function saveGameScore(input: {
  userId: string;
  playerName: string;
  gameKey?: string;
  score: number;
  scrollsCollected?: number;
  waveReached?: number;
}) {
  try {
    const [row] = await db
      .insert(sqlGameScores)
      .values({
        userId: input.userId,
        playerName: input.playerName.slice(0, 60),
        gameKey: input.gameKey || "zion-quest-3d",
        score: Math.max(0, Math.floor(input.score)),
        scrollsCollected: Math.max(0, Math.floor(input.scrollsCollected ?? 0)),
        waveReached: Math.max(1, Math.floor(input.waveReached ?? 1)),
      })
      .returning();
    return row;
  } catch (error) {
    throw new Error("Failed to record game score", { cause: error });
  }
}
