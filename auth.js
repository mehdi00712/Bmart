import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const form = document.getElementById('authForm');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const msg = document.getElementById('msg');

function setMsg(t){ msg.textContent = t; }
function getForm() {
  const fd = new FormData(form);
  return { email: fd.get('email').trim(), password: fd.get('password') };
}

async function ensureUserDoc(uid, defaults) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { createdAt: serverTimestamp(), ...defaults });
  }
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const { email, password } = getForm();
  try {
    setMsg('Signing in…');
    await signInWithEmailAndPassword(auth, email, password);
    setMsg('Signed in. Redirecting…');
    location.href = 'dashboard.html';
  } catch (err) {
    setMsg(err.message || 'Sign in failed');
  }
});

signupBtn.addEventListener('click', async ()=>{
  const { email, password } = getForm();
  try {
    setMsg('Creating account…');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(cred.user.uid, { role: 'seller' });
    setMsg('Account created. Redirecting…');
    location.href = 'dashboard.html';
  } catch (err) {
    setMsg(err.message || 'Sign up failed');
  }
});

onAuthStateChanged(auth, (u)=>{ if (u) location.href = 'dashboard.html'; });
