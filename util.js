export function $(sel, parent = document) { return parent.querySelector(sel); }
export function $$(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }
export function fmtCurrency(x) { return `Rs ${Number(x || 0).toFixed(2)}`; }
export function readQuery(key) { return new URL(location.href).searchParams.get(key); }
export function uid() { return Math.random().toString(36).slice(2); }
