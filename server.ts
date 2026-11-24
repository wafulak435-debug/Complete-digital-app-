import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { createServer as createViteServer } from "vite";
import mammoth from "mammoth";
import {
  attachIdentity,
  AuthenticatedRequest,
  canTutorAccessCourse,
  clearSessionCookie,
  EMPTY_CAPABILITIES,
  enforceAiRateLimit,
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

dotenv.config();

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
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || req.path === "/mpesa/callback") {
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
// HEALTH & AUTHENTICATION / SESSION ENDPOINTS
// ============================================================================
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: process.env.NODE_ENV || "development",
    supabase: getSupabaseServerStatus(),
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
      const uid = "demo_kenya_member";
      const email = "member@ziondigital.co.ke";
      const token = signSessionToken({ uid, email, name: "Bungoma Scholar (Demo)" });
      setSessionCookie(res, token, req);
      return res.json({
        success: true,
        sessionToken: token,
        user: buildPublicUserResponse(uid, email, "Bungoma Scholar (Demo)"),
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
    allowManageExams: Boolean(rawPerms.allowManageExams),
    allowIssueCertificates: Boolean(rawPerms.allowIssueCertificates),
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
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Valid tutor email is required." });
  }
  securityState.tutorCourses[email] = courses;
  if (securityState.accounts[email] && securityState.accounts[email].role === "member") {
    securityState.accounts[email].role = "tutor";
    securityState.accounts[email].authorizedCourses = courses;
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

app.post("/api/books/pdf", requireAuth, (req: AuthenticatedRequest, res: Response) => {
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

    let pureBase64 = String(pdfBase64);
    if (pureBase64.startsWith("data:")) {
      const parts = pureBase64.split(";base64,");
      if (parts[1]) pureBase64 = parts[1];
    }

    const buffer = Buffer.from(pureBase64, "base64");
    const filePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}.pdf`);
    if (!filePath) return res.status(400).json({ success: false, error: "Invalid file path." });

    fs.writeFileSync(filePath, buffer);
    return res.json({ success: true, url: `/api/books/pdf/${safeId}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/books/pdf/:id", (req: AuthenticatedRequest, res: Response) => {
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
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "PDF document not found on server." });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeId}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err) });
  }
});

app.get("/api/books/docx/:id", (req: AuthenticatedRequest, res: Response) => {
  try {
    const safeId = sanitizeUploadId(req.params.id);
    if (!safeId) return res.status(400).json({ success: false, error: "Invalid document ID." });

    const access = hasBookFileAccess(req.identity, safeId);
    if (!access.allowed) {
      return res.status(req.identity ? 403 : 401).json({ success: false, error: access.reason });
    }

    const filePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}.docx`);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Word document not found on server." });
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

    let pureBase64 = String(fileBase64);
    if (pureBase64.startsWith("data:")) {
      const parts = pureBase64.split(";base64,");
      if (parts[1]) pureBase64 = parts[1];
    }

    const buffer = Buffer.from(pureBase64, "base64");
    const originalFilePath = resolveSafeFileInsideDir(PDF_DIR, `${safeId}${ext}`);
    if (!originalFilePath) return res.status(400).json({ success: false, error: "Invalid destination filename." });

    fs.writeFileSync(originalFilePath, buffer);

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
    title: ex.title,
    durationMinutes: ex.durationMinutes,
    maxAttempts: ex.maxAttempts,
    resultsReleased: ex.resultsReleased,
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
  const examId = sanitizeUploadId(String(req.body?.id || `exam_${Date.now()}`));
  if (!examId) return res.status(400).json({ success: false, error: "Invalid examId." });

  if (!canTutorAccessCourse(actor, courseTrack) && !canTutorAccessCourse(actor, examId)) {
    recordAuditLog({
      actor,
      category: "ACCESS_DENIED",
      action: "EXAM_CREATE_UNAUTHORIZED",
      targetType: "exam",
      targetId: examId,
      details: `User denied access to author exam for course "${courseTrack}"`,
      ip: extractIp(req),
    });
    return res.status(403).json({ success: false, error: "Not authorized to manage examinations for this course." });
  }

  const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];
  const now = new Date().toISOString();

  securityState.exams[examId] = {
    id: examId,
    lessonId: String(req.body?.lessonId || examId),
    courseTrack,
    title: String(req.body?.title || "Academic Examination"),
    questions: stripQuestionAnswerKeys(rawQuestions),
    durationMinutes: Math.max(5, Math.min(180, Number(req.body?.durationMinutes || 30))),
    maxAttempts: Math.max(1, Math.min(10, Number(req.body?.maxAttempts || 3))),
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

  // Enforce server-side exam timing window (15s clock drift grace)
  if (Date.now() > new Date(attempt.expiresAt).getTime() + 15_000) {
    attempt.status = "expired";
    attempt.updatedAt = new Date().toISOString();
    persistSecurityState();
    return res.status(403).json({ success: false, error: "Examination time window expired before submission." });
  }

  const submittedAnswers = (req.body?.answers && typeof req.body.answers === "object") ? req.body.answers : {};
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
  const passed = score >= 80;
  const nowIso = new Date().toISOString();

  attempt.answers = submittedAnswers;
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
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction:
          "You are the Super Admin Independent AI Companion, providing analytical explanations and step-by-step guidance.",
        tools: [{ googleSearch: {} }],
      },
    });

    return res.json({ success: true, data: response.text || "Empty response from Gemini." });
  } catch (err) {
    console.error("Admin AI error:", err instanceof Error ? err.message : "unknown");
    return res.status(502).json({ success: false, error: safeError(err, "AI analysis service is temporarily unavailable.") });
  }
});

app.post("/api/ai/assistant", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, voiceInput, history, category, enableGoogleSearch, images } = req.body;

  try {
    const aiClient = getGenAI();
    const contents: any[] = [];
    let systemInstruction =
      "You are Gemini, Google's advanced, speedy, intelligent, and friendly AI model. You serve as Zion Digital's official AI Companion in Bungoma, Kenya. You have complete memory of all previous messages in this conversation history. Address users respectfully as 'Leader' or 'Scholar'. NEVER use markdown '#' tag headers; format titles using CAPITALIZED BOLD lines.";

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
      const modelToUse = category === "Problem Solver" ? "gemini-3.1-pro-preview" : "gemini-3.6-flash";
      const response = await aiClient.models.generateContent({
        model: modelToUse,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: enableGoogleSearch ? [{ googleSearch: {} }] : [],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundingSources = chunks
        .map((chunk: any) => ({
          title: chunk.web?.title || chunk.title || "Grounded Resource",
          uri: chunk.web?.uri || chunk.uri || "#",
        }))
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

app.post("/api/school/generate-class", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
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
          model: "gemini-3.6-flash",
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

app.post("/api/school/generate-quiz", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
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
          model: "gemini-3.6-flash",
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

app.post("/api/school/generate-notes", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, schoolType } = req.body;
  if (!topic) return res.status(400).json({ success: false, error: "A study topic is required." });

  try {
    const aiClient = getGenAI();
    let detailedNotes: string | null = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Generate a comprehensive academic syllabus of 10 topics (5 subtopics each) for "${topic}" (track: "${schoolType || "leadership"}").`,
          config: { tools: [{ googleSearch: {} }] },
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

app.post("/api/school/generate-section-notes", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
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
          model: "gemini-3.5-flash",
          contents: `Write 400 words of academic study notes for Section ${sectionIndex || 1}: "${sectionTitle}" under "${topic}" (${sectionBrief || ""}) for track "${schoolType || "leadership"}".`,
          config: { tools: [{ googleSearch: {} }] },
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

app.post("/api/school/generate-curriculum", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ success: false, error: "Subject is required." });

  try {
    const aiClient = getGenAI();
    let detailedContent: string | null = null;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Formulate an academic curriculum of 10 topics with 5 subtopics each for "${subject}".`,
          config: { tools: [{ googleSearch: {} }] },
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
          model: "gemini-3.6-flash",
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
          model: "gemini-3.6-flash",
          contents: `Polish and format this plain text cleanly:\n\n${decodedText}`,
        });
        textResult = response.text || decodedText;
      } else {
        textResult = decodedText;
      }
    } else if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
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
          model: "gemini-3.6-flash",
          contents: `Structure an eBook titled "${title}" by ${author} (${category}) based on:\n${docxText.slice(0, 15000)}`,
        });
        compiledBook = response.text || docxText;
      } else {
        compiledBook = `INTRODUCTION\n${title} (${category})\n\n${docxText.slice(0, 2000)}`;
      }
    } else if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.6-flash",
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
        model: "gemini-3.6-flash",
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
      const finalCoverImage = book.base64Image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=350";

      if (aiClient) {
        try {
          const response = await aiClient.models.generateContent({
            model: "gemini-3.6-flash",
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

app.post("/api/ai/generate-image", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, aspectRatio, hdMode } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Prompt is required." });

  try {
    const aiClient = getGenAI();
    let imageUrl = "";

    if (aiClient) {
      const model = hdMode ? "gemini-3.1-flash-image" : "gemini-3.1-flash-lite-image";
      const response = await aiClient.models.generateContent({
        model,
        contents: { parts: [{ text: String(prompt) }] },
        config: { imageConfig: { aspectRatio: aspectRatio || "1:1" } },
      });
      const part = response?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (part?.inlineData?.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    if (!imageUrl) {
      imageUrl = `https://picsum.photos/seed/${encodeURIComponent(String(prompt))}/800/800`;
    }

    return res.json({ success: true, imageUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Image generation failed.") });
  }
});

app.post("/api/ai/generate-video", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { prompt, aspectRatio, resolution } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: "Prompt is required." });

  try {
    const aiClient = getGenAI();
    if (aiClient) {
      const operation = await aiClient.models.generateVideos({
        model: "veo-3.1-lite-generate-preview",
        prompt: String(prompt),
        config: {
          numberOfVideos: 1,
          resolution: resolution || "720p",
          aspectRatio: aspectRatio || "16:9",
        },
      });
      return res.json({ success: true, operationName: operation.name });
    }
    return res.json({ success: true, operationName: `mock-operations/veo-video-${Date.now()}`, offline: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Video generation failed.") });
  }
});

app.post("/api/ai/video-status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { operationName } = req.body;
  if (!operationName) return res.status(400).json({ success: false, error: "Operation name is required." });

  try {
    if (String(operationName).startsWith("mock-operations/")) {
      const ts = parseInt(String(operationName).split("-").pop() || "0", 10);
      return res.json({ success: true, done: Date.now() - ts > 3500, offline: true });
    }

    const aiClient = getGenAI();
    if (!aiClient) return res.status(503).json({ success: false, error: "AI video service unavailable." });
    const op = new GenerateVideosOperation();
    op.name = String(operationName);
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    return res.json({ success: true, done: updated.done });
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Failed checking video status.") });
  }
});

app.all("/api/ai/video-download", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const operationName = req.method === "POST" ? req.body?.operationName : String(req.query.operationName || "");
  if (!operationName) return res.status(400).json({ success: false, error: "Operation name is required." });

  try {
    if (String(operationName).startsWith("mock-operations/")) {
      return res.redirect("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    }
    const aiClient = getGenAI();
    if (!aiClient) return res.status(503).json({ success: false, error: "AI video service unavailable." });

    const op = new GenerateVideosOperation();
    op.name = String(operationName);
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) return res.status(404).json({ success: false, error: "Video not ready." });

    const videoRes = await fetch(uri, { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY || "" } });
    res.setHeader("Content-Type", "video/mp4");
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }
    return res.redirect(uri);
  } catch (err) {
    return res.status(500).json({ success: false, error: safeError(err, "Video download failed.") });
  }
});

app.post("/api/ai/compile-lecture-questions", requireAuth, enforceAiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const { topic, content, schoolType } = req.body;
  if (!topic || !content) return res.status(400).json({ success: false, error: "Topic and content are required." });

  const track = String(schoolType || "leadership");
  try {
    const aiClient = getGenAI();
    let questionsList: any[] = [];

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.6-flash",
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
          model: "gemini-3.6-flash",
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

app.put("/api/site/showcase", requireManagerAccess, (req: AuthenticatedRequest, res: Response) => {
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
      console.log(`🚀 Zion Digital Full-Stack server listening on http://0.0.0.0:${listenPort}`);
      resolve(server);
    });
  });
}

if (process.env.ZION_TEST_MODE !== "1") {
  startServer();
}

export { app };
