import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();

// ---- SUPER ADMIN UID (ONLY YOU) ----
const SUPER_ADMIN_UID = "Je9nLjh9rzYNrf79ll6M6sfgN5I2";

// Utility: batch-delete a query in pages
async function deleteByQuery(colRef, field, value) {
  const db = admin.firestore();
  const pageSize = 300;
  let last = null;
  while (true) {
    let q = colRef.where(field, "==", value).orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
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

export const deleteUserEverything = onCall(async (req) => {
  // Auth check
  const caller = req.auth?.uid;
  if (!caller || caller !== SUPER_ADMIN_UID) {
    throw new Error("unauthorized");
  }

  const targetUid = req.data?.targetUid;
  if (!targetUid) throw new Error("Missing targetUid");

  const db = admin.firestore();

  // 1) Delete products owned by target
  await deleteByQuery(db.collection("products"), "ownerUid", targetUid);

  // 2) Delete orders where the user is the seller
  await deleteByQuery(db.collection("orders"), "sellerUid", targetUid);

  // 3) (Optional) Delete orders where the user is the buyer too
  await deleteByQuery(db.collection("orders"), "buyerUid", targetUid);

  // 4) Delete the user profile doc
  await db.doc(`users/${targetUid}`).delete().catch(()=>{});

  // 5) Delete Auth account
  await admin.auth().deleteUser(targetUid).catch((e) => {
    // If already gone, ignore
    if (e?.errorInfo?.code !== "auth/user-not-found") throw e;
  });

  return { ok: true };
});
