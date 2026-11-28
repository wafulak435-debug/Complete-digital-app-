import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";

export interface AuthenticatedSqlUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface SqlAuthenticatedRequest extends Request {
  sqlUser?: AuthenticatedSqlUser;
}

export async function requireSqlAuth(
  req: SqlAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    res.status(401).json({ success: false, error: "Authentication token missing" });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.sqlUser = {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || decoded.email?.split("@")[0] || "Zion Member",
      picture: decoded.picture || undefined,
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired Firebase token" });
  }
}
