import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();

// 🔒 Only your UID can run this
const SUPER_ADMIN_UID = "Je9nLjh9rzYNrf79ll6M6sfgN5I2";

// helper: delete docs in pages
async function deleteByField(col, field, value) {
  const db = admin.firestore();
  const page = 300;
  let last = null;
  for (;;) {
    let q = col.where(field, "==", value)
               .orderBy(admin.firestore.FieldPath.documentId())
               .limit(page);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < page) break;
  }
}

export const deleteUserEverything = onCall(
  { region: "us-central1", timeoutSeconds: 540, memory: "512MiB" },
  async (req) => {
    const caller = req.auth?.uid;
    const targetUid = req.data?.targetUid;

    if (!caller || caller !== SUPER_ADMIN_UID) {
      return { ok: false, code: "unauthorized", message: "Only super admin can delete users." };
    }
    if (!targetUid) {
      return { ok: false, code: "missing-target-uid", message: "targetUid is required." };
    }

    const db = admin.firestore();

    try {
      await deleteByField(db.collection("products"), "ownerUid", targetUid);
      await deleteByField(db.collection("orders"), "sellerUid", targetUid);
      await deleteByField(db.collection("orders"), "buyerUid", targetUid);
      await db.doc(`users/${targetUid}`).delete().catch(() => {});
    } catch (e) {
      return { ok: false, code: "firestore-delete-failed", message: e?.message || "Failed to delete Firestore docs." };
    }

    // Try to delete the Auth user; if it fails, still return ok with a note.
    try {
      await admin.auth().deleteUser(targetUid);
      return { ok: true, deletedAuth: true };
    } catch (e) {
      return {
        ok: true,
        deletedAuth: false,
        message: "Firestore wiped; Auth account not removed (you can disable/delete it in Console). Reason: " + (e?.message || "unknown")
      };
    }
  }
);
