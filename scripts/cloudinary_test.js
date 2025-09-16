// scripts/cloudinary_test.js
// Server-side test script (Node) — do NOT expose your api_secret in the browser.
// Set env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  const uploadResult = await cloudinary.uploader.upload(
    'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
    { public_id: 'shoes' }
  );
  console.log(uploadResult);

  const optimizeUrl = cloudinary.url('shoes', { fetch_format: 'auto', quality: 'auto' });
  console.log(optimizeUrl);

  const autoCropUrl = cloudinary.url('shoes', { crop: 'auto', gravity: 'auto', width: 500, height: 500 });
  console.log(autoCropUrl);
}
run().catch(console.error);
