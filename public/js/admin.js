// public/js/admin.js
import { db, collection, getDocs, doc, updateDoc } from '../js/firebase.js';

const usersDiv = document.getElementById('users');

async function loadUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  usersDiv.innerHTML = items.map(u => `
    <div class="row">
      <div>${u.displayName||u.id}</div>
      <div>Role: ${u.role||'buyer'}</div>
      <div>
        <button data-id="${u.id}" data-role="seller">Make Seller</button>
        <button data-id="${u.id}" data-role="admin">Make Admin</button>
      </div>
    </div>`).join('');

  usersDiv.querySelectorAll('button').forEach(b => b.onclick = async () => {
    await updateDoc(doc(db, 'users', b.dataset.id), { role: b.dataset.role });
    alert('Updated');
    loadUsers();
  });
}

loadUsers();
