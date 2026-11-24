import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

process.env.ZION_TEST_MODE = "1";
process.env.NODE_ENV = "production";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const secFile = path.join(dataDir, "zion-security-state.json");
  const acadFile = path.join(dataDir, "zion-academics-state.json");

  const hadSec = fs.existsSync(secFile);
  const origSec = hadSec ? fs.readFileSync(secFile, "utf8") : "";
  const hadAcad = fs.existsSync(acadFile);
  const origAcad = hadAcad ? fs.readFileSync(acadFile, "utf8") : "";

  const { app } = await import("../server");
  const { signSessionToken } = await import("../server/security");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind test port.");
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  async function req(
    method: string,
    route: string,
    opts?: { token?: string; body?: unknown }
  ) {
    const headers: Record<string, string> = {};
    if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts?.body !== undefined) headers["Content-Type"] = "application/json";
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
    return { status: res.status, json, text };
  }

  try {
    const adminToken = signSessionToken({
      uid: "e2e_admin",
      email: "wafulak435@gmail.com",
      name: "Principal Admin",
    });
    const studentToken = signSessionToken({
      uid: "e2e_student",
      email: "scholar.verify@ziondigital.co.ke",
      name: "Verify Scholar",
    });
    const otherToken = signSessionToken({
      uid: "e2e_other",
      email: "other.student@ziondigital.co.ke",
      name: "Other Student",
    });

    // 1. Health & Catalog
    const health = await req("GET", "/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.json?.status, "ok");

    const books = await req("GET", "/api/books");
    assert.equal(books.status, 200);
    assert.equal(books.json?.success, true);

    // 2. Finance & Payment Flows (eCitizen + M-Pesa Daraja)
    const ecitizenOrder = await req("POST", "/api/orders", {
      token: studentToken,
      body: {
        bookId: "1",
        bookTitle: "Rising Beyond Limitations",
        price: 350,
        paymentReference: "ECITIZEN-TEST-991",
      },
    });
    assert.equal(ecitizenOrder.status, 201);
    const ecitizenOrderId = ecitizenOrder.json?.order?.id;
    assert.ok(ecitizenOrderId, "eCitizen order should return ID");

    const approveRes = await req("PUT", `/api/orders/${encodeURIComponent(ecitizenOrderId)}/status`, {
      token: adminToken,
      body: { status: "approved" },
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.json?.order?.status, "approved");

    const mpesaCfg = await req("GET", "/api/mpesa/config");
    assert.equal(mpesaCfg.status, 200);
    assert.equal(mpesaCfg.json?.success, true);

    const stk = await req("POST", "/api/mpesa/stkpush", {
      token: studentToken,
      body: {
        phoneNumber: "0712345678",
        purpose: "book",
        targetId: "2",
        targetTitle: "Children are Parents' Investment",
        amount: 400,
      },
    });
    assert.equal(stk.status, 200);
    const checkoutId = stk.json?.checkoutRequestId;
    assert.ok(checkoutId, "STK push should return checkoutRequestId");

    const sim = await req("POST", "/api/mpesa/admin/simulate-sandbox-callback", {
      token: adminToken,
      body: { checkoutRequestId: checkoutId, success: true },
    });
    assert.equal(sim.status, 200);
    assert.equal(sim.json?.transaction?.status, "completed");

    const overview = await req("GET", "/api/mpesa/admin/overview", { token: adminToken });
    assert.equal(overview.status, 200);
    assert.ok((overview.json?.metrics?.totalRevenueKes || 0) >= 400);

    const receipts = await req("GET", "/api/mpesa/receipts", { token: adminToken });
    assert.equal(receipts.status, 200);
    assert.ok(Array.isArray(receipts.json?.receipts) && receipts.json.receipts.length >= 1);

    const ordersList = await req("GET", "/api/orders", { token: adminToken });
    assert.equal(ordersList.status, 200);
    const approvedOrders = (ordersList.json?.orders || []).filter((o: any) => o.status === "approved");
    assert.ok(approvedOrders.length >= 2, "Should include both approved eCitizen and M-Pesa orders");

    // 3. School Academics (8-4-4 & CBC)
    const anonSchool = await req("GET", "/api/school/institutions/zion_academy/academics");
    assert.equal(anonSchool.status, 401, "Anonymous school academics access must be rejected");

    const acadInit = await req("GET", "/api/school/institutions/zion_academy/academics", {
      token: adminToken,
    });
    assert.equal(acadInit.status, 200);
    assert.ok(acadInit.json.classes.length >= 2);
    assert.ok(acadInit.json.terms.length >= 2);
    assert.ok(acadInit.json.subjects.length >= 4);

    // Add student
    const addStu = await req("POST", "/api/school/institutions/zion_academy/students", {
      token: adminToken,
      body: {
        name: "Verify Scholar",
        admNo: "ZD-2026-999",
        studentEmail: "scholar.verify@ziondigital.co.ke",
        classId: "cls_form2_east",
      },
    });
    assert.equal(addStu.status, 201);
    const stuId = addStu.json?.student?.id;
    assert.ok(stuId);

    // Create assessment
    const addAss = await req("POST", "/api/school/institutions/zion_academy/assessments", {
      token: adminToken,
      body: {
        classId: "cls_form2_east",
        termId: "term_2026_2",
        subjectId: "sub_math",
        name: "Mid-Term Exam",
        outOf: 100,
        date: "2026-06-15",
      },
    });
    assert.equal(addAss.status, 201);
    const assId = addAss.json?.assessment?.id;
    assert.ok(assId);

    // Open mark sheet & save score 84 -> KNEC Grade A (12 pts)
    const saveScores = await req("PUT", `/api/school/assessments/${encodeURIComponent(assId)}/scores`, {
      token: adminToken,
      body: { scores: [{ studentId: stuId, score: 84 }] },
    });
    assert.equal(saveScores.status, 200);

    const sheet = await req("GET", `/api/school/assessments/${encodeURIComponent(assId)}/sheet`, {
      token: adminToken,
    });
    assert.equal(sheet.status, 200);
    const row = sheet.json?.rows?.find((r: any) => r.studentId === stuId);
    assert.equal(row?.score, 84);
    assert.equal(row?.grade, "A");

    // Save attendance
    const saveAtt = await req("PUT", "/api/school/classes/cls_form2_east/attendance", {
      token: adminToken,
      body: { date: "2026-06-15", rows: [{ studentId: stuId, status: "present" }] },
    });
    assert.equal(saveAtt.status, 200);

    // Generate class report cards
    const reports = await req(
      "GET",
      "/api/school/classes/cls_form2_east/reports?termId=term_2026_2",
      { token: adminToken }
    );
    assert.equal(reports.status, 200);
    const card = reports.json?.cards?.find((c: any) => c.studentId === stuId);
    assert.ok(card, "Report card must be generated for student");
    assert.equal(card.meanPercent, 84);
    assert.equal(card.overallGrade, "A");
    assert.equal(card.totalPoints, 12);
    assert.equal(card.attendance.ratePercent, 100);

    // Student / Parent ownership checks
    const myCtx = await req("GET", "/api/school/my/context", { token: studentToken });
    assert.equal(myCtx.status, 200);
    assert.ok(myCtx.json.students.some((s: any) => s.id === stuId));

    const myReport = await req(
      "GET",
      `/api/school/my/report?studentId=${encodeURIComponent(stuId)}&termId=term_2026_2`,
      { token: studentToken }
    );
    assert.equal(myReport.status, 200);
    assert.equal(myReport.json?.card?.overallGrade, "A");

    const forbiddenReport = await req(
      "GET",
      `/api/school/my/report?studentId=${encodeURIComponent(stuId)}&termId=term_2026_2`,
      { token: otherToken }
    );
    assert.equal(forbiddenReport.status, 403, "Unrelated student must be blocked from viewing another student's report card");

    console.log("ALL_E2E_VERIFICATION_CHECKS_PASSED");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (hadSec) fs.writeFileSync(secFile, origSec, "utf8");
    else if (fs.existsSync(secFile)) fs.unlinkSync(secFile);
    if (hadAcad) fs.writeFileSync(acadFile, origAcad, "utf8");
    else if (fs.existsSync(acadFile)) fs.unlinkSync(acadFile);
  }
}

main().catch((err) => {
  console.error("E2E_VERIFICATION_FAILED:", err);
  process.exit(1);
});
