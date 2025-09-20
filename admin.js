import { db } from './firebase.js';
import {
  collection, getDocs, query, where, orderBy, limit, startAfter,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const usersDiv = document.getElementById('users');

async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                         .sort((a,b)=> (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));

  usersDiv.innerHTML = users.map(u => `
    <div class="row">
      <div style="flex:2;word-break:break-all">
        <b>${u.displayName || u.email || u.id}</b><br>
        <small>${u.id}</small>
      </div>
      <div style="flex:1">Role: <b>${u.role || 'buyer'}</b></div>
      <div style="flex:2;display:flex;gap:8px;justify-content:flex-end">
        ${u.role === 'banned'
          ? `<button class="unban" data-id="${u.id}">Unban</button>`
          : `<button class="ban" data-id="${u.id}" style="background:#6b7280">Ban</button>`}
        <button class="wipe" data-id="${u.id}" style="background:#ef4444">Wipe Content</button>
      </div>
    </div>
  `).join('');

  // Ban
  usersDiv.querySelectorAll('.ban').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      if (!confirm(`Ban this user?\nUID: ${uid}`)) return;
      await updateDoc(doc(db, 'users', uid), { role: 'banned' });
      alert('User banned (cannot post anymore).');
      loadUsers();
    };
  });

  // Unban
  usersDiv.querySelectorAll('.unban').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      if (!confirm(`Unban this user?\nUID: ${uid}`)) return;
      await updateDoc(doc(db, 'users', uid), { role: 'seller' });
      alert('User unbanned.');
      loadUsers();
    };
  });

  // Wipe Content (delete all products + orders)
  usersDiv.querySelectorAll('.wipe').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      if (!confirm(`Delete ALL products and orders for this user?\nUID: ${uid}`)) return;
      try {
        await wipeUserContent(uid);
        alert('Content wiped.');
        loadUsers();
      } catch (e) {
        alert(e.message || 'Wipe failed');
      }
    };
  });
}

// Paginated client-side delete
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
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }
}

async function wipeUserContent(uid) {
  await deleteQueryBatched('products', 'ownerUid', uid);
  await deleteQueryBatched('orders', 'sellerUid', uid);
  await deleteQueryBatched('orders', 'buyerUid', uid);
  // TIP: keep the /users doc to preserve "banned" status; if you delete it, they may create it again on next login.
}

loadUsers();
