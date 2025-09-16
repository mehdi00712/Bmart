// public/js/store.js
const KEY = 'mp_cart_v1';

export function getCart() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
export function setCart(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
export function addToCart(item) {
  const cart = getCart();
  const i = cart.findIndex(x => x.productId === item.productId);
  if (i >= 0) cart[i].qty += item.qty; else cart.push(item);
  setCart(cart);
}
export function removeFromCart(productId) {
  setCart(getCart().filter(x => x.productId !== productId));
}
export function clearCart() { setCart([]); }
export function subtotal() {
  return getCart().reduce((s, it) => s + (it.price * it.qty), 0);
}
