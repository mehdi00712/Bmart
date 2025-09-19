// admin.js — list users with email, change roles, delete users (Auth + Firestore)

import { db, collection, getDocs, doc, updateDoc, deleteDoc } from './firebase.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";

const usersDiv = document.getElementById('users');
const functions = getFunctions(); // default region

async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  usersDiv.innerHTML = items.map(u => `
    <div class="row">
      <div>
        <div><b>${u.email || '(no email yet)'}</b></div>
        <div style="color:#9ca3af">${u.id}</div>
      </div>
      <div>Role: <b>${u.role || 'buyer'}</b></div>
      <div style="display:flex;gap:8px">
        <button data-id="${u.id}" data-role="seller">Make Seller</button>
        <button data-id="${u.id}" data-role="admin">Make Admin</button>
        <button data-id="${u.id}" data-role="buyer" style="background:#6b7280">Ban (set buyer)</button>
        <button data-id="${u.id}" class="delete" style="background:#ef4444">Delete User</button>
      </div>
    </div>`).join('');

  // Change role
  usersDiv.querySelectorAll('button[data-role]').forEach(b => b.onclick = async () => {
    try {
      await updateDoc(doc(db, 'users', b.dataset.id), { role: b.dataset.role });
      alert('Role updated');
      loadUsers();
    } catch (e) { alert(e.message || 'Update failed'); }
  });

  // Delete user (Auth + Firestore) via callable CF
  usersDiv.querySelectorAll('button.delete').forEach(btn => btn.onclick = async () => {
    const uid = btn.dataset.id;
    if (!confirm('Delete this user account and their user doc? This is permanent.')) return;
    try {
      const delFn = httpsCallable(functions, 'adminDeleteAuthUser');
      await delFn({ uid });                   // server: remove from Firebase Auth
      await deleteDoc(doc(db, 'users', uid)); // client: remove /users/<uid>
      alert('User deleted.');
      loadUsers();
    } catch (e) { alert(e.message || 'Delete failed'); }
  });
}

loadUsers();
