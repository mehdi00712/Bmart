import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();

const SUPER_ADMIN_UID = "Je9nLjh9rzYNrf79ll6M6sfgN5I2"; // your Firebase Auth UID

// Deletes user + products + orders + profile
export const deleteUserEverything = onCall(async (req) => {
  const caller = req.auth?.uid;
  const targetUid = req.data?.targetUid;

  if (!caller || caller !== SUPER_ADMIN_UID) {
    throw new Error("unauthorized");
  }
  if (!targetUid) throw new Error("missing-target-uid");

  const db = admin.firestore();

  // Delete products
  const prods = await db.collection("products").where("ownerUid", "==", targetUid).get();
  for (const d of prods.docs) await d.ref.delete();

  // Delete orders (as seller or buyer)
  const orders1 = await db.collection("orders").where("sellerUid", "==", targetUid).get();
  for (const d of orders1.docs) await d.ref.delete();
  const orders2 = await db.collection("orders").where("buyerUid", "==", targetUid).get();
  for (const d of orders2.docs) await d.ref.delete();

  // Delete user profile
  await db.doc(`users/${targetUid}`).delete().catch(() => {});

  // Delete Auth account
  await admin.auth().deleteUser(targetUid);

  return { ok: true };
});
