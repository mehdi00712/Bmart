import { app, db } from './firebase.js';
import {
  getFunctions, httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";
import {
  collection, getDocs, query, where, orderBy, limit, startAfter,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const functions = getFunctions(app, "us-central1"); // ✅ region must match
const cfDeleteUserEverything = httpsCallable(functions, 'deleteUserEverything');

// simple paginator delete (client-side fallback)
async function deleteQueryBatched(colName, field, value, batchSize = 100) {
  let last = null;
  for (;;) {
    let qy = query(
      collection(db, colName),
      where(field, '==', value),
      orderBy('__name__'),
      limit(batchSize)
    );
    if (last) qy = query(qy, startAfter(last));
    const snap = await getDocs(qy);
    if (snap.empty) break;
    for (const d of snap.docs) await deleteDoc(d.ref);
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }
}

async function wipeContentFallback(uid) {
  await deleteQueryBatched('products', 'ownerUid', uid);
  await deleteQueryBatched('orders', 'sellerUid', uid);
  await deleteQueryBatched('orders', 'buyerUid', uid);
}

async function handleDelete(uid) {
  if (!confirm(`Delete this user and ALL their data?\nUID: ${uid}`)) return;
  try {
    const res = await cfDeleteUserEverything({ targetUid: uid });
    const data = res?.data || {};
    if (data.ok) {
      if (data.deletedAuth === false) {
        alert(data.message || "Content deleted, but could not remove Auth account (you can disable/delete it in Firebase Authentication).");
      } else {
        alert("User and all data deleted.");
      }
      location.reload();
      return;
    }
    // Not ok — show server reason and do a fallback wipe so they’re still removed from the site
    alert((data.code || "internal") + ": " + (data.message || "Server error. Doing local wipe…"));
    await wipeContentFallback(uid);
    alert("Local wipe completed (products & orders removed).");
    location.reload();
  } catch (e) {
    // Network/SDK error — fallback
    alert("internal: " + (e?.message || "Function error. Doing local wipe…"));
    await wipeContentFallback(uid);
    alert("Local wipe completed (products & orders removed).");
    location.reload();
  }
}

// attach to buttons
document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-del]');
  if (btn) handleDelete(btn.dataset.del);
});
