import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const form = document.getElementById('authForm');
const signupBtn = document.getElementById('signupBtn');
const msg = document.getElementById('msg');

function setMsg(t){ msg.textContent = t; }
function getForm() {
  const fd = new FormData(form);
  return { email: String(fd.get('email')||'').trim(), password: String(fd.get('password')||'') };
}

async function upsertUserDoc(u, defaults={}) {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  const base = { email: u.email || '', updatedAt: serverTimestamp() };
  if (!snap.exists()) {
    await setDoc(ref, { createdAt: serverTimestamp(), ...base, ...defaults });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const { email, password } = getForm();
  try {
    setMsg('Signing in…');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserDoc(cred.user); // write email on login
    setMsg('Signed in. Redirecting…');
    location.href = 'dashboard.html';
  } catch (err) { setMsg(err.message || 'Sign in failed'); }
});

signupBtn.addEventListener('click', async ()=>{
  const { email, password } = getForm();
  try {
    setMsg('Creating account…');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await upsertUserDoc(cred.user, { role: 'seller' }); // default new sellers
    setMsg('Account created. Redirecting…');
    location.href = 'dashboard.html';
  } catch (err) { setMsg(err.message || 'Sign up failed'); }
});

onAuthStateChanged(auth, (u)=>{ if (u) location.href = 'dashboard.html'; });
