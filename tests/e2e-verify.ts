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

    // 4. School Operations Modules (Timetable, Lesson Plans, Discipline, Assignments, Parent Comms, Transport, Inventory)
    const opsGet = await req("GET", "/api/school/institutions/zion_academy/operations", { token: adminToken });
    assert.equal(opsGet.status, 200);

    const ttAdd = await req("POST", "/api/school/institutions/zion_academy/timetable", {
      token: adminToken,
      body: { classId: "cls_form2_east", day: "Monday", timeSlot: "08:00 - 09:00", subjectName: "Mathematics", room: "Room 2A" },
    });
    assert.equal(ttAdd.status, 201);

    const lpAdd = await req("POST", "/api/school/institutions/zion_academy/lesson-plans", {
      token: adminToken,
      body: { classId: "cls_form2_east", subjectName: "Mathematics", topic: "Quadratic Equations", objectives: "Solve factorable quadratics" },
    });
    assert.equal(lpAdd.status, 201);

    const discAdd = await req("POST", "/api/school/institutions/zion_academy/discipline", {
      token: adminToken,
      body: { studentId: stuId, category: "Commendation", notes: "Exemplary peer mentorship", actionTaken: "Awarded merit badge" },
    });
    assert.equal(discAdd.status, 201);

    const asgAdd = await req("POST", "/api/school/institutions/zion_academy/assignments", {
      token: adminToken,
      body: { classId: "cls_form2_east", subjectName: "Mathematics", title: "Algebra Problem Set 1", instructions: "Complete exercises 1-10", dueDate: "2026-06-25" },
    });
    assert.equal(asgAdd.status, 201);
    const asgId = asgAdd.json?.assignment?.id;
    assert.ok(asgId, "Created assignment should return ID");

    const asgSubmit = await req("POST", `/api/school/assignments/${encodeURIComponent(asgId)}/submit`, {
      token: studentToken,
      body: { answerText: "Completed all quadratic exercises neatly." },
    });
    assert.equal(asgSubmit.status, 201);

    const parentMsg = await req("POST", "/api/school/institutions/zion_academy/parent-messages", {
      token: adminToken,
      body: { recipientEmail: "all-parents", subject: "Mid-Term Academic Clinic", body: "Parents are invited this Friday at 10 AM." },
    });
    assert.equal(parentMsg.status, 201);

    const transportAdd = await req("POST", "/api/school/institutions/zion_academy/transport", {
      token: adminToken,
      body: { routeName: "Bungoma CBD - Kanduyi", vehicleReg: "KDM 421Z", driverName: "J. Barasa", departureTime: "06:30 AM", stops: "Posta, Kanduyi, Campus", assignedCount: 28 },
    });
    assert.equal(transportAdd.status, 201);

    const invAdd = await req("POST", "/api/school/institutions/zion_academy/inventory", {
      token: adminToken,
      body: { name: "Science Lab Microscopes", category: "Equipment", quantity: 18, condition: "Good", location: "Lab B" },
    });
    assert.equal(invAdd.status, 201);

    // 5. Zion Connect Social, Reels, Groups & AI Assistant
    const profSave = await req("PUT", "/api/connect/profile", {
      token: studentToken,
      body: { name: "Verify Scholar", headline: "Theology & Computing Student", bio: "Passionate about faith and ICT.", location: "Bungoma", skills: ["ICT", "Bible Study"] },
    });
    assert.equal(profSave.status, 200);

    const followRes = await req("POST", "/api/connect/follow", {
      token: studentToken,
      body: { target: "wafulak435@gmail.com" },
    });
    assert.equal(followRes.status, 200);

    const reelAdd = await req("POST", "/api/reels", {
      token: studentToken,
      body: { title: "Morning Devotion Highlight", description: "Psalm 23 reflection", hashtags: ["#Faith", "#ZionConnect"] },
    });
    assert.equal(reelAdd.status, 201);
    const reelId = reelAdd.json?.reel?.id;
    assert.ok(reelId);

    const reelLike = await req("POST", `/api/reels/${encodeURIComponent(reelId)}/like`, { token: adminToken });
    assert.equal(reelLike.status, 200);

    const reelCmt = await req("POST", `/api/reels/${encodeURIComponent(reelId)}/comment`, {
      token: adminToken,
      body: { text: "Amen! Uplifting reflection." },
    });
    assert.equal(reelCmt.status, 201);

    const reelPl = await req("POST", "/api/reels/playlists", {
      token: studentToken,
      body: { name: "Saved Christian Reels", reelId },
    });
    assert.equal(reelPl.status, 200);

    const grpAdd = await req("POST", "/api/groups", {
      token: studentToken,
      body: { name: "Bungoma Youth Choir", category: "Worship", privacy: "public", description: "Weekly choir rehearsals." },
    });
    assert.equal(grpAdd.status, 201);
    const grpId = grpAdd.json?.group?.id;
    assert.ok(grpId);

    const grpEvt = await req("POST", `/api/groups/${encodeURIComponent(grpId)}/events`, {
      token: studentToken,
      body: { title: "Sunday Praise Rehearsal", date: "2026-07-05", location: "Main Sanctuary" },
    });
    assert.equal(grpEvt.status, 201);
    const evtId = grpEvt.json?.group?.events?.[0]?.id;
    assert.ok(evtId);

    const grpRsvp = await req("POST", `/api/groups/${encodeURIComponent(grpId)}/events/${encodeURIComponent(evtId)}/rsvp`, {
      token: studentToken,
    });
    assert.equal(grpRsvp.status, 200);

    const grpDisc = await req("POST", `/api/groups/${encodeURIComponent(grpId)}/discussions`, {
      token: studentToken,
      body: { text: "Welcome everyone to this week's choir rehearsal thread!" },
    });
    assert.equal(grpDisc.status, 201);

    const anonAi = await req("POST", "/api/connect/ai", { body: { prompt: "Share Psalm 23", mode: "fellowship" } });
    assert.equal(anonAi.status, 401);

    const authAi = await req("POST", "/api/connect/ai", {
      token: studentToken,
      body: { prompt: "Write a short uplifting fellowship caption.", mode: "caption" },
    });
    assert.ok(
      authAi.status === 200 || authAi.status === 503,
      `Expected 200 (with key) or honest 503 (without key), got ${authAi.status}`
    );

    // 6. Zion Professional Hub & Content Studio Scheduler
    const profOverview = await req("GET", "/api/professional/overview", { token: studentToken });
    assert.equal(profOverview.status, 200);

    const proSave = await req("PUT", "/api/professional/profile", {
      token: studentToken,
      body: { headline: "ICT Educator & Author", summary: "Building school digital ecosystems.", skills: ["Leadership", "TypeScript"] },
    });
    assert.equal(proSave.status, 200);

    const proEndorse = await req("POST", "/api/professional/endorse", {
      token: adminToken,
      body: { targetEmail: "scholar.verify@ziondigital.co.ke", skillName: "Leadership" },
    });
    assert.equal(proEndorse.status, 200);

    const jobAdd = await req("POST", "/api/professional/jobs", {
      token: adminToken,
      body: { title: "CBC Curriculum Specialist", orgName: "Zion Academy", location: "Bungoma", jobType: "Full-Time", description: "Lead CBC competency assessments." },
    });
    assert.equal(jobAdd.status, 201);
    const jobId = jobAdd.json?.job?.id;
    assert.ok(jobId);

    const jobApply = await req("POST", `/api/professional/jobs/${encodeURIComponent(jobId)}/apply`, {
      token: studentToken,
      body: { note: "Passionate about CBC education in Western Kenya." },
    });
    assert.equal(jobApply.status, 201);

    const orgAdd = await req("POST", "/api/professional/orgs", {
      token: adminToken,
      body: { name: "Zion Publishing Press", sector: "Publishing", location: "Bungoma", description: "Christian books and educational texts." },
    });
    assert.equal(orgAdd.status, 201);

    const artAdd = await req("POST", "/api/professional/articles", {
      token: studentToken,
      body: { title: "Digital Stewardship in Kenyan Schools", category: "Education", body: "Technology empowers equitable learning across rural and urban classrooms." },
    });
    assert.equal(artAdd.status, 201);

    const studioSched = await req("POST", "/api/studio/scheduled-posts", {
      token: studentToken,
      body: { title: "Sunday Verse Poster", content: "Trust in the Lord with all your heart. #ZionConnect", targetPlatform: "Zion Connect", scheduledFor: "2026-07-10T09:00" },
    });
    assert.equal(studioSched.status, 201);
    const schedId = studioSched.json?.post?.id;
    assert.ok(schedId);

    const studioPub = await req("POST", `/api/studio/scheduled-posts/${encodeURIComponent(schedId)}/publish`, {
      token: studentToken,
    });
    assert.equal(studioPub.status, 200);
    assert.equal(studioPub.json?.post?.status, "published");

    // 7. Storage Health, Rolling .bak Persistence & Backup/Restore Anti-Data-Loss
    const connCheck = await req("GET", "/api/connections/status");
    assert.equal(connCheck.status, 200);
    assert.equal(connCheck.json?.firebase?.configured, true);

    const storageStatus = await req("GET", "/api/storage/status", { token: adminToken });
    assert.equal(storageStatus.status, 200);
    assert.equal(storageStatus.json?.supabase?.storageBucket, "user-uploads");
    assert.ok(fs.existsSync(`${secFile}.bak`), "Rolling .bak backup for security state must exist after mutations");
    assert.ok(fs.existsSync(`${acadFile}.bak`), "Rolling .bak backup for academic state must exist after mutations");

    const durableBookId = `e2e_durable_${Date.now()}`;
    const createDurable = await req("POST", "/api/books", {
      token: adminToken,
      body: { id: durableBookId, title: "Durable Kingdom Archive", price: 0, status: "active", category: "Education" },
    });
    assert.equal(createDurable.status, 201);

    const backupRes = await req("GET", "/api/admin/backup", { token: adminToken });
    assert.equal(backupRes.status, 200);
    assert.ok(backupRes.json?.backup?.security?.books?.[durableBookId], "Backup must include newly saved book");

    const delDurable = await req("DELETE", `/api/books/${encodeURIComponent(durableBookId)}`, { token: adminToken });
    assert.equal(delDurable.status, 200);

    const afterDelBooks = await req("GET", "/api/books");
    assert.ok(
      !(afterDelBooks.json?.books || []).some((b: any) => b.id === durableBookId),
      "Deleted book should be absent prior to restore"
    );

    const restoreRes = await req("POST", "/api/admin/restore", {
      token: adminToken,
      body: { backup: backupRes.json.backup },
    });
    assert.equal(restoreRes.status, 200);

    const afterRestoreBooks = await req("GET", "/api/books");
    assert.ok(
      (afterRestoreBooks.json?.books || []).some((b: any) => b.id === durableBookId),
      "Restored backup must recover deleted book cleanly without data loss"
    );

    console.log("ALL_E2E_VERIFICATION_CHECKS_PASSED");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (hadSec) fs.writeFileSync(secFile, origSec, "utf8");
    else {
      if (fs.existsSync(secFile)) fs.unlinkSync(secFile);
      if (fs.existsSync(`${secFile}.bak`)) fs.unlinkSync(`${secFile}.bak`);
    }
    if (hadAcad) fs.writeFileSync(acadFile, origAcad, "utf8");
    else {
      if (fs.existsSync(acadFile)) fs.unlinkSync(acadFile);
      if (fs.existsSync(`${acadFile}.bak`)) fs.unlinkSync(`${acadFile}.bak`);
    }
  }
}

main().catch((err) => {
  console.error("E2E_VERIFICATION_FAILED:", err);
  process.exit(1);
});
