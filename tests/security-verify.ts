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
      if (hadStateFile) {
        fs.writeFileSync(stateFile, originalStateRaw, "utf8");
      } else if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
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
