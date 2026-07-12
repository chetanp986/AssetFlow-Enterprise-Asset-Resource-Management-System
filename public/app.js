import { auth } from "./firebase-config.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const statusEl = document.getElementById("status");
const loginBtn = document.getElementById("login-btn");
const logEl = document.getElementById("log");

function log(message) {
  logEl.textContent += `${message}\n`;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function isConfigPlaceholder(config) {
  return config.apiKey.includes("YourKeyGoesHere") || config.authDomain.includes("your-project") || config.projectId === "your-project";
}

try {
  const script = document.createElement("script");
  script.type = "module";
  document.head.appendChild(script);
} catch (err) {
  console.error(err);
}

loginBtn.disabled = false;
loginBtn.addEventListener("click", async () => {
  setStatus("Signing in...");
  try {
    const userCredential = await signInAnonymously(auth);
    log(`Signed in anonymously: ${userCredential.user.uid}`);
    setStatus("Signed in successfully.");
  } catch (error) {
    console.error(error);
    setStatus("Sign-in failed. Check console.");
    log(`Error: ${error.message}`);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    setStatus(`User signed in: ${user.uid}`);
    loginBtn.disabled = true;
  } else {
    setStatus("Not signed in.");
    loginBtn.disabled = false;
  }
});
