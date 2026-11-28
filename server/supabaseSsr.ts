import type { Request, Response, NextFunction } from "express";

export interface VerifiedSsrUser {
  uid: string;
  email: string;
  name: string;
  source: "supabase";
}

export interface RequestWithSsrUser extends Request {
  ssrSupabaseUser?: VerifiedSsrUser;
}

export function getSupabaseSsrConfig() {
  return {
    url: "",
    publishableKey: "",
    configured: false,
  };
}

export function createSupabaseExpressServerClient(_req: Request, _res: Response) {
  return null;
}

export async function supabaseSessionRefreshMiddleware(_req: Request, _res: Response, next: NextFunction) {
  next();
}
