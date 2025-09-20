// reviews.js
import {
  db, ensureAuth, doc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, getDocs, serverTimestamp
} from './firebase.js';
import { $ } from './util.js';

export async function initReviews(productId) {
  const container = $('#reviews');
  if (!container) return;

  // Render placeholders
  container.innerHTML = `
    <div class="card" style="padding:12px">
      <h2>Reviews</h2>
      <div id="avgRow" style="margin:6px 0 12px;color:#9ca3af">Loading…</div>

      <div id="reviewForm" class="card" style="padding:12px;margin:12px 0">
        <h3>Your Review</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <label>Stars:
            <select id="stars">
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </label>
          <label style="flex:1">Name <input id="rname" placeholder="Optional" /></label>
        </div>
        <label style="margin-top:8px">Comment
          <textarea id="comment" rows="3" placeholder="What did you think?" maxlength="1000"></textarea>
        </label>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="saveReview">Save</button>
          <button id="deleteReview" style="display:none;background:#ef4444">Delete</button>
        </div>
        <div id="reviewNote" style="color:#9ca3af;margin-top:6px"></div>
      </div>

      <div id="reviewsList"></div>
    </div>
  `;

  const avgRow = $('#avgRow', container);
  const reviewsList = $('#reviewsList', container);
  const saveBtn = $('#saveReview', container);
  const delBtn  = $('#deleteReview', container);
  const starsEl = $('#stars', container);
  const nameEl  = $('#rname', container);
  const commentEl = $('#comment', container);
  const noteEl = $('#reviewNote', container);

  // Load product (to know owner for client guard text)
  const prodSnap = await getDoc(doc(db, 'products', productId));
  const product = prodSnap.exists() ? prodSnap.data() : null;

  // Signed-in user (anonymous is fine)
  const user = await ensureAuth();

  // Fetch all reviews (newest first)
  async function fetchAllReviews() {
    const qAll = query(collection(db, 'products', productId, 'reviews'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qAll);
    return snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
  }

  // Fetch my review (if any)
  async function fetchMyReview() {
    const qMine = query(
      collection(db, 'products', productId, 'reviews'),
      where('buyerUid', '==', user.uid)
    );
    const snap = await getDocs(qMine);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ref: d.ref, ...d.data() };
  }

  async function render() {
    const [all, mine] = await Promise.all([fetchAllReviews(), fetchMyReview()]);

    // Average
    const sum = all.reduce((s, r) => s + Number(r.stars || 0), 0);
    const avg = all.length ? (sum / all.length) : 0;
    avgRow.innerHTML = all.length
      ? `Average: <b>${avg.toFixed(1)}</b> (${all.length} review${all.length>1?'s':''})`
      : `No reviews yet`;

    // My review form state
    if (mine) {
      starsEl.value = String(mine.stars || 5);
      nameEl.value = mine.buyerName || '';
      commentEl.value = mine.comment || '';
      delBtn.style.display = '';
      noteEl.textContent = `You can edit or delete your review.`;
    } else {
      starsEl.value = '5';
      nameEl.value = '';
      commentEl.value = '';
      delBtn.style.display = 'none';
      noteEl.textContent = `Only real buyers can fairly review. Please keep it respectful.`;
    }

    // Seller cannot review own product (UI guard; rules enforce it anyway)
    if (product && product.ownerUid === user.uid) {
      saveBtn.disabled = true;
      noteEl.textContent = 'Sellers cannot review their own products.';
    } else {
      saveBtn.disabled = false;
    }

    // List
    reviewsList.innerHTML = all.map(r => {
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const stars = '★★★★★'.slice(0, Number(r.stars||0)).padEnd(5, '☆');
      const name = r.buyerName || r.buyerUid?.slice(-6) || 'Anonymous';
      return `
        <div class="row" style="align-items:flex-start">
          <div style="min-width:80px">${stars}</div>
          <div style="flex:1">
            <b>${name}</b> <span style="color:#9ca3af">${when}</span><br>
            <div>${(r.comment||'').replace(/</g,'&lt;')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Save (create or update)
  saveBtn.onclick = async () => {
    try {
      const stars = Number(starsEl.value || 5);
      const comment = (commentEl.value || '').slice(0, 1000);
      const buyerName = nameEl.value || '';

      // Is there an existing review?
      const mine = await fetchMyReview();
      if (mine) {
        await updateDoc(mine.ref, {
          buyerUid: user.uid,
          buyerName,
          stars,
          comment,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'products', productId, 'reviews'), {
          buyerUid: user.uid,
          buyerName,
          stars,
          comment,
          createdAt: serverTimestamp()
        });
      }
      await render();
      alert('Saved!');
    } catch (e) {
      alert(e.message || 'Failed to save review');
    }
  };

  // Delete my review
  delBtn.onclick = async () => {
    if (!confirm('Delete your review?')) return;
    try {
      const mine = await fetchMyReview();
      if (mine) await deleteDoc(mine.ref);
      await render();
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  // Initial render
  await render();
}
