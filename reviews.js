// reviews.js — email display, login required to post
import {
  db, auth, currentUser, requireAuth, ensureUserDoc,
  doc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, getDocs, serverTimestamp
} from './firebase.js';
import { $ } from './util.js';

const SUPER_ADMIN_UID = "Je9nLjh9rzYNrf79ll6M6sfgN5I2ID"; // admin

export async function initReviews(productId) {
  const container = $('#reviews');
  if (!container) return;

  container.innerHTML = `
    <div class="card" style="padding:12px">
      <h2>Reviews</h2>
      <div id="avgRow" style="margin:6px 0 12px;color:#9ca3af">Loading…</div>

      <div id="reviewForm" class="card" style="padding:12px;margin:12px 0"></div>
      <div id="reviewsList"></div>
    </div>
  `;

  const avgRow = $('#avgRow', container);
  const formWrap = $('#reviewForm', container);
  const listEl = $('#reviewsList', container);

  // product owner (for moderation rights)
  const prodSnap = await getDoc(doc(db, 'products', productId));
  const product = prodSnap.exists() ? prodSnap.data() : null;
  const viewer = currentUser(); // may be null

  const isAdmin = viewer?.uid === SUPER_ADMIN_UID;
  const isSellerOwner = viewer?.uid && product && viewer.uid === product.ownerUid;
  const canModerateAny = !!(isAdmin || isSellerOwner);

  function esc(s=''){ return String(s).replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m])); }
  function starText(n){ n = Number(n||0); return '★★★★★'.slice(0,n).padEnd(5,'☆'); }

  // ----- Render form: show login invite if not signed-in -----
  if (!viewer) {
    formWrap.innerHTML = `
      <div class="muted">You must be logged in to write a review.</div>
      <a class="btn" href="login.html" style="margin-top:8px;display:inline-block;text-decoration:none">Sign in to review</a>
    `;
  } else if (isSellerOwner) {
    formWrap.innerHTML = `<div class="muted">Sellers cannot review their own products.</div>`;
  } else {
    formWrap.innerHTML = `
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
      </div>
      <label style="margin-top:8px">Comment
        <textarea id="comment" rows="3" placeholder="What did you think?" maxlength="1000"></textarea>
      </label>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="saveReview">Save</button>
        <button id="deleteReview" style="display:none;background:#ef4444">Delete</button>
      </div>
      <div class="muted" id="reviewNote" style="margin-top:6px">Your review will show your email: <b>${esc(viewer.email || '(no email)')}</b></div>
    `;

    // hook save/delete after we know if a review exists
  }

  async function fetchAll() {
    const qAll = query(collection(db, 'products', productId, 'reviews'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qAll);
    return snap.docs.map(d => ({ id:d.id, ref:d.ref, ...d.data() }));
  }
  async function fetchMine() {
    if (!viewer) return null;
    const qMine = query(collection(db, 'products', productId, 'reviews'), where('buyerUid', '==', viewer.uid));
    const snap = await getDocs(qMine);
    if (snap.empty) return null;
    const d = snap.docs[0]; return { id:d.id, ref:d.ref, ...d.data() };
  }

  async function renderLists() {
    const [all, mine] = await Promise.all([fetchAll(), fetchMine()]);

    const sum = all.reduce((s,r)=>s+Number(r.stars||0),0);
    const avg = all.length ? (sum/all.length) : 0;
    avgRow.innerHTML = all.length ? `Average: <b>${avg.toFixed(1)}</b> (${all.length} review${all.length>1?'s':''})` : `No reviews yet`;

    // Show user's existing review controls
    if (viewer && !isSellerOwner) {
      const delBtn = $('#deleteReview', formWrap);
      const saveBtn = $('#saveReview', formWrap);
      const starsEl = $('#stars', formWrap);
      const commentEl = $('#comment', formWrap);

      if (mine) {
        starsEl.value = String(mine.stars || 5);
        commentEl.value = mine.comment || '';
        delBtn.style.display = '';
      }

      saveBtn.onclick = async () => {
        try {
          await requireAuth();          // ensure still signed in
          await ensureUserDoc();        // ensure users/{uid}
          const stars = Number(starsEl.value || 5);
          const comment = (commentEl.value || '').slice(0,1000);
          const buyerEmail = auth.currentUser?.email || '';

          if (mine) {
            await updateDoc(mine.ref, { buyerUid: viewer.uid, buyerEmail, stars, comment, createdAt: serverTimestamp() });
          } else {
            await addDoc(collection(db, 'products', productId, 'reviews'), {
              buyerUid: viewer.uid, buyerEmail, stars, comment, createdAt: serverTimestamp()
            });
          }
          alert('Review saved!');
          await renderLists();
        } catch (e) { alert(e.message || 'Failed to save'); }
      };

      delBtn.onclick = async () => {
        if (!mine) return;
        if (!confirm('Delete your review?')) return;
        await deleteDoc(mine.ref);
        await renderLists();
      };
    }

    // Render all reviews, with moderation
    listEl.innerHTML = all.map(r => {
      const when = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '';
      const isReviewer = viewer?.uid === r.buyerUid;
      const canDeleteThis = !!(isReviewer || canModerateAny);
      const showBan = !!(isAdmin && r.buyerUid);
      const label = r.buyerEmail || (r.buyerUid ? r.buyerUid.slice(-6) : 'Anonymous');
      return `
        <div class="row" style="align-items:flex-start;gap:12px">
          <div style="min-width:80px">${'★★★★★'.slice(0, Number(r.stars||0)).padEnd(5,'☆')}</div>
          <div style="flex:1">
            <b>${esc(label)}</b>
            <span class="muted">${when}</span><br>
            <div>${esc(r.comment || '')}</div>
          </div>
          <div style="display:flex;gap:8px">
            ${showBan ? `<button class="rev-ban" data-uid="${esc(r.buyerUid)}" title="Ban user">Ban</button>` : ``}
            ${canDeleteThis ? `<button class="rev-del" data-path="${r.ref.path}">Delete</button>` : ``}
          </div>
        </div>
      `;
    }).join('');

    // Actions
    listEl.querySelectorAll('.rev-del').forEach(btn => {
      btn.onclick = async () => {
        const path = btn.dataset.path;
        if (!confirm('Delete this review?')) return;
        await deleteDoc(doc(db, path));
        await renderLists();
      };
    });

    listEl.querySelectorAll('.rev-ban').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        if (!confirm(`Ban this user? UID: ${uid}`)) return;
        await updateDoc(doc(db, 'users', uid), { role: 'banned' });
        alert('User banned');
      };
    });
  }

  await renderLists();
}
