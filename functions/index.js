import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

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
  const buyerDoc = await admin.firestore().doc(`users/${buyerUid}`).get();
  const tokens = buyerDoc.get("fcmTokens") || [];
  await sendPush(tokens, "Order update", `Status: ${after.status}`, {
    orderId: event.params.orderId,
    role: "buyer"
  });
});
