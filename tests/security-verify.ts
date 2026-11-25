import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

process.env.ZION_TEST_MODE = "1";
process.env.NODE_ENV = "production";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const stateFile = path.join(dataDir, "zion-security-state.json");
  const uploadsDir = path.join(process.cwd(), "uploads");

  const hadStateFile = fs.existsSync(stateFile);
  const originalStateRaw = hadStateFile ? fs.readFileSync(stateFile, "utf8") : "";

  const { app } = await import("../server");
  const { signSessionToken, securityState, EMPTY_CAPABILITIES } = await import("../server/security");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind ephemeral verification port.");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const createdFiles: string[] = [];

  async function api(
    method: string,
    route: string,
    opts?: { token?: string; body?: unknown; headers?: Record<string, string> }
  ) {
    const headers: Record<string, string> = {
      ...(opts?.headers || {}),
    };
    if (opts?.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }
    if (opts?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers,
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, text, json };
  }

  try {
    const mainAdminToken = signSessionToken({
      uid: "test_main_admin",
      email: "wafulak435@gmail.com",
      name: "Principal Admin",
    });
    const memberToken = signSessionToken({
      uid: "test_member_1",
      email: "scholar.verify@ziondigital.co.ke",
      name: "Verify Scholar",
    });
    const clerkSubAdminToken = signSessionToken({
      uid: "test_sub_clerk",
      email: "mod.clerk@wafula.com",
      name: "Minor Clerk",
    });

    // Provision a dedicated finance-only sub-admin for Stage 3 granular RBAC test
    const financeEmail = "finance.sub@ziondigital.co.ke";
    securityState.subAdminPermissions[financeEmail] = {
      id: "sa_test_fin",
      name: "Finance Officer",
      email: financeEmail,
      permissions: {
        ...EMPTY_CAPABILITIES,
        allowConfirmPayments: true,
      },
      createdBy: "wafulak435@gmail.com",
      updatedAt: new Date().toISOString(),
    };
    const financeSubToken = signSessionToken({
      uid: "test_sub_finance",
      email: financeEmail,
      name: "Finance Officer",
    });

    // ------------------------------------------------------------------------
    // 1. Anonymous callers blocked on protected routes
    // ------------------------------------------------------------------------
    const anonChecks = [
      await api("GET", "/api/admin/access-check"),
      await api("GET", "/api/admin/audit-logs"),
      await api("GET", "/api/orders"),
      await api("GET", "/api/fee-payments"),
      await api("GET", "/api/enrollments"),
      await api("GET", "/api/exams"),
      await api("POST", "/api/ai/assistant", { body: { prompt: "Hello" } }),
      await api("PUT", "/api/site/showcase", { body: { slogan: "Hijacked" } }),
    ];
    for (const r of anonChecks) {
      assert.ok(r.status === 401 || r.status === 403, `Expected 401/403 for anonymous request, got ${r.status}`);
    }

    const anonAdminPage = await api("GET", "/admin", { headers: { Accept: "text/html" } });
    assert.equal(anonAdminPage.status, 403, "Direct GET /admin should return 403 for anonymous caller");

    const anonManagerPage = await api("GET", "/manager-portal", { headers: { Accept: "application/json" } });
    assert.equal(anonManagerPage.status, 403, "Direct GET /manager-portal should return 403 for anonymous caller");

    // ------------------------------------------------------------------------
    // 2. Ordinary member RBAC & privilege escalation protections
    // ------------------------------------------------------------------------
    assert.equal((await api("GET", "/api/admin/access-check", { token: memberToken })).status, 403);
    assert.equal((await api("GET", "/api/manager/access-check", { token: memberToken })).status, 403);
    assert.equal((await api("GET", "/api/admin/sub-admins", { token: memberToken })).status, 403);
    assert.equal(
      (await api("PUT", "/api/site/showcase", { token: memberToken, body: { slogan: "Member override" } })).status,
      403
    );
    assert.equal(
      (await api("GET", "/api/examiner/exams/visionary_leadership/keys", { token: memberToken })).status,
      403
    );
    assert.equal(
      (
        await api("POST", "/api/admin/sub-admins", {
          token: clerkSubAdminToken,
          body: { email: "attacker@zion.test", permissions: { allowConfirmPayments: true } },
        })
      ).status,
      403,
      "Sub-admin cannot modify SubAdminPermission (main_admin only)"
    );

    // Deny-by-default clerk sub-admin cannot confirm payments or suspend users
    assert.equal(
      (
        await api("POST", "/api/admin/users/scholar.verify@ziondigital.co.ke/suspend", {
          token: clerkSubAdminToken,
          body: { reason: "Unauthorized test" },
        })
      ).status,
      403
    );

    // Finance-only sub-admin cannot suspend users or manage exams
    assert.equal(
      (
        await api("POST", "/api/admin/users/scholar.verify@ziondigital.co.ke/suspend", {
          token: financeSubToken,
          body: { reason: "Finance should not suspend" },
        })
      ).status,
      403
    );

    // ------------------------------------------------------------------------
    // 3. Stage 5: Paid vs Free Book File Security & Order Entitlement Flow
    // ------------------------------------------------------------------------
    const paidBookId = `sec_paid_${Date.now()}`;
    const freeBookId = `sec_free_${Date.now()}`;

    const createPaidBook = await api("POST", "/api/books", {
      token: mainAdminToken,
      body: {
        id: paidBookId,
        title: "Restricted Kingdom Finance",
        price: 1200,
        status: "active",
        category: "Business",
        content: "CONFIDENTIAL FULL CHAPTER TEXT FOR PAID BUYERS ONLY.",
      },
    });
    assert.equal(createPaidBook.status, 201);

    const createFreeBook = await api("POST", "/api/books", {
      token: mainAdminToken,
      body: {
        id: freeBookId,
        title: "Open Community Guide",
        price: 0,
        status: "active",
        category: "Education",
        content: "FREE PUBLIC TEXT FOR ALL READERS.",
      },
    });
    assert.equal(createFreeBook.status, 201);

    const samplePdfBase64 = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF", "utf8").toString("base64");
    assert.equal(
      (await api("POST", "/api/books/pdf", { token: mainAdminToken, body: { id: paidBookId, pdfBase64: samplePdfBase64 } })).status,
      200
    );
    assert.equal(
      (await api("POST", "/api/books/pdf", { token: mainAdminToken, body: { id: freeBookId, pdfBase64: samplePdfBase64 } })).status,
      200
    );
    createdFiles.push(path.join(uploadsDir, `${paidBookId}.pdf`), path.join(uploadsDir, `${freeBookId}.pdf`));

    // Unpurchased paid PDF blocked for anonymous and ordinary member
    assert.equal((await api("GET", `/api/books/pdf/${paidBookId}`)).status, 401);
    assert.equal((await api("GET", `/api/books/pdf/${paidBookId}`, { token: memberToken })).status, 403);

    // Free preview remains accessible without exposing full content
    const previewRes = await api("GET", `/api/books/${paidBookId}/preview`);
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.json?.preview?.id, paidBookId);

    // Free book PDF accessible to member
    const freePdfRes = await api("GET", `/api/books/pdf/${freeBookId}`, { token: memberToken });
    assert.equal(freePdfRes.status, 200);
    assert.ok(freePdfRes.text.includes("%PDF-1.4"));

    // Order tampering protection: client tries to inject status="approved" and price=0
    const orderCreate = await api("POST", "/api/orders", {
      token: memberToken,
      body: {
        bookId: paidBookId,
        status: "approved",
        price: 0,
      },
    });
    assert.equal(orderCreate.status, 201);
    assert.equal(orderCreate.json.order.status, "pending", "Server must ignore client-supplied approved status");
    assert.equal(orderCreate.json.order.price, 1200, "Server must enforce authoritative catalog price");

    const orderId = orderCreate.json.order.id;

    // Member & clerk sub-admin without allowConfirmPayments cannot confirm order
    assert.equal(
      (await api("PUT", `/api/orders/${orderId}/status`, { token: memberToken, body: { status: "approved" } })).status,
      403
    );
    assert.equal(
      (await api("PUT", `/api/orders/${orderId}/status`, { token: clerkSubAdminToken, body: { status: "approved" } })).status,
      403
    );

    // Finance sub-admin CAN approve the order, granting PDF access
    const approveOrder = await api("PUT", `/api/orders/${orderId}/status`, {
      token: financeSubToken,
      body: { status: "approved" },
    });
    assert.equal(approveOrder.status, 200);
    assert.equal(approveOrder.json.order.status, "approved");

    const unlockedPdf = await api("GET", `/api/books/pdf/${paidBookId}`, { token: memberToken });
    assert.equal(unlockedPdf.status, 200);
    assert.ok(unlockedPdf.text.includes("%PDF-1.4"));

    // ------------------------------------------------------------------------
    // 4. Stage 4: Examination Answer-Key Isolation, Result Release & Attempt Limits
    // ------------------------------------------------------------------------
    const examList = await api("GET", "/api/exams", { token: memberToken });
    assert.equal(examList.status, 200);
    assert.ok(!examList.text.includes("correctIndex"), "Exam catalog must not leak correctIndex");

    const customExamId = `sec_exam_${Date.now()}`;
    const createExam = await api("POST", "/api/exams", {
      token: mainAdminToken,
      body: {
        id: customExamId,
        courseTrack: "leadership",
        title: "Security Hardening Assessment",
        durationMinutes: 20,
        maxAttempts: 1,
        resultsReleased: false,
        questions: [
          {
            question: "Which layer must validate exam scores?",
            options: ["Browser localStorage", "Server Examiner", "CSS Theme", "URL Query"],
            correctIndex: 1,
            explanation: "Scores must be computed exclusively by trusted server logic.",
          },
          {
            question: "Should client bundles include confidential answer keys?",
            options: ["Yes", "No"],
            correctIndex: 1,
            explanation: "Answer keys must remain isolated on the server.",
          },
        ],
      },
    });
    assert.equal(createExam.status, 201);

    const studentExamFetch = await api("GET", `/api/exams/${customExamId}`, { token: memberToken });
    assert.equal(studentExamFetch.status, 200);
    assert.ok(!studentExamFetch.text.includes("correctIndex"), "GET /api/exams/:id must strip correctIndex");
    assert.ok(!studentExamFetch.text.includes("explanation"), "GET /api/exams/:id must strip explanations");

    const startRes = await api("POST", `/api/exams/${customExamId}/start`, { token: memberToken });
    assert.equal(startRes.status, 201);
    const attemptId = startRes.json.attempt.id;

    // Client score tampering attempt must be rejected with 403
    const tamperRes = await api("POST", `/api/exams/${customExamId}/submit`, {
      token: memberToken,
      body: { attemptId, answers: { 0: 0, 1: 0 }, score: 100 },
    });
    assert.equal(tamperRes.status, 403);

    // Legitimate submit while resultsReleased=false: server grades (1/2 = 50%), withholds answer keys
    const submitRes = await api("POST", `/api/exams/${customExamId}/submit`, {
      token: memberToken,
      body: { attemptId, answers: { 0: 1, 1: 0 } },
    });
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.json.score, 50);
    assert.equal(submitRes.json.passed, false);
    assert.equal(submitRes.json.resultsReleased, false);
    assert.equal(submitRes.json.breakdown[0].correctIndex, undefined, "Unreleased exam must withhold correctIndex");
    assert.equal(submitRes.json.breakdown[0].explanation, undefined, "Unreleased exam must withhold explanation");

    // Re-attempt limit (maxAttempts=1) must block 2nd attempt
    const secondAttempt = await api("POST", `/api/exams/${customExamId}/start`, { token: memberToken });
    assert.equal(secondAttempt.status, 403);

    // Examiner can access keys and release results
    const examinerKeys = await api("GET", `/api/examiner/exams/${customExamId}/keys`, { token: mainAdminToken });
    assert.equal(examinerKeys.status, 200);
    assert.equal(examinerKeys.json.answers.length, 2);

    const releaseRes = await api("POST", `/api/exams/${customExamId}/release`, {
      token: mainAdminToken,
      body: { released: true },
    });
    assert.equal(releaseRes.status, 200);
    assert.equal(releaseRes.json.resultsReleased, true);

    // ------------------------------------------------------------------------
    // 5. Stage 1 & Stage 6: AI Route Safety & Audit Logs
    // ------------------------------------------------------------------------
    const aiRes = await api("POST", "/api/ai/assistant", {
      token: memberToken,
      body: { prompt: "Summarize Proverbs 3:5 in one sentence.", category: "General Guide" },
    });
    assert.equal(aiRes.status, 200);
    assert.ok(aiRes.json?.success === true);
    assert.ok(!aiRes.text.includes("MOCK_KEY"), "AI response must never expose mock keys");
    if (process.env.GEMINI_API_KEY) {
      assert.ok(!aiRes.text.includes(process.env.GEMINI_API_KEY), "AI response must never expose GEMINI_API_KEY");
    }

    const usageRes = await api("GET", "/api/ai/usage", { token: memberToken });
    assert.equal(usageRes.status, 200);
    assert.ok(usageRes.json.usage.totalCount >= 1);

    const auditRes = await api("GET", "/api/admin/audit-logs", { token: mainAdminToken });
    assert.equal(auditRes.status, 200);
    const actions = (auditRes.json.auditLogs || []).map((l: any) => l.action);
    assert.ok(actions.includes("ORDER_APPROVED"), "Audit log must capture ORDER_APPROVED");
    assert.ok(actions.includes("EXAM_RESULTS_RELEASED"), "Audit log must capture EXAM_RESULTS_RELEASED");

    const auditMutateRes = await api("POST", "/api/admin/audit-logs", {
      token: mainAdminToken,
      body: { action: "FORGED" },
    });
    assert.equal(auditMutateRes.status, 403, "Audit logs must be immutable");

    // ------------------------------------------------------------------------
    // 8. Participant-Locked 1-to-1 Private DM Isolation (even Admins blocked)
    // ------------------------------------------------------------------------
    const aliceEmail = "alice@ziondigital.co.ke";
    const bobEmail = "bob@ziondigital.co.ke";
    const aliceToken = signSessionToken({ uid: "sec_alice", email: aliceEmail, name: "Alice Scholar" });
    const bobToken = signSessionToken({ uid: "sec_bob", email: bobEmail, name: "Bob Fellow" });

    const dmConvRes = await api("POST", "/api/dm/conversations", {
      token: aliceToken,
      body: { peerEmail: bobEmail, peerName: "Bob Fellow" },
    });
    assert.equal(dmConvRes.status, 201);
    const dmConvId = dmConvRes.json?.conversation?.id;
    assert.ok(dmConvId, "Private DM conversation should return ID");

    const dmSettingsRes = await api("PATCH", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/settings`, {
      token: aliceToken,
      body: { disappearingTimer: "24h" },
    });
    assert.equal(dmSettingsRes.status, 200);
    assert.equal(dmSettingsRes.json?.conversation?.disappearingTimer, "24h");

    const dmMsgRes = await api("POST", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/messages`, {
      token: aliceToken,
      body: { text: "Confidential prayer request strictly between Alice and Bob." },
    });
    assert.equal(dmMsgRes.status, 201);
    const dmMsgId = dmMsgRes.json?.message?.id;
    assert.ok(dmMsgId, "Private DM message should return ID");

    const dmCallSigRes = await api("POST", "/api/dm/call-signal", {
      token: aliceToken,
      body: { conversationId: dmConvId, callType: "audio", signalType: "offer", payload: { sdp: "test-offer" } },
    });
    assert.equal(dmCallSigRes.status, 201);

    for (const outsiderToken of [mainAdminToken, clerkSubAdminToken]) {
      assert.equal(
        (await api("GET", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/messages`, { token: outsiderToken })).status,
        403
      );
      assert.equal(
        (
          await api("POST", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/messages`, {
            token: outsiderToken,
            body: { text: "Admin intrusion attempt" },
          })
        ).status,
        403
      );
      assert.equal(
        (
          await api("PATCH", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/settings`, {
            token: outsiderToken,
            body: { disappearingTimer: "off" },
          })
        ).status,
        403
      );
      assert.equal(
        (
          await api("PUT", `/api/dm/messages/${encodeURIComponent(dmMsgId)}`, {
            token: outsiderToken,
            body: { text: "Tampered" },
          })
        ).status,
        403
      );
      assert.equal(
        (await api("DELETE", `/api/dm/messages/${encodeURIComponent(dmMsgId)}`, { token: outsiderToken })).status,
        403
      );
      assert.equal(
        (await api("GET", `/api/dm/call-signal/${encodeURIComponent(dmConvId)}`, { token: outsiderToken })).status,
        403
      );
      assert.equal(
        (
          await api("POST", "/api/dm/call-signal", {
            token: outsiderToken,
            body: { conversationId: dmConvId, callType: "video", signalType: "offer" },
          })
        ).status,
        403
      );
    }

    const adminConvList = await api("GET", "/api/dm/conversations", { token: mainAdminToken });
    assert.equal(adminConvList.status, 200);
    assert.ok(
      !(adminConvList.json?.conversations || []).some((c: any) => c.id === dmConvId),
      "Main admin DM inbox must never expose third-party private conversations"
    );

    // Bob IS a direct participant: can read and react, but cannot edit/delete Alice's message
    const bobReadRes = await api("GET", `/api/dm/conversations/${encodeURIComponent(dmConvId)}/messages`, {
      token: bobToken,
    });
    assert.equal(bobReadRes.status, 200);
    assert.ok(bobReadRes.json?.messages?.some((m: any) => m.id === dmMsgId));

    const bobReactRes = await api("POST", `/api/dm/messages/${encodeURIComponent(dmMsgId)}/react`, {
      token: bobToken,
      body: { emoji: "🙏" },
    });
    assert.equal(bobReactRes.status, 200);

    assert.equal(
      (
        await api("PUT", `/api/dm/messages/${encodeURIComponent(dmMsgId)}`, {
          token: bobToken,
          body: { text: "Bob altering Alice's message" },
        })
      ).status,
      403
    );
    assert.equal(
      (await api("DELETE", `/api/dm/messages/${encodeURIComponent(dmMsgId)}`, { token: bobToken })).status,
      403
    );

    // ------------------------------------------------------------------------
    // 9. File Upload Validation, Path Traversal, Backup RBAC & SVG Sanitizer
    // ------------------------------------------------------------------------
    const badExtRes = await api("POST", "/api/books/upload-doc", {
      token: mainAdminToken,
      body: { id: "bad_exec", fileBase64: Buffer.from("alert(1)").toString("base64"), fileName: "payload.html" },
    });
    assert.equal(badExtRes.status, 400, "Disallowed upload file extension must be rejected");

    const badPdfMagic = await api("POST", "/api/books/pdf", {
      token: mainAdminToken,
      body: { id: paidBookId, pdfBase64: Buffer.from("<script>alert(1)</script>").toString("base64") },
    });
    assert.equal(badPdfMagic.status, 400, "PDF upload without %PDF- header signature must be rejected");

    const traversalIdRes = await api("GET", "/api/books/pdf/..%2F..%2Fpackage.json", { token: mainAdminToken });
    assert.equal(traversalIdRes.status, 400, "Path traversal characters in document ID must be rejected");

    assert.equal((await api("GET", "/api/storage/status")).status, 401, "Anonymous storage status check must return 401");
    assert.equal((await api("GET", "/api/admin/backup")).status, 401, "Anonymous backup export must return 401");
    assert.equal((await api("GET", "/api/admin/backup", { token: memberToken })).status, 403, "Member backup export must return 403");
    assert.equal((await api("GET", "/api/admin/backup", { token: clerkSubAdminToken })).status, 403, "Sub-admin backup export must return 403");
    assert.equal(
      (await api("POST", "/api/admin/restore", { token: memberToken, body: { backup: { security: {} } } })).status,
      403,
      "Member backup restore must return 403"
    );

    const adminBackupRes = await api("GET", "/api/admin/backup", { token: mainAdminToken });
    assert.equal(adminBackupRes.status, 200);
    assert.ok(!adminBackupRes.text.includes("passwordHash"), "Backup export must never leak password hashes");
    assert.ok(!adminBackupRes.text.includes("adminPasscodeHash"), "Backup export must never leak adminPasscodeHash");

    assert.equal((await api("GET", "/api/storage/vault/list")).status, 401, "Anonymous vault list must return 401");
    assert.equal(
      (await api("POST", "/api/storage/vault/upload", { body: { fileName: "a.pdf", fileBase64: "JVBERi0xLjQ=" } })).status,
      401,
      "Anonymous vault upload must return 401"
    );
    assert.equal(
      (await api("GET", "/api/storage/vault/signed-url?path=other_user/documents/secret.pdf", { token: memberToken })).status,
      403,
      "Member must not generate signed URLs for another user's vault path"
    );
    assert.equal(
      (await api("GET", "/api/storage/vault/signed-url?path=../../etc/passwd", { token: memberToken })).status,
      400,
      "Vault signed URL must reject path traversal characters"
    );
    assert.equal(
      (await api("DELETE", "/api/storage/vault", { token: memberToken, body: { path: "other_user/documents/secret.pdf" } })).status,
      403,
      "Member must not delete another user's vault file"
    );

    const connStatus = await api("GET", "/api/connections/status");
    assert.equal(connStatus.status, 200);
    assert.ok(!connStatus.text.includes("SUPABASE_SECRET_KEY"));
    assert.ok(!connStatus.text.includes("sb_secret_"));
    assert.equal(connStatus.json?.firebase?.configured, true);
    assert.equal(connStatus.json?.supabase?.configured, true);

    const { sanitizeSvgMarkup } = await import("../src/lib/sanitizeSvg");
    const dirtySvg = `<svg onload="alert(1)" xmlns="http://www.w3.org/2000/svg"><script>fetch('https://evil.test')</script><foreignObject><div>bad</div></foreignObject><a href="javascript:alert(2)"><rect width="10" height="10" onclick="evil()"/></a></svg>`;
    const cleanSvg = sanitizeSvgMarkup(dirtySvg);
    assert.ok(!cleanSvg.toLowerCase().includes("<script"), "SVG sanitizer must strip <script> tags");
    assert.ok(!cleanSvg.toLowerCase().includes("foreignobject"), "SVG sanitizer must strip <foreignObject>");
    assert.ok(!cleanSvg.toLowerCase().includes("onload="), "SVG sanitizer must strip onload handlers");
    assert.ok(!cleanSvg.toLowerCase().includes("onclick="), "SVG sanitizer must strip onclick handlers");
    assert.ok(!cleanSvg.toLowerCase().includes("javascript:"), "SVG sanitizer must neutralize javascript: URIs");

    // ------------------------------------------------------------------------
    // 10. Safaricom Daraja M-Pesa RBAC, Owner Isolation & Secret Masking
    // ------------------------------------------------------------------------
    const mpesaCfgRes = await api("GET", "/api/mpesa/config");
    assert.equal(mpesaCfgRes.status, 200);
    assert.ok(!mpesaCfgRes.text.includes("waxKvb3I"), "M-Pesa config must never leak consumerSecret");
    assert.ok(!mpesaCfgRes.text.includes("21b42538"), "M-Pesa config must never leak passkey");

    assert.equal(
      (await api("POST", "/api/mpesa/stkpush", { body: { phoneNumber: "0712345678", purpose: "book", targetId: "1" } })).status,
      401,
      "Anonymous STK Push must return 401"
    );
    assert.equal(
      (await api("POST", "/api/mpesa/qrcode", { body: { purpose: "book", targetId: "1" } })).status,
      401,
      "Anonymous Dynamic QR generation must return 401"
    );
    assert.equal(
      (await api("GET", "/api/mpesa/admin/test-auth", { token: memberToken })).status,
      403,
      "Ordinary member must not access Daraja OAuth diagnostics"
    );
    assert.equal(
      (await api("POST", "/api/mpesa/c2b/register", { token: memberToken })).status,
      403,
      "Ordinary member must not trigger Daraja C2B URL registration"
    );

    const memberStk = await api("POST", "/api/mpesa/stkpush", {
      token: memberToken,
      body: { phoneNumber: "0712345699", purpose: "subscription", targetId: "pro" },
    });
    assert.equal(memberStk.status, 200);
    assert.equal(memberStk.json?.amount, 1500, "Server must enforce KES 1500 authoritative price for pro plan");
    const checkoutReqId = memberStk.json?.checkoutRequestId;
    assert.ok(checkoutReqId);

    assert.equal(
      (await api("GET", `/api/mpesa/query/${encodeURIComponent(checkoutReqId)}`)).status,
      401,
      "Anonymous query of M-Pesa transaction status must return 401"
    );
    assert.equal(
      (await api("GET", `/api/mpesa/query/${encodeURIComponent(checkoutReqId)}`, { token: aliceToken })).status,
      403,
      "Another member must not inspect a different member's M-Pesa transaction"
    );
    assert.equal(
      (await api("GET", `/api/mpesa/query/${encodeURIComponent(checkoutReqId)}`, { token: memberToken })).status,
      200,
      "Initiating owner must be allowed to query their own M-Pesa transaction"
    );

    console.log("ALL_SECURITY_VERIFICATION_CHECKS_PASSED");
  } finally {
    server.close();
    for (const filePath of createdFiles) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
    try {
      const bakFile = `${stateFile}.bak`;
      if (hadStateFile) {
        fs.writeFileSync(stateFile, originalStateRaw, "utf8");
      } else {
        if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
        if (fs.existsSync(bakFile)) fs.unlinkSync(bakFile);
      }
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error("SECURITY_VERIFICATION_FAILED:", err);
  process.exit(1);
});
