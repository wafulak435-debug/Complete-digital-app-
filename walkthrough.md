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

## 6. Supabase Storage, Data Durability & Input Hardening
- **Supabase Storage (`user-uploads` bucket) & Durable IndexedDB Vault (`src/lib/supabaseClient.ts`, `src/utils/pdfDb.ts`)**: Replaced `localStorage` Base64 data URL storage (which risks silent quota loss) with IndexedDB binary caching (`supa_vault_<path>`), `navigator.storage.persist()` quota protection, `transaction.oncomplete` write guarantees, and automatic Supabase `user-uploads` bucket upload/signed-URL resolution plus background vault migration (`syncLocalVaultFilesToSupabase`) when Supabase is configured and authenticated.
- **Anti-Data-Loss Book Sync (`src/App.tsx`)**: Fixed the Firestore `onSnapshot` race where newly created books could be removed before confirming cloud write by marking new uploads `isSynced: false` until `saveBookToFirestore` succeeds, merging server `/api/books` on startup, and preserving live local `blob:` / `indexeddb://` PDF pointers during remote snapshot updates.
- **Rolling Disk Backups & Admin Restore (`server/security.ts`, `server/academicLogic.ts`, `server.ts`, `src/components/AdminPanel.tsx`)**: Added `.bak` rolling recovery backups written before atomic `.tmp` renames, automatic primary-to-`.bak` fallback on state load, pre-restore snapshots (`.pre-restore.bak`), authenticated storage diagnostics (`GET /api/storage/status`), and `main_admin`-only backup export/restore (`GET /api/admin/backup`, `POST /api/admin/restore`) that exclude `passwordHash` and `adminPasscodeHash` from exports.
- **Upload Signature & SVG Script Sanitization (`server.ts`, `src/lib/sanitizeSvg.ts`, `src/components/AICreativeWidgets.tsx`, `src/components/AITutorStudio.tsx`)**: Added upload byte-length bounds (1 byte to 35 MB), `%PDF-` / `PK` (ZIP/DOCX) header checks, path traversal rejection on document endpoints, restricted public `/api/health` and `/api/connections/status` metadata so internal env var names are not exposed anonymously, and stripped active `<script>`, `<foreignObject>`, inline event attributes, and `javascript:` URIs from AI-generated inline SVG diagrams.

## 7. Live Safaricom M-Pesa Daraja Production Gateway
- **Server-Side Secret Storage (`/.env`, `/server/mpesa.ts`)**: Configured `MPESA_ENV=production`, PayBill shortcode `1171473`, `MPESA_SHORTCODE_TYPE=paybill`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, and `MPESA_CALLBACK_URL` strictly on the server while keeping public `/api/mpesa/config` masked (`"Configured"` / `"Not set"`).
- **Authenticated Checkout & Authoritative Pricing (`/server/mpesa.ts`)**: Required authentication (`requireAuth`) on `POST /api/mpesa/stkpush` and `POST /api/mpesa/qrcode`, enforced owner-or-finance authorization (`403`) on `GET /api/mpesa/query/:checkoutRequestId`, enforced server-derived amounts for books (`book`), tuition (`course`), fees (`fee`), and plans (`subscription` including `topup`, `starter`, `pro`, `unlimited`), and enforced manager authorization (`requireManagerAccess`) on `GET /api/mpesa/admin/test-auth` and `POST /api/mpesa/c2b/register`.
- **C2B v2 PayBill & Dynamic QR Endpoints (`/server/mpesa.ts`)**: Added Dynamic QR generation (`POST /api/mpesa/qrcode`), C2B v2 URL registration (`POST /api/mpesa/c2b/register`), PayBill validation webhook (`POST /api/mpesa/c2b/validation`), and idempotent confirmation webhook (`POST /api/mpesa/c2b/confirmation`) backed by `processedReceipts`.
- **Live Checkout UI Integration (`/src/components/Store.tsx`, `/src/components/UpgradeModal.tsx`, `/src/components/MpesaApiConsole.tsx`, `/src/components/ManagerPortal.tsx`, `/src/App.tsx`)**: Replaced legacy simulated PayBill `247247` prompts and dummy M-Pesa consoles with live Daraja STK Push, Dynamic PayBill QR checkout, real-time polling against `/api/mpesa/query/:checkoutRequestId`, and Manager Portal OAuth verification / C2B URL registration controls.

---

## PoC Verification

All verification checks below were executed directly against the current codebase and live Express server after the final code edit:

1. **Automated Security Verification Suite (`npx tsx tests/security-verify.ts`)**:
   - **Result**: Exited `0` — printed `ALL_SECURITY_VERIFICATION_CHECKS_PASSED`.
   - Verified anonymous callers receive `401`/`403` on `/api/admin/*`, `/api/storage/status`, `/api/admin/backup`, `/api/orders`, `/api/fee-payments`, `/api/enrollments`, `/api/exams`, `/api/ai/assistant`, `PUT /api/site/showcase`, `/admin`, `/manager-portal`, and paid `/api/books/pdf/:id`.
   - Verified Safaricom Daraja RBAC and secret masking: `GET /api/mpesa/config` does not leak `consumerSecret` or `passkey`, anonymous `POST /api/mpesa/stkpush` and `POST /api/mpesa/qrcode` return `401`, cross-user `GET /api/mpesa/query/:id` returns `403`, and non-manager `GET /api/mpesa/admin/test-auth` & `POST /api/mpesa/c2b/register` return `403`.
   - Verified ordinary members and non-finance/clerk sub-admins receive `403` on privilege escalation attempts, answer-key endpoints, sub-admin permission writes, suspension routes, backup/restore routes, order confirmation tampering, and unpurchased paid book downloads, while free active books and paid book previews return `200`.
   - Verified disallowed upload extensions, spoofed PDF uploads lacking the `%PDF-` header, and path traversal document IDs are rejected with `400`.
   - Verified `GET /api/admin/backup` returns `200` to `main_admin` without leaking `passwordHash` or `adminPasscodeHash`, and `GET /api/connections/status` returns `200` without exposing secret env var names.
   - Verified `sanitizeSvgMarkup` strips `<script>`, `<foreignObject>`, `onload=`, `onclick=`, and `javascript:` URIs.

2. **End-to-End Persistence & Recovery Suite (`npx tsx tests/e2e-verify.ts`)**:
   - **Result**: Exited `0` — printed `ALL_E2E_VERIFICATION_CHECKS_PASSED`.
   - Verified `/api/health`, `/api/connections/status` (`firebase.configured: true`), `/api/storage/status` (`supabase.storageBucket: "user-uploads"`), M-Pesa/eCitizen order approval & PDF download, enrollment & certificate verification, community & messaging persistence, rolling `.bak` file generation on `data/zion-security-state.json.bak` and `data/zion-academics-state.json.bak`, and full backup export -> record delete -> backup restore recovery.

3. **Compilation, Type-Checking & Live Gateway Verification**:
   - `tsc --noEmit` (`lint_applet`): Passed cleanly (exit code `0`, 0 errors).
   - `npm run build` (`vite build` + `esbuild server.ts`): Succeeded cleanly, producing `dist/assets/` and `dist/server.cjs`.
   - Production client bundle scan (`dist/assets/`): Printed `ZERO_SECRET_LEAKAGE` (zero Daraja or Supabase secrets bundled into client assets).
   - Live Safaricom Daraja Production OAuth check against `https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials` with PayBill `1171473`: Succeeded (`true`).

---

## Manual Post-Deployment Actions
1. **Verify Public Callback Reachability**: Confirm Safaricom Daraja can reach `MPESA_CALLBACK_URL` (`https://<your-live-domain>/api/mpesa/callback`) and use **Register C2B v2 PayBill URLs** inside Manager Portal -> M-Pesa Finance if accepting direct PayBill `1171473` C2B payments.
2. **Set Server-Side Secrets in Host Environment** (never prefixed with `VITE_`):
   - `MPESA_ENV`, `MPESA_SHORTCODE`, `MPESA_SHORTCODE_TYPE`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`
   - `GEMINI_API_KEY`, `ADMIN_ACCESS_PASSCODE`
3. **Set Public Client Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. **Supabase SQL Schema**: Execute `/supabase_schema.sql` in the Supabase SQL Editor if full SQL table syncing (`profiles`, `user_history`) is desired alongside the active `user-uploads` storage bucket.

