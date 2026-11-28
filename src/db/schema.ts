import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const sqlUsers = pgTable("sql_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sqlSchoolEnrollments = pgTable("sql_school_enrollments", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => sqlUsers.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  schoolTrack: text("school_track").notNull(),
  programTitle: text("program_title").notNull(),
  campus: text("campus").notNull().default("Bungoma Main Campus"),
  status: text("status").notNull().default("enrolled"),
  progressPercent: integer("progress_percent").notNull().default(0),
  feeStatus: text("fee_status").notNull().default("pending"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sqlAiCreations = pgTable("sql_ai_creations", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => sqlUsers.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("chat"),
  model: text("model").notNull().default("gemini-4-hydrogen"),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  outputText: text("output_text"),
  svgArtwork: text("svg_artwork"),
  groundingSources: jsonb("grounding_sources").$type<Array<{ title: string; uri: string; type?: string }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sqlCampusCheckins = pgTable("sql_campus_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => sqlUsers.id, { onDelete: "cascade" }),
  campusName: text("campus_name").notNull(),
  note: text("note"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sqlGameScores = pgTable("sql_game_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => sqlUsers.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  gameKey: text("game_key").notNull().default("zion-quest-3d"),
  score: integer("score").notNull(),
  scrollsCollected: integer("scrolls_collected").notNull().default(0),
  waveReached: integer("wave_reached").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sqlUsersRelations = relations(sqlUsers, ({ many }) => ({
  enrollments: many(sqlSchoolEnrollments),
  creations: many(sqlAiCreations),
  campusCheckins: many(sqlCampusCheckins),
  gameScores: many(sqlGameScores),
}));

export const sqlSchoolEnrollmentsRelations = relations(sqlSchoolEnrollments, ({ one }) => ({
  user: one(sqlUsers, {
    fields: [sqlSchoolEnrollments.userId],
    references: [sqlUsers.id],
  }),
}));

export const sqlAiCreationsRelations = relations(sqlAiCreations, ({ one }) => ({
  user: one(sqlUsers, {
    fields: [sqlAiCreations.userId],
    references: [sqlUsers.id],
  }),
}));

export const sqlCampusCheckinsRelations = relations(sqlCampusCheckins, ({ one }) => ({
  user: one(sqlUsers, {
    fields: [sqlCampusCheckins.userId],
    references: [sqlUsers.id],
  }),
}));

export const sqlGameScoresRelations = relations(sqlGameScores, ({ one }) => ({
  user: one(sqlUsers, {
    fields: [sqlGameScores.userId],
    references: [sqlUsers.id],
  }),
}));
