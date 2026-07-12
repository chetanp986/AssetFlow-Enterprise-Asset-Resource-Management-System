import { auth } from '../config/firebase-config.js';
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

/**
 * Fetches the user's role from Firestore, caching it in sessionStorage
 * to save database reads and speed up page loads.
 */
export async function getUserRole(uid) {
    // 1. Check cache first
    const cachedRole = sessionStorage.getItem('userRole');
    if (cachedRole) return cachedRole;

    // 2. If not cached, fetch from Firestore 'users' collection
    try {
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const role = userSnap.data().role || 'employee'; // Safe fallback
            sessionStorage.setItem('userRole', role);
            return role;
        }
    } catch (error) {
        console.error("Error fetching user role:", error);
    }
    
    return 'employee'; // Default to lowest privilege on error
}

/**
 * Page Guard: Placed at the top of protected pages (like admin-setup.js).
 * Redirects unauthorized users back to the dashboard.
 */
export function requireRole(allowedRoles) {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html'; // Not logged in
            return;
        }

        const role = await getUserRole(user.uid);
        
        if (!allowedRoles.includes(role)) {
            console.warn(`Access Denied: User role '${role}' cannot access this page.`);
            window.location.replace('dashboard.html'); // Bounce them out
        } else {
            // User is authorized. Clean up the UI based on their role.
            applyUIHiding(role);
        }
    });
}

/**
 * UI Hider: Scans the DOM for elements with 'data-role-required'
 * and removes them if the user doesn't have clearance.
 */
export function applyUIHiding(currentRole) {
    // Look for anything in the HTML like: <button data-role-required="admin">
    const restrictedElements = document.querySelectorAll('[data-role-required]');
    
    restrictedElements.forEach(el => {
        const requiredRole = el.getAttribute('data-role-required');
        
        // If the user isn't the required role, rip the element out of the DOM
        if (currentRole !== requiredRole) {
            el.remove(); 
        }
    });
}

/**
 * Optional Helper: Just clears the cache on logout
 */
export function clearRoleCache() {
    sessionStorage.removeItem('userRole');
}