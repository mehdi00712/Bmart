// firebase.js — email/password required

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, limit, startAfter
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ✅ Your Firebase web config
export const firebaseConfig = {
  apiKey: "AIzaSyBMqutrvlRPiDYwqn2JSutL38rsCyiaeJ8",
  authDomain: "marketplace-ddddc.firebaseapp.com",
  projectId: "marketplace-ddddc",
  storageBucket: "marketplace-ddddc.firebasestorage.app",
  messagingSenderId: "957340019852",
  appId: "1:957340019852:web:593cc63d6b1d67a6e11fa9",
  measurementId: "G-L8M8WH1D5V"
};

// --- init ---
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Auth guards ---
/** Redirects to login.html if not signed in; resolves with user */
export async function requireAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else {
        window.location.href = "login.html";
        reject(new Error("Not signed in"));
      }
    });
  });
}

/** Returns current user or null (no redirect) */
export function currentUser() {
  return auth.currentUser || null;
}

/** Ensure users/{uid} exists with role: "buyer" */
export async function ensureUserDoc() {
  const u = await requireAuth();
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { role: "buyer", email: u.email || "", createdAt: serverTimestamp() });
  }
  return u;
}

export { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword };

// --- Re-export Firestore utils used elsewhere ---
export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, limit, startAfter
};
