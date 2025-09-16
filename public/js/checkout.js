// public/js/checkout.js
import { db, ensureAuth, collection, addDoc, serverTimestamp } from './firebase.js';
import { getCart, clearCart, subtotal } from './store.js';
import { fmtCurrency } from './util.js';

const FEES = { pickup: 0, delivery: 150, postage: 125 };

const items = getCart();
const summary = document.getElementById('summary');
const totalEl = document.getElementById('total');
const form = document.getElementById('form');

if (!items.length) summary.innerHTML = '<p>Cart is empty.</p>';
else summary.innerHTML = items.map(it => `<div class="row"><div>${it.title}</div><div>× ${it.qty}</div><div>${fmtCurrency(it.qty * it.price)}</div></div>`).join('');

function calcTotal(method) {
  const st = subtotal();
  const fee = FEES[method] || 0;
  totalEl.textContent = `Subtotal: ${fmtCurrency(st)}  +  ${method} fee: ${fmtCurrency(fee)}  =  Total: ${fmtCurrency(st + fee)}`;
  return { st, fee, total: st + fee };
}

let method = 'pickup';
calcTotal(method);

// In some browsers, form.dm is a RadioNodeList; ensure we iterate safely
const radios = form.querySelectorAll('input[name="dm"]');
radios.forEach(r => r.addEventListener('change', () => { method = form.dm.value; calcTotal(method); }));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!items.length) return alert('Cart is empty');
  const { st, fee, total } = calcTotal(method);

  const user = await ensureAuth(); // anonymous OK

  // Assume all items belong to the same seller/shop in MVP
  const sellerUid = items[0].sellerUid || 'UNKNOWN_SELLER';
  const shopId = items[0].shopId || 'UNKNOWN_SHOP';

  const order = {
    buyerUid: user.uid,
    sellerUid, shopId,
    items: items.map(x => ({ productId: x.productId, title: x.title, price: x.price, qty: x.qty })),
    subtotal: st,
    deliveryMethod: method,
    deliveryFee: fee,
    total,
    status: 'pending',
    shippingAddress: form.address.value || '',
    createdAt: serverTimestamp(),
    buyerName: form.name.value,
    buyerPhone: form.phone.value
  };

  await addDoc(collection(db, 'orders'), order);
  clearCart();
  alert('Order placed! You will receive updates.');
  location.href = '/';
});
