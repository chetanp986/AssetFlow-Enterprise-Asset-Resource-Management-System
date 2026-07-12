import { auth, db } from '../config/firebase-config.js';
import { 
    collection, query, where, onSnapshot, addDoc, updateDoc, doc, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const selectAsset = document.getElementById('select-asset');
const priorityInput = document.getElementById('issue-priority');
const descInput = document.getElementById('issue-desc');
const formMaintenance = document.getElementById('form-maintenance');
const ticketsContainer = document.getElementById('tickets-container');

let currentUserObj = null;

// ==========================================
// 1. INITIALIZE AUTH & ASSET DROPDOWN
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserObj = { 
            uid: user.uid, 
            name: user.displayName || user.email 
        };
        loadAssetsForDropdown();
    }
});

function loadAssetsForDropdown() {
    // We only want users to be able to report assets that aren't already broken
    const q = query(collection(db, 'assets'), where('status', '!=', 'Maintenance'));
    
    onSnapshot(q, (snapshot) => {
        selectAsset.innerHTML = '<option value="" disabled selected>Select an asset to report...</option>';
        
        if (snapshot.empty) {
            selectAsset.innerHTML = '<option value="" disabled>No assets available to report</option>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            selectAsset.innerHTML += `<option value="${docSnap.id}" data-tag="${data.assetTag}" data-name="${data.name}">
                ${data.assetTag} - ${data.name} (${data.status})
            </option>`;
        });
    });
}

// ==========================================
// 2. REAL-TIME TICKETS BOARD
// ==========================================
function loadActiveTickets() {
    const q = query(
        collection(db, 'maintenance_tickets'), 
        where('status', '==', 'Open'),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        ticketsContainer.innerHTML = '';
        
        if (snapshot.empty) {
            ticketsContainer.innerHTML = `
                <div class="empty-state">
                    🎉 No active maintenance tickets! Everything is running smoothly.
                </div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const ticket = docSnap.data();
            const ticketId = docSnap.id;
            
            // Map priority to CSS class for the colored border
            let priorityClass = 'priority-low';
            if (ticket.priority === 'High') priorityClass = 'priority-high';
            if (ticket.priority === 'Medium') priorityClass = 'priority-medium';

            ticketsContainer.innerHTML += `
                <div class="ticket-card ${priorityClass}">
                    <div class="ticket-header">
                        <h3>${ticket.assetTag} - ${ticket.assetName}</h3>
                        <strong style="font-size: 0.85rem; text-transform: uppercase;">${ticket.priority} Priority</strong>
                    </div>
                    <div class="ticket-body">
                        <p>${ticket.description}</p>
                    </div>
                    <div class="ticket-footer">
                        <span class="reporter-info">Reported by: ${ticket.reportedByName}</span>
                        <button class="btn-resolve" onclick="resolveTicket('${ticketId}', '${ticket.assetId}', '${ticket.assetTag}')">Mark Resolved</button>
                    </div>
                </div>
            `;
        });
    });
}

// ==========================================
// 3. FORM SUBMISSION (CREATE TICKET)
// ==========================================
formMaintenance.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Submitting...';

    const assetId = selectAsset.value;
    
    // Safely extract the asset details from the dropdown options
    const selectedOption = selectAsset.options[selectAsset.selectedIndex];
    const assetTag = selectedOption.getAttribute('data-tag');
    const assetName = selectedOption.getAttribute('data-name');

    try {
        // A. Create the Ticket Document
        await addDoc(collection(db, 'maintenance_tickets'), {
            assetId: assetId,
            assetTag: assetTag,
            assetName: assetName,
            priority: priorityInput.value,
            description: descInput.value.trim(),
            status: 'Open',
            reportedById: currentUserObj.uid,
            reportedByName: currentUserObj.name,
            createdAt: new Date().toISOString()
        });

        // B. Update the Asset Document (Pull it out of circulation)
        await updateDoc(doc(db, 'assets', assetId), {
            status: 'Maintenance',
            // Wipe allocation fields so it doesn't mistakenly show up as Overdue while in the shop
            assignedToId: null, 
            assignedToName: null,
            checkoutDate: null,
            dueDate: null
        });

        // Reset the form
        formMaintenance.reset();
        
        if (window.showToast) window.showToast(`Ticket submitted for ${assetTag}. Asset moved to Maintenance.`, "warning");

    } catch (error) {
        console.error("Error creating ticket:", error);
        if (window.showToast) window.showToast("Failed to submit maintenance ticket.", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submit Ticket';
    }
});

// ==========================================
// 4. GLOBAL RESOLVE ACTION
// ==========================================
window.resolveTicket = async (ticketId, assetId, assetTag) => {
    if(confirm(`Has ${assetTag} been fully repaired and is ready for use?`)) {
        try {
            // A. Close the ticket
            await updateDoc(doc(db, 'maintenance_tickets', ticketId), {
                status: 'Resolved',
                resolvedAt: new Date().toISOString()
            });

            // B. Flip asset back to Available
            await updateDoc(doc(db, 'assets', assetId), {
                status: 'Available'
            });

            if (window.showToast) window.showToast(`${assetTag} repaired and returned to active inventory!`, "success");

        } catch (error) {
            console.error("Error resolving ticket:", error);
            if (window.showToast) window.showToast("Failed to resolve ticket.", "error");
        }
    }
};

// ==========================================
// INITIALIZE
// ==========================================
loadActiveTickets();