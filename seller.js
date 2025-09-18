import {
  db, ensureAuth, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  collection, query, where, onSnapshot, serverTimestamp
} from './firebase.js';
import { $, $$, fmtCurrency } from './util.js';

// Cloudinary unsigned upload
const CLOUD_NAME = 'degcslkrj';
const UPLOAD_PRESET = 'marketplace'; // your unsigned preset
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'marketplace');
  const res = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.secure_url;
}

const pform = $('#pform');
const imgInput = $('#img');
const plist = $('#plist');
const ordersDiv = $('#orders');

let imageUrl = '';

imgInput?.addEventListener('change', async () => {
  const file = imgInput.files?.[0];
  if (!file) return;
  try {
    imageUrl = await uploadImage(file);
    alert('Image uploaded');
  } catch (e) { alert(e.message || 'Upload failed'); }
});

const user = await ensureAuth();
const userRef = doc(db, 'users', user.uid);
const uSnap = await getDoc(userRef);
if (!uSnap.exists()) {
  await setDoc(userRef, { role: 'seller', createdAt: serverTimestamp() });
}

pform.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(pform).entries());

  const prod = {
    title: data.title,
    price: Number(data.price || 0),
    stock: Number(data.stock || 0),
    category: data.category || '',
    description: data.description || '',
    images: imageUrl ? [imageUrl] : [],
    ownerUid: user.uid,
    shopId: user.uid,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    if (data.id) await updateDoc(doc(db, 'products', data.id), prod);
    else await addDoc(collection(db, 'products'), prod);
    alert('Saved');
    pform.reset(); imageUrl = '';
    loadProducts();
  } catch (e2) { alert(e2.message || 'Save failed'); }
});

async function loadProducts() {
  const snap = await getDocs(query(collection(db, 'products'), where('ownerUid','==', user.uid)));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  plist.innerHTML = items.map(p => `
    <div class="row">
      <div><img class="thumb" src="${(p.images && p.images[0]) || ''}"></div>
      <div><b>${p.title}</b><br>${fmtCurrency(p.price)} · Stock: ${p.stock}</div>
      <div>
        <button data-id="${p.id}" class="edit">Edit</button>
        <button data-id="${p.id}" class="del" style="background:#ef4444">Delete</button>
      </div>
    </div>
  `).join('');

  $$('.edit', plist).forEach(btn => btn.onclick = () => {
    const p = items.find(i => i.id === btn.dataset.id);
    if (!p) return;
    pform.title.value = p.title;
    pform.price.value = p.price;
    pform.stock.value = p.stock;
    pform.category.value = p.category || '';
    pform.description.value = p.description || '';
    pform.id.value = p.id;
    imageUrl = (p.images && p.images[0]) || '';
  });

  $$('.del', plist).forEach(btn => btn.onclick = async () => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', btn.dataset.id));
      loadProducts();
    } catch (e3) { alert(e3.message || 'Delete failed'); }
  });
}
loadProducts();

onSnapshot(
  query(collection(db, 'orders'), where('sellerUid', '==', user.uid)),
  (snap) => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    ordersDiv.innerHTML = orders.map(o => {
      const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : '';
      const buyerLine = `
        <div style="margin:6px 0">
          <b>${o.buyerName || '—'}</b>
          ${o.buyerPhone ? ' · ' + o.buyerPhone : ''}
          ${o.buyerEmail ? ' · ' + o.buyerEmail : ''}
          ${o.shippingAddress ? `<div>${o.shippingAddress}</div>` : ''}
        </div>
      `;
      return `
        <div class="card">
          <b>Order ${o.id.slice(-6)}</b> · ${o.status} ·
          <span style="color:#9ca3af">${when}</span><br>
          ${buyerLine}
          ${o.items.map(i => `${i.title} × ${i.qty}`).join(', ')}<br>
          Total: ${fmtCurrency(o.total)}<br>
          <select data-id="${o.id}" class="status" style="margin-top:8px">
            ${['pending','accepted','out_for_delivery','completed','cancelled']
              .map(s => `<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      `;
    }).join('');

    $$('.status', ordersDiv).forEach(sel => sel.onchange = async () => {
      try {
        await updateDoc(doc(db, 'orders', sel.dataset.id), { status: sel.value });
      } catch (e4) { alert(e4.message || 'Status update failed'); }
    });
  }
);
