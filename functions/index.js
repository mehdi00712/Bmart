// functions/index.js
import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

// ✅ If you used Node 20 and had deploy/runtime issues, set engines.node to "18" in package.json
// "engines": { "node": "18" }

admin.initializeApp();

// 🔒 ONLY YOU can trigger deletions (put YOUR UID here)
const SUPER_ADMIN_UID = "Je9nLjh9rzYNrf79ll6M6sfgN5I2";

// util: page through and delete docs by field
async function deleteByQuery(colRef, field, value) {
  const db = admin.firestore();
  const pageSize = 300;
  let last = null;

  for (;;) {
    let q = colRef
      .where(field, "==", value)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);

    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
}

// 🔥 Callable: delete user’s products, orders, user doc, AND Auth account
export const deleteUserEverything = onCall(
  { region: "us-central1", timeoutSeconds: 540, memory: "512MiB" },
  async (req) => {
    const caller = req.auth?.uid;
    const targetUid = req.data?.targetUid;

    console.log("deleteUserEverything called by", caller, "for", targetUid);

    if (!caller || caller !== SUPER_ADMIN_UID) {
      console.error("Unauthorized caller");
      throw new Error("unauthorized");
    }
    if (!targetUid) {
      console.error("Missing targetUid");
      throw new Error("missing-target-uid");
    }

    const db = admin.firestore();

    try {
      // 1) products owned by the user
      await deleteByQuery(db.collection("products"), "ownerUid", targetUid);
      console.log("Deleted products for", targetUid);

      // 2) orders where they are seller
      await deleteByQuery(db.collection("orders"), "sellerUid", targetUid);
      // 3) orders where they are buyer
      await deleteByQuery(db.collection("orders"), "buyerUid", targetUid);
      console.log("Deleted orders for", targetUid);

      // 4) user profile
      await db.doc(`users/${targetUid}`).delete().catch(() => {});
      console.log("Deleted user profile for", targetUid);

      // 5) Auth account
      await admin.auth().deleteUser(targetUid);
      console.log("Deleted auth user", targetUid);

      return { ok: true };
    } catch (e) {
      console.error("deleteUserEverything FAILED", e);
      // Return a readable error to the client
      throw new Error(e?.message || "internal");
    }
  }
);
