import { auth, db } from '../config/firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Session Guard: Auto-redirect if already logged in
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Optional: verify the user doc exists before redirecting
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            window.location.href = 'dashboard.html';
        }
    }
});

// 2. DOM Elements
const authForm = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const submitBtn = document.getElementById('submit-btn');
const toggleText = document.getElementById('toggle-text');
const subtitle = document.getElementById('auth-subtitle');
const errorMsg = document.getElementById('error-message');

let isLoginMode = true; // Tracks which state the form is in

// 3. UI Toggle Logic
function setupToggle() {
    const toggleBtn = document.getElementById('toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        errorMsg.textContent = ''; // Clear errors on toggle
        
        if (isLoginMode) {
            nameGroup.style.display = 'none';
            document.getElementById('fullName').removeAttribute('required');
            submitBtn.textContent = 'Log In';
            subtitle.textContent = 'Log in to manage your workspace.';
            toggleText.innerHTML = 'Need an account? <button type="button" id="toggle-btn" class="btn-link">Sign Up</button>';
        } else {
            nameGroup.style.display = 'block';
            document.getElementById('fullName').setAttribute('required', 'true');
            submitBtn.textContent = 'Sign Up';
            subtitle.textContent = 'Create an account to get started.';
            toggleText.innerHTML = 'Already have an account? <button type="button" id="toggle-btn" class="btn-link">Log In</button>';
        }
        
        // Re-attach listener to the newly rendered button
        setupToggle();
    });
}
setupToggle(); // Initialize toggle

// 4. Form Submission (Login & Signup)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        if (isLoginMode) {
            // ==========================================
            // LOGIN FLOW
            // ==========================================
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged at the top of the file handles the redirect

        } else {
            // ==========================================
            // SIGN UP FLOW
            // ==========================================
            const fullName = document.getElementById('fullName').value.trim();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 1. Attach name to Auth object
            await updateProfile(user, { displayName: fullName });

            // 2. Create the User Document in Firestore
            // This guarantees the 'employee' role exists immediately for the demo
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: fullName,
                role: 'employee', // Default role for all new signups
                createdAt: new Date().toISOString()
            });
            
            // onAuthStateChanged at the top of the file handles the redirect
        }
    } catch (error) {
        console.error("Auth Error:", error);
        
        // Human-readable error mapping
        switch(error.code) {
            case 'auth/invalid-credential':
                errorMsg.textContent = 'Incorrect email or password.';
                break;
            case 'auth/email-already-in-use':
                errorMsg.textContent = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                errorMsg.textContent = 'Password must be at least 6 characters.';
                break;
            default:
                errorMsg.textContent = 'Something went wrong. Please try again.';
        }
        
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
    }
});