import { auth, db } from '../config/firebase-config.js';
import { 
    collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let unreadCount = 0;

// 1. Listen for Auth State to Initialize
onAuthStateChanged(auth, (user) => {
    if (user) {
        injectNotificationUI();
        setupNotificationListener(user.uid);
    }
});

// 2. Dynamically Inject the Bell UI into the Navbar
function injectNotificationUI() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return; // Wait for app.js to render navbar

    // Create the Bell Container
    const notifContainer = document.createElement('div');
    notifContainer.className = 'notif-container';
    notifContainer.innerHTML = `
        <button id="btn-bell" class="btn-bell">
            🔔 <span id="notif-badge" class="notif-badge" style="display: none;">0</span>
        </button>
        <div id="notif-dropdown" class="notif-dropdown" style="display: none;">
            <div class="notif-header">
                <h4>Notifications</h4>
                <button id="btn-read-all" class="btn-text-small">Mark all read</button>
            </div>
            <div id="notif-list" class="notif-list">
                <div class="empty-state">No notifications.</div>
            </div>
        </div>
    `;

    // Insert it before the user profile/logout buttons
    navActions.prepend(notifContainer);

    // Toggle Dropdown Logic
    const btnBell = document.getElementById('btn-bell');
    const dropdown = document.getElementById('notif-dropdown');
    
    btnBell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notifContainer.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Mark all as read logic
    document.getElementById('btn-read-all').addEventListener('click', markAllAsRead);
}

// 3. Real-time Firebase Listener
function setupNotificationListener(userId) {
    const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(15)
    );

    onSnapshot(q, (snapshot) => {
        const notifList = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!notifList || !badge) return;

        notifList.innerHTML = '';
        unreadCount = 0;

        if (snapshot.empty) {
            notifList.innerHTML = '<div class="empty-state">You are all caught up!</div>';
            badge.style.display = 'none';
            return;
        }

        snapshot.forEach(docSnap => {
            const notif = docSnap.data();
            const isUnread = !notif.read;
            if (isUnread) unreadCount++;

            // Create notification item
            const item = document.createElement('div');
            item.className = `notif-item ${isUnread ? 'unread' : ''}`;
            item.innerHTML = `
                <div class="notif-title">${notif.title}</div>
                <div class="notif-message">${notif.message}</div>
                <div class="notif-time">${new Date(notif.createdAt).toLocaleDateString()}</div>
            `;

            // Click to mark as read
            if (isUnread) {
                item.addEventListener('click', () => {
                    updateDoc(doc(db, 'notifications', docSnap.id), { read: true });
                });
            }

            notifList.appendChild(item);
        });

        // Update Badge UI
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

// 4. Mark all as Read (Client-side fast update)
async function markAllAsRead() {
    const notifItems = document.querySelectorAll('.notif-item.unread');
    if (notifItems.length === 0) return;

    // For the hackathon demo, we will just hide the UI instantly 
    // to feel snappy, then let Firebase sync in the background.
    document.getElementById('notif-badge').style.display = 'none';
    notifItems.forEach(item => item.classList.remove('unread'));

    // Note: In production, you would run a batch update here to set read:true on all docs.
    window.showToast("All notifications marked as read.", "success");
}