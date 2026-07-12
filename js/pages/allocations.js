import { db } from '../config/firebase-config.js';
import { 
    collection, query, where, onSnapshot, updateDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const selectAsset = document.getElementById('select-asset');
const selectUser = document.getElementById('select-user');
const formAllocate = document.getElementById('form-allocate');
const allocationsTbody = document.getElementById('allocations-tbody');
const checkoutDateInput = document.getElementById('checkout-date');
const dueDateInput = document.getElementById('due-date');

// Set default checkout date to today
checkoutDateInput.valueAsDate = new Date();

// ==========================================
// 1. LIVE LISTENERS FOR DROPDOWNS
// ==========================================
function setupDropdownListeners() {
    // A. Listen ONLY for Available assets
    const availableAssetsQuery = query(collection(db, 'assets'), where('status', '==', 'Available'));
    
    onSnapshot(availableAssetsQuery, (snapshot) => {
        selectAsset.innerHTML = '<option value="" disabled selected>Select an available asset...</option>';
        
        if (snapshot.empty) {
            selectAsset.innerHTML = '<option value="" disabled>No assets currently available</option>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            selectAsset.innerHTML += `<option value="${docSnap.id}">${data.assetTag} - ${data.name}</option>`;
        });
    });

    // B. Listen for all employees
    onSnapshot(collection(db, 'users'), (snapshot) => {
        selectUser.innerHTML = '<option value="" disabled selected>Select assignee...</option>';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            selectUser.innerHTML += `<option value="${docSnap.id}" data-name="${data.displayName || data.email}">${data.displayName || 'Unknown'} (${data.email})</option>`;
        });
    });
}

// ==========================================
// 2. LIVE LISTENER FOR CHECKED-OUT TABLE
// ==========================================
function setupAllocationsListener() {
    // We only care about assets that are currently checked out
    const allocatedQuery = query(collection(db, 'assets'), where('status', '==', 'Allocated'));
    
    onSnapshot(allocatedQuery, (snapshot) => {
        allocationsTbody.innerHTML = '';
        
        if (snapshot.empty) {
            allocationsTbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted); font-style: italic;">
                        No assets are currently checked out.
                    </td>
                </tr>`;
            return;
        }

        // We calculate 'now' outside the loop for slight performance gain
        const now = new Date();
        now.setHours(0,0,0,0); // Normalize to midnight for accurate day comparison

        snapshot.forEach(docSnap => {
            const asset = docSnap.data();
            const dueDate = new Date(asset.dueDate);
            dueDate.setHours(0,0,0,0);
            
            const isOverdue = dueDate < now;
            
            // Format dates nicely
            const dueDateStr = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            
            // Apply warning styles if overdue
            const dueDateDisplay = isOverdue 
                ? `<span style="color: var(--danger-color); font-weight: bold;">⚠️ ${dueDateStr} (Overdue)</span>` 
                : `<span style="color: var(--text-main);">${dueDateStr}</span>`;

            allocationsTbody.innerHTML += `
                <tr>
                    <td>
                        <strong style="color: var(--primary-color);">${asset.assetTag}</strong><br>
                        <small style="color: var(--text-muted);">${asset.name}</small>
                    </td>
                    <td style="font-weight: 500;">${asset.assignedToName || 'Unknown User'}</td>
                    <td>${dueDateDisplay}</td>
                    <td>
                        <button class="btn-primary" style="background-color: var(--success-color); padding: 0.35rem 0.75rem; font-size: 0.85rem;" onclick="returnAsset('${docSnap.id}', '${asset.assetTag}')">Return</button>
                    </td>
                </tr>
            `;
        });
    });
}

// ==========================================
// 3. FORM SUBMISSION (CHECKOUT ASSET)
// ==========================================
formAllocate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Allocating...';

    const assetId = selectAsset.value;
    const userId = selectUser.value;
    
    // Extract the user's name from the selected option's data attribute
    const userOption = selectUser.options[selectUser.selectedIndex];
    const userName = userOption.getAttribute('data-name');
    
    // Ensure the due date string parses correctly without timezone shifting
    const checkoutDate = new Date(`${checkoutDateInput.value}T12:00:00`).toISOString();
    const dueDate = new Date(`${dueDateInput.value}T12:00:00`).toISOString();

    try {
        // Update the asset document directly
        await updateDoc(doc(db, 'assets', assetId), {
            status: 'Allocated',
            assignedToId: userId,
            assignedToName: userName,
            checkoutDate: checkoutDate,
            dueDate: dueDate
        });
        
        // Reset the form
        formAllocate.reset();
        checkoutDateInput.valueAsDate = new Date(); // Reset to today
        
        if (window.showToast) window.showToast(`Asset successfully assigned to ${userName}.`, "success");
        
    } catch (error) {
        console.error("Error allocating asset:", error);
        if (window.showToast) window.showToast("Failed to allocate asset. Someone else may have grabbed it!", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Allocate Asset';
    }
});

// ==========================================
// 4. GLOBAL RETURN ACTION
// ==========================================
window.returnAsset = async (assetId, assetTag) => {
    if(confirm(`Are you sure you want to mark ${assetTag} as returned?`)) {
        try {
            // Null out the assignment fields and return to 'Available' status
            await updateDoc(doc(db, 'assets', assetId), {
                status: 'Available',
                assignedToId: null,
                assignedToName: null,
                checkoutDate: null,
                dueDate: null
            });
            
            if (window.showToast) window.showToast(`${assetTag} has been returned to inventory.`, "info");
        } catch (error) {
            console.error("Error returning asset:", error);
            if (window.showToast) window.showToast("Failed to process return.", "error");
        }
    }
};

// ==========================================
// INITIALIZE
// ==========================================
setupDropdownListeners();
setupAllocationsListener();