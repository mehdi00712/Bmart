import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

/** ─────────────────────────────────────────────────────────────
 *  Push notifications (keep if you want, safe to leave here)
 *  Update/trim these if you’re not using FCM.
 *  ────────────────────────────────────────────────────────────*/
async function sendPush(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;
  const message = { notification: { title, body }, data };
  const chunk = 500;
  for (let i = 0; i < tokens.length; i += chunk) {
    const batch = tokens.slice(i, i + chunk);
    await admin.messaging().sendEachForMulticast({ ...message, tokens: batch });
  }
}

export const onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order) return;
  const sellerUid = order.sellerUid;
  if (!sellerUid) return;
  const sellerDoc = await admin.firestore().doc(`users/${sellerUid}`).get();
  const tokens = sellerDoc.get("fcmTokens") || [];
  await sendPush(tokens, "New order", `Rs ${order.total} from a buyer`, {
    orderId: event.params.orderId,
    role: "seller"
  });
});

export const onOrderStatusUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  if (before.status === after.status) return;
  const buyerUid = after.buyerUid;
  if (!buyerUid) return;
  const buyerDoc = await admin.firestore().doc(`users/${buyerUid}`).get();
  const tokens = buyerDoc.get("fcmTokens") || [];
  await sendPush(tokens, "Order update", `Status: ${after.status}`, {
    orderId: event.params.orderId,
    role: "buyer"
  });
});

/** ─────────────────────────────────────────────────────────────
 *  Super-admin callable: delete an Auth user (and optionally user doc)
 *  Only YOUR UID may call this.
 *  ────────────────────────────────────────────────────────────*/
const SUPER_ADMIN_UID = "REPLACE_WITH_YOUR_UID"; // <-- put your UID

export const adminDeleteAuthUser = onCall(async (req) => {
  if (!req.auth || req.auth.uid !== SUPER_ADMIN_UID) {
    throw new HttpsError("permission-denied", "Only super admin can delete users.");
  }
  const uid = String(req.data?.uid || "");
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  if (uid === SUPER_ADMIN_UID) throw new HttpsError("failed-precondition", "Cannot delete super admin.");

  // Delete Firebase Auth account
  await admin.auth().deleteUser(uid);

  // Optional: also delete their Firestore user doc server-side
  try { await admin.firestore().doc(`users/${uid}`).delete(); } catch { /* ignore */ }

  return { ok: true, deleted: uid };
});
