import { db } from './firebase.js';
import { getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";
import { app } from './firebase.js';

const usersDiv = document.getElementById('users');
const functions = getFunctions(app);
const deleteUserEverything = httpsCallable(functions, 'deleteUserEverything');

async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                         .sort((a,b)=> (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
  usersDiv.innerHTML = items.map(u => `
    <div class="row">
      <div style="flex:2;word-break:break-all">
        <b>${u.displayName || u.email || u.id}</b><br>
        <small>${u.id}</small>
      </div>
      <div style="flex:1">Role: <b>${u.role || 'buyer'}</b></div>
      <div style="flex:2;display:flex;gap:8px;justify-content:flex-end">
        <button data-id="${u.id}" data-role="seller">Make Seller</button>
        <button data-id="${u.id}" data-role="admin">Make Admin</button>
        <button class="danger" data-del="${u.id}" style="background:#ef4444">Delete User (all data)</button>
      </div>
    </div>
  `).join('');

  // Role changes (super admin only; rules will enforce)
  usersDiv.querySelectorAll('button[data-role]').forEach(b => {
    b.onclick = async () => {
      await updateDoc(doc(db, 'users', b.dataset.id), { role: b.dataset.role });
      alert('Updated');
      loadUsers();
    };
  });

  // Delete user (Cloud Function)
  usersDiv.querySelectorAll('button[data-del]').forEach(b => {
    b.onclick = async () => {
      const targetUid = b.dataset.del;
      if (!confirm(`Delete this user and ALL their products & orders?\nUID: ${targetUid}`)) return;
      try {
        const res = await deleteUserEverything({ targetUid });
        if (res?.data?.ok) {
          alert('User and data deleted.');
          loadUsers();
        } else {
          alert('Delete failed.');
        }
      } catch (e) {
        alert(e.message || 'Delete failed');
      }
    };
  });
}

loadUsers();
