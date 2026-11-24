import React from "react";
import { secureApiFetch } from "../lib/aiClient";

export async function api<T = unknown>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const url = path.startsWith("/api/") ? path : `/api/school${path.startsWith("/") ? path : `/${path}`}`;
  const res = await secureApiFetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const card =
  "rounded-2xl border border-border-main bg-bg-surface p-4 sm:p-5 shadow-xs min-w-0";

export const input =
  "w-full rounded-xl border border-border-main bg-bg-surface px-3 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white px-3.5 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-main bg-bg-surface hover:bg-bg-muted text-text-primary px-3 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-left min-w-0">
      <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "good" | "warn" | "info" | "neutral";
  children: React.ReactNode;
  key?: React.Key;
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
      : tone === "info"
      ? "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
      : "bg-bg-muted text-text-secondary border-border-main";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function Table({
  head,
  rows,
  empty = "No records found.",
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-main bg-bg-muted/40 px-4 py-6 text-center text-xs text-text-secondary">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-main">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="border-b border-border-main bg-bg-muted/60 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
            {head.map((h, i) => (
              <th key={`${h}_${i}`} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-main">
          {rows.map((cells, rIdx) => (
            <tr key={rIdx} className="hover:bg-bg-muted/30 transition-colors">
              {cells.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2.5 align-middle text-text-primary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
