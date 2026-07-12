// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace this object with your actual Firebase project configuration!
// 1. Go to console.firebase.google.com
// 2. Click the Gear Icon (Project Settings) > General
// 3. Scroll down to "Your apps", select the Web app (</>), and copy the config object here.
const firebaseConfig = {
    apiKey: "AIzaSyC7CAxk7ynY1llZr6jd-kqxbRxNTwLTj7o",
  authDomain: "assetflow-enterprise-system.firebaseapp.com",
  projectId: "assetflow-enterprise-system",
  storageBucket: "assetflow-enterprise-system.firebasestorage.app",
  messagingSenderId: "1003355056429",
  appId: "1:1003355056429:web:57e0e12c1312fce3f50ba4",
  measurementId: "G-G861SMDWRQ"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export them so they can be imported by your page scripts (like dashboard.js, assets.js, etc.)
export { app, auth, db };
