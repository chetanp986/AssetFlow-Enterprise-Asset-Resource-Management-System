import { auth, db } from '../config/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. UI INJECTION TEMPLATES
// ==========================================

function getSidebarHTML(userRole, currentPage) {
    // Helper to add 'active' class to the current page
    const isActive = (pageName) => currentPage.includes(pageName) ? 'active' : '';

    // Only Admins see the Admin Setup and Logs links
    const adminLinks = userRole === 'admin' ? `
        <a href="admin-setup.html" class="nav-link ${isActive('admin')}">⚙️ Admin Setup</a>
        <a href="logs.html" class="nav-link ${isActive('logs')}">📜 System Logs</a>
    ` : '';

    return `
        <aside class="sidebar">
            <div class="sidebar-brand">
                <span>Asset</span>Flow
            </div>
            <nav class="sidebar-nav">
                <a href="dashboard.html" class="nav-link ${isActive('dashboard')}">📊 Dashboard</a>
                <a href="assets.html" class="nav-link ${isActive('assets')}">📦 Asset Directory</a>
                <a href="allocations.html" class="nav-link ${isActive('allocations')}">🔄 Allocations</a>
                <a href="bookings.html" class="nav-link ${isActive('bookings')}">📅 Bookings</a>
                <a href="maintenance.html" class="nav-link ${isActive('maintenance')}">🛠️ Maintenance</a>
                <a href="audit.html" class="nav-link ${isActive('audit')}">✅ Audits & Checks</a>
                <a href="reports.html" class="nav-link ${isActive('reports')}">📈 Reports</a>
                ${adminLinks}
            </nav>
        </aside>
    `;
}

function getNavbarHTML(userName) {
    return `
        <header class="navbar">
            <div class="nav-actions">
                <div class="user-profile">
                    👤 <span id="nav-user-name">${userName}</span>
                </div>
                <button id="btn-logout" class="btn-logout">Logout</button>
            </div>
        </header>
    `;
}

// ==========================================
// 2. INITIALIZATION & STATE LISTENER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Check auth state to render the correct UI
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Fetch user's role from Firestore to determine sidebar links
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.exists() ? userDoc.data() : { role: 'employee', displayName: user.email };
                const userName = userData.displayName || user.email;
                const userRole = userData.role;

                // Inject UI
                renderAppShell(userName, userRole);
            } catch (error) {
                console.error("Error fetching user data for app shell:", error);
                renderAppShell(user.email, 'employee'); // Fallback
            }
        }
        // Note: If no user, rbac.js handles the redirect to index.html, 
        // so we don't need to duplicate that logic here.
    });
});

function renderAppShell(userName, userRole) {
    const sidebarContainer = document.getElementById('sidebar-container');
    const navbarContainer = document.getElementById('navbar-container');
    
    // Get current filename (e.g., "dashboard.html")
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    if (sidebarContainer) {
        sidebarContainer.innerHTML = getSidebarHTML(userRole, currentPage);
    }

    if (navbarContainer) {
        navbarContainer.innerHTML = getNavbarHTML(userName);
        
        // Attach Logout Event Listener immediately after injecting HTML
        document.getElementById('btn-logout').addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Logout Error:", error);
                showToast("Failed to logout. Please try again.");
            }
        });
    }

    // Initialize the Toast Container if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const toastDiv = document.createElement('div');
        toastDiv.id = 'toast-container';
        toastDiv.className = 'toast-container';
        document.body.appendChild(toastDiv);
    }
}

// ==========================================
// 3. GLOBAL TOAST NOTIFICATION SYSTEM
// ==========================================

/**
 * Displays a temporary toast notification on the screen.
 * Available globally via window.showToast
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'error', 'info' (defaults to info)
 */
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Apply quick inline styling overrides for different types
    if (type === 'success') toast.style.backgroundColor = 'var(--success-color)';
    if (type === 'error') toast.style.backgroundColor = 'var(--danger-color)';

    toast.textContent = message;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Wait for fade out
    }, 3000);
};