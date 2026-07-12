import { auth, db } from '../config/firebase-config.js';
import { 
    collection, query, where, getDocs, getCountFromServer, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// DOM Elements
const kpiTotal = document.getElementById('kpi-total');
const kpiInUse = document.getElementById('kpi-in-use');
const kpiMaintenance = document.getElementById('kpi-maintenance');
const kpiOverdue = document.getElementById('kpi-overdue');
const overdueTbody = document.getElementById('overdue-tbody');

// 1. Initialize Dashboard Data on Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadKPIs();
        loadOverdueItems();
    }
});

// 2. Fetch KPIs using Aggregation Queries (Fast & Cheap)
async function loadKPIs() {
    const assetsRef = collection(db, 'assets');
    const now = new Date().toISOString();

    try {
        // Total Assets
        const totalSnap = await getCountFromServer(assetsRef);
        kpiTotal.textContent = totalSnap.data().count;

        // In Use (Allocated)
        const inUseQuery = query(assetsRef, where('status', '==', 'Allocated'));
        const inUseSnap = await getCountFromServer(inUseQuery);
        kpiInUse.textContent = inUseSnap.data().count;

        // Under Maintenance
        const maintQuery = query(assetsRef, where('status', '==', 'Maintenance'));
        const maintSnap = await getCountFromServer(maintQuery);
        kpiMaintenance.textContent = maintSnap.data().count;

        // Overdue
        // Note: For this specific query to work in Firestore, you will need to click the 
        // link in the console error to generate a Composite Index for status + dueDate.
        const overdueQuery = query(
            assetsRef, 
            where('status', '==', 'Allocated'),
            where('dueDate', '<', now)
        );
        const overdueSnap = await getCountFromServer(overdueQuery);
        
        const overdueCount = overdueSnap.data().count;
        kpiOverdue.textContent = overdueCount;

        // Optional UX: If there are overdue items, make the text red to draw attention
        if (overdueCount > 0) {
            kpiOverdue.style.color = 'var(--danger-color)';
        }

    } catch (error) {
        console.error("Error loading KPIs:", error);
        kpiTotal.textContent = "Error";
        kpiInUse.textContent = "-";
        kpiMaintenance.textContent = "-";
        kpiOverdue.textContent = "-";
        
        // Show the toast we built in app.js
        if (window.showToast) window.showToast("Failed to load dashboard metrics.", "error");
    }
}

// 3. Fetch Overdue Items for the Action Table
async function loadOverdueItems() {
    const assetsRef = collection(db, 'assets');
    const now = new Date().toISOString();
    
    // Query the top 5 worst offenders to keep the dashboard fast and uncluttered
    const q = query(
        assetsRef, 
        where('status', '==', 'Allocated'),
        where('dueDate', '<', now),
        orderBy('dueDate', 'asc'),
        limit(5)
    );

    try {
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            overdueTbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color: var(--success-color); font-weight: 500; padding: 2rem;">
                        🎉 No overdue assets! Everyone is playing by the rules.
                    </td>
                </tr>`;
            return;
        }

        overdueTbody.innerHTML = ''; // Clear the "Loading..." state

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Format the ISO date nicely for the UI (e.g., "Oct 12, 2024")
            const dueDateObj = new Date(data.dueDate);
            const dueDateStr = dueDateObj.toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });
            
            // Calculate how many days late it is for extra impact
            const daysLate = Math.floor((new Date() - dueDateObj) / (1000 * 60 * 60 * 24));
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${data.assetTag}</strong><br>
                    <small style="color: var(--text-muted);">${data.name}</small>
                </td>
                <td>${data.assignedToName || 'Unknown User'}</td>
                <td style="color: var(--danger-color); font-weight: 600;">
                    ${dueDateStr} <br><small>(${daysLate} days late)</small>
                </td>
                <td>
                    <button class="btn-small" onclick="pingUser('${data.assignedToId}', '${data.assetTag}')">Ping User</button>
                </td>
            `;
            overdueTbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading overdue items:", error);
        overdueTbody.innerHTML = '<tr><td colspan="4">Failed to load alerts. Check console for index requirements.</td></tr>';
    }
}

// 4. Global Action for the Ping Button
// Attaching to window so the inline onclick="" in the HTML table can access it
window.pingUser = (userId, assetTag) => {
    // In a full production app, this would write to the 'notifications' collection
    // or trigger an email via a Cloud Function. For the demo, we show a success toast.
    
    console.log(`Pinging user ${userId} to return ${assetTag}`);
    
    if (window.showToast) {
        window.showToast(`Reminder sent to return ${assetTag}!`, "success");
    } else {
        alert(`Reminder sent to return ${assetTag}!`);
    }
};