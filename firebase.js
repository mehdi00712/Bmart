// Firebase init (flat for GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging.js";

export const app = initializeApp({
  apiKey: "AIzaSyBMqutrvlRPiDYwqn2JSutL38rsCyiaeJ8",
  authDomain: "marketplace-ddddc.firebaseapp.com",
  projectId: "marketplace-ddddc",
  storageBucket: "marketplace-ddddc.firebasestorage.app",
  messagingSenderId: "957340019852",
  appId: "1:957340019852:web:593cc63d6b1d67a6e11fa9",
  measurementId: "G-L8M8WH1D5V"
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

export async function ensureAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) return resolve(user);
      await signInAnonymously(auth);
      onAuthStateChanged(auth, (u) => resolve(u));
    });
  });
}

export async function registerFcmToken() {
  try {
    const current = auth.currentUser || (await ensureAuth());
    const token = await getToken(messaging, { vapidKey: "YOUR_WEB_PUSH_CERT_KEY_PAIR" });
    if (!token) return;
    const userRef = doc(db, "users", current.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, { role: 'buyer', createdAt: serverTimestamp(), fcmTokens: [token] });
    } else {
      const data = snap.data();
      const set = new Set([...(data.fcmTokens || []), token]);
      await updateDoc(userRef, { fcmTokens: Array.from(set) });
    }
  } catch (e) { console.warn("FCM registration failed", e); }
}

export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, runTransaction
};
