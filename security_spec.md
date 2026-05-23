# Firestore Security Specification

This document guarantees Attribute-Based Access Control (ABAC) and Zero-Trust Firestore coverage for "Wafula Digital Books" application layers.

## 1. Data Invariants

1. **Identity Integrity**: No member should be able to create, write, or update documents where the author / owner fields differ from their verified `request.auth.uid`.
2. **Role Boundaries**: Users cannot elevate their own roles to `admin`. The `role` field on `/users/{userId}` can only be written by an existing admin, or initially bootstrapped under tight constraints.
3. **Draft Cataloging isolation**: Ebooks marked as drafts (`status = 'draft'`) are only visible to administrators. Public members can only read `active` eBooks.
4. **Member Upload limits**: Members can only modify or initiate deletion for their own uploaded manuscripts. Deletion approves are restricted exclusively to administrators.
5. **Private Vault Isolation**: Saved documents generated through Document Studio are entirely private; readers are forbidden from examining other user's documents.

---

## 2. The "Dirty Dozen" Malicious Exploits

Below are 12 JSON payloads designed to test and violate security rule systems. Every single payload must return `PERMISSION_DENIED` on evaluation:

1. **Self-Appointed Administrator**: Registering a profile with `'role': 'admin'`.
2. **Identity Theft Draft**: Creating a book review with `userId: "malicious_actor"` while logged in as `anonymous_user`.
3. **Metadata Hijacking**: Updating a book record to change the `price` or `publishedDate` as a basic member.
4. **Draft Spill Leak**: Reading books where `status == "draft"` as a non-authenticated member.
5. **Inter-Member Trash Access**: Deleting file upload requests that belong to another user ID.
6. **Privilege Over-ride**: Updating community message sender flags (`isAdmin: true`) as a standard reader.
7. **Cross-User Document Vault Invasion**: Reading another student's document vault with ID variables.
8. **Negative Cost Charge**: Slicing the ebook price down to a negative value or zero to buy it free.
9. **Fake Email Validation Injection**: Creating a user profile claiming verification while `email_verified` contains a forged false token scope.
10. **Orphaned Message Poisoning**: Injecting general messages where `id` references junk characters exceeding 128 bytes size limit.
11. **Illegal State Shortcut**: Forcing an upload status directly from `pending` to `approved` to bypass administrative moderation review.
12. **Streak Counter Escalation**: Mutating streak values directly to high numbers without actual reader time validations.

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

A clean integration test suite verifying that all malicious writes return permission denied:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Wafula Digital Books - Fortress Rules Audit", () => {
  let testEnv: any;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "spheric-retina-spnh2",
      firestore: {
        host: "localhost",
        port: 8080,
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should fail self-elevating to Admin role", async () => {
    const context = testEnv.authenticatedContext("user_id_1");
    const db = context.firestore();
    const maliciousPayload = {
      email: "attacker@mail.com",
      name: "Stolen Identity",
      role: "admin",
      readingStreak: 5,
      dailyGoalMinutes: 30
    };
    await assertFails(db.collection("users").doc("user_id_1").set(maliciousPayload));
  });

  it("should fail when user creates a review with a spoofed userId", async () => {
    const context = testEnv.authenticatedContext("genuine_user");
    const db = context.firestore();
    const reviewPayload = {
      id: "rev_1",
      productId: "book_1",
      userId: "victim_user",
      userName: "Victim Profile",
      rating: 5,
      text: "Nice book!",
      date: new Date().toISOString()
    };
    await assertFails(db.collection("reviews").doc("rev_1").set(reviewPayload));
  });
});
```
