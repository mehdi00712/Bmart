# Local Marketplace (Web + Firebase + Cloudinary)

This is a ready-to-deploy starter for a local marketplace:

- Buyer site (browse → cart → checkout → order in Firestore)
- Seller dashboard (add products with **Cloudinary unsigned** uploads, view live orders)
- Admin page (set user roles)
- Cloud Functions (FCM push on new orders / status updates)

## 0) Prerequisites
- Firebase project with **Auth (Email/Password + Anonymous)**, **Firestore**, **Cloud Messaging** enabled.
- Cloudinary account (create an **Unsigned Upload Preset** in folder `marketplace`).
- Node 18+ if deploying functions.

## 1) Configure
- Edit `public/js/firebase.js` — already filled with your config.
- Edit `public/js/seller.js` — set `UPLOAD_PRESET` to the name of your unsigned preset.
- (Optional) If you want web push notifications: in Firebase console > Project Settings > **Cloud Messaging**: create a **Web Push certificate** (VAPID) and put the key into `registerFcmToken()`.

## 2) Firestore Rules
```
firebase deploy --only firestore:rules
```
(using `firestore.rules`)

## 3) Deploy Cloud Functions (optional for notifications)
```
cd functions
npm i
firebase deploy --only functions
```

## 4) Hosting
```
firebase login
firebase init (choose Hosting + Functions if you plan to use them)
# select 'public' as your hosting folder
firebase deploy
```

## 5) Try it
- Open `/seller/dashboard.html` to add a product (image uploads go to Cloudinary).
- Open `/` to browse the product, add to cart, and place an order.
- The order is stored under `orders` in Firestore. If Functions are deployed and devices registered tokens, push notifications fire.

## 6) Notes
- Do **NOT** expose your Cloudinary `api_secret` in any browser code. For client uploads use **unsigned** preset.
- Web push will only work over HTTPS and with a valid VAPID key and a proper `firebase-messaging-sw.js` implementation.

## 7) GitHub
Push the whole folder to a new repo. Example:
```
git init
git add .
git commit -m "Initial marketplace starter"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
