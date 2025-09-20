// firebase.js — single-file setup for GitHub Pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously,
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

// --- Core inits ---
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Auth helpers ---
/** Ensures there is a signed-in user (anonymous is fine). Resolves with the user. */
export async function ensureAuth() {
  // Fast path if already signed in
  if (auth.currentUser) return auth.currentUser;

  // Wait for current state, otherwise sign in anonymously
  return new Promise(async (resolve) => {
    let unsub = onAuthStateChanged(auth, async (u) => {
      if (u) { unsub && unsub(); resolve(u); }
    });
    // If nobody arrives in first tick, start anonymous
    await signInAnonymously(auth).catch(() => {});
  });
}

/** Optional sign-out export (used by dashboard etc.) */
export { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword };

// --- Firestore: ensure users/{uid} exists with role: "buyer" ---
export async function ensureUserDoc() {
  const u = await ensureAuth();
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { role: "buyer", createdAt: serverTimestamp() });
  }
  return u;
}

// --- Re-export Firestore utils used elsewhere ---
export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, limit, startAfter
};
