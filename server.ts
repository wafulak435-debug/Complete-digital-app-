import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";
import { requireSqlAuth, SqlAuthenticatedRequest } from "./src/middleware/sqlAuth.ts";
import * as sqlRepo from "./src/db/repository.ts";
import {
  attachIdentity,
  AuthenticatedRequest,
  canTutorAccessCourse,
  clearSessionCookie,
  EMPTY_CAPABILITIES,
  enforceAiRateLimit,
  exportSanitizedSecuritySnapshot,
  getSecurityStorageInfo,
  getSupabaseServerStatus,
  hasCapability,
  hashPasswordScrypt,
  MAIN_ADMIN_EMAILS,
  persistSecurityState,
  recordAuditLog,
  requireAdminAccess,
  requireAuth,
  requireMainAdmin,
  requireManagerAccess,
  resolveAuthoritativeRoleAndPermissions,
  resolveSafeFileInsideDir,
  restoreSecurityFromSnapshot,
  sanitizeUploadId,
  securityState,
  setSessionCookie,
  signSessionToken,
  SubAdminCapabilityMap,
  verifyPasswordScrypt,
  verifySupabaseTokenWithServerSdk,
} from "./server/security";
import { supabaseSessionRefreshMiddleware } from "./server/supabaseSsr";
import { mpesaRouter } from "./server/mpesa";
import { academicsRouter } from "./server/academicsRouter";
import { connectRouter } from "./server/connectRouter";
import { academicState, getAcademicStorageInfo, restoreAcademicSnapshot } from "./server/academicLogic";
import {
  deleteVaultFileViaAdmin,
  downloadBookFileFromSupabase,
  ensureSupabaseUploadsBucket,
  getSafeUserStorageFolder,
  getVaultSignedUrlViaAdmin,
  listVaultFilesViaAdmin,
  mirrorBookFileToSupabase,
  sanitizeVaultObjectPath,
  uploadVaultFileViaAdmin,
} from "./server/supabaseStorage";

dotenv.config({ path: [".env.local", ".env"] });

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Refresh @supabase/ssr session cookies when present, then attach verified identity
app.use(supabaseSessionRefreshMiddleware);
app.use(attachIdentity);

// CSRF origin & requested-with check for cookie-authenticated state-changing requests
app.use("/api", (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS" ||
    req.path === "/mpesa/callback" ||
    req.path === "/mpesa/c2b/validation" ||
    req.path === "/mpesa/c2b/confirmation"
  ) {
    return next();
  }
  const hasBearer = Boolean(req.headers.authorization?.startsWith("Bearer "));
  const hasCookie = Boolean(
    req.headers.cookie &&
      (req.headers.cookie.includes("zion_session=") ||
        /(?:^|;\s*)sb-[a-zA-Z0-9_-]+-auth-token/.test(req.headers.cookie))
  );
  if (hasCookie && !hasBearer) {
    const requestedWith = String(req.headers["x-requested-with"] || "").toLowerCase();
    const origin = String(req.headers.origin || "");
    const host = String(req.headers.host || "");
    const originMatchesHost = !origin || (host && origin.includes(host));
    if (requestedWith !== "xmlhttprequest" && !originMatchesHost) {
      return res.status(403).json({ success: false, error: "Invalid request origin." });
    }
  }
  return next();
});

// Lazy-initialize Gemini SDK safely without mock key strings
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

function safeError(_error: unknown, fallbackMessage = "Request could not be completed safely."): string {
  return fallbackMessage;
}

function stripQuestionAnswerKeys(questions: any[]): { question: string; options: string[] }[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q: any) => ({
    question: String(q?.question || ""),
    options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [],
  }));
}

function extractIp(req: Request): string {
  return String(req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim();
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Optional Firebase ID token verification using public project API key
let cachedFirebaseApiKey: string | null = null;
function getFirebaseWebApiKey(): string {
  if (cachedFirebaseApiKey !== null) return cachedFirebaseApiKey;
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      cachedFirebaseApiKey = String(parsed.apiKey || "");
      return cachedFirebaseApiKey;
    }
  } catch {
    // ignore
  }
  cachedFirebaseApiKey = "";
  return "";
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string; name: string } | null> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey || !idToken) return null;
  try {
    const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    const u = data?.users?.[0];
    if (!u?.localId || !u?.email) return null;
    // Do not trust unverified email addresses for admin privilege mapping
    const safeEmail = u.emailVerified ? String(u.email) : `unverified:${u.localId}`;
    return {
      uid: String(u.localId),
      email: safeEmail,
      name: String(u.displayName || String(u.email).split("@")[0]),
    };
  } catch {
    return null;
  }
}

function buildPublicUserResponse(uid: string, email: string, name: string) {
  const resolved = resolveAuthoritativeRoleAndPermissions(email, uid);
  return {
    id: uid,
    email,
    name,
    role: resolved.role,
    isMainAdmin: resolved.isMainAdmin,
    isSuspended: resolved.isSuspended,
    permissions: resolved.capabilities,
    authorizedCourses: resolved.authorizedCourses,
  };
}

// ============================================================================
// M-PESA DARAJA PRODUCTION PAYMENT GATEWAY
// ============================================================================
app.use("/api/mpesa", mpesaRouter);

// ============================================================================
// SCHOOL ACADEMICS (8-4-4 & CBC SETUP, MARKS, ATTENDANCE, REPORT CARDS)
// ============================================================================
app.use("/api/school", academicsRouter);

function getFirebasePublicStatus() {
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      return {
        configured: Boolean(parsed.projectId && parsed.apiKey),
        projectId: String(parsed.projectId || ""),
        authDomain: String(parsed.authDomain || ""),
        firestoreDatabaseId: String(parsed.firestoreDatabaseId || "(default)"),
      };
    }
  } catch {
    // ignore
  }
  return {
    configured: false,
    projectId: "",
    authDomain: "",
    firestoreDatabaseId: "",
  };
}

// ============================================================================
// HEALTH & AUTHENTICATION / SESSION ENDPOINTS
// ============================================================================
app.get("/api/health", (_req, res) => {
  const supabaseStatus = getSupabaseServerStatus();
  res.json({
    status: "ok",
    mode: process.env.NODE_ENV || "development",
    firebase: getFirebasePublicStatus(),
    supabase: {
      configured: supabaseStatus.configured,
      jwksConfigured: supabaseStatus.jwksConfigured,
    },
  });
});

app.get("/api/connections/status", async (_req, res) => {
  const firebase = getFirebasePublicStatus();
  const supabaseStatus = getSupabaseServerStatus();
  let supabaseReachable = false;

  if (supabaseStatus.configured) {
    const supaUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ""
    ).trim();
    const supaKey = (
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      ""
    ).trim();
    if (supaUrl && supaKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(`${supaUrl.replace(/\/+$/, "")}/auth/v1/health`, {
          headers: { apikey: supaKey },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        supabaseReachable = resp.ok;
      } catch {
        supabaseReachable = false;
      }
    }
  }

  res.json({
    success: true,
    firebase,
    supabase: {
      configured: supabaseStatus.configured,
      jwksConfigured: supabaseStatus.jwksConfigured,
      reachable: supabaseReachable,
    },
  });
});

app.get("/api/auth/bootstrap-status", (_req, res) => {
  const hasEnvPasscode = Boolean(process.env.ADMIN_ACCESS_PASSCODE && process.env.ADMIN_ACCESS_PASSCODE.trim().length > 0);
  res.json({
    success: true,
    hasEnvPasscode,
    adminClaimRequired: !hasEnvPasscode && !securityState.adminPasscodeHash,
  });
});

app.post("/api/auth/session", async (req: Request, res: Response) => {
  try {
    const mode = String(req.body?.mode || "login");
    const rawEmail = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const passcode = String(req.body?.passcode || "");
    const name = String(req.body?.name || "").trim();

    if (mode === "demo_member") {
      return res.status(403).json({
        success: false,
        error: "Demo guest bypass is disabled. Please sign in with your real email or Google account.",
      });
    }

    if (mode === "supabase") {
      const accessToken = String(req.body?.accessToken || "");
      const verified = await verifySupabaseTokenWithServerSdk(accessToken);
      if (!verified) {
        return res.status(401).json({ success: false, error: "Invalid or expired Supabase token." });
      }
      const userObj = buildPublicUserResponse(verified.uid, verified.email, verified.name);
      if (userObj.isSuspended) {
        return res.status(403).json({ success: false, error: "Account is suspended." });
      }
      const token = signSessionToken({ uid: verified.uid, email: verified.email, name: verified.name });
      setSessionCookie(res, token, req);
      return res.json({ success: true, sessionToken: token, user: userObj });
    }

    if (mode === "firebase") {
      const idToken = String(req.body?.idToken || "");
      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified) {
        return res.status(401).json({ success: false, error: "Invalid or expired Firebase authentication token." });
      }
      const userObj = buildPublicUserResponse(verified.uid, verified.email, verified.name);
      if (userObj.isSuspended) {
        return res.status(403).json({ success: false, error: "Account is suspended." });
      }
      const token = signSessionToken({ uid: verified.uid, email: verified.email, name: verified.name });
      setSessionCookie(res, token, req);
      return res.json({ success: true, sessionToken: token, user: userObj });
    }

    if (!rawEmail || !rawEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }

    if (mode === "bootstrap_admin") {
      if (!MAIN_ADMIN_EMAILS.has(rawEmail)) {
        return res.status(403).json({ success: false, error: "Only designated principal administrator emails may claim admin setup." });
      }
      if (process.env.ADMIN_ACCESS_PASSCODE || securityState.adminPasscodeHash) {
        return res.status(403).json({ success: false, error: "Administrator passcode is already configured." });
      }
      if (passcode.length < 8) {
        return res.status(400).json({ success: false, error: "Choose an administrator passcode of at least 8 characters." });
      }
      securityState.adminPasscodeHash = hashPasswordScrypt(passcode);
      persistSecurityState();
      const uid = `admin_${crypto.createHash("sha256").update(rawEmail).digest("hex").slice(0, 12)}`;
      const displayName = name || "Principal Administrator";
      const token = signSessionToken({ uid, email: rawEmail, name: displayName });
      setSessionCookie(res, token, req);
      recordAuditLog({
        actorEmail: rawEmail,
        actorRole: "main_admin",
        category: "ADMIN_ACTION",
        action: "ADMIN_PASSCODE_CLAIMED",
        targetType: "system",
        targetId: rawEmail,
        details: "Initial preview administrator passcode configured securely via scrypt hash.",
        ip: extractIp(req),
      });
      return res.json({
        success: true,
        sessionToken: token,
        user: buildPublicUserResponse(uid, rawEmail, displayName),
      });
    }

    if (mode === "register") {
      if (MAIN_ADMIN_EMAILS.has(rawEmail)) {
        return res.status(403).json({ success: false, error: "Administrator accounts cannot be self-registered." });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
      }
      if (securityState.accounts[rawEmail]) {
        return res.status(409).json({ success: false, error: "An account with this email already exists. Please sign in." });
      }
      const uid = `usr_${crypto.randomBytes(8).toString("hex")}`;
      const displayName = name || rawEmail.split("@")[0];
      // Self-registration ALWAYS assigns lowest privilege ("member") — never trusts client role
      securityState.accounts[rawEmail] = {
        id: uid,
        email: rawEmail,
        name: displayName,
        role: "member",
        passwordHash: hashPasswordScrypt(password),
        createdAt: new Date().toISOString(),
      };
      persistSecurityState();
      const token = signSessionToken({ uid, email: rawEmail, name: displayName });
      setSessionCookie(res, token, req);
      return res.status(201).json({
        success: true,
        sessionToken: token,
        user: buildPublicUserResponse(uid, rawEmail, displayName),
      });
    }

    // Standard login or admin_passcode verification
    const secretInput = passcode || password;
    if (!secretInput) {
      return res.status(400).json({ success: false, error: "Password or passcode is required." });
    }

    const existingAccount = securityState.accounts[rawEmail];
    const envAdminPasscode = process.env.ADMIN_ACCESS_PASSCODE?.trim();

    if (MAIN_ADMIN_EMAILS.has(rawEmail)) {
      const envOk = Boolean(envAdminPasscode && timingSafeTextEqual(secretInput, envAdminPasscode));
      const claimedOk = Boolean(securityState.adminPasscodeHash && verifyPasswordScrypt(secretInput, securityState.adminPasscodeHash));
      const accountOk = Boolean(existingAccount && verifyPasswordScrypt(secretInput, existingAccount.passwordHash));

      if (!envOk && !claimedOk && !accountOk) {
        recordAuditLog({
          actorEmail: rawEmail,
          actorRole: "anonymous",
          category: "ACCESS_DENIED",
          action: "ADMIN_LOGIN_FAILED",
          targetType: "auth",
          targetId: rawEmail,
          details: "Failed main administrator authentication attempt.",
          ip: extractIp(req),
        });
        return res.status(401).json({ success: false, error: "Invalid administrator credentials." });
      }

      const uid = existingAccount?.id || `admin_${crypto.createHash("sha256").update(rawEmail).digest("hex").slice(0, 12)}`;
      const displayName = existingAccount?.name || name || "Kelvin Opara Wafula";
      const token = signSessionToken({ uid, email: rawEmail, name: displayName });
      setSessionCookie(res, token, req);
      return res.json({
        success: true,
        sessionToken: token,
        user: buildPublicUserResponse(uid, rawEmail, displayName),
      });
    }

    if (!existingAccount || !verifyPasswordScrypt(secretInput, existingAccount.passwordHash)) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const userObj = buildPublicUserResponse(existingAccount.id, rawEmail, existingAccount.name);
    if (userObj.isSuspended) {
      return res.status(403).json({ success: false, error: "This account has been suspended by administration." });
    }

    const token = signSessionToken({ uid: existingAccount.id, email: rawEmail, name: existingAccount.name });
    setSessionCookie(res, token, req);
    return res.json({ success: true, sessionToken: token, user: userObj });
  } catch (err) {
    console.error("Auth session error:", err);
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  clearSessionCookie(res, req);
  return res.json({ success: true });
});

app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    user: {
      id: req.identity!.uid,
      email: req.identity!.email,
      name: req.identity!.name,
      role: req.identity!.role,
      isMainAdmin: req.identity!.isMainAdmin,
      isSuspended: req.identity!.isSuspended,
      permissions: req.identity!.capabilities,
      authorizedCourses: req.identity!.authorizedCourses,
    },
  });
});

// ============================================================================
// STAGE 3: SERVER-SIDE ADMIN & MANAGER ACCESS CHECKS + RBAC MANAGEMENT
// ============================================================================
app.get("/api/admin/access-check", requireAdminAccess(), (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.identity });
});

app.get("/api/manager/access-check", requireManagerAccess, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, user: req.identity });
});

app.get("/api/admin/sub-admins", requireMainAdmin, (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, subAdmins: Object.values(securityState.subAdminPermissions) });
});

app.post("/api/admin/sub-admins", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const subName = String(req.body?.name || "").trim();
  const rawPerms = (req.body?.permissions || {}) as Partial<SubAdminCapabilityMap>;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid sub-administrator email is required." });
  }
  if (MAIN_ADMIN_EMAILS.has(email)) {
    return res.status(400).json({ success: false, error: "Main administrator permissions cannot be downgraded here." });
  }

  const sanitizedPerms: SubAdminCapabilityMap = {
    allowBroadcast: Boolean(rawPerms.allowBroadcast),
    allowApproval: Boolean(rawPerms.allowApproval),
    allowVault: Boolean(rawPerms.allowVault),
    allowManageBooks: Boolean(rawPerms.allowManageBooks),
    allowConfirmPayments: Boolean(rawPerms.allowConfirmPayments),
    allowManageEnrollments: Boolean(rawPerms.allowManageEnrollments),
    allowManageStudents: Boolean(rawPerms.allowManageStudents),
    allowManageExams: Boolean(rawPerms.allowManageExams),
    allowIssueCertificates: Boolean(rawPerms.allowIssueCertificates),
    allowManageLeadership: Boolean(rawPerms.allowManageLeadership),
    allowManageComputer: Boolean(rawPerms.allowManageComputer),
    allowManageBible: Boolean(rawPerms.allowManageBible),
    allowModeration: Boolean(rawPerms.allowModeration),
    allowSuspendUsers: Boolean(rawPerms.allowSuspendUsers),
  };

  const id = securityState.subAdminPermissions[email]?.id || `sa_${Date.now()}`;
  const record = {
    id,
    name: subName || email.split("@")[0],
    email,
    permissions: sanitizedPerms,
    createdBy: req.identity!.email,
    updatedAt: new Date().toISOString(),
  };

  securityState.subAdminPermissions[email] = record;
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ROLE_CHANGE",
    action: "SUBADMIN_PERMISSION_SAVED",
    targetType: "sub_admin_permission",
    targetId: email,
    details: `Main admin updated capabilities for ${email}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, subAdmin: record });
});

app.put("/api/admin/sub-admins/:email", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const email = decodeURIComponent(req.params.email || "").trim().toLowerCase();
  const existing = securityState.subAdminPermissions[email];
  if (!existing) {
    return res.status(404).json({ success: false, error: "Sub-administrator record not found." });
  }

  const rawPerms = (req.body?.permissions || {}) as Partial<SubAdminCapabilityMap>;
  const updatedPerms: SubAdminCapabilityMap = { ...EMPTY_CAPABILITIES };
  (Object.keys(EMPTY_CAPABILITIES) as (keyof SubAdminCapabilityMap)[]).forEach((k) => {
    updatedPerms[k] = rawPerms[k] !== undefined ? Boolean(rawPerms[k]) : existing.permissions[k];
  });

  existing.permissions = updatedPerms;
  if (req.body?.name) existing.name = String(req.body.name).trim();
  existing.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ROLE_CHANGE",
    action: "SUBADMIN_PERMISSION_UPDATED",
    targetType: "sub_admin_permission",
    targetId: email,
    details: `Updated sub-admin permissions for ${email}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, subAdmin: existing });
});

app.delete("/api/admin/sub-admins/:email", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const email = decodeURIComponent(req.params.email || "").trim().toLowerCase();
  if (!securityState.subAdminPermissions[email]) {
    return res.status(404).json({ success: false, error: "Sub-administrator not found." });
  }
  delete securityState.subAdminPermissions[email];
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ROLE_CHANGE",
    action: "SUBADMIN_REVOKED",
    targetType: "sub_admin_permission",
    targetId: email,
    details: `Revoked sub-admin status for ${email}`,
    ip: extractIp(req),
  });

  return res.json({ success: true });
});

app.get("/api/admin/tutors", requireManagerAccess, (_req: AuthenticatedRequest, res: Response) => {
  const tutors = Object.entries(securityState.tutorCourses).map(([email, courses]) => ({
    email,
    authorizedCourses: courses,
    name: securityState.accounts[email]?.name || email.split("@")[0],
  }));
  return res.json({ success: true, tutors });
});

app.post("/api/admin/tutors/assign", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const courses = Array.isArray(req.body?.authorizedCourses)
    ? req.body.authorizedCourses.map((c: any) => String(c).trim()).filter(Boolean)
    : [];
  const name = String(req.body?.name || "").trim();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid tutor email is required." });
  }
  securityState.tutorCourses[email] = courses;
  if (securityState.accounts[email]) {
    if (securityState.accounts[email].role === "member") {
      securityState.accounts[email].role = "tutor";
    }
    if (name && !securityState.accounts[email].name) {
      securityState.accounts[email].name = name;
    }
    securityState.accounts[email].authorizedCourses = courses;
  } else if (name) {
    securityState.accounts[email] = {
      id: `tutor_${Date.now()}`,
      email,
      name,
      role: "tutor",
      passwordHash: "",
      authorizedCourses: courses,
      createdAt: new Date().toISOString(),
    };
  }
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ROLE_CHANGE",
    action: "TUTOR_COURSES_ASSIGNED",
    targetType: "tutor",
    targetId: email,
    details: `Assigned authorized courses [${courses.join(", ")}] to ${email}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, email, authorizedCourses: courses });
});

app.get("/api/admin/accounts", requireMainAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const accounts = Object.values(securityState.accounts).map((acc) => ({
    id: acc.id,
    email: acc.email,
    name: acc.name,
    role: acc.role,
    authorizedCourses: acc.authorizedCourses || securityState.tutorCourses[acc.email] || [],
    suspended: Boolean(acc.suspended || securityState.suspendedUsers[acc.email]),
    createdAt: acc.createdAt,
  }));
  return res.json({
    success: true,
    accounts,
    suspendedUsers: securityState.suspendedUsers,
  });
});

app.post("/api/admin/accounts", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim();
  const role = String(req.body?.role || "member") as any;
  const password = String(req.body?.password || "");
  const authorizedCourses = Array.isArray(req.body?.authorizedCourses)
    ? req.body.authorizedCourses.map((c: any) => String(c))
    : [];

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid email is required." });
  }
  if (!["sub_admin", "manager", "tutor", "member"].includes(role)) {
    return res.status(400).json({ success: false, error: "Invalid role assignment." });
  }

  const existing = securityState.accounts[email];
  if (!existing && password.length < 6) {
    return res.status(400).json({ success: false, error: "Password of at least 6 characters is required for new staff accounts." });
  }

  securityState.accounts[email] = {
    id: existing?.id || `usr_${crypto.randomBytes(6).toString("hex")}`,
    email,
    name: name || existing?.name || email.split("@")[0],
    role,
    passwordHash: password.length >= 6 ? hashPasswordScrypt(password) : existing!.passwordHash,
    authorizedCourses,
    suspended: existing?.suspended || false,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (role === "tutor") {
    securityState.tutorCourses[email] = authorizedCourses;
  }
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ROLE_CHANGE",
    action: "STAFF_ACCOUNT_SAVED",
    targetType: "account",
    targetId: email,
    details: `Main admin assigned role "${role}" to ${email}`,
    ip: extractIp(req),
  });

  return res.json({
    success: true,
    account: {
      id: securityState.accounts[email].id,
      email,
      name: securityState.accounts[email].name,
      role,
      authorizedCourses,
    },
  });
});

app.post("/api/admin/users/:email/suspend", requireAdminAccess("allowSuspendUsers"), (req: AuthenticatedRequest, res: Response) => {
  const email = decodeURIComponent(req.params.email || "").trim().toLowerCase();
  const reason = String(req.body?.reason || "Suspended by administration").slice(0, 300);

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid user email is required." });
  }
  if (MAIN_ADMIN_EMAILS.has(email)) {
    return res.status(403).json({ success: false, error: "Main administrator cannot be suspended." });
  }

  securityState.suspendedUsers[email] = {
    reason,
    suspendedBy: req.identity!.email,
    suspendedAt: new Date().toISOString(),
  };
  if (securityState.accounts[email]) {
    securityState.accounts[email].suspended = true;
    securityState.accounts[email].suspendedReason = reason;
  }
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "USER_SUSPENSION",
    action: "USER_SUSPENDED",
    targetType: "user",
    targetId: email,
    details: reason,
    ip: extractIp(req),
  });

  return res.json({ success: true, email, suspended: true });
});

app.delete("/api/admin/users/:email/suspend", requireAdminAccess("allowSuspendUsers"), (req: AuthenticatedRequest, res: Response) => {
  const email = decodeURIComponent(req.params.email || "").trim().toLowerCase();
  delete securityState.suspendedUsers[email];
  if (securityState.accounts[email]) {
    securityState.accounts[email].suspended = false;
    delete securityState.accounts[email].suspendedReason;
  }
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "USER_SUSPENSION",
    action: "USER_UNSUSPENDED",
    targetType: "user",
    targetId: email,
    details: `Suspension lifted for ${email}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, email, suspended: false });
});

// ============================================================================
// STAGE 6: IMMUTABLE AUDIT LOG ENDPOINTS
// ============================================================================
app.get("/api/admin/audit-logs", requireAdminAccess("allowVault"), (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  const category = req.query.category ? String(req.query.category) : null;
  const logs = category
    ? securityState.auditLogs.filter((l) => l.category === category).slice(0, limit)
    : securityState.auditLogs.slice(0, limit);
  return res.json({ success: true, auditLogs: logs });
});

app.get("/api/manager/monitoring", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(Number(req.query.limit || 150), 500);
  const subAdminEmails = new Set(Object.keys(securityState.subAdminPermissions).map((e) => e.toLowerCase()));
  const staffActions = securityState.auditLogs
    .filter((l) => l.actorRole !== "main_admin" || subAdminEmails.has((l.actorEmail || "").toLowerCase()))
    .slice(0, limit);
  const blockedAttempts = securityState.auditLogs
    .filter((l) => l.category === "ACCESS_DENIED")
    .slice(0, limit);
  const allRecent = securityState.auditLogs.slice(0, limit);

  const subAdmins = Object.values(securityState.subAdminPermissions).map((sa) => {
    const emailLower = sa.email.toLowerCase();
    const recentCount = securityState.auditLogs.filter((l) => l.actorEmail.toLowerCase() === emailLower).length;
    const deniedCount = securityState.auditLogs.filter(
      (l) => l.actorEmail.toLowerCase() === emailLower && l.category === "ACCESS_DENIED"
    ).length;
    const lastAction = securityState.auditLogs.find((l) => l.actorEmail.toLowerCase() === emailLower) || null;
    return {
      ...sa,
      recentCount,
      deniedCount,
      lastActionAt: lastAction?.timestamp || null,
      lastActionSummary: lastAction ? `${lastAction.action}: ${lastAction.details}` : null,
    };
  });

  return res.json({
    success: true,
    subAdmins,
    staffActions,
    blockedAttempts,
    recentAuditLogs: allRecent,
  });
});

app.all("/api/admin/audit-logs*", requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(403).json({
    success: false,
    error: "Audit logs are server-generated, append-only, and immutable.",
  });
});

// Expose workspace source files ONLY to authenticated Main Admin (excluding dotfiles/.env)
app.get("/api/admin/workspace-files", requireMainAdmin, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const filesMap: Record<string, string> = {};
    const rootFiles = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "firestore.rules"];
    const srcRootFiles = ["src/main.tsx", "src/index.css", "src/App.tsx", "src/types.ts", "src/data.ts", "src/schoolCurriculum.ts"];
    const srcLibFiles = ["src/lib/bibleDb.ts", "src/lib/firebase.ts", "src/lib/firestoreUtils.ts", "src/lib/aiClient.ts"];
    const srcUtilsFiles = ["src/utils/cookies.ts", "src/utils/pdfDb.ts"];

    const allExpectedFiles = [...rootFiles, ...srcRootFiles, ...srcLibFiles, ...srcUtilsFiles];
    const componentsDir = path.join(process.cwd(), "src", "components");
    if (fs.existsSync(componentsDir)) {
      fs.readdirSync(componentsDir).forEach((file) => {
        if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          allExpectedFiles.push(`src/components/${file}`);
        }
      });
    }

    allExpectedFiles.forEach((relPath) => {
      const fullPath = path.join(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        filesMap[relPath] = fs.readFileSync(fullPath, "utf8");
      }
    });

    return res.json({ success: true, files: filesMap });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ============================================================================
// STORAGE HEALTH, ROLLING BACKUP EXPORT & RESTORE (ANTI-DATA-LOSS)
// ============================================================================
app.get("/api/storage/status", requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const uploadFiles = fs.existsSync(PDF_DIR) ? fs.readdirSync(PDF_DIR) : [];
    let uploadsBytes = 0;
    for (const file of uploadFiles) {
      const target = resolveSafeFileInsideDir(PDF_DIR, file);
      if (target && fs.existsSync(target)) {
        try {
          uploadsBytes += fs.statSync(target).size;
        } catch {
          // ignore
        }
      }
    }
    const bucketStatus = await ensureSupabaseUploadsBucket().catch(() => ({
      ready: false,
      bucket: "user-uploads",
    }));
    return res.json({
      success: true,
      firebase: getFirebasePublicStatus(),
      supabase: {
        ...getSupabaseServerStatus(),
        storageBucket: "user-uploads",
        bucketReady: bucketStatus.ready,
      },
      diskPersistence: {
        security: getSecurityStorageInfo(),
        academics: getAcademicStorageInfo(),
        uploadsCount: uploadFiles.length,
        uploadsBytes,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.post("/api/storage/vault/upload", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const fileName = String(req.body?.fileName || "").trim();
    const mimeType = String(req.body?.mimeType || "application/octet-stream").trim();
    const folder = req.body?.folder === "images" ? "images" : "documents";
    const fileBase64 = String(req.body?.fileBase64 || "").trim();

    if (!fileName || !fileBase64) {
      return res.status(400).json({ success: false, error: "fileName and fileBase64 are required." });
    }

    let pureBase64 = fileBase64;
    if (pureBase64.startsWith("data:")) {
      const parts = pureBase64.split(";base64,");
      if (parts[1]) pureBase64 = parts[1];
    }

    const buffer = Buffer.from(pureBase64, "base64");
    if (buffer.length === 0 || buffer.length > 35 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "File must be non-empty and under 35 MB." });
    }

    if (mimeType === "application/pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ success: false, error: "Invalid PDF signature." });
    }

    const ownerFolder = getSafeUserStorageFolder(actor);
    const uploaded = await uploadVaultFileViaAdmin({
      ownerFolder,
      folder,
      fileName,
      mimeType,
      buffer,
    });

    if (!uploaded) {
      return res.status(503).json({ success: false, error: "Supabase Storage bucket is not active." });
    }

    return res.status(201).json({
      success: true,
      path: uploaded.path,
      signedUrl: uploaded.signedUrl,
      storageBackend: "supabase",
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/storage/vault/list", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerFolder = getSafeUserStorageFolder(req.identity!);
    const files = await listVaultFilesViaAdmin(ownerFolder);
    if (!files) {
      return res.status(503).json({ success: false, error: "Supabase Storage bucket is not active.", files: [] });
    }
    return res.json({ success: true, files });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err), files: [] });
  }
});

app.get("/api/storage/vault/signed-url", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const cleanPath = sanitizeVaultObjectPath(String(req.query.path || ""));
    if (!cleanPath) {
      return res.status(400).json({ success: false, error: "Invalid storage object path." });
    }

    const ownerFolder = getSafeUserStorageFolder(actor);
    const allowed =
      cleanPath.startsWith(`${ownerFolder}/`) ||
      actor.isMainAdmin ||
      (cleanPath.startsWith("books/") && hasCapability(actor, "allowManageBooks"));
    if (!allowed) {
      return res.status(403).json({ success: false, error: "Not authorized to access this storage object." });
    }

    const signedUrl = await getVaultSignedUrlViaAdmin(cleanPath, 3600);
    if (!signedUrl) {
      return res.status(404).json({ success: false, error: "Signed URL unavailable for this file." });
    }
    return res.json({ success: true, signedUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.delete("/api/storage/vault", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const cleanPath = sanitizeVaultObjectPath(String(req.body?.path || req.query.path || ""));
    if (!cleanPath) {
      return res.status(400).json({ success: false, error: "Invalid storage object path." });
    }

    const ownerFolder = getSafeUserStorageFolder(actor);
    if (!cleanPath.startsWith(`${ownerFolder}/`) && !actor.isMainAdmin) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this storage object." });
    }

    const deleted = await deleteVaultFileViaAdmin(cleanPath);
    return res.json({ success: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/admin/backup", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: req.identity!.email,
      security: exportSanitizedSecuritySnapshot(),
      academics: academicState,
    };
    recordAuditLog({
      actor: req.identity,
      category: "ADMIN_ACTION",
      action: "ADMIN_BACKUP_EXPORTED",
      targetType: "storage_backup",
      targetId: "full_state",
      details: `Exported verified server state backup (${Object.keys(securityState.books || {}).length} books, ${Object.keys(academicState.students || {}).length} students)`,
      ip: extractIp(req),
    });
    return res.json({ success: true, backup });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.post("/api/admin/restore", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const payload = req.body?.backup || req.body;
    if (!payload || typeof payload !== "object" || (!payload.security && !payload.academics)) {
      return res.status(400).json({
        success: false,
        error: "Valid backup payload containing 'security' and/or 'academics' state is required.",
      });
    }

    const restoredSections: string[] = [];
    if (payload.security) {
      const secResult = restoreSecurityFromSnapshot(payload.security);
      restoredSections.push(...secResult.restoredKeys.map((k) => `security.${k}`));
    }
    if (payload.academics) {
      restoreAcademicSnapshot(payload.academics);
      restoredSections.push("academics");
    }

    recordAuditLog({
      actor: req.identity,
      category: "ADMIN_ACTION",
      action: "ADMIN_BACKUP_RESTORED",
      targetType: "storage_backup",
      targetId: "full_state",
      details: `Restored server backup sections: ${restoredSections.slice(0, 12).join(", ")}`,
      ip: extractIp(req),
    });

    return res.json({ success: true, restoredSections });
  } catch (err) {
    return res.status(400).json({ success: false, error: safeError(err, "Failed to restore backup snapshot.") });
  }
});

// ============================================================================
// STAGE 5: PROTECTED BOOK CATALOG & FILE ACCESS
// ============================================================================
const PDF_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

app.get("/api/books", (req: AuthenticatedRequest, res: Response) => {
  const canManage = req.identity ? hasCapability(req.identity, "allowManageBooks") : false;
  const callerEmail = req.identity?.email.toLowerCase() || "";
  const list = Object.values(securityState.books)
    .filter((b) => {
      if (b.status === "active") return true;
      if (canManage) return true;
      return Boolean(callerEmail && b.authorEmail.toLowerCase() === callerEmail);
    })
    .map((b) => ({
      ...b,
      // Do not expose paid full text over unpurchased public catalog listing
      content: (b.price <= 0 || canManage || (callerEmail && b.authorEmail.toLowerCase() === callerEmail))
        ? b.content
        : undefined,
    }));
  return res.json({ success: true, books: list });
});

app.post("/api/books", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isManagerOrAdmin = hasCapability(actor, "allowManageBooks");
  const bookId = sanitizeUploadId(String(req.body?.id || `book_${Date.now()}`));
  if (!bookId) {
    return res.status(400).json({ success: false, error: "Invalid book ID format." });
  }

  const requestedStatus = String(req.body?.status || "active") === "draft" ? "draft" : "active";
  // Ordinary non-admin authors cannot self-publish directly to active without approval
  const finalStatus: "active" | "draft" = isManagerOrAdmin ? requestedStatus : "draft";

  const record = {
    id: bookId,
    title: String(req.body?.title || "Untitled Book").slice(0, 200),
    author: String(req.body?.author || actor.name).slice(0, 120),
    authorId: actor.uid,
    authorEmail: actor.email.toLowerCase(),
    price: Math.max(0, Number(req.body?.price || 0)),
    status: finalStatus,
    category: String(req.body?.category || "Non-Fiction").slice(0, 60),
    allowPreview: req.body?.allowPreview !== false,
    previewDuration: Number(req.body?.previewDuration || 30),
    content: typeof req.body?.content === "string" ? req.body.content : undefined,
    previewExcerpt: typeof req.body?.previewExcerpt === "string"
      ? req.body.previewExcerpt.slice(0, 1200)
      : typeof req.body?.content === "string"
      ? req.body.content.slice(0, 600)
      : undefined,
    pdfUrl: typeof req.body?.pdfUrl === "string" ? req.body.pdfUrl : undefined,
  };

  securityState.books[bookId] = record;
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "BOOK_ACTION",
    action: "BOOK_CREATED",
    targetType: "book",
    targetId: bookId,
    details: `Book "${record.title}" (${record.status}, KES ${record.price}) saved`,
    ip: extractIp(req),
  });

  return res.status(201).json({ success: true, book: record });
});

app.put("/api/books/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const bookId = sanitizeUploadId(req.params.id);
  if (!bookId) return res.status(400).json({ success: false, error: "Invalid book ID." });
  const existing = securityState.books[bookId];
  if (!existing) return res.status(404).json({ success: false, error: "Book not found." });

  const isBookAdmin = hasCapability(actor, "allowManageBooks");
  const isAuthorOwner = existing.authorEmail === actor.email.toLowerCase() || existing.authorId === actor.uid;
  if (!isBookAdmin && !isAuthorOwner) {
    return res.status(403).json({ success: false, error: "Not authorized to modify this book." });
  }

  if (req.body?.title) existing.title = String(req.body.title).slice(0, 200);
  if (req.body?.category) existing.category = String(req.body.category).slice(0, 60);
  if (req.body?.price !== undefined && isBookAdmin) existing.price = Math.max(0, Number(req.body.price));
  if (req.body?.status && isBookAdmin) {
    existing.status = req.body.status === "draft" ? "draft" : "active";
  }
  if (typeof req.body?.content === "string") {
    existing.content = req.body.content;
    existing.previewExcerpt = req.body.content.slice(0, 600);
  }
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "BOOK_ACTION",
    action: "BOOK_UPDATED",
    targetType: "book",
    targetId: bookId,
    details: `Updated book "${existing.title}"`,
    ip: extractIp(req),
  });

  return res.json({ success: true, book: existing });
});

app.delete("/api/books/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const bookId = sanitizeUploadId(req.params.id);
  if (!bookId) return res.status(400).json({ success: false, error: "Invalid book ID." });
  const existing = securityState.books[bookId];
  if (!existing) return res.status(404).json({ success: false, error: "Book not found." });

  const isBookAdmin = hasCapability(actor, "allowManageBooks");
  const isDraftAuthor = existing.status === "draft" && (existing.authorEmail === actor.email.toLowerCase() || existing.authorId === actor.uid);
  if (!isBookAdmin && !isDraftAuthor) {
    return res.status(403).json({ success: false, error: "Only authorized book administrators may delete published books." });
  }

  delete securityState.books[bookId];
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "BOOK_ACTION",
    action: "BOOK_DELETED",
    targetType: "book",
    targetId: bookId,
    details: `Deleted book "${existing.title}"`,
    ip: extractIp(req),
  });

  return res.json({ success: true });
});

app.get("/api/books/:id/preview", (req: Request, res: Response) => {
  const bookId = sanitizeUploadId(req.params.id);
  if (!bookId) return res.status(400).json({ success: false, error: "Invalid book ID." });
  const book = securityState.books[bookId];
  if (!book) {
    return res.status(404).json({ success: false, error: "Book preview not found." });
  }
  if (book.allowPreview === false) {
    return res.status(403).json({ success: false, error: "Previews are disabled for this volume." });
  }
  return res.json({
    success: true,
    preview: {
      id: book.id,
      title: book.title,
      author: book.author,
      price: book.price,
      previewDuration: book.previewDuration || 30,
      excerpt: book.previewExcerpt || book.content?.slice(0, 600) || `Preview excerpt for ${book.title}. Purchase full volume to unlock all chapters and downloads.`,
    },
  });
});

function hasBookFileAccess(identity: AuthenticatedRequest["identity"] | undefined, bookId: string): { allowed: boolean; reason?: string } {
  const book = securityState.books[bookId];
  if (!book) {
    // Unregistered file in uploads/ requires authenticated book manager or matching entitlement
    if (!identity) return { allowed: false, reason: "Authentication required to access protected document." };
    if (hasCapability(identity, "allowManageBooks") || securityState.bookEntitlements[`${bookId}:${identity.email.toLowerCase()}`]) {
      return { allowed: true };
    }
    return { allowed: false, reason: "Purchase or authorization required to access this document." };
  }

  if (book.price <= 0 && book.status === "active") {
    return { allowed: true };
  }

  if (!identity) {
    return { allowed: false, reason: "Authentication and verified purchase required for paid books." };
  }
  if (identity.isSuspended) {
    return { allowed: false, reason: "Account is suspended." };
  }
  if (hasCapability(identity, "allowManageBooks") || identity.isMainAdmin || identity.role === "manager") {
    return { allowed: true };
  }
  if (book.authorEmail.toLowerCase() === identity.email.toLowerCase() || book.authorId === identity.uid) {
    return { allowed: true };
  }
  if (securityState.bookEntitlements[`${bookId}:${identity.email.toLowerCase()}`]) {
    return { allowed: true };
  }
  return { allowed: false, reason: "Verified purchase required before downloading paid book files." };
}

app.post("/api/books/pdf", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const safeId = sanitizeUploadId(String(req.body?.id || ""));
    const { pdfBase64 } = req.body;
    if (!safeId || !pdfBase64) {
      return res.status(400).json({ success: false, error: "Valid book id and PDF data are required." });
    }

    const existing = securityState.books[safeId];
    const isBookAdmin = hasCapability(actor, "allowManageBooks");
    if (existing && !isBookAdmin && existing.authorEmail !== actor.email.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Not authorized to overwrite this book's PDF." });
    }
    if (!existing && !isBookAdmin) {
      return res.status(403).json({ success: false, error: "Book publishing permission required to upload standalone PDFs." });
    }

    let pureBase64 = String(pdfBase64).trim();
    if (pureBase64.startsWith("data:")) {
      const parts = pureBase64.split(";base64,");
      if (parts[1]) pureBase64 = parts[1];
    }

    const buffer = Buffer.from(pureBase64, "base64");
    if (buffer.length === 0 || buffer.length > 35 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "PDF payload must be non-empty and under 35 MB." });
    }
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ success: false, error: "Invalid PDF signature: file must begin with %PDF-." });
    }

    const filePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}.pdf`);
    if (!filePath) return res.status(400).json({ success: false, error: "Invalid file path." });

    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, filePath);

    await mirrorBookFileToSupabase(safeId, ".pdf", buffer);

    if (existing) {
      existing.pdfUrl = `/api/books/pdf/${safeId}`;
      persistSecurityState();
    }
    return res.json({ success: true, url: `/api/books/pdf/${safeId}`, bytes: buffer.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/books/pdf/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const safeId = sanitizeUploadId(req.params.id);
    if (!safeId) return res.status(400).json({ success: false, error: "Invalid document ID." });

    const access = hasBookFileAccess(req.identity, safeId);
    if (!access.allowed) {
      recordAuditLog({
        actor: req.identity,
        category: "ACCESS_DENIED",
        action: "PAID_PDF_ACCESS_BLOCKED",
        targetType: "book_file",
        targetId: safeId,
        details: access.reason || "Unauthorized paid PDF access attempt",
        ip: extractIp(req),
      });
      return res.status(req.identity ? 403 : 401).json({ success: false, error: access.reason });
    }

    const filePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}.pdf`);
    if (!filePath) {
      return res.status(400).json({ success: false, error: "Invalid document path." });
    }
    if (!fs.existsSync(filePath)) {
      const recovered = await downloadBookFileFromSupabase(safeId, ".pdf");
      if (recovered && recovered.length > 0) {
        const tmpPath = `${filePath}.tmp`;
        fs.writeFileSync(tmpPath, recovered);
        fs.renameSync(tmpPath, filePath);
      } else {
        return res.status(404).json({ success: false, error: "PDF document not found on server." });
      }
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeId}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/books/docx/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const safeId = sanitizeUploadId(req.params.id);
    if (!safeId) return res.status(400).json({ success: false, error: "Invalid document ID." });

    const access = hasBookFileAccess(req.identity, safeId);
    if (!access.allowed) {
      return res.status(req.identity ? 403 : 401).json({ success: false, error: access.reason });
    }

    const filePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}.docx`);
    if (!filePath) {
      return res.status(400).json({ success: false, error: "Invalid document path." });
    }
    if (!fs.existsSync(filePath)) {
      const recovered = await downloadBookFileFromSupabase(safeId, ".docx");
      if (recovered && recovered.length > 0) {
        const tmpPath = `${filePath}.tmp`;
        fs.writeFileSync(tmpPath, recovered);
        fs.renameSync(tmpPath, filePath);
      } else {
        return res.status(404).json({ success: false, error: "Word document not found on server." });
      }
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `inline; filename="${safeId}.docx"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.post("/api/books/upload-doc", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const safeId = sanitizeUploadId(String(req.body?.id || ""));
    const { fileBase64, fileName } = req.body;
    if (!safeId || !fileBase64 || !fileName) {
      return res.status(400).json({ success: false, error: "Valid id, fileBase64, and fileName are required." });
    }

    const ext = path.extname(String(fileName)).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
      return res.status(400).json({ success: false, error: "Only .pdf and .docx uploads are permitted." });
    }

    const existing = securityState.books[safeId];
    const isBookAdmin = hasCapability(actor, "allowManageBooks");
    if (existing && !isBookAdmin && existing.authorEmail !== actor.email.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Not authorized to overwrite this book document." });
    }
    if (!existing && !isBookAdmin && !hasCapability(actor, "allowApproval") && actor.role === "member") {
      // Allow members to upload pending draft documents owned by themselves
      securityState.books[safeId] = {
        id: safeId,
        title: String(fileName).replace(/\.(pdf|docx)$/i, ""),
        author: actor.name,
        authorId: actor.uid,
        authorEmail: actor.email.toLowerCase(),
        price: 0,
        status: "draft",
        category: "Education",
        allowPreview: true,
      };
      persistSecurityState();
    }

    let pureBase64 = String(fileBase64).trim();
    if (pureBase64.startsWith("data:")) {
      const parts = pureBase64.split(";base64,");
      if (parts[1]) pureBase64 = parts[1];
    }

    const buffer = Buffer.from(pureBase64, "base64");
    if (buffer.length === 0 || buffer.length > 35 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "Uploaded file must be non-empty and under 35 MB." });
    }
    if (ext === ".pdf" && buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ success: false, error: "Invalid PDF signature: file must begin with %PDF-." });
    }
    if (ext === ".docx" && buffer.subarray(0, 2).toString("ascii") !== "PK") {
      return res.status(400).json({ success: false, error: "Invalid DOCX archive header." });
    }

    const originalFilePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}${ext}`);
    if (!originalFilePath) return res.status(400).json({ success: false, error: "Invalid destination filename." });

    const tmpDocPath = `${originalFilePath}.tmp`;
    fs.writeFileSync(tmpDocPath, buffer);
    fs.renameSync(tmpDocPath, originalFilePath);

    await mirrorBookFileToSupabase(safeId, ext as ".pdf" | ".docx", buffer);

    let extractedText = "";
    let fileType = "pdf";
    if (ext === ".docx") {
      fileType = "word";
      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        extractedText = mammothResult.value || "";
      } catch (docxErr) {
        console.warn("Mammoth DOCX extraction failed:", docxErr);
      }
    }

    return res.json({
      success: true,
      url: ext === ".pdf" ? `/api/books/pdf/${safeId}` : `/api/books/docx/${safeId}`,
      text: extractedText,
      fileType,
      fileName: path.basename(String(fileName)),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

// ============================================================================
// STAGE 2: ORDERS, FEE PAYMENTS, ENROLLMENTS, CERTIFICATES
// ============================================================================
app.get("/api/orders", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isFinance = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;
  const callerEmail = actor.email.toLowerCase();
  const orders = Object.values(securityState.orders).filter((o) =>
    isFinance || o.userEmail.toLowerCase() === callerEmail || o.userId === actor.uid
  );
  return res.json({ success: true, orders });
});

app.post("/api/orders", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const bookId = sanitizeUploadId(String(req.body?.bookId || ""));
  if (!bookId) return res.status(400).json({ success: false, error: "Valid bookId is required." });

  const catalogBook = securityState.books[bookId];
  const derivedTitle = catalogBook?.title || String(req.body?.bookTitle || "Digital Volume").slice(0, 180);
  const derivedPrice = catalogBook ? catalogBook.price : Math.max(0, Number(req.body?.price || 0));

  // Ignore any client-supplied status/verifiedBy/userId — always starts pending
  const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  const order = {
    id: orderId,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    userName: actor.name,
    bookId,
    bookTitle: derivedTitle,
    price: derivedPrice,
    status: "pending" as const,
    paymentReference: req.body?.paymentReference ? String(req.body.paymentReference).slice(0, 80) : undefined,
    date: now,
    updatedAt: now,
  };

  securityState.orders[orderId] = order;
  persistSecurityState();

  return res.status(201).json({ success: true, order });
});

app.put("/api/orders/:id/status", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const canConfirm = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;
  if (!canConfirm) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "ORDER_STATUS_TAMPER_BLOCKED",
      targetType: "order",
      targetId: req.params.id,
      details: `Unauthorized user attempted to set order status to "${req.body?.status}"`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Only trusted payment processing or finance administrators may confirm orders." });
  }

  const order = securityState.orders[req.params.id];
  if (!order) return res.status(404).json({ success: false, error: "Order not found." });

  const nextStatus = String(req.body?.status || "");
  if (!["approved", "rejected", "pending"].includes(nextStatus)) {
    return res.status(400).json({ success: false, error: "Invalid order status." });
  }

  order.status = nextStatus as any;
  order.verifiedBy = actor.email;
  order.updatedAt = new Date().toISOString();

  if (nextStatus === "approved") {
    securityState.bookEntitlements[`${order.bookId}:${order.userEmail.toLowerCase()}`] = {
      bookId: order.bookId,
      userEmail: order.userEmail.toLowerCase(),
      orderId: order.id,
      grantedAt: new Date().toISOString(),
    };
  } else {
    delete securityState.bookEntitlements[`${order.bookId}:${order.userEmail.toLowerCase()}`];
  }

  persistSecurityState();

  recordAuditLog({
    actor,
    category: "PAYMENT_CONFIRMATION",
    action: `ORDER_${nextStatus.toUpperCase()}`,
    targetType: "order",
    targetId: order.id,
    details: `Order for "${order.bookTitle}" (KES ${order.price}, ${order.userEmail}) marked ${nextStatus}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, order });
});

app.get("/api/fee-payments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isFinance = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;
  const payments = Object.values(securityState.feePayments).filter((p) =>
    isFinance || p.userEmail.toLowerCase() === actor.email.toLowerCase() || p.userId === actor.uid
  );
  return res.json({ success: true, payments });
});

app.post("/api/fee-payments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const feeType = String(req.body?.feeType || "library");
  if (!["library", "certificate", "tuition", "wifi"].includes(feeType)) {
    return res.status(400).json({ success: false, error: "Invalid fee type." });
  }
  const paymentId = `fee_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  const payment = {
    id: paymentId,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    userName: actor.name,
    feeType: feeType as any,
    planName: String(req.body?.planName || feeType).slice(0, 100),
    amount: Math.max(0, Number(req.body?.amount || 0)),
    phoneNumber: String(req.body?.phoneNumber || "").slice(0, 30),
    status: "pending" as const,
    date: now,
    updatedAt: now,
  };
  securityState.feePayments[paymentId] = payment;
  persistSecurityState();
  return res.status(201).json({ success: true, payment });
});

app.put("/api/fee-payments/:id/confirm", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const canConfirm = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;
  if (!canConfirm) {
    return res.status(403).json({ success: false, error: "Finance administrator authorization required." });
  }
  const payment = securityState.feePayments[req.params.id];
  if (!payment) return res.status(404).json({ success: false, error: "Payment not found." });

  const status = req.body?.status === "rejected" ? "rejected" : "confirmed";
  payment.status = status;
  payment.verifiedBy = actor.email;
  payment.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "PAYMENT_CONFIRMATION",
    action: `FEE_PAYMENT_${status.toUpperCase()}`,
    targetType: "fee_payment",
    targetId: payment.id,
    details: `${payment.feeType} fee (KES ${payment.amount}) for ${payment.userEmail} marked ${status}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, payment });
});

app.get("/api/enrollments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isEnrolAdmin = hasCapability(actor, "allowManageEnrollments") || actor.role === "manager" || actor.isMainAdmin;
  const list = Object.values(securityState.enrollments).filter((e) =>
    isEnrolAdmin || e.userEmail.toLowerCase() === actor.email.toLowerCase() || e.userId === actor.uid
  );
  return res.json({ success: true, enrollments: list });
});

app.post("/api/enrollments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseId = String(req.body?.courseId || "").trim();
  const courseTopic = String(req.body?.courseTopic || "").trim();
  if (!courseId || !courseTopic) {
    return res.status(400).json({ success: false, error: "courseId and courseTopic are required." });
  }

  const enrollmentId = `enr_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  // Students cannot approve their own enrollment, feeStatus, or certificateIssued
  const enrollment = {
    id: enrollmentId,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    studentName: String(req.body?.studentName || actor.name).slice(0, 120),
    admNo: String(req.body?.admNo || `ZD-${Date.now().toString().slice(-6)}`).slice(0, 40),
    phone: String(req.body?.phone || "").slice(0, 30),
    courseId,
    courseTopic: courseTopic.slice(0, 160),
    courseCode: String(req.body?.courseCode || "ZDL-100").slice(0, 40),
    courseFee: Math.max(0, Number(req.body?.courseFee || 0)),
    enrolmentType: (["new", "continuing", "repeat"].includes(req.body?.enrolmentType) ? req.body.enrolmentType : "new") as any,
    mpesaTransactionCode: String(req.body?.mpesaTransactionCode || "").slice(0, 60),
    status: "pending" as const,
    feeStatus: "unpaid" as const,
    certificateIssued: false,
    enrolledAt: now,
    updatedAt: now,
  };

  securityState.enrollments[enrollmentId] = enrollment;
  persistSecurityState();
  return res.status(201).json({ success: true, enrollment });
});

app.put("/api/enrollments/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const canManage = hasCapability(actor, "allowManageEnrollments") || actor.role === "manager" || actor.isMainAdmin;
  if (!canManage) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "ENROLLMENT_MODIFICATION_BLOCKED",
      targetType: "enrollment",
      targetId: req.params.id,
      details: `Unauthorized enrollment approval/fee edit attempted by ${actor.email}`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Only authorized enrollment workflows may approve enrollments or update fee status." });
  }

  const enrollment = securityState.enrollments[req.params.id];
  if (!enrollment) return res.status(404).json({ success: false, error: "Enrollment not found." });

  if (req.body?.status && ["pending", "approved", "rejected"].includes(req.body.status)) {
    enrollment.status = req.body.status;
  }
  if (req.body?.feeStatus && ["unpaid", "paid"].includes(req.body.feeStatus)) {
    if (!hasCapability(actor, "allowConfirmPayments") && actor.role !== "manager" && !actor.isMainAdmin && !hasCapability(actor, "allowManageEnrollments")) {
      return res.status(403).json({ success: false, error: "Not permitted to change fee status." });
    }
    enrollment.feeStatus = req.body.feeStatus;
  }
  if (req.body?.certificateIssued !== undefined) {
    if (!hasCapability(actor, "allowIssueCertificates") && actor.role !== "manager" && !actor.isMainAdmin) {
      return res.status(403).json({ success: false, error: "Certificate issuance permission required." });
    }
    enrollment.certificateIssued = Boolean(req.body.certificateIssued);
  }
  enrollment.reviewedBy = actor.email;
  enrollment.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "ENROLLMENT_APPROVAL",
    action: `ENROLLMENT_${enrollment.status.toUpperCase()}`,
    targetType: "enrollment",
    targetId: enrollment.id,
    details: `Enrollment for ${enrollment.userEmail} (${enrollment.courseTopic}): status=${enrollment.status}, feeStatus=${enrollment.feeStatus}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, enrollment });
});

app.get("/api/certificates", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isCertAdmin = hasCapability(actor, "allowIssueCertificates") || actor.role === "manager" || actor.isMainAdmin;
  const certs = Object.values(securityState.certificates).filter((c) =>
    isCertAdmin || c.studentEmail.toLowerCase() === actor.email.toLowerCase()
  );
  return res.json({ success: true, certificates: certs });
});

app.get("/api/certificates/verify/:id", (req: Request, res: Response) => {
  const cert = securityState.certificates[req.params.id];
  if (!cert || cert.status === "revoked") {
    return res.status(404).json({ success: false, valid: false, error: "Certificate not found or revoked." });
  }
  return res.json({
    success: true,
    valid: true,
    certificate: {
      id: cert.id,
      studentName: cert.studentName,
      schoolName: cert.schoolName,
      courseTopic: cert.courseTopic,
      score: cert.score,
      ledgerHash: cert.ledgerHash,
      date: cert.date,
    },
  });
});

app.post("/api/certificates/issue", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const canIssue = hasCapability(actor, "allowIssueCertificates") || actor.role === "manager" || actor.isMainAdmin;
  if (!canIssue) {
    return res.status(403).json({ success: false, error: "Certificate issuance permission required." });
  }

  const studentEmail = String(req.body?.studentEmail || "").trim().toLowerCase();
  const studentName = String(req.body?.studentName || "").trim();
  const courseTopic = String(req.body?.courseTopic || "").trim();
  if (!studentEmail || !studentName || !courseTopic) {
    return res.status(400).json({ success: false, error: "studentEmail, studentName, and courseTopic are required." });
  }

  const certId = String(req.body?.id || `CERT-ZD-${Date.now().toString(36).toUpperCase()}`);
  const score = Math.min(100, Math.max(0, Number(req.body?.score || 0)));
  const now = new Date().toISOString();
  const ledgerHash = crypto.createHash("sha256").update(`${certId}:${studentEmail}:${courseTopic}:${score}`).digest("hex").slice(0, 16).toUpperCase();

  const cert = {
    id: certId,
    studentEmail,
    studentName,
    schoolName: String(req.body?.schoolName || "Zion Digital Leadership & Technology Institute"),
    courseTopic,
    score,
    ledgerHash,
    status: "active" as const,
    issuedBy: actor.email,
    date: now.slice(0, 10),
    updatedAt: now,
  };

  securityState.certificates[certId] = cert;
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "CERTIFICATE_ISSUANCE",
    action: "CERTIFICATE_ISSUED",
    targetType: "certificate",
    targetId: certId,
    details: `Issued certificate to ${studentName} (${studentEmail}) for ${courseTopic}`,
    ip: extractIp(req),
  });

  return res.status(201).json({ success: true, certificate: cert });
});

// Only main administrator can edit or remove certificate details
app.put("/api/certificates/:id", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const cert = securityState.certificates[req.params.id];
  if (!cert) return res.status(404).json({ success: false, error: "Certificate not found." });

  if (req.body?.studentName) cert.studentName = String(req.body.studentName).trim();
  if (req.body?.schoolName) cert.schoolName = String(req.body.schoolName).trim();
  if (req.body?.courseTopic) cert.courseTopic = String(req.body.courseTopic).trim();
  if (req.body?.score !== undefined) cert.score = Math.min(100, Math.max(0, Number(req.body.score)));
  if (req.body?.status && ["active", "revoked"].includes(req.body.status)) cert.status = req.body.status;
  cert.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "CERTIFICATE_ISSUANCE",
    action: "CERTIFICATE_EDITED",
    targetType: "certificate",
    targetId: cert.id,
    details: `Main admin edited certificate details for ${cert.id}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, certificate: cert });
});

app.delete("/api/certificates/:id", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (!securityState.certificates[req.params.id]) {
    return res.status(404).json({ success: false, error: "Certificate not found." });
  }
  delete securityState.certificates[req.params.id];
  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "CERTIFICATE_ISSUANCE",
    action: "CERTIFICATE_DELETED",
    targetType: "certificate",
    targetId: req.params.id,
    details: `Main admin removed certificate ${req.params.id}`,
    ip: extractIp(req),
  });

  return res.json({ success: true });
});

// ============================================================================
// STAGE 2: COMMUNITY CHAT (GROUP MEMBERSHIP + MODERATION) & SOCIAL POSTS
// ============================================================================
function isChannelMember(channel: string, email: string): boolean {
  const restricted = securityState.restrictedChannels[channel];
  if (!restricted) return true;
  return restricted.members.map((m) => m.toLowerCase()).includes(email.toLowerCase());
}

app.get("/api/community/messages", (req: AuthenticatedRequest, res: Response) => {
  const channelQuery = req.query.channel ? String(req.query.channel) : null;
  const actor = req.identity;
  const isMod = actor ? (hasCapability(actor, "allowModeration") || actor.isMainAdmin) : false;

  if (channelQuery && securityState.restrictedChannels[channelQuery]) {
    if (!actor || (!isMod && !isChannelMember(channelQuery, actor.email))) {
      return res.status(actor ? 403 : 401).json({
        success: false,
        error: `Membership is required to view messages in ${channelQuery}.`,
      });
    }
  }

  const messages = Object.values(securityState.chatMessages).filter((msg) => {
    if (channelQuery && msg.channel !== channelQuery) return false;
    if (securityState.restrictedChannels[msg.channel]) {
      return Boolean(actor && (isMod || isChannelMember(msg.channel, actor.email)));
    }
    return true;
  });

  return res.json({ success: true, messages });
});

app.post("/api/community/messages", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const channel = String(req.body?.channel || "#General").trim();
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ success: false, error: "Message text is required." });

  const isMod = hasCapability(actor, "allowModeration") || actor.isMainAdmin;
  if (securityState.restrictedChannels[channel] && !isMod && !isChannelMember(channel, actor.email)) {
    return res.status(403).json({ success: false, error: `Group membership required to post in ${channel}.` });
  }

  const msgId = `cmsg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date();
  const message = {
    id: msgId,
    channel,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    userName: actor.name,
    role: actor.role,
    text: text.slice(0, 4000),
    parentId: req.body?.parentId ? String(req.body.parentId) : undefined,
    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  securityState.chatMessages[msgId] = message;
  persistSecurityState();
  return res.status(201).json({ success: true, message });
});

app.put("/api/community/messages/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const msg = securityState.chatMessages[req.params.id];
  if (!msg) return res.status(404).json({ success: false, error: "Chat message not found." });

  const isOwner = msg.userEmail.toLowerCase() === actor.email.toLowerCase() || msg.userId === actor.uid;
  const isMod = hasCapability(actor, "allowModeration") || actor.isMainAdmin;
  if (!isOwner && !isMod) {
    return res.status(403).json({ success: false, error: "Only the message owner or an authorized moderator may edit this message." });
  }

  const nextText = String(req.body?.text || "").trim();
  if (!nextText) return res.status(400).json({ success: false, error: "Updated text cannot be empty." });

  msg.text = nextText.slice(0, 4000);
  msg.isEdited = true;
  if (!isOwner && isMod) msg.moderated = true;
  persistSecurityState();
  return res.json({ success: true, message: msg });
});

app.delete("/api/community/messages/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const msg = securityState.chatMessages[req.params.id];
  if (!msg) return res.status(404).json({ success: false, error: "Chat message not found." });

  const isOwner = msg.userEmail.toLowerCase() === actor.email.toLowerCase() || msg.userId === actor.uid;
  const isMod = hasCapability(actor, "allowModeration") || actor.isMainAdmin;
  if (!isOwner && !isMod) {
    return res.status(403).json({ success: false, error: "Only the message owner or an authorized moderator may delete this message." });
  }

  delete securityState.chatMessages[req.params.id];
  persistSecurityState();
  return res.json({ success: true });
});

app.post("/api/community/channels/:channel/members", requireAdminAccess("allowModeration"), (req: AuthenticatedRequest, res: Response) => {
  const channel = decodeURIComponent(req.params.channel);
  const memberEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!memberEmail) return res.status(400).json({ success: false, error: "Member email is required." });

  if (!securityState.restrictedChannels[channel]) {
    securityState.restrictedChannels[channel] = { name: channel, members: [] };
  }
  if (!securityState.restrictedChannels[channel].members.includes(memberEmail)) {
    securityState.restrictedChannels[channel].members.push(memberEmail);
    persistSecurityState();
  }
  return res.json({ success: true, channel: securityState.restrictedChannels[channel] });
});

app.get("/api/social/posts", (_req: Request, res: Response) => {
  return res.json({ success: true, posts: Object.values(securityState.socialPosts) });
});

app.post("/api/social/posts", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ success: false, error: "Post text is required." });

  const postId = `post_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const now = new Date().toISOString();
  const post = {
    id: postId,
    targetId: String(req.body?.targetId || "general"),
    kind: (["review", "comment", "post"].includes(req.body?.kind) ? req.body.kind : "post") as any,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    userName: actor.name,
    rating: req.body?.rating !== undefined ? Math.min(5, Math.max(1, Number(req.body.rating))) : undefined,
    text: text.slice(0, 4000),
    parentId: req.body?.parentId ? String(req.body.parentId) : undefined,
    date: now.slice(0, 10),
    updatedAt: now,
  };
  securityState.socialPosts[postId] = post;
  persistSecurityState();
  return res.status(201).json({ success: true, post });
});

app.put("/api/social/posts/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const post = securityState.socialPosts[req.params.id];
  if (!post) return res.status(404).json({ success: false, error: "Social post not found." });

  const isOwner = post.userEmail.toLowerCase() === actor.email.toLowerCase() || post.userId === actor.uid;
  const isMod = hasCapability(actor, "allowModeration") || actor.isMainAdmin;
  if (!isOwner && !isMod) {
    return res.status(403).json({ success: false, error: "Only the post owner or an authorized moderator may edit this post." });
  }

  const nextText = String(req.body?.text || "").trim();
  if (!nextText) return res.status(400).json({ success: false, error: "Post text cannot be empty." });

  post.text = nextText.slice(0, 4000);
  if (!isOwner && isMod) {
    post.isModerated = true;
    post.moderatedReason = String(req.body?.moderatedReason || "Moderated by authorized staff");
  }
  post.updatedAt = new Date().toISOString();
  persistSecurityState();
  return res.json({ success: true, post });
});

app.delete("/api/social/posts/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const post = securityState.socialPosts[req.params.id];
  if (!post) return res.status(404).json({ success: false, error: "Social post not found." });

  const isOwner = post.userEmail.toLowerCase() === actor.email.toLowerCase() || post.userId === actor.uid;
  const isMod = hasCapability(actor, "allowModeration") || actor.isMainAdmin;
  if (!isOwner && !isMod) {
    return res.status(403).json({ success: false, error: "Only the post owner or an authorized moderator may delete this post." });
  }

  delete securityState.socialPosts[req.params.id];
  persistSecurityState();
  return res.json({ success: true });
});

// ============================================================================
// STAGE 4: BACKEND EXAMINATION ENGINE (ANSWER KEY ISOLATION & SERVER GRADING)
// ============================================================================
app.get("/api/exams", requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const exams = Object.values(securityState.exams).map((ex) => ({
    id: ex.id,
    lessonId: ex.lessonId,
    courseTrack: ex.courseTrack,
    courseCode: ex.courseCode || "",
    school: ex.school || "leadership",
    assessmentType: ex.assessmentType || "exam",
    allowMicrophone: ex.allowMicrophone !== false,
    writtenQuestionsCount: Array.isArray(ex.writtenQuestions) ? ex.writtenQuestions.length : 0,
    title: ex.title,
    durationMinutes: ex.durationMinutes,
    maxAttempts: ex.maxAttempts,
    resultsReleased: ex.resultsReleased,
    createdBy: ex.createdBy,
    updatedAt: ex.updatedAt,
    questionsCount: ex.questions.length || (securityState.examAnswerKeys[ex.id]?.answers?.length ?? 0),
  }));
  return res.json({ success: true, exams });
});

app.get("/api/exams/:examId", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const exam = securityState.exams[req.params.examId];
  if (!exam) return res.status(404).json({ success: false, error: "Examination not found." });

  // NEVER return answer keys or explanations from student exam definition endpoint
  return res.json({
    success: true,
    exam: {
      id: exam.id,
      lessonId: exam.lessonId,
      courseTrack: exam.courseTrack,
      courseCode: exam.courseCode || "",
      school: exam.school || "leadership",
      assessmentType: exam.assessmentType || "exam",
      allowMicrophone: exam.allowMicrophone !== false,
      writtenQuestions: Array.isArray(exam.writtenQuestions) ? exam.writtenQuestions : [],
      title: exam.title,
      questions: stripQuestionAnswerKeys(exam.questions),
      durationMinutes: exam.durationMinutes,
      maxAttempts: exam.maxAttempts,
      resultsReleased: exam.resultsReleased,
    },
  });
});

app.post("/api/exams", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseTrack = String(req.body?.courseTrack || "leadership").trim();
  const courseCode = String(req.body?.courseCode || "").trim();
  const examId = sanitizeUploadId(String(req.body?.id || `exam_${Date.now()}`));
  if (!examId) return res.status(400).json({ success: false, error: "Invalid examId." });

  if (
    !canTutorAccessCourse(actor, courseTrack) &&
    !canTutorAccessCourse(actor, examId) &&
    (!courseCode || !canTutorAccessCourse(actor, courseCode))
  ) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "EXAM_CREATE_UNAUTHORIZED",
      targetType: "exam",
      targetId: examId,
      details: `User denied access to author exam for course "${courseTrack}"`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Not authorized to manage CATs or examinations for this course." });
  }

  const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];
  const writtenQuestions = Array.isArray(req.body?.writtenQuestions)
    ? req.body.writtenQuestions
        .map((wq: any) => ({
          prompt: String(wq?.prompt || "").trim().slice(0, 800),
          maxMarks: Math.max(1, Math.min(100, Number(wq?.maxMarks || 10))),
        }))
        .filter((wq: any) => wq.prompt.length > 0)
    : [];
  const now = new Date().toISOString();

  securityState.exams[examId] = {
    id: examId,
    lessonId: String(req.body?.lessonId || courseTrack || examId),
    courseTrack,
    courseCode,
    school: req.body?.school === "bible" ? "bible" : "leadership",
    assessmentType: req.body?.assessmentType === "cat" ? "cat" : "exam",
    allowMicrophone: req.body?.allowMicrophone !== false,
    writtenQuestions,
    title: String(req.body?.title || "Academic Examination").slice(0, 180),
    questions: stripQuestionAnswerKeys(rawQuestions),
    durationMinutes: Math.max(2, Math.min(240, Number(req.body?.durationMinutes || 30))),
    maxAttempts: Math.max(1, Math.min(10, Number(req.body?.maxAttempts || 1))),
    resultsReleased: Boolean(req.body?.resultsReleased ?? false),
    createdBy: actor.email,
    updatedAt: now,
  };

  securityState.examAnswerKeys[examId] = {
    answers: rawQuestions.map((q: any) => ({
      correctIndex: Number(q?.correctIndex || 0),
      explanation: String(q?.explanation || ""),
    })),
    updatedBy: actor.email,
    updatedAt: now,
  };

  persistSecurityState();
  return res.status(201).json({ success: true, exam: securityState.exams[examId] });
});

app.get("/api/examiner/exams/:examId/keys", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const exam = securityState.exams[req.params.examId];
  const keys = securityState.examAnswerKeys[req.params.examId];
  if (!exam || !keys) return res.status(404).json({ success: false, error: "Exam answer keys not found." });

  if (!canTutorAccessCourse(actor, exam.courseTrack) && !canTutorAccessCourse(actor, exam.id)) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "EXAM_ANSWER_KEYS_BLOCKED",
      targetType: "exam_answer_key",
      targetId: req.params.examId,
      details: `Blocked answer key read on course "${exam.courseTrack}" by ${actor.email} (${actor.role})`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Only authorized examiners for this course may access answer keys." });
  }

  return res.json({
    success: true,
    examId: exam.id,
    courseTrack: exam.courseTrack,
    answers: keys.answers,
  });
});

app.post("/api/exams/:examId/start", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const exam = securityState.exams[req.params.examId];
  const keys = securityState.examAnswerKeys[req.params.examId];
  if (!exam || !keys) return res.status(404).json({ success: false, error: "Examination not found." });

  const userAttempts = Object.values(securityState.examAttempts).filter(
    (a) => a.examId === exam.id && a.userEmail.toLowerCase() === actor.email.toLowerCase()
  );

  // Resume active non-expired attempt if already started
  const activeAttempt = userAttempts.find(
    (a) => a.status === "in_progress" && Date.now() <= new Date(a.expiresAt).getTime()
  );
  if (activeAttempt) {
    return res.json({ success: true, attempt: activeAttempt, resumed: true });
  }

  if (userAttempts.length >= exam.maxAttempts) {
    return res.status(403).json({
      success: false,
      error: `Maximum attempt limit (${exam.maxAttempts}) reached for this examination.`,
    });
  }

  const now = Date.now();
  const attemptId = `att_${now}_${crypto.randomBytes(3).toString("hex")}`;
  const attempt = {
    id: attemptId,
    examId: exam.id,
    userId: actor.uid,
    userEmail: actor.email.toLowerCase(),
    userName: actor.name,
    attemptNumber: userAttempts.length + 1,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + exam.durationMinutes * 60_000).toISOString(),
    answers: {},
    score: null,
    correctCount: null,
    totalQuestions: keys.answers.length,
    passed: null,
    status: "in_progress" as const,
    updatedAt: new Date(now).toISOString(),
  };

  securityState.examAttempts[attemptId] = attempt;
  persistSecurityState();

  return res.status(201).json({ success: true, attempt });
});

app.post("/api/exams/:examId/submit", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const exam = securityState.exams[req.params.examId];
  const keys = securityState.examAnswerKeys[req.params.examId];
  if (!exam || !keys) return res.status(404).json({ success: false, error: "Examination not found." });

  // Reject any attempt by client to inject score, passed, or gradedBy
  if (req.body?.score !== undefined || req.body?.passed !== undefined || req.body?.gradedBy !== undefined) {
    return res.status(403).json({
      success: false,
      error: "Exam scores are computed exclusively on the server and cannot be supplied by clients.",
    });
  }

  const attemptId = req.body?.attemptId ? String(req.body.attemptId) : "";
  const attempt = attemptId
    ? securityState.examAttempts[attemptId]
    : Object.values(securityState.examAttempts).find(
        (a) => a.examId === exam.id && a.userEmail.toLowerCase() === actor.email.toLowerCase() && a.status === "in_progress"
      );

  if (!attempt || attempt.userEmail.toLowerCase() !== actor.email.toLowerCase()) {
    return res.status(404).json({ success: false, error: "Active examination attempt not found for your account." });
  }
  if (attempt.status !== "in_progress") {
    return res.status(400).json({ success: false, error: "This examination attempt has already been submitted or expired." });
  }

  const autoSubmitReason = (
    ["completed", "timer_expired", "tab_or_exit"].includes(String(req.body?.autoSubmitReason || ""))
      ? String(req.body?.autoSubmitReason)
      : "completed"
  ) as "completed" | "timer_expired" | "tab_or_exit";

  // Allow server grace for automatic timer/lockdown submissions so unfinished answers still lock & save
  const deadlineGraceMs = autoSubmitReason === "completed" ? 20_000 : 120_000;
  if (Date.now() > new Date(attempt.expiresAt).getTime() + deadlineGraceMs) {
    attempt.autoSubmitReason = "timer_expired";
  }

  const submittedAnswers = (req.body?.answers && typeof req.body.answers === "object") ? req.body.answers : {};
  const writtenAnswers: Record<string, string> = {};
  if (req.body?.writtenAnswers && typeof req.body.writtenAnswers === "object") {
    for (const [k, v] of Object.entries(req.body.writtenAnswers)) {
      writtenAnswers[String(k)] = String(v || "").slice(0, 6000);
    }
  }
  const audioResponses: Record<string, { mimeType: string; dataUrl: string; durationSec?: number }> = {};
  if (req.body?.audioResponses && typeof req.body.audioResponses === "object") {
    for (const [k, v] of Object.entries(req.body.audioResponses as Record<string, any>)) {
      if (v && typeof v.dataUrl === "string" && v.dataUrl.startsWith("data:audio/") && v.dataUrl.length <= 2_500_000) {
        audioResponses[String(k)] = {
          mimeType: String(v.mimeType || "audio/webm").slice(0, 60),
          dataUrl: v.dataUrl,
          durationSec: Number(v.durationSec || 0),
        };
      }
    }
  }

  let correctCount = 0;
  const totalQuestions = keys.answers.length;

  const breakdown = keys.answers.map((k, idx) => {
    const selected = Number(submittedAnswers[idx] ?? submittedAnswers[String(idx)] ?? -1);
    const isCorrect = selected === k.correctIndex;
    if (isCorrect) correctCount += 1;
    return {
      questionIndex: idx,
      selectedIndex: selected,
      isCorrect,
      ...(exam.resultsReleased ? { correctIndex: k.correctIndex, explanation: k.explanation } : {}),
    };
  });

  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= 60;
  const nowIso = new Date().toISOString();

  attempt.assessmentType = exam.assessmentType || "exam";
  attempt.answers = submittedAnswers;
  attempt.writtenAnswers = writtenAnswers;
  attempt.audioResponses = audioResponses;
  attempt.autoSubmitReason = autoSubmitReason;
  attempt.correctCount = correctCount;
  attempt.totalQuestions = totalQuestions;
  attempt.score = score;
  attempt.passed = passed;
  attempt.status = "submitted";
  attempt.submittedAt = nowIso;
  attempt.gradedBy = "server_examiner";
  attempt.updatedAt = nowIso;
  persistSecurityState();

  return res.json({
    success: true,
    attempt,
    score,
    correctCount,
    totalQuestions,
    passed,
    autoSubmitReason,
    resultsReleased: exam.resultsReleased,
    breakdown,
  });
});

app.get("/api/exams/attempts", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const attempts = Object.values(securityState.examAttempts).filter((a) => {
    if (a.userEmail.toLowerCase() === actor.email.toLowerCase()) return true;
    const ex = securityState.exams[a.examId];
    return ex ? canTutorAccessCourse(actor, ex.courseTrack) || canTutorAccessCourse(actor, ex.id) : false;
  });
  return res.json({ success: true, attempts });
});

app.put("/api/exams/attempts/:attemptId/grade", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const attempt = securityState.examAttempts[req.params.attemptId];
  if (!attempt) return res.status(404).json({ success: false, error: "Exam attempt not found." });

  const exam = securityState.exams[attempt.examId];
  const courseTrack = exam?.courseTrack || attempt.examId;
  if (!canTutorAccessCourse(actor, courseTrack) && !canTutorAccessCourse(actor, attempt.examId)) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "EXAM_GRADE_OVERRIDE_BLOCKED",
      targetType: "exam_attempt",
      targetId: attempt.id,
      details: `Unauthorized grade modification attempt by ${actor.email}`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Only authorized course examiners may update exam scores." });
  }

  const nextScore = Math.min(100, Math.max(0, Number(req.body?.score)));
  if (Number.isNaN(nextScore)) {
    return res.status(400).json({ success: false, error: "A valid numeric score between 0 and 100 is required." });
  }

  const prevScore = attempt.score;
  attempt.score = nextScore;
  attempt.passed = nextScore >= 80;
  attempt.gradedBy = actor.email;
  attempt.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "EXAM_RESULT_CHANGE",
    action: "EXAM_SCORE_UPDATED",
    targetType: "exam_attempt",
    targetId: attempt.id,
    details: `Score for ${attempt.userEmail} on ${attempt.examId} updated from ${prevScore} to ${nextScore}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, attempt });
});

app.post("/api/exams/:examId/release", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const exam = securityState.exams[req.params.examId];
  if (!exam) return res.status(404).json({ success: false, error: "Exam not found." });

  if (!canTutorAccessCourse(actor, exam.courseTrack) && !canTutorAccessCourse(actor, exam.id)) {
    return res.status(403).json({ success: false, error: "Only authorized course examiners may release exam results." });
  }

  exam.resultsReleased = req.body?.released !== undefined ? Boolean(req.body.released) : true;
  exam.updatedAt = new Date().toISOString();
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "EXAM_RESULT_CHANGE",
    action: exam.resultsReleased ? "EXAM_RESULTS_RELEASED" : "EXAM_RESULTS_WITHHELD",
    targetType: "exam",
    targetId: exam.id,
    details: `Exam "${exam.title}" resultsReleased set to ${exam.resultsReleased}`,
    ip: extractIp(req),
  });

  return res.json({ success: true, examId: exam.id, resultsReleased: exam.resultsReleased });
});

// ============================================================================
// STAGE 1: SECURE AI ROUTES (AUTHENTICATED + PER-USER RATE LIMITING)
// ============================================================================
app.get("/api/ai/usage", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const key = req.identity!.email.toLowerCase();
  const usage = securityState.aiUsage[key] || { minuteCount: 0, dayCount: 0, totalCount: 0 };
  const dailyLimit = req.identity!.isMainAdmin ? 500 : 100;
  return res.json({
    success: true,
    usage: {
      minuteCount: usage.minuteCount,
      minuteLimit: 15,
      dayCount: usage.dayCount,
      dailyLimit,
      totalCount: usage.totalCount,
    },
  });
});

app.post("/api/my-ai-assistant", requireAdminAccess(), enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userMessage = String(req.body?.message || "");
    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const aiClient = getGenAI();

    if (!aiClient) {
      const fallbackMsg = `[SPECIALIZED ADMIN HUB - OFFLINE PREVIEW]\n\nReceived instruction: "${userMessage}".\nProcessed ${images.length} attached files safely without external AI key.`;
      return res.json({ success: true, data: fallbackMsg, offline: true });
    }

    const parts: any[] = [{ text: userMessage || "Analyze the provided input and photos in high detail." }];
    images.forEach((imgBase64: string) => {
      if (typeof imgBase64 === "string" && imgBase64.startsWith("data:")) {
        const match = imgBase64.match(/data:([^;]+);base64,(.*)/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    });

    const response = await aiClient.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: { parts },
      config: {
        systemInstruction:
          "You are the Super Admin Independent AI Companion, providing analytical explanations and step-by-step guidance.",
      },
    });

    return res.json({ success: true, data: response.text || "Empty response from Gemini." });
  } catch (err) {
    console.error("Admin AI error:", err instanceof Error ? err.message : "unknown");
    return res.status(502).json({ success: false, error: safeError(err, "AI analysis service is temporarily unavailable.") });
  }
});

app.post("/api/ai/assistant", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isSchoolTutorAllowed =
    actor.isMainAdmin ||
    actor.role === "sub_admin" ||
    actor.role === "manager" ||
    actor.role === "tutor";

  if (req.body?.schoolContext && !isSchoolTutorAllowed) {
    return res.status(403).json({
      success: false,
      error: "School AI tools are restricted exclusively to authorized Tutors and Administrators.",
    });
  }

  const {
    prompt,
    voiceInput,
    history,
    category,
    enableGoogleSearch,
    model: requestedModel,
    images,
  } = req.body;

  try {
    const aiClient = getGenAI();
    const contents: any[] = [];
    let systemInstruction =
      "You are Zion Digital's intelligent AI Scholar Companion in Bungoma, Kenya. You remember previous messages in the conversation history and address users respectfully as 'Leader' or 'Scholar'. Format major headings clearly without excess clutter.";

    if (category === "Problem Solver") {
      systemInstruction += " Present formal, step-by-step STEM, Coding, and Mathematics solutions.";
    } else if (category === "Project Plan") {
      systemInstruction += " Generate formal project blueprints, timelines, and milestones.";
    } else if (category === "Book Publisher" || category === "Document Publisher") {
      systemInstruction += " Generate structured, formal, scholarly book chapters.";
    } else if (category === "AI Note Generator") {
      systemInstruction += " Format strictly with TOPIC, SUB-TOPIC, and DETAILED NOTES sections.";
    }

    const userParts: any[] = [
      { text: prompt || (voiceInput ? `Interpret and solve: ${voiceInput}` : "Hello! Introduce yourself.") },
    ];

    let extraDocumentContext = "";
    if (Array.isArray(images)) {
      for (const imgBase64 of images) {
        if (typeof imgBase64 === "string" && imgBase64.startsWith("data:")) {
          const match = imgBase64.match(/data:([^;]+);base64,(.*)/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            if (mimeType.includes("wordprocessingml") || mimeType.includes("docx")) {
              try {
                const docBuffer = Buffer.from(base64Data, "base64");
                const mammothResult = await mammoth.extractRawText({ buffer: docBuffer });
                extraDocumentContext += `\n\n[DOCUMENT CONTENT FROM WORD DOCX]:\n${mammothResult.value || ""}\n`;
              } catch {
                extraDocumentContext += "\n\n[Attached Word document could not be fully parsed]\n";
              }
            } else if (mimeType.includes("text/plain")) {
              extraDocumentContext += `\n\n[DOCUMENT CONTENT FROM TEXT FILE]:\n${Buffer.from(base64Data, "base64").toString("utf8")}\n`;
            } else {
              userParts.push({ inlineData: { mimeType, data: base64Data } });
            }
          }
        }
      }
    }

    if (extraDocumentContext) {
      userParts.push({ text: `\n\n[Attached Reference Documents Context]${extraDocumentContext}` });
    }

    if (Array.isArray(history)) {
      history.slice(-20).forEach((h: any) => {
        const role = h.role === "user" ? "user" : "model";
        const textContent = String(h.text || "").trim();
        if (!textContent) return;
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n\n${textContent}`;
        } else {
          contents.push({ role, parts: [{ text: textContent }] });
        }
      });
    }

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n\n${prompt || ""}`;
      if (userParts.length > 1) contents[contents.length - 1].parts.push(...userParts.slice(1));
    } else {
      contents.push({ role: "user", parts: userParts });
    }

    if (aiClient) {
      const modelToUse = "gemini-4-hydrogen";

      const config: any = {
        systemInstruction,
      };

      const response = await aiClient.models.generateContent({
        model: modelToUse,
        contents,
        config,
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingSources = chunks
        .flatMap((chunk: any) => {
          const items: Array<{ title: string; uri: string; type?: string }> = [];
          if (chunk.web?.uri) {
            items.push({
              title: chunk.web.title || "Grounded Web Source",
              uri: chunk.web.uri,
              type: "web",
            });
          }
          return items;
        })
        .filter((s: any) => s.title && s.uri);

      return res.json({
        success: true,
        text: response.text || "I processed your request, but no text was returned.",
        model: modelToUse,
        groundingSources,
      });
    }

    // Offline preview template when GEMINI_API_KEY is not configured
    const reply =
      category === "Problem Solver"
        ? `STEM ANALYSIS\n\nQuery: "${prompt}"\n\n1. Identify constraints and invariants.\n2. Formulate step-by-step verification.\n3. Confirm solution bounds cleanly.`
        : `ZION DIGITAL AI COMPANION (OFFLINE PREVIEW)\n\nReceived prompt: "${prompt || ""}". Connect server-side GEMINI_API_KEY to enable live cloud responses.`;

    return res.json({ success: true, text: reply, offline: true });
  } catch (err) {
    console.error("AI Assistant error:", err instanceof Error ? err.message : "unknown");
    return res.status(502).json({ success: false, error: safeError(err, "AI assistant request could not be completed.") });
  }
});

function requireSchoolTutorOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const actor = req.identity;
  if (!actor) return res.status(401).json({ success: false, error: "Authentication required." });
  const allowed =
    actor.isMainAdmin ||
    actor.role === "sub_admin" ||
    actor.role === "manager" ||
    actor.role === "tutor";
  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: "School AI tools are restricted to authorized Tutors and Administrators. Students do not have AI access in school.",
    });
  }
  return next();
}

app.post("/api/school/generate-class", requireAuth, requireSchoolTutorOrAdmin, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, schoolType } = req.body;
  if (!topic) return res.status(400).json({ success: false, error: "A topic is required." });

  const track = String(schoolType || "leadership");
  const schoolName =
    track === "computer"
      ? "Zion Digital School of Computer Science & IT"
      : track === "bible"
      ? "Zion Spiritual Covenant Bible School"
      : "Zion Digital Leadership & Public Management School";

  try {
    const aiClient = getGenAI();
    let classData: any = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Generate a complete academic syllabus class for topic "${topic}" at ${schoolName} with exactly 5 points and 5 selfAssessment MCQs.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                slogan: { type: Type.STRING },
                intro: { type: Type.STRING },
                points: { type: Type.ARRAY, items: { type: Type.STRING } },
                illustrationPrompt: { type: Type.STRING },
                selfAssessment: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                  },
                },
              },
              required: ["topic", "slogan", "intro", "points", "illustrationPrompt", "selfAssessment"],
            },
          },
        });
        if (response.text) classData = JSON.parse(response.text.trim());
      } catch {
        classData = null;
      }
    }

    if (!classData) {
      classData = {
        topic,
        slogan: `Mastering ${topic} with Scholarly Precision`,
        intro: `This module develops foundational competencies in ${topic} at ${schoolName}.`,
        points: [
          `Foundational Synthesis: Investigating core principles of ${topic}.`,
          `Systemic Application: Implementing structured workflows with verification loops.`,
          `Diagnostics: Detecting operational drift early through audits.`,
          `Resource Balancing: Sustaining resilient institutional execution.`,
          `Ethical Stewardship: Aligning execution with community accountability.`,
        ],
        illustrationPrompt: `Professional academic cover showcasing ${topic}`,
        selfAssessment: [
          {
            question: `What drives high reliability when implementing ${topic}?`,
            options: [
              "Skipping verification and documentation.",
              "Establishing structured diagnostics and defensive buffers.",
              "Ignoring measurable milestones.",
              "Granting unchecked administrative access.",
            ],
            correctIndex: 1,
            explanation: "Reliability depends on structured diagnostics and defense-in-depth.",
          },
          {
            question: `How should leaders handle operational shifts in ${topic}?`,
            options: [
              "Halt all evaluation loops.",
              "Analyze downstream impacts and adapt tactically around core objectives.",
              "Erase audit records.",
              "Delegate unchecked authority.",
            ],
            correctIndex: 1,
            explanation: "Resilient execution adapts tactically while preserving core goals.",
          },
          {
            question: `Which practice reflects Zion Academy ethical standards?`,
            options: [
              "Concealing metrics.",
              "Transparent stewardship and verified competence.",
              "Bypassing assessments.",
              "Ignoring learner feedback.",
            ],
            correctIndex: 1,
            explanation: "Transparency and verified competence anchor ethical stewardship.",
          },
          {
            question: `What is a critical deployment risk in modern digital systems?`,
            options: [
              "Exposing server secrets on client browsers and missing auth checks.",
              "Using modular TypeScript services.",
              "Validating schemas server-side.",
              "Recording immutable audit logs.",
            ],
            correctIndex: 0,
            explanation: "Client-exposed secrets and missing auth checks create critical risks.",
          },
          {
            question: `How is academic mastery verified?`,
            options: [
              "Submission speed alone.",
              "Passing server-validated examinations and coursework.",
              "Skipping required modules.",
              "Self-scoring without oversight.",
            ],
            correctIndex: 1,
            explanation: "Server-validated assessments ensure objective academic integrity.",
          },
        ],
      };
    }

    // Store confidential answer keys strictly on server; return sanitized questions to students
    const examId = `ai_class_${Date.now()}`;
    const rawQs = Array.isArray(classData.selfAssessment) ? classData.selfAssessment : [];
    const nowIso = new Date().toISOString();

    securityState.exams[examId] = {
      id: examId,
      lessonId: examId,
      courseTrack: track,
      title: String(classData.topic || topic),
      questions: stripQuestionAnswerKeys(rawQs),
      durationMinutes: 30,
      maxAttempts: 3,
      resultsReleased: true,
      createdBy: req.identity!.email,
      updatedAt: nowIso,
    };
    securityState.examAnswerKeys[examId] = {
      answers: rawQs.map((q: any) => ({
        correctIndex: Number(q?.correctIndex || 0),
        explanation: String(q?.explanation || ""),
      })),
      updatedBy: req.identity!.email,
      updatedAt: nowIso,
    };
    persistSecurityState();

    const includeKeys = canTutorAccessCourse(req.identity!, track);
    const safeClassData = {
      ...classData,
      examId,
      selfAssessment: includeKeys ? rawQs : stripQuestionAnswerKeys(rawQs),
    };

    return res.json({ success: true, data: safeClassData });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Failed to generate class notes.") });
  }
});

app.post("/api/school/generate-quiz", requireAuth, requireSchoolTutorOrAdmin, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { notes, subtopic, count, schoolType } = req.body;
  if (!notes) {
    return res.status(400).json({ success: false, error: "Study notes are required to generate examination questions." });
  }

  const qCount = Math.min(20, Math.max(1, parseInt(String(count || 10), 10) || 10));
  const track = String(schoolType || "leadership");

  try {
    const aiClient = getGenAI();
    let questionsList: any[] = [];

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Construct exactly ${qCount} rigorous 4-option MCQs based on "${subtopic || "General Topic"}":\n${String(notes).slice(0, 14000)}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        });
        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed?.questions)) questionsList = parsed.questions;
        }
      } catch {
        questionsList = [];
      }
    }

    if (questionsList.length === 0) {
      questionsList = Array.from({ length: Math.min(qCount, 5) }, (_, idx) => ({
        question: `Assessment Item ${idx + 1} for ${subtopic || "Study Module"}: Which practice best upholds scholarly governance?`,
        options: [
          "Bypassing peer review and validation.",
          "Applying structured verification, accountability, and evidence-based analysis.",
          "Relying solely on unverified assumptions.",
          "Deleting baseline audit records.",
        ],
        correctIndex: 1,
        explanation: "Verified, evidence-based analysis and accountability ensure durable scholarly outcomes.",
      }));
    }

    const examId = `ai_quiz_${Date.now()}`;
    const nowIso = new Date().toISOString();
    securityState.exams[examId] = {
      id: examId,
      lessonId: examId,
      courseTrack: track,
      title: String(subtopic || "Generated Examination"),
      questions: stripQuestionAnswerKeys(questionsList),
      durationMinutes: 30,
      maxAttempts: 3,
      resultsReleased: true,
      createdBy: req.identity!.email,
      updatedAt: nowIso,
    };
    securityState.examAnswerKeys[examId] = {
      answers: questionsList.map((q: any) => ({
        correctIndex: Number(q?.correctIndex || 0),
        explanation: String(q?.explanation || ""),
      })),
      updatedBy: req.identity!.email,
      updatedAt: nowIso,
    };
    persistSecurityState();

    const includeKeys = canTutorAccessCourse(req.identity!, track);
    return res.json({
      success: true,
      examId,
      questions: includeKeys ? questionsList : stripQuestionAnswerKeys(questionsList),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Quiz generation failed.") });
  }
});

app.post("/api/school/generate-notes", requireAuth, requireSchoolTutorOrAdmin, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, schoolType } = req.body;
  if (!topic) return res.status(400).json({ success: false, error: "A study topic is required." });

  try {
    const aiClient = getGenAI();
    let detailedNotes: string | null = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Generate a comprehensive academic syllabus of 10 topics (5 subtopics each) for "${topic}" (track: "${schoolType || "leadership"}").`,
        });
        if (response.text) detailedNotes = response.text;
      } catch {
        detailedNotes = null;
      }
    }

    if (!detailedNotes) {
      detailedNotes = `## COMPREHENSIVE STUDY NOTES: ${String(topic).toUpperCase()}\n\n### Core Academic Pillars\n1. Strategic Intent & Alignment\n2. Systemic Diagnostics & Accountability\n3. Regional East African Contextualization`;
    }

    return res.json({ success: true, notes: detailedNotes });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Notes generation failed.") });
  }
});

app.post("/api/school/generate-section-notes", requireAuth, requireSchoolTutorOrAdmin, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, sectionTitle, sectionBrief, schoolType, sectionIndex } = req.body;
  if (!topic || !sectionTitle) {
    return res.status(400).json({ success: false, error: "Topic and Section title are required." });
  }

  try {
    const aiClient = getGenAI();
    let detailedNotes: string | null = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Write 400 words of academic study notes for Section ${sectionIndex || 1}: "${sectionTitle}" under "${topic}" (${sectionBrief || ""}) for track "${schoolType || "leadership"}".`,
        });
        if (response.text) detailedNotes = response.text;
      } catch {
        detailedNotes = null;
      }
    }

    if (!detailedNotes) {
      detailedNotes = `### Detailed Lecture Notes: ${sectionTitle}\n\nThis section examines core structural foundations for **${sectionTitle}** within **${topic}**.`;
    }

    return res.json({ success: true, notes: detailedNotes });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Section notes generation failed.") });
  }
});

app.post("/api/school/generate-curriculum", requireAuth, requireSchoolTutorOrAdmin, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ success: false, error: "Subject is required." });

  try {
    const aiClient = getGenAI();
    let detailedContent: string | null = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Formulate an academic curriculum of 10 topics with 5 subtopics each for "${subject}".`,
        });
        if (response.text) detailedContent = response.text;
      } catch {
        detailedContent = null;
      }
    }

    if (!detailedContent) {
      detailedContent = `## ACADEMIC SYLLABUS: ${String(subject).toUpperCase()}\n\nTopic 1: Foundational Frameworks\nTopic 2: Comparative Methodologies\nTopic 3: East African Systems Architecture`;
    }

    return res.json({ success: true, subject, notes: detailedContent });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Curriculum generation failed.") });
  }
});

// ============================================================================
// SCHOOL TUTOR RECRUITMENT, COURSE-LOCKED NOTES, ONLINE CLASSES & ASSIGNMENTS
// ============================================================================
function getStudentEnrolledCourseSet(email: string, uid?: string): Set<string> {
  const lower = email.toLowerCase().trim();
  const keys = new Set<string>();
  Object.values(securityState.enrollments).forEach((enr) => {
    const matchesUser = enr.userEmail.toLowerCase() === lower || (uid && enr.userId === uid);
    if (!matchesUser) return;
    if (enr.status === "rejected") return;
    if (enr.courseId) keys.add(enr.courseId.toLowerCase().trim());
    if (enr.courseCode) keys.add(enr.courseCode.toLowerCase().trim());
  });
  return keys;
}

function isSchoolStaffOrAdmin(identity: AuthenticatedRequest["identity"]): boolean {
  if (!identity) return false;
  return (
    identity.isMainAdmin ||
    identity.role === "sub_admin" ||
    identity.role === "manager" ||
    identity.role === "tutor"
  );
}

// 1. Tutor Recruitment Campaigns
app.get("/api/school/tutor-campaigns", (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = Boolean(req.identity && (req.identity.isMainAdmin || req.identity.role === "sub_admin"));
  const all = Object.values(securityState.tutorCampaigns).sort((a, b) =>
    b.openedAt.localeCompare(a.openedAt)
  );
  const campaigns = isAdmin ? all : all.filter((c) => c.status === "open");
  return res.json({ success: true, campaigns });
});

app.post("/api/admin/tutor-campaigns", requireAdminAccess(), (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const title = String(req.body?.title || "").trim().slice(0, 140);
  const subjectArea = String(req.body?.subjectArea || "").trim().slice(0, 140);
  const qualificationsRequired = String(req.body?.qualificationsRequired || "").trim().slice(0, 600);
  const description = String(req.body?.description || "").trim().slice(0, 1200);
  const school = (["leadership", "bible", "both"].includes(req.body?.school) ? req.body.school : "both") as
    | "leadership"
    | "bible"
    | "both";

  if (!title || !subjectArea) {
    return res.status(400).json({ success: false, error: "Title and subject area are required." });
  }

  const id = `camp_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const campaign = {
    id,
    title,
    school,
    subjectArea,
    qualificationsRequired: qualificationsRequired || "National ID, KCSE Certificate, College/University Certificate & CV",
    description,
    status: "open" as const,
    openedBy: actor.email,
    openedAt: new Date().toISOString(),
  };

  securityState.tutorCampaigns[id] = campaign;
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "ADMIN_ACTION",
    action: "TUTOR_CAMPAIGN_OPENED",
    targetType: "tutor_campaign",
    targetId: id,
    details: `Opened tutor recruitment campaign "${title}" (${school})`,
    ip: extractIp(req),
  });

  return res.status(201).json({ success: true, campaign });
});

app.patch("/api/admin/tutor-campaigns/:id", requireAdminAccess(), (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const campaign = securityState.tutorCampaigns[req.params.id];
  if (!campaign) return res.status(404).json({ success: false, error: "Campaign not found." });

  const nextStatus = req.body?.status === "closed" ? "closed" : "open";
  campaign.status = nextStatus;
  if (nextStatus === "closed") {
    campaign.closedAt = new Date().toISOString();
  } else {
    delete campaign.closedAt;
  }
  persistSecurityState();

  recordAuditLog({
    actor,
    category: "ADMIN_ACTION",
    action: nextStatus === "closed" ? "TUTOR_CAMPAIGN_CLOSED" : "TUTOR_CAMPAIGN_REOPENED",
    targetType: "tutor_campaign",
    targetId: campaign.id,
    details: `${nextStatus === "closed" ? "Closed" : "Reopened"} tutor recruitment "${campaign.title}"`,
    ip: extractIp(req),
  });

  return res.json({ success: true, campaign });
});

// 2. Tutor Applications (with CV, National ID, KCSE Cert, University/College Cert)
function validateUploadedDoc(raw: any, label: string): { name: string; mimeType: string; dataUrl: string } {
  if (!raw || typeof raw !== "object" || typeof raw.dataUrl !== "string" || !raw.dataUrl.startsWith("data:")) {
    throw new Error(`${label} document upload is required.`);
  }
  if (raw.dataUrl.length > 3_500_000) {
    throw new Error(`${label} file is too large (max ~2.5 MB).`);
  }
  return {
    name: String(raw.name || `${label.toLowerCase().replace(/\s+/g, "_")}.pdf`).slice(0, 120),
    mimeType: String(raw.mimeType || "application/pdf").slice(0, 80),
    dataUrl: raw.dataUrl,
  };
}

app.post("/api/school/tutor-applications", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const campaignId = String(req.body?.campaignId || "").trim();
  const campaign = securityState.tutorCampaigns[campaignId];
  if (!campaign || campaign.status !== "open") {
    return res.status(400).json({
      success: false,
      error: "Tutor recruitment for this posting is currently closed or unavailable.",
    });
  }

  const applicantName = String(req.body?.applicantName || actor.name).trim().slice(0, 120);
  const phone = String(req.body?.phone || "").trim().slice(0, 30);
  const educationLevel = String(req.body?.educationLevel || "").trim().slice(0, 120);
  const yearsExperience = Math.max(0, Math.min(60, Number(req.body?.yearsExperience || 0)));
  const qualificationSummary = String(req.body?.qualificationSummary || "").trim().slice(0, 2000);
  const schoolPreference = (["leadership", "bible", "both"].includes(req.body?.schoolPreference)
    ? req.body.schoolPreference
    : campaign.school) as "leadership" | "bible" | "both";

  if (!applicantName || !phone || !educationLevel || !qualificationSummary) {
    return res.status(400).json({
      success: false,
      error: "Full name, phone, education level, and qualification summary are required.",
    });
  }

  let cvDoc, nationalIdDoc, kcseCertDoc, collegeCertDoc;
  try {
    cvDoc = validateUploadedDoc(req.body?.cvDoc, "CV / Resume");
    nationalIdDoc = validateUploadedDoc(req.body?.nationalIdDoc, "National ID");
    kcseCertDoc = validateUploadedDoc(req.body?.kcseCertDoc, "KCSE Certificate");
    collegeCertDoc = validateUploadedDoc(req.body?.collegeCertDoc, "University / College Certificate");
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message || "Invalid uploaded document." });
  }

  const id = `tapp_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const application = {
    id,
    campaignId,
    applicantEmail: actor.email.toLowerCase(),
    applicantName,
    phone,
    educationLevel,
    yearsExperience,
    qualificationSummary,
    schoolPreference,
    cvDoc,
    nationalIdDoc,
    kcseCertDoc,
    collegeCertDoc,
    status: "pending" as const,
    assignedCourses: [],
    createdAt: new Date().toISOString(),
  };

  securityState.tutorApplications[id] = application;
  persistSecurityState();

  return res.status(201).json({ success: true, application });
});

app.get("/api/school/my-tutor-applications", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const lower = actor.email.toLowerCase();
  const mine = Object.values(securityState.tutorApplications)
    .filter((a) => a.applicantEmail.toLowerCase() === lower)
    .map((a) => ({
      ...a,
      cvDoc: { name: a.cvDoc.name, mimeType: a.cvDoc.mimeType, dataUrl: "" },
      nationalIdDoc: { name: a.nationalIdDoc.name, mimeType: a.nationalIdDoc.mimeType, dataUrl: "" },
      kcseCertDoc: { name: a.kcseCertDoc.name, mimeType: a.kcseCertDoc.mimeType, dataUrl: "" },
      collegeCertDoc: { name: a.collegeCertDoc.name, mimeType: a.collegeCertDoc.mimeType, dataUrl: "" },
    }));
  return res.json({ success: true, applications: mine });
});

app.get("/api/admin/tutor-applications", requireAdminAccess(), (_req: AuthenticatedRequest, res: Response) => {
  const applications = Object.values(securityState.tutorApplications).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return res.json({ success: true, applications });
});

app.put("/api/admin/tutor-applications/:id/review", requireAdminAccess(), (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const application = securityState.tutorApplications[req.params.id];
  if (!application) return res.status(404).json({ success: false, error: "Tutor application not found." });

  const decision = req.body?.decision === "approved" ? "approved" : "denied";
  const assignedCourses = Array.isArray(req.body?.assignedCourses)
    ? req.body.assignedCourses.map((c: any) => String(c).trim()).filter(Boolean)
    : [];
  const reviewNote = String(req.body?.reviewNote || "").trim().slice(0, 500);

  if (decision === "approved" && assignedCourses.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Select at least one Leadership or Bible School course to assign when approving a tutor.",
    });
  }

  application.status = decision;
  application.assignedCourses = decision === "approved" ? assignedCourses : [];
  application.reviewNote = reviewNote;
  application.reviewedBy = actor.email;
  application.reviewedAt = new Date().toISOString();

  const lowerEmail = application.applicantEmail.toLowerCase();
  if (decision === "approved") {
    const existingCourses = securityState.tutorCourses[lowerEmail] || [];
    const mergedCourses = Array.from(new Set([...existingCourses, ...assignedCourses]));
    securityState.tutorCourses[lowerEmail] = mergedCourses;

    if (securityState.accounts[lowerEmail]) {
      if (securityState.accounts[lowerEmail].role === "member") {
        securityState.accounts[lowerEmail].role = "tutor";
      }
      securityState.accounts[lowerEmail].authorizedCourses = mergedCourses;
    } else {
      securityState.accounts[lowerEmail] = {
        id: `tutor_${Date.now()}`,
        email: lowerEmail,
        name: application.applicantName,
        role: "tutor",
        passwordHash: "",
        authorizedCourses: mergedCourses,
        createdAt: new Date().toISOString(),
      };
    }
  }

  persistSecurityState();

  recordAuditLog({
    actor,
    category: "ROLE_CHANGE",
    action: decision === "approved" ? "TUTOR_APPLICATION_APPROVED" : "TUTOR_APPLICATION_DENIED",
    targetType: "tutor_application",
    targetId: application.id,
    details: `${decision.toUpperCase()} tutor application for ${lowerEmail} (${assignedCourses.join(", ")})`,
    ip: extractIp(req),
  });

  return res.json({ success: true, application });
});

// 3. Course-Locked Tutor Notes (PDF, Word, Slides, Sheet)
app.get("/api/school/notes", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const allNotes = Object.values(securityState.schoolCourseNotes).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  if (actor.isMainAdmin || actor.role === "sub_admin" || actor.role === "manager") {
    return res.json({ success: true, notes: allNotes, enrolledCourseKeys: ["*"] });
  }

  const enrolledKeys = getStudentEnrolledCourseSet(actor.email, actor.uid);

  if (actor.role === "tutor") {
    const allowedNotes = allNotes.filter(
      (n) =>
        canTutorAccessCourse(actor, n.courseId) ||
        canTutorAccessCourse(actor, n.courseCode) ||
        n.tutorEmail.toLowerCase() === actor.email.toLowerCase() ||
        enrolledKeys.has(n.courseId.toLowerCase()) ||
        enrolledKeys.has(n.courseCode.toLowerCase())
    );
    return res.json({
      success: true,
      notes: allowedNotes,
      enrolledCourseKeys: Array.from(enrolledKeys),
    });
  }

  // Strict student access check: ONLY return notes for courses the student is enrolled in
  const studentNotes = allNotes.filter(
    (n) => enrolledKeys.has(n.courseId.toLowerCase()) || enrolledKeys.has(n.courseCode.toLowerCase())
  );

  return res.json({
    success: true,
    notes: studentNotes,
    enrolledCourseKeys: Array.from(enrolledKeys),
  });
});

app.post("/api/school/notes", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseId = String(req.body?.courseId || "").trim();
  const courseCode = String(req.body?.courseCode || courseId).trim();
  const courseTitle = String(req.body?.courseTitle || courseId).trim().slice(0, 180);
  const school = (req.body?.school === "bible" ? "bible" : "leadership") as "leadership" | "bible";
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const content = String(req.body?.content || "").trim().slice(0, 80_000);
  const publishFormat = (
    ["pdf", "docx", "slides", "sheet"].includes(req.body?.publishFormat) ? req.body.publishFormat : "pdf"
  ) as "pdf" | "docx" | "slides" | "sheet";

  if (!courseId || !title || !content) {
    return res.status(400).json({ success: false, error: "Course, note title, and content are required." });
  }

  if (!canTutorAccessCourse(actor, courseId) && !canTutorAccessCourse(actor, courseCode)) {
    return res.status(403).json({
      success: false,
      error: "You may only publish notes to courses assigned to you by the Administrator.",
    });
  }

  const now = new Date().toISOString();
  const id = `note_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const note = {
    id,
    courseId,
    courseCode,
    courseTitle,
    school,
    title,
    content,
    publishFormat,
    tutorEmail: actor.email.toLowerCase(),
    tutorName: actor.name,
    createdAt: now,
    updatedAt: now,
  };

  securityState.schoolCourseNotes[id] = note;
  persistSecurityState();

  return res.status(201).json({ success: true, note });
});

app.delete("/api/school/notes/:id", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const note = securityState.schoolCourseNotes[req.params.id];
  if (!note) return res.status(404).json({ success: false, error: "Course note not found." });

  const canDelete =
    actor.isMainAdmin ||
    actor.role === "sub_admin" ||
    note.tutorEmail.toLowerCase() === actor.email.toLowerCase();
  if (!canDelete) return res.status(403).json({ success: false, error: "Not authorized to remove this note." });

  delete securityState.schoolCourseNotes[req.params.id];
  persistSecurityState();
  return res.json({ success: true });
});

// 4. Online Classes & Google Meet Sessions
app.get("/api/school/classes", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const list = Object.values(securityState.schoolCourseClasses).sort((a, b) =>
    a.scheduledFor.localeCompare(b.scheduledFor)
  );
  if (isSchoolStaffOrAdmin(actor)) {
    return res.json({ success: true, classes: list });
  }
  const enrolledKeys = getStudentEnrolledCourseSet(actor.email, actor.uid);
  const filtered = list.filter(
    (c) => enrolledKeys.has(c.courseId.toLowerCase()) || enrolledKeys.size === 0
  );
  return res.json({ success: true, classes: filtered });
});

app.post("/api/school/classes", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseId = String(req.body?.courseId || "").trim();
  const courseTitle = String(req.body?.courseTitle || courseId).trim().slice(0, 180);
  const school = (req.body?.school === "bible" ? "bible" : "leadership") as "leadership" | "bible";
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const scheduledFor = String(req.body?.scheduledFor || "").trim().slice(0, 60);
  const durationMinutes = Math.max(15, Math.min(360, Number(req.body?.durationMinutes || 60)));
  const meetUrl = String(req.body?.meetUrl || "").trim().slice(0, 400);
  const classroomUrl = String(req.body?.classroomUrl || "").trim().slice(0, 400);
  const notes = String(req.body?.notes || "").trim().slice(0, 1000);

  if (!courseId || !title || !scheduledFor) {
    return res.status(400).json({ success: false, error: "Course, session title, and schedule are required." });
  }
  if (!canTutorAccessCourse(actor, courseId)) {
    return res.status(403).json({ success: false, error: "You may only schedule classes for your assigned courses." });
  }

  const id = `cls_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const cls = {
    id,
    courseId,
    courseTitle,
    school,
    title,
    scheduledFor,
    durationMinutes,
    meetUrl: meetUrl || "https://meet.google.com/new",
    classroomUrl: classroomUrl || undefined,
    notes: notes || undefined,
    tutorEmail: actor.email.toLowerCase(),
    tutorName: actor.name,
    createdAt: new Date().toISOString(),
  };

  securityState.schoolCourseClasses[id] = cls;
  persistSecurityState();
  return res.status(201).json({ success: true, schoolClass: cls });
});

app.delete("/api/school/classes/:id", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const cls = securityState.schoolCourseClasses[req.params.id];
  if (!cls) return res.status(404).json({ success: false, error: "Class session not found." });
  if (!actor.isMainAdmin && cls.tutorEmail.toLowerCase() !== actor.email.toLowerCase()) {
    return res.status(403).json({ success: false, error: "Cannot delete another tutor's class." });
  }
  delete securityState.schoolCourseClasses[req.params.id];
  persistSecurityState();
  return res.json({ success: true });
});

// 5. Course Learner-Tutor Discussions (Zero AI)
app.get("/api/school/discussions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const courseId = String(req.query.courseId || "").trim().toLowerCase();
  const list = Object.values(securityState.schoolCourseDiscussions)
    .filter((d) => !courseId || d.courseId.toLowerCase() === courseId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return res.json({ success: true, discussions: list });
});

app.post("/api/school/discussions", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseId = String(req.body?.courseId || "").trim();
  const courseTitle = String(req.body?.courseTitle || courseId).trim().slice(0, 160);
  const message = String(req.body?.message || "").trim().slice(0, 2000);
  const parentId = req.body?.parentId ? String(req.body.parentId).trim() : undefined;

  if (!courseId || !message) {
    return res.status(400).json({ success: false, error: "Course and message are required." });
  }

  const id = `disc_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const entry = {
    id,
    courseId,
    courseTitle,
    authorEmail: actor.email.toLowerCase(),
    authorName: actor.name,
    authorRole: actor.role,
    message,
    parentId,
    createdAt: new Date().toISOString(),
  };

  securityState.schoolCourseDiscussions[id] = entry;
  persistSecurityState();
  return res.status(201).json({ success: true, discussion: entry });
});

// 6. Course Assignments & Grading
app.get("/api/school/assignments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const all = Object.values(securityState.schoolCourseAssignments).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  if (isSchoolStaffOrAdmin(actor)) {
    return res.json({ success: true, assignments: all });
  }
  const enrolledKeys = getStudentEnrolledCourseSet(actor.email, actor.uid);
  const lowerEmail = actor.email.toLowerCase();
  const visible = all
    .filter((a) => enrolledKeys.has(a.courseId.toLowerCase()))
    .map((a) => ({
      ...a,
      submissions: a.submissions[lowerEmail] ? { [lowerEmail]: a.submissions[lowerEmail] } : {},
    }));
  return res.json({ success: true, assignments: visible });
});

app.post("/api/school/assignments", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const courseId = String(req.body?.courseId || "").trim();
  const courseTitle = String(req.body?.courseTitle || courseId).trim().slice(0, 180);
  const school = (req.body?.school === "bible" ? "bible" : "leadership") as "leadership" | "bible";
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const instructions = String(req.body?.instructions || "").trim().slice(0, 4000);
  const dueDate = String(req.body?.dueDate || "").trim().slice(0, 60);
  const maxMarks = Math.max(5, Math.min(100, Number(req.body?.maxMarks || 20)));

  if (!courseId || !title || !instructions) {
    return res.status(400).json({ success: false, error: "Course, assignment title, and instructions are required." });
  }
  if (!canTutorAccessCourse(actor, courseId)) {
    return res.status(403).json({ success: false, error: "You may only assign work to courses assigned to you." });
  }

  const id = `asg_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
  const assignment = {
    id,
    courseId,
    courseTitle,
    school,
    title,
    instructions,
    dueDate: dueDate || "Next Class",
    maxMarks,
    tutorEmail: actor.email.toLowerCase(),
    tutorName: actor.name,
    submissions: {},
    createdAt: new Date().toISOString(),
  };

  securityState.schoolCourseAssignments[id] = assignment;
  persistSecurityState();
  return res.status(201).json({ success: true, assignment });
});

app.post("/api/school/assignments/:id/submit", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const assignment = securityState.schoolCourseAssignments[req.params.id];
  if (!assignment) return res.status(404).json({ success: false, error: "Assignment not found." });

  const enrolledKeys = getStudentEnrolledCourseSet(actor.email, actor.uid);
  if (!isSchoolStaffOrAdmin(actor) && !enrolledKeys.has(assignment.courseId.toLowerCase())) {
    return res.status(403).json({ success: false, error: "You must be enrolled in this course to submit assignments." });
  }

  const answerText = String(req.body?.answerText || "").trim().slice(0, 8000);
  if (!answerText) return res.status(400).json({ success: false, error: "Assignment response text is required." });

  const lowerEmail = actor.email.toLowerCase();
  assignment.submissions[lowerEmail] = {
    studentEmail: lowerEmail,
    studentName: actor.name,
    answerText,
    attachmentName: req.body?.attachmentName ? String(req.body.attachmentName).slice(0, 120) : undefined,
    attachmentDataUrl:
      typeof req.body?.attachmentDataUrl === "string" &&
      req.body.attachmentDataUrl.startsWith("data:") &&
      req.body.attachmentDataUrl.length <= 2_500_000
        ? req.body.attachmentDataUrl
        : undefined,
    submittedAt: new Date().toISOString(),
  };

  persistSecurityState();
  return res.json({ success: true, submission: assignment.submissions[lowerEmail] });
});

app.put("/api/school/assignments/:id/grade", requireAuth, requireSchoolTutorOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const assignment = securityState.schoolCourseAssignments[req.params.id];
  if (!assignment) return res.status(404).json({ success: false, error: "Assignment not found." });
  if (!canTutorAccessCourse(actor, assignment.courseId)) {
    return res.status(403).json({ success: false, error: "Not authorized to grade this course's assignments." });
  }

  const studentEmail = String(req.body?.studentEmail || "").toLowerCase().trim();
  const sub = assignment.submissions[studentEmail];
  if (!sub) return res.status(404).json({ success: false, error: "Student submission not found." });

  const marks = Math.max(0, Math.min(assignment.maxMarks, Number(req.body?.marks || 0)));
  sub.marks = marks;
  sub.feedback = String(req.body?.feedback || "").trim().slice(0, 1000);
  sub.gradedBy = actor.email.toLowerCase();

  persistSecurityState();
  return res.json({ success: true, submission: sub });
});

app.post("/api/ai/extract", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { imageBase64, fileBase64, docTitle, fileName, customMimeType } = req.body;
  const rawBase64Input = fileBase64 || imageBase64;
  if (!rawBase64Input) return res.status(400).json({ success: false, error: "File base64 data is required." });

  try {
    const aiClient = getGenAI();
    const title = String(docTitle || fileName || "Extracted Document");
    let mimeType = String(customMimeType || "image/png");
    let rawBase64 = String(rawBase64Input);

    if (rawBase64.startsWith("data:")) {
      const match = rawBase64.match(/data:([^;]+);base64,(.*)/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }
    }

    let textResult = "";
    if (mimeType.includes("docx") || mimeType.includes("wordprocessingml") || String(fileName || "").endsWith(".docx")) {
      const fileBuffer = Buffer.from(rawBase64, "base64");
      const mammothResult = await mammoth.extractRawText({ buffer: fileBuffer });
      const docxText = mammothResult.value || "";
      if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Refine and structure this extracted Word text into clean prose (use ALL CAPS headings, no # hashes):\n\n${docxText}`,
        });
        textResult = response.text || docxText;
      } else {
        textResult = docxText || `Parsed Word document: ${title}`;
      }
    } else if (mimeType === "text/plain" || String(fileName || "").endsWith(".txt")) {
      const decodedText = Buffer.from(rawBase64, "base64").toString("utf8");
      if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Polish and format this plain text cleanly:\n\n${decodedText}`,
        });
        textResult = response.text || decodedText;
      } else {
        textResult = decodedText;
      }
    } else if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          { inlineData: { mimeType, data: rawBase64 } },
          { text: "Extract and summarize all text cleanly without markdown '#' headers." },
        ],
      });
      textResult = response.text || `Extracted content for ${title}`;
    } else {
      textResult = `EXTRACTION PREVIEW FOR ${title}\n\nProcessed ${mimeType} safely in local preview mode.`;
    }

    return res.json({
      success: true,
      title,
      text: textResult,
      fileSize: `${((textResult.length * 2) / 1024).toFixed(1)} KB`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Document extraction failed.") });
  }
});

app.post("/api/ai/publish", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { originalContent, requestedTitle, targetCategory, authorName } = req.body;
  const title = String(requestedTitle || "Untitled Published Book");
  const author = String(authorName || req.identity!.name || "Zion Scholar");
  const category = String(targetCategory || "Leadership");

  try {
    const aiClient = getGenAI();
    let compiledBook = "";

    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Create a structured multi-chapter eBook titled "${title}" by ${author} (${category}) from:\n${String(originalContent || "").slice(0, 12000)}`,
      });
      compiledBook = response.text || "";
    }

    if (!compiledBook) {
      compiledBook = `${title.toUpperCase()}\nBy ${author} | Category: ${category}\n\nINTRODUCTION\nA structured scholarly digital volume prepared in Zion Digital Studio.`;
    }

    return res.json({
      success: true,
      title,
      author,
      category,
      content: compiledBook,
      fileSize: `${((compiledBook.length * 2) / 1024).toFixed(1)} KB`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Publishing generation failed.") });
  }
});

app.post("/api/ai/publish-document", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { fileBase64, documentType, requestedTitle, targetCategory, authorName } = req.body;
  if (!fileBase64) return res.status(400).json({ success: false, error: "Document file content is required." });

  const title = String(requestedTitle || "Untitled Academic Volume");
  const author = String(authorName || req.identity!.name || "Zion Scholar");
  const category = String(targetCategory || "Leadership");
  const docType = String(documentType || "pdf").toLowerCase();

  try {
    const aiClient = getGenAI();
    const rawBase64 = String(fileBase64).replace(/^data:.*;base64,/, "");
    let compiledBook = "";

    if (docType === "docx" || docType === "doc") {
      const mammothResult = await mammoth.extractRawText({ buffer: Buffer.from(rawBase64, "base64") });
      const docxText = mammothResult.value || "";
      if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Structure an eBook titled "${title}" by ${author} (${category}) based on:\n${docxText.slice(0, 15000)}`,
        });
        compiledBook = response.text || docxText;
      } else {
        compiledBook = `INTRODUCTION\n${title} (${category})\n\n${docxText.slice(0, 2000)}`;
      }
    } else if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          { inlineData: { mimeType: "application/pdf", data: rawBase64 } },
          { text: `Synthesize a multi-chapter academic eBook titled "${title}" by ${author} (${category}).` },
        ],
      });
      compiledBook = response.text || `Synthesized book ${title}`;
    } else {
      compiledBook = `INTRODUCTION\n\nZion Digital Academic Volume: ${title} (${category}).`;
    }

    return res.json({
      success: true,
      title,
      author,
      category,
      content: compiledBook,
      fileSize: `${((compiledBook.length * 2) / 1024).toFixed(1)} KB`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Document publishing failed.") });
  }
});

app.post("/api/ai/language-translate", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { text, targetLang, mode } = req.body;
  try {
    const aiClient = getGenAI();
    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Mode: ${mode || "translate"}. Target language: ${targetLang || "Swahili"}. Input: "${text || ""}"`,
      });
      return res.json({ success: true, text: response.text });
    }
    return res.json({
      success: true,
      text: `[OFFLINE PREVIEW - ${targetLang || "Swahili"}]\nProcessed "${text || ""}" cleanly.`,
      offline: true,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Language processing failed.") });
  }
});

app.post("/api/ai/batch-classify", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { books } = req.body;
  if (!Array.isArray(books)) return res.status(400).json({ success: false, error: "An array of books is required." });

  try {
    const aiClient = getGenAI();
    const results: any[] = [];

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      let finalCategory = "Non-Fiction";
      let finalIntroduction = String(book.description || "");
      const finalCoverImage = book.base64Image || "";

      if (aiClient) {
        try {
          const response = await aiClient.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: `Classify "${book.title}" by ${book.author || "Scholar"} (${book.description || ""}) into JSON {"category": "...", "introduction": "..."}`,
            config: { responseMimeType: "application/json" },
          });
          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (parsed.category) finalCategory = parsed.category;
            if (parsed.introduction) finalIntroduction = parsed.introduction;
          }
        } catch {
          // fallback below
        }
      }

      if (!finalIntroduction) {
        finalIntroduction = `Scholarly volume on "${book.title}" within ${finalCategory}.`;
      }

      results.push({
        id: `book_ai_${Date.now()}_${i}`,
        title: book.title,
        author: book.author || "Zion Scholar",
        price: parseFloat(book.price) || 350,
        category: finalCategory,
        description: finalIntroduction,
        coverImage: finalCoverImage,
        fileSize: "2.4MB",
        pages: 140,
        publishedDate: new Date().toISOString().split("T")[0],
        isFeatured: false,
        status: "active",
        rating: 5,
        reviewsCount: 1,
      });
    }

    return res.json({ success: true, books: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Batch classification failed.") });
  }
});

app.post("/api/ai/generate-lecture-questions", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, content, courseTrack } = req.body;
  const track = String(courseTrack || "leadership").trim().toLowerCase() || "leadership";
  if (!topic || !content) return res.status(400).json({ success: false, error: "Topic and content are required." });

  try {
    const aiClient = getGenAI();
    let questionsList: any[] = [];

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Generate 3 4-option MCQs for "${topic}" from:\n${String(content).slice(0, 10000)}\nReturn raw JSON array [{"question": "...", "options": ["..."], "correctIndex": 0, "explanation": "..."}]`,
        });
        const cleaned = (response.text || "").replace(/```json|```/g, "").trim();
        questionsList = JSON.parse(cleaned);
      } catch {
        questionsList = [];
      }
    }

    if (!Array.isArray(questionsList) || questionsList.length === 0) {
      questionsList = [
        {
          question: `Regarding "${topic}", what represents its strategic foundation?`,
          options: [
            "Structured accountability & verified analysis",
            "Random unaligned experiments",
            "Manual overrides without logs",
            "Client-side self-grading",
          ],
          correctIndex: 0,
          explanation: `Study guides for ${topic} emphasize structured accountability and verified analysis.`,
        },
        {
          question: `Which metric governs evaluation for "${topic}"?`,
          options: [
            "Consistent scholarly fidelity and accuracy",
            "Temporary unverified placeholders",
            "Bypassing student assessments",
            "Removing documentation",
          ],
          correctIndex: 0,
          explanation: "Scholarly fidelity anchors academic assessments.",
        },
        {
          question: `How does assessment grading operate securely?`,
          options: [
            "Server-side scoring verified against separated answer keys",
            "Client browser score calculation",
            "Unauthenticated answer previews",
            "Skipping validation",
          ],
          correctIndex: 0,
          explanation: "Server-side grading protects integrity.",
        },
      ];
    }

    const examId = `ai_lecture_${Date.now()}`;
    const nowIso = new Date().toISOString();
    securityState.exams[examId] = {
      id: examId,
      lessonId: examId,
      courseTrack: track,
      title: String(topic),
      questions: stripQuestionAnswerKeys(questionsList),
      durationMinutes: 30,
      maxAttempts: 3,
      resultsReleased: true,
      createdBy: req.identity!.email,
      updatedAt: nowIso,
    };
    securityState.examAnswerKeys[examId] = {
      answers: questionsList.map((q: any) => ({
        correctIndex: Number(q?.correctIndex || 0),
        explanation: String(q?.explanation || ""),
      })),
      updatedBy: req.identity!.email,
      updatedAt: nowIso,
    };
    persistSecurityState();

    const includeKeys = canTutorAccessCourse(req.identity!, track);
    return res.json({
      success: true,
      examId,
      questions: includeKeys ? questionsList : stripQuestionAnswerKeys(questionsList),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Failed to compile lecture questions.") });
  }
});

app.post("/api/ai/edit-video", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { videoName, prompt, category } = req.body;
  if (!prompt && !videoName) return res.status(400).json({ success: false, error: "Video name or prompt is required." });

  try {
    const aiClient = getGenAI();
    let resultData: any = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Video Title: "${videoName || "Uploaded Video"}", Category: "${category || "Evangelism"}", Directives: "${prompt || ""}"`,
          config: {
            systemInstruction: "Return structured JSON with title, summary, trimPoints, subtitles, voiceoverScriptEnglish, voiceoverScriptSwahili, sermonOutlineDoc, appliedEffects, highlightClipTitle.",
            responseMimeType: "application/json",
          },
        });
        if (response.text) resultData = JSON.parse(response.text.trim());
      } catch {
        resultData = null;
      }
    }

    if (!resultData) {
      resultData = {
        title: videoName ? `Edited: ${videoName}` : "Zion Media Video Edit",
        summary: `Processed video edits cleanly for "${videoName || "Media Clip"}".`,
        trimPoints: ["00:00 - 00:03 Intro Trim", "00:03 - 08:45 Core Session"],
        subtitles: [{ timestamp: "00:03", text: "Welcome to Zion Digital Academy & Ministry." }],
        voiceoverScriptEnglish: "Welcome to this teaching highlight from Bungoma.",
        voiceoverScriptSwahili: "Karibu kwenye muhtasari wa mafundisho haya kutoka Bungoma.",
        sermonOutlineDoc: `ZION MEDIA STUDY OUTLINE\nTopic: ${videoName || "Teaching Session"}`,
        appliedEffects: ["Warm Color Grade", "Audio Normalization -6dB", "Auto-Subtitles"],
        highlightClipTitle: "30-Sec Highlight Reel",
      };
    }

    return res.json({ success: true, data: resultData });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Video edit failed.") });
  }
});

// ============================================================================
// HOME SHOWCASE, VISION/MISSION/SLOGAN & SLIDESHOW CONFIGURATION
// ============================================================================
app.get("/api/site/showcase", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    showcase: securityState.siteShowcase || null,
  });
});

app.put("/api/site/showcase", requireMainAdmin, (req: AuthenticatedRequest, res: Response) => {
  const payload = req.body || {};
  const slidesRaw = Array.isArray(payload.slides) ? payload.slides.slice(0, 12) : [];
  const cleanSlides = slidesRaw
    .map((s: any, idx: number) => ({
      id: String(s?.id || `slide_${Date.now()}_${idx}`).slice(0, 64),
      title: String(s?.title || "").trim().slice(0, 140),
      subtitle: String(s?.subtitle || "").trim().slice(0, 280),
      category: String(s?.category || "Highlight").trim().slice(0, 60),
      imageUrl: String(s?.imageUrl || "").trim().slice(0, 900_000),
      ctaLabel: String(s?.ctaLabel || "Explore").trim().slice(0, 60),
      targetView: String(s?.targetView || "store").trim().slice(0, 40),
    }))
    .filter((s: any) => s.title && s.imageUrl);

  const intervalMs = Math.min(10000, Math.max(1500, Number(payload.intervalMs) || 2000));

  securityState.siteShowcase = {
    heroBackdropUrl: payload.heroBackdropUrl ? String(payload.heroBackdropUrl).slice(0, 900_000) : securityState.siteShowcase?.heroBackdropUrl,
    heroEyebrow: String(payload.heroEyebrow || "ZION DIGITAL · LEADERSHIP & BIBLE SCHOOL").slice(0, 120),
    heroTitleLead: String(payload.heroTitleLead || "Lead With Faith.").slice(0, 120),
    heroTitleAccent: String(payload.heroTitleAccent || "Transform With Wisdom.").slice(0, 120),
    heroDescription: String(payload.heroDescription || "").slice(0, 500),
    vision: String(payload.vision || "").slice(0, 400),
    mission: String(payload.mission || "").slice(0, 400),
    slogan: String(payload.slogan || "Read. Lead. Transform.").slice(0, 160),
    tagline: String(payload.tagline || "Knowledge That Transforms You").slice(0, 160),
    intervalMs,
    slides: cleanSlides.length > 0 ? cleanSlides : securityState.siteShowcase?.slides || [],
    updatedAt: new Date().toISOString(),
  };

  persistSecurityState();

  recordAuditLog({
    actor: req.identity,
    category: "ADMIN_ACTION",
    action: "SITE_SHOWCASE_UPDATED",
    targetType: "site_showcase",
    targetId: "home",
    details: `Updated home slideshow (${cleanSlides.length} slides, ${intervalMs}ms) and Vision/Mission/Slogan`,
    ip: extractIp(req),
  });

  return res.json({ success: true, showcase: securityState.siteShowcase });
});

// ============================================================================
// AI CAPABILITY ENDPOINTS (@google/genai FREE-TIER STRICT)
// ============================================================================
app.post("/api/ai/chat", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, message, model: modelParam, history, systemInstruction, enableGoogleSearch } = req.body;
  const userMessage = String(prompt || message || "").trim();
  if (!userMessage) return res.status(400).json({ success: false, error: "Prompt is required." });

  const aiClient = getGenAI();
  if (!aiClient) {
    return res.status(503).json({ success: false, error: "Gemini API key is not configured on server." });
  }

  const model = "gemini-4-hydrogen";

  try {
    const formattedHistory: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-16)) {
        const textVal = String(h?.text || "").trim();
        if (!textVal) continue;
        formattedHistory.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: textVal }],
        });
      }
    }

    const config: any = {
      systemInstruction:
        systemInstruction ||
        "You are Zion Digital AI Assistant, providing expert Christian fellowship, academic guidance, and administrative support.",
    };

    const chat = aiClient.chats.create({
      model,
      history: formattedHistory,
      config,
    });

    const response = await chat.sendMessage({ message: userMessage.slice(0, 4000) });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources = chunks
      .flatMap((chunk: any) => {
        const items: Array<{ title: string; uri: string; type?: string }> = [];
        if (chunk.web?.uri) items.push({ title: chunk.web.title || "Web Source", uri: chunk.web.uri, type: "web" });
        return items;
      })
      .filter((s: any) => s.title && s.uri);

    return res.json({ success: true, reply: response.text || "", model, groundingSources });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: safeError(err, "AI chat failed.") });
  }
});

app.post("/api/ai/search-grounding", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Prompt is required." });

  const aiClient = getGenAI();
  if (!aiClient) {
    return res.status(503).json({ success: false, error: "Gemini API key is not configured on server." });
  }

  try {
    const response = await aiClient.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: String(prompt).slice(0, 4000),
      config: {
        systemInstruction: "You are Zion Digital Research Assistant powered strictly by Gemini 4 Hydrogen.",
      },
    });

    return res.json({
      success: true,
      text: response.text || "",
      groundingMetadata: null,
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: safeError(err, "Research assistant failed.") });
  }
});

app.post("/api/ai/transcribe-audio", requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: "Server audio transcription disabled to keep app strictly on Gemini 4 Hydrogen free tier.",
  });
});

app.post("/api/ai/tts", requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: "Server TTS disabled to avoid billing; using built-in browser speech synthesis.",
  });
});

app.post("/api/ai/generate-music", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, duration } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Music prompt is required." });

  const aiClient = getGenAI();
  try {
    let composition: any = null;
    if (aiClient) {
      try {
        const resp = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Compose a sacred hymn / worship chord & melody arrangement for: "${String(prompt).slice(0, 400)}" (${duration === "full" ? "16 bars" : "8 bars"}). Return valid JSON with keys: title, keySignature, tempoBpm (integer 64-120), chords (array of {name, freqs: array of 3 numbers in Hz}), melodyNotes (array of numbers in Hz), lyrics (string).`,
          config: { responseMimeType: "application/json" },
        });
        if (resp.text) composition = JSON.parse(resp.text.trim());
      } catch {
        composition = null;
      }
    }

    if (!composition || !Array.isArray(composition.chords)) {
      composition = {
        title: `Zion Hymn: ${String(prompt).slice(0, 40)}`,
        keySignature: "C Major",
        tempoBpm: 78,
        chords: [
          { name: "C", freqs: [261.63, 329.63, 392.0] },
          { name: "F", freqs: [349.23, 440.0, 523.25] },
          { name: "Am", freqs: [220.0, 261.63, 329.63] },
          { name: "G", freqs: [196.0, 246.94, 392.0] },
        ],
        melodyNotes: [523.25, 493.88, 440.0, 392.0, 349.23, 392.0, 440.0, 523.25],
        lyrics: `Praise rises across Zion hills for: ${String(prompt).slice(0, 120)}.`,
      };
    }

    return res.json({
      success: true,
      composition,
      message: "Synthesized interactive sacred Web Audio arrangement.",
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: safeError(err, "Music arrangement failed.") });
  }
});

app.post("/api/ai/generate-image", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, aspectRatio } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Image prompt is required." });

  const cleanPrompt = String(prompt).slice(0, 400);
  const ratio = String(aspectRatio || "1:1");
  const dimensions = ratio === "16:9" ? { w: 960, h: 540 } : ratio === "9:16" ? { w: 540, h: 960 } : { w: 800, h: 800 };

  try {
    const aiClient = getGenAI();
    let svgMarkup = "";

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Create a high-craft vector SVG poster/book-cover artwork with viewBox="0 0 ${dimensions.w} ${dimensions.h}" for: "${cleanPrompt}". Output ONLY raw <svg ...>...</svg> markup with rich gradients, clean typography, geometric architectural motifs, and zero external links or script tags.`,
        });
        const raw = String(response.text || "").replace(/```svg|```xml|```/g, "").trim();
        const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
          svgMarkup = svgMatch[0].replace(/<script[\s\S]*?<\/script>/gi, "");
        }
      } catch {
        svgMarkup = "";
      }
    }

    if (!svgMarkup) {
      const safeTitle = cleanPrompt.replace(/[<>&"']/g, "").slice(0, 42);
      svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.w} ${dimensions.h}">
  <defs>
    <linearGradient id="zionBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B254D"/>
      <stop offset="55%" stop-color="#155EEF"/>
      <stop offset="100%" stop-color="#7C2D12"/>
    </linearGradient>
  </defs>
  <rect width="${dimensions.w}" height="${dimensions.h}" fill="url(#zionBg)"/>
  <circle cx="${dimensions.w * 0.5}" cy="${dimensions.h * 0.4}" r="${Math.min(dimensions.w, dimensions.h) * 0.24}" fill="none" stroke="#F5B82E" stroke-width="4" opacity="0.85"/>
  <path d="M ${dimensions.w * 0.5} ${dimensions.h * 0.22} L ${dimensions.w * 0.5} ${dimensions.h * 0.58} M ${dimensions.w * 0.36} ${dimensions.h * 0.36} L ${dimensions.w * 0.64} ${dimensions.h * 0.36}" stroke="#F5B82E" stroke-width="10" stroke-linecap="round"/>
  <rect x="48" y="48" width="${dimensions.w - 96}" height="${dimensions.h - 96}" rx="24" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"/>
  <text x="${dimensions.w * 0.5}" y="${dimensions.h * 0.78}" text-anchor="middle" fill="#FFFFFF" font-family="Georgia, serif" font-weight="bold" font-size="30">${safeTitle}</text>
  <text x="${dimensions.w * 0.5}" y="${dimensions.h * 0.86}" text-anchor="middle" fill="#FDE68A" font-family="monospace" font-size="14" letter-spacing="4">ZION DIGITAL STUDIO</text>
</svg>`;
    }

    const imageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    return res.json({ success: true, imageUrl, svgMarkup });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: safeError(err, "Vector cover generation failed.") });
  }
});

app.post("/api/ai/generate-video", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, aspectRatio } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Storyboard prompt is required." });

  try {
    const aiClient = getGenAI();
    let storyboard: any = null;

    if (aiClient) {
      try {
        const resp = await aiClient.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Create a 4-scene animated ministry/academic storyboard (${aspectRatio || "16:9"}) for: "${String(prompt).slice(0, 500)}". Return JSON with: title, aspectRatio, scenes (array of 4 objects: { headline, subtitle, narration, accentColor, bgColor }).`,
          config: { responseMimeType: "application/json" },
        });
        if (resp.text) storyboard = JSON.parse(resp.text.trim());
      } catch {
        storyboard = null;
      }
    }

    if (!storyboard || !Array.isArray(storyboard.scenes)) {
      storyboard = {
        title: String(prompt).slice(0, 64),
        aspectRatio: aspectRatio || "16:9",
        scenes: [
          {
            headline: "Zion Vision Opening",
            subtitle: String(prompt).slice(0, 72),
            narration: "Welcome to a guided visual reflection from Zion Digital Academy.",
            bgColor: "#0B254D",
            accentColor: "#F5B82E",
          },
          {
            headline: "Foundation of Truth",
            subtitle: "Scriptural wisdom meets modern scholarship",
            narration: "True leadership anchors communities with clarity, integrity, and service.",
            bgColor: "#123A78",
            accentColor: "#38BDF8",
          },
          {
            headline: "Bungoma & Global Outreach",
            subtitle: "Equipping leaders across campuses",
            narration: "Every lesson equips scholars to build transformative initiatives in their towns.",
            bgColor: "#7C2D12",
            accentColor: "#FBBF24",
          },
          {
            headline: "Call to Action",
            subtitle: "Read. Lead. Transform.",
            narration: "Continue exploring in Zion Digital School and Community.",
            bgColor: "#064E3B",
            accentColor: "#34D399",
          },
        ],
      };
    }

    return res.json({
      success: true,
      storyboard,
      summary: `Prepared 4-scene interactive canvas reel for "${storyboard.title}".`,
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: safeError(err, "Storyboard generation failed.") });
  }
});

// ============================================================================
// CLOUD SQL (POSTGRESQL) PERSISTENCE ENDPOINTS (FIREBASE ID TOKEN VERIFIED)
// ============================================================================
app.get("/api/sql/profile", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    const user = await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not load user profile.") });
  }
});

app.post("/api/sql/profile", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    const user = await sqlRepo.getOrCreateSqlUser({
      uid: req.sqlUser!.uid,
      email: req.sqlUser!.email,
      displayName: req.body?.displayName ? String(req.body.displayName).slice(0, 100) : req.sqlUser!.name,
      photoUrl: req.body?.photoUrl ? String(req.body.photoUrl).slice(0, 500) : req.sqlUser!.picture,
    });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not update user profile.") });
  }
});

app.get("/api/sql/creations", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    const items = await sqlRepo.listSqlCreations(req.sqlUser!.uid);
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not load saved AI creations.") });
  }
});

app.post("/api/sql/creations", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    const item = await sqlRepo.createSqlCreation({
      userId: req.sqlUser!.uid,
      mode: String(req.body?.mode || "chat").slice(0, 40),
      model: String(req.body?.model || "gemini-4-hydrogen").slice(0, 60),
      title: String(req.body?.title || "Zion AI Session").slice(0, 140),
      prompt: String(req.body?.prompt || "").slice(0, 6000),
      outputText: req.body?.outputText ? String(req.body.outputText).slice(0, 20000) : undefined,
      svgArtwork: req.body?.svgArtwork ? String(req.body.svgArtwork).slice(0, 50000) : undefined,
      groundingSources: Array.isArray(req.body?.groundingSources) ? req.body.groundingSources.slice(0, 20) : [],
    });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not save AI creation.") });
  }
});

app.delete("/api/sql/creations/:id", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  const numericId = Number(req.params.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({ success: false, error: "Invalid creation id." });
  }
  try {
    const deleted = await sqlRepo.deleteSqlCreation(req.sqlUser!.uid, numericId);
    return res.json({ success: deleted });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not delete AI creation.") });
  }
});

app.get("/api/sql/school-enrollments", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    const items = await sqlRepo.listSqlEnrollments(req.sqlUser!.uid);
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not load enrollments.") });
  }
});

app.post("/api/sql/school-enrollments", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    const item = await sqlRepo.createSqlEnrollment({
      userId: req.sqlUser!.uid,
      studentName: String(req.body?.studentName || req.sqlUser!.name || "Zion Scholar").slice(0, 120),
      schoolTrack: String(req.body?.schoolTrack || "leadership").slice(0, 60),
      programTitle: String(req.body?.programTitle || "Zion Leadership Certificate").slice(0, 160),
      campus: String(req.body?.campus || "Bungoma Main Campus").slice(0, 120),
      status: String(req.body?.status || "enrolled").slice(0, 40),
      progressPercent: Number(req.body?.progressPercent || 0),
      feeStatus: String(req.body?.feeStatus || "pending").slice(0, 40),
    });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not save school enrollment.") });
  }
});

app.get("/api/sql/game-scores", async (req: Request, res: Response) => {
  const gameKey = String(req.query.gameKey || "zion-quest-3d").slice(0, 60);
  try {
    const items = await sqlRepo.listTopGameScores(gameKey, 10);
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not load leaderboard.") });
  }
});

app.post("/api/sql/game-scores", requireSqlAuth, async (req: SqlAuthenticatedRequest, res: Response) => {
  try {
    await sqlRepo.getOrCreateSqlUser(req.sqlUser!);
    const item = await sqlRepo.saveGameScore({
      userId: req.sqlUser!.uid,
      playerName: String(req.body?.playerName || req.sqlUser!.name || "Scholar").slice(0, 60),
      gameKey: String(req.body?.gameKey || "zion-quest-3d").slice(0, 60),
      score: Number(req.body?.score || 0),
      scrollsCollected: Number(req.body?.scrollsCollected || 0),
      waveReached: Number(req.body?.waveReached || 1),
    });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Could not save game score.") });
  }
});

app.use("/api", connectRouter);

// ============================================================================
// STAGE 3: SERVER-SIDE GUARD FOR /admin AND /manager-portal HTML/URL ACCESS
// ============================================================================
function renderAccessDeniedHtml(portalName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>403 Access Restricted — Zion Digital</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #020617; color: #f8fafc; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 460px; background: #0f172a; border: 1px solid #334155; border-radius: 20px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(244,63,94,0.18); color: #fda4af; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { font-size: 22px; margin: 14px 0 8px; }
    p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px; }
    a { display: inline-block; padding: 10px 18px; border-radius: 10px; background: #2563eb; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">403 • Access Restricted</span>
    <h1>${portalName} Access Denied</h1>
    <p>Server-side role verification blocked direct access. Only verified administrators or authorized managers with an active session may open this route.</p>
    <a href="/">Return to Zion Digital Home</a>
  </div>
</body>
</html>`;
}

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.includes(".")) {
    return next();
  }

  const lowerPath = req.path.toLowerCase();
  const viewParam = String(req.query.view || "").toLowerCase();
  const wantsAdmin = lowerPath === "/admin" || lowerPath.startsWith("/admin/") || viewParam === "admin";
  const wantsManager = lowerPath === "/manager-portal" || lowerPath.startsWith("/manager-portal/") || viewParam === "manager-portal";

  if (!wantsAdmin && !wantsManager) {
    return next();
  }

  const identity = req.identity;
  const adminOk = Boolean(identity && !identity.isSuspended && (identity.isMainAdmin || identity.role === "sub_admin"));
  const managerOk = Boolean(
    identity &&
      !identity.isSuspended &&
      (identity.isMainAdmin ||
        identity.role === "manager" ||
        (identity.role === "sub_admin" &&
          (identity.capabilities.allowManageEnrollments ||
            identity.capabilities.allowConfirmPayments ||
            identity.capabilities.allowManageExams ||
            identity.capabilities.allowIssueCertificates ||
            identity.capabilities.allowApproval)))
  );

  if (wantsAdmin && !adminOk) {
    recordAuditLog({
      actor: identity,
      category: "ACCESS_DENIED",
      action: "ADMIN_URL_DIRECT_BLOCKED",
      targetType: "url",
      targetId: req.originalUrl,
      details: `Direct URL access to ${req.originalUrl} blocked (role=${identity?.role || "anonymous"})`,
      ip: extractIp(req),
    });
    if (req.headers.accept?.includes("application/json")) {
      return res.status(403).json({ success: false, error: "Administrative role verification failed." });
    }
    return res.status(403).send(renderAccessDeniedHtml("Administrator Portal"));
  }

  if (wantsManager && !managerOk) {
    recordAuditLog({
      actor: identity,
      category: "ACCESS_DENIED",
      action: "MANAGER_URL_DIRECT_BLOCKED",
      targetType: "url",
      targetId: req.originalUrl,
      details: `Direct URL access to ${req.originalUrl} blocked (role=${identity?.role || "anonymous"})`,
      ip: extractIp(req),
    });
    if (req.headers.accept?.includes("application/json")) {
      return res.status(403).json({ success: false, error: "Manager portal authorization required." });
    }
    return res.status(403).send(renderAccessDeniedHtml("Manager Portal"));
  }

  return next();
});

// Capture all assets through Vite or built dist/
export async function startServer(portOverride?: number) {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const listenPort = portOverride ?? PORT;
  return new Promise<import("http").Server>((resolve) => {
    const server = app.listen(listenPort, "0.0.0.0", () => {
      console.log(`Zion Digital Full-Stack server listening on http://0.0.0.0:${listenPort} (Gemini 4 Hydrogen Only)`);
      resolve(server);
    });
  });
}

if (process.env.ZION_TEST_MODE !== "1") {
  startServer();
}

export { app };
