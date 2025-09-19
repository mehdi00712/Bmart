// functions/index.js
import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();

// 🔒 ONLY YOU can run deletions — set YOUR UID here
const SUPER_ADMIN_UID = "REPLACE_WITH_YOUR_UID";

// Delete a collection by field in pages
async function deleteByField(colRef, field, value) {
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
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
}

// Callable: delete user’s products, orders, profile, AND Auth account
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
      await deleteByField(db.collection("products"), "ownerUid", targetUid);
      await deleteByField(db.collection("orders"), "sellerUid", targetUid);
      await deleteByField(db.collection("orders"), "buyerUid", targetUid);
      await db.doc(`users/${targetUid}`).delete().catch(() => {});
      await admin.auth().deleteUser(targetUid); // deletes Auth account
      console.log("Deleted EVERYTHING for", targetUid);
      return { ok: true };
    } catch (e) {
      console.error("deleteUserEverything FAILED", e);
      throw new Error(e?.message || "internal");
    }
  }
);
