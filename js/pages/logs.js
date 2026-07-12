import { db } from '../config/firebase-config.js';
import { 
    collection, query, orderBy, limit, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const logsTbody = document.getElementById('logs-tbody');
const searchInput = document.getElementById('search-log');
const typeFilter = document.getElementById('filter-type');

// Store logs locally for lightning-fast client-side filtering
let allLogs = []; 

// ==========================================
// 1. FETCH LOGS IN REAL-TIME
// ==========================================
function setupLogsListener() {
    // Pull the 100 most recent system actions
    const q = query(
        collection(db, 'system_logs'), 
        orderBy('timestamp', 'desc'), 
        limit(100)
    );

    onSnapshot(q, (snapshot) => {
        allLogs = [];
        
        if (snapshot.empty) {
            logsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No system activity recorded yet.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            allLogs.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        renderLogs(); // Trigger the initial render
    }, (error) => {
        console.error("Error loading logs:", error);
        logsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--danger-color);">Error loading system logs. Check console.</td></tr>';
    });
}

// ==========================================
// 2. RENDER & FILTER LOGIC
// ==========================================
function renderLogs() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedType = typeFilter.value;

    logsTbody.innerHTML = '';

    // A. Client-side filtering
    const filteredLogs = allLogs.filter(log => {
        const matchesSearch = log.details.toLowerCase().includes(searchTerm) || 
                              log.userName.toLowerCase().includes(searchTerm);
        const matchesType = selectedType === "" || log.actionType === selectedType;
        
        return matchesSearch && matchesType;
    });

    // B. Empty State for Filters
    if (filteredLogs.length === 0) {
        logsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1.5rem;">No logs match your current filter.</td></tr>';
        return;
    }

    // C. Render Rows
    filteredLogs.forEach(log => {
        // Format timestamp safely
        const dateObj = new Date(log.timestamp);
        const timeString = isNaN(dateObj) ? 'Invalid Date' : 
            `${dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;

        // Map Action Type to your global CSS Badges
        let badgeClass = 'action-system';
        if (log.actionType === 'CREATE') badgeClass = 'action-create';
        if (log.actionType === 'UPDATE') badgeClass = 'action-update';
        if (log.actionType === 'DELETE') badgeClass = 'action-delete';

        logsTbody.innerHTML += `
            <tr>
                <td class="log-time">${timeString}</td>
                <td><span class="badge-action ${badgeClass}">${log.actionType}</span></td>
                <td class="log-user">${log.userName}</td>
                <td>${log.details}</td>
            </tr>
        `;
    });
}

// ==========================================
// 3. ATTACH EVENT LISTENERS
// ==========================================
searchInput.addEventListener('input', renderLogs);
typeFilter.addEventListener('change', renderLogs);

// ==========================================
// INITIALIZE
// ==========================================
setupLogsListener();