// backend/config/firebase-config.js

// 1. Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// 2. PASTE YOUR CONFIG OBJECT HERE (Get this from the Firebase Web Console)
const firebaseConfig = {
  apiKey: "AIzaSyYourKeyGoesHere...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefg"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 4. Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// ==========================================
// LOCAL EMULATOR CONFIGURATION
// ==========================================
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  console.log("Running in local development mode. Connecting to emulators...");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
