import {
  db, ensureAuth, collection, doc, serverTimestamp, runTransaction
} from './firebase.js';
import { getCart, clearCart, subtotal } from './store.js';
import { fmtCurrency } from './util.js';

const FEES = { pickup: 0, delivery: 150, postage: 125 };

const items = getCart();
const summary = document.getElementById('summary');
const totalEl = document.getElementById('total');
const form = document.getElementById('form');

if (!items.length) summary.innerHTML = '<p>Cart is empty.</p>';
else summary.innerHTML = items.map(it =>
  `<div class="row"><div>${it.title}</div><div>× ${it.qty}</div><div>${fmtCurrency(it.qty * it.price)}</div></div>`
).join('');

function calcTotal(method) {
  const st = subtotal();
  const fee = FEES[method] || 0;
  totalEl.textContent =
    `Subtotal: ${fmtCurrency(st)}  +  ${method} fee: ${fmtCurrency(fee)}  =  Total: ${fmtCurrency(st + fee)}`;
  return { st, fee, total: st + fee };
}

let method = 'pickup';
calcTotal(method);
form.querySelectorAll('input[name="dm"]').forEach(r =>
  r.addEventListener('change', () => { method = form.dm.value; calcTotal(method); })
);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!items.length) return alert('Cart is empty');
  const { st, fee, total } = calcTotal(method);

  // ✅ read fields via FormData (avoid form.name/phone which collide with form props)
  const fd = new FormData(form);
  const buyerName = (fd.get('name') || '').toString().trim();
  const buyerPhone = (fd.get('phone') || '').toString().trim();
  const shippingAddress = (fd.get('address') || '').toString().trim();
  if (!buyerName || !buyerPhone) return alert('Please enter name and phone.');

  const user = await ensureAuth();
  const buyerEmail = (user.email || ''); // may be empty for anonymous checkout

  try {
    await runTransaction(db, async (tx) => {
      // 1) verify & decrement stock on all products in cart
      const productRefs = items.map(it => doc(db, 'products', it.productId));
      const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

      const firstProd = productSnaps[0].data() || {};
      const sellerUid = firstProd.ownerUid || 'UNKNOWN_SELLER';
      const shopId = firstProd.shopId || 'UNKNOWN_SHOP';

      productSnaps.forEach((snap, i) => {
        if (!snap.exists()) throw new Error('Product not found: ' + items[i].productId);
        const p = snap.data();
        const newStock = Number(p.stock || 0) - Number(items[i].qty || 0);
        if (newStock < 0) throw new Error(`Not enough stock for "${p.title}"`);
        tx.update(productRefs[i], { stock: newStock, updatedAt: serverTimestamp() });
      });

      // 2) create order with buyer details
      const orderRef = doc(collection(db, 'orders'));
      tx.set(orderRef, {
        buyerUid: user.uid,
        buyerName,
        buyerPhone,
        buyerEmail,
        shippingAddress,
        sellerUid, shopId,
        items: items.map(x => ({ productId: x.productId, title: x.title, price: x.price, qty: x.qty })),
        subtotal: st,
        deliveryMethod: method,
        deliveryFee: fee,
        total,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    });

    clearCart();
    alert('Order placed!');
    location.href = 'index.html';
  } catch (err) {
    alert(err.message || 'Order failed');
  }
});
