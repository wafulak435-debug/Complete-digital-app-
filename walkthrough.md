# Security Summary

This document summarizes the Phase 0 security hardening, access-control architecture, and visual showcase updates implemented across the Zion Digital application.

## 1. AI Key Isolation & Usage Controls
- Removed all client-side AI provider API keys and fallback mock key strings from browser source files and server runtime paths.
- Routed all AI assistant, OCR extraction, document publishing, language tutoring, lecture quiz compilation, image generation, and video synthesis workflows through authenticated server endpoints (`/api/ai/*`, `/api/school/*`, `/api/my-ai-assistant`) in `server.ts` and the Supabase Edge Function (`supabase/functions/call-gemini/index.ts`).
- Added server-side per-user request quotas and usage tracking (`enforceAiRateLimit` and `GET /api/ai/usage` in `server/security.ts`), alongside sanitized error handling.
- Preserved all existing assistant categories, voice/file tools, offline IndexedDB fallback templates, and Sleek Mode ergonomics.

## 2. Database, RBAC & Route Access Control
- Enforced server-authoritative identities (`zion_session` HMAC cookie / Bearer token, verified Supabase JWT, or Firebase ID token) and role resolution (`main_admin`, `sub_admin`, `manager`, `tutor`, `member`) in `server/security.ts`.
- Deployed restrictive `firestore.rules` with a global deny-by-default catch-all and per-entity rules for:
  - **Books (`Product`)**: Public reads restricted to published (`status == "active"`) items; authors manage only their own drafts/books; catalog publication/pricing/deletion requires `allowManageBooks`.
  - **Orders & Fee Payments**: Owner-only reads; client requests always initialize as `pending` using server-derived pricing; status confirmations restricted to finance (`allowConfirmPayments`), `manager`, or `main_admin`.
  - **Enrollments & Certificates**: Student enrollment requests initialize as `pending` / `unpaid` / `certificateIssued: false`; approvals and fee/certificate updates require authorized administrative/manager workflows; certificate edits and deletions are restricted to `main_admin`.
  - **Community Messages & Social Posts**: Owner/moderator edit and delete enforcement, plus group membership checks on restricted channels (`#workers`, `#faculty`).
  - **Sub-Admin Permissions**: Deny-by-default capability flags (`EMPTY_CAPABILITIES`) checked per endpoint and editable solely by `main_admin`.
- Protected `/admin` and `/manager-portal` direct URL access server-side in `server.ts` (returning HTTP 403 HTML/JSON to unauthorized callers) and removed hardcoded email admin bypasses from client components.

## 3. Examination Isolation & Server Grading
- Separated public student questions (`src/schoolCurriculum.ts`) from confidential answer keys and explanations (`server/examBank.ts`, `examAnswerKeys` collection).
- Implemented timed attempt creation (`POST /api/exams/:examId/start`), attempt limit enforcement, server-side scoring (`POST /api/exams/:examId/submit`), rejection of client-supplied `score`/`passed`/`gradedBy` fields, and release-gated explanations (`POST /api/exams/:examId/release`).

## 4. Protected Paid Book Downloads & Audit Logging
- Gated `/api/books/pdf/:id` and `/api/books/docx/:id` behind `hasBookFileAccess`, requiring authenticated ownership, author identity, book-admin permission, or verified order entitlement for paid books while keeping free books and `/api/books/:id/preview` excerpts accessible.
- Updated `SecureBookReader.tsx` to stream protected documents through `secureApiFetch` object URLs with strict `canAccessFully` checks.
- Recorded administrative, role, book, payment, enrollment, exam grade/release, certificate, and suspension events in append-only `auditLogs`, exposed read-only via `/api/admin/audit-logs` and visible in `AdminPanel.tsx`.

## 5. Brand Identity & Live Showcase Integration
- Unified the application palette around Warm Ivory (`#FAF8F4`), Crisp Linen (`#FFFFFF`), Soft Taupe (`#E7E1D8`), Espresso Ink (`#1F1B18`), Muted Ink (`#6E655E`), and Terracotta (`#A8421B`), paired with `Playfair Display`, `Plus Jakarta Sans`, and `JetBrains Mono`.
- Added 2-second auto-sliding welcome & campus showcases on `AuthScreen.tsx` and `Store.tsx`, synchronized with `GET/PUT /api/site/showcase` and editable live in `ManagerPortal.tsx` along with Vision, Mission, Slogan, Featured Books, and Paystack KES (M-Pesa + Card) / Supabase / Firebase integration strips.

---

## PoC Verification

All verification checks below were executed directly against the compiled workspace and live Express application (`tests/security-verify.ts` with `ZION_TEST_MODE=1`):

1. **Automated Security Verification Suite (`npx tsx tests/security-verify.ts`)**:
   - **Result**: Exited `0` — printed `ALL_SECURITY_VERIFICATION_CHECKS_PASSED`.
   - Verified anonymous callers receive `401`/`403` on `/api/admin/*`, `/api/orders`, `/api/fee-payments`, `/api/enrollments`, `/api/exams`, `/api/ai/assistant`, `PUT /api/site/showcase`, `/admin`, `/manager-portal`, and paid `/api/books/pdf/:id`.
   - Verified ordinary members and non-finance/clerk sub-admins receive `403` on privilege escalation attempts, answer-key endpoints, sub-admin permission writes, suspension routes, order confirmation tampering, and unpurchased paid book downloads, while free active books and paid book previews return `200`.
   - Verified order creation ignores client-supplied `status: "approved"` and `price: 0` (forces `"pending"` at catalog price `KES 1200`), and finance sub-admin approval grants `200` PDF download access.
   - Verified exam endpoints strip `correctIndex`/`explanation`, reject tampered `score: 100` (`403`), grade accurately server-side, withhold unreleased answer breakdowns, and enforce `maxAttempts`.
   - Verified immutable audit logs record `ORDER_APPROVED` and `EXAM_RESULTS_RELEASED` while blocking `POST /api/admin/audit-logs` with `403`.

2. **Compilation & Static Analysis**:
   - `tsc --noEmit` (`lint_applet`): Passed cleanly (exit code `0`, 0 errors).
   - `npm run build` (`vite build` + `esbuild server.ts`): Succeeded cleanly, producing `dist/assets/` and `dist/server.cjs`.
   - Production client bundle scan (`dist/assets/`): Verified zero server secrets (`MOCK_KEY`, `sk_live`, `sk_test`, `PAYSTACK_SECRET_KEY`, or private Gemini keys) and zero school assessment answer keys leaked in client assets (only the public Firebase Web SDK config in `firebase-applet-config.json` and placeholder documentation strings appear).
   - `npm audit`: Reported 20 advisories across transitive packages (`vite`, `esbuild`, `body-parser`, `proxy-addr`, `postcss`, `browserslist`, `dompurify`, `nanoid`, `protobufjs`, `qs`, `source-map-js`, `websocket-driver`, `ws`, `baseline-browser-mapping`).
   - Firestore rules deployment (`deploy_firebase`): `firestore.rules` deployed successfully.

---

## Manual Post-Deployment Actions
1. **Rotate Previously Exposed Credentials**: Rotate the previously used Gemini API key in Google Cloud / AI Studio before configuring production secrets.
2. **Set Server-Side Secrets** (Google AI Studio Secrets / host env & Supabase Edge Function Secrets — never prefixed with `VITE_`):
   - `GEMINI_API_KEY`
   - `PAYSTACK_SECRET_KEY`
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_ACCESS_PASSCODE`
3. **Set Public Client Environment Variables** (Vite / Cloudflare Pages build env):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PAYSTACK_PUBLIC_KEY`
4. **Supabase SQL Schema**: Execute `/supabase_schema.sql` in the Supabase SQL Editor if setting up a fresh Supabase project and deploy `supabase/functions/call-gemini` and `supabase/functions/paystack-webhook`.
