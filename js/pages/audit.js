import { db } from '../config/firebase-config.js';
import { 
    collection, query, where, onSnapshot, getDocs, updateDoc, doc, addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const btnToggleAudit = document.getElementById('btn-toggle-audit');
const progressContainer = document.getElementById('audit-progress-container');
const currentAuditName = document.getElementById('current-audit-name');
const auditStats = document.getElementById('audit-stats');
const progressBarFill = document.getElementById('progress-bar-fill');
const checklistTbody = document.getElementById('checklist-tbody');
const discrepancyContainer = document.getElementById('discrepancy-container');
const searchInput = document.getElementById('audit-search');

let activeAuditId = null;
let auditAssets = []; // For client-side search filtering

// ==========================================
// 1. LISTEN FOR ACTIVE AUDIT CYCLE
// ==========================================
function setupAuditListener() {
    // Look for any audit that is currently 'In Progress'
    const q = query(collection(db, 'audits'), where('status', '==', 'In Progress'));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            // State: NO ACTIVE AUDIT
            activeAuditId = null;
            btnToggleAudit.textContent = 'Start New Audit Cycle';
            btnToggleAudit.style.backgroundColor = 'var(--primary-color)';
            
            progressContainer.style.display = 'none';
            checklistTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No active audit cycle.</td></tr>';
            discrepancyContainer.innerHTML = '<div class="empty-state">Start an audit to see discrepancies.</div>';
        } else {
            // State: AUDIT IN PROGRESS
            const auditDoc = snapshot.docs[0];
            activeAuditId = auditDoc.id;
            const auditData = auditDoc.data();
            
            btnToggleAudit.textContent = 'Close Audit Cycle';
            btnToggleAudit.style.backgroundColor = 'var(--danger-color)'; // Make it red so they know it's a destructive action
            
            progressContainer.style.display = 'block';
            currentAuditName.textContent = auditData.name;
            
            // Kick off the asset listener for this specific cycle
            loadAuditAssets();
        }
    });
}

// ==========================================
// 2. LOAD ASSETS & CALCULATE PROGRESS
// ==========================================
function loadAuditAssets() {
    if (!activeAuditId) return;

    // Listen to ALL assets to track their current audit status
    const assetsQuery = query(collection(db, 'assets'));
    
    onSnapshot(assetsQuery, (snapshot) => {
        auditAssets = [];
        let totalAssets = 0;
        let verifiedAssets = 0;
        let hasDiscrepancies = false;

        discrepancyContainer.innerHTML = '';

        snapshot.forEach(docSnap => {
            const asset = { id: docSnap.id, ...docSnap.data() };
            auditAssets.push(asset);
            totalAssets++;
            
            // Tally up the progress metrics
            if (asset.currentAuditStatus === 'Verified') {
                verifiedAssets++;
            } else if (asset.currentAuditStatus === 'Flagged') {
                hasDiscrepancies = true;
                discrepancyContainer.innerHTML += `
                    <div class="flag-card">
                        <h4>${asset.assetTag} - ${asset.name}</h4>
                        <p><strong>Expected Dept:</strong> ${asset.department}</p>
                        <p><strong>Auditor Note:</strong> ${asset.auditNote || 'Asset missing or damaged.'}</p>
                    </div>
                `;
            }
        });

        if (!hasDiscrepancies) {
            discrepancyContainer.innerHTML = '<div class="empty-state">No discrepancies found yet.</div>';
        }

        // Update the visual Progress Bar UI
        const percentage = totalAssets === 0 ? 0 : Math.round((verifiedAssets / totalAssets) * 100);
        auditStats.textContent = `${verifiedAssets} / ${totalAssets} Verified (${percentage}%)`;
        progressBarFill.style.width = `${percentage}%`;

        // Render the checklist (Pending items)
        renderChecklist();
    });
}

// ==========================================
// 3. RENDER & FILTER CHECKLIST
// ==========================================
function renderChecklist() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    checklistTbody.innerHTML = '';

    // Only show assets that are NOT verified or flagged
    const pendingAssets = auditAssets.filter(a => 
        a.currentAuditStatus !== 'Verified' && 
        a.currentAuditStatus !== 'Flagged'
    );

    // Apply the user's search term (crucial for "barcode scanner" simulation during demo)
    const filteredAssets = pendingAssets.filter(a => 
        a.assetTag.toLowerCase().includes(searchTerm) || 
        a.name.toLowerCase().includes(searchTerm)
    );

    if (pendingAssets.length === 0) {
        checklistTbody.innerHTML = `
            <tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--success-color); font-weight: bold;">
                🎉 All assets verified! You can close the audit.
            </td></tr>`;
        return;
    }

    if (filteredAssets.length === 0) {
        checklistTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No pending assets match your search.</td></tr>`;
        return;
    }

    filteredAssets.forEach(asset => {
        checklistTbody.innerHTML += `
            <tr>
                <td><strong style="color: var(--primary-color);">${asset.assetTag}</strong></td>
                <td>${asset.name}</td>
                <td>${asset.department}</td>
                <td style="display:flex; gap:0.5rem;">
                    <button class="btn-verify" onclick="updateAuditStatus('${asset.id}', 'Verified')">✔ Verify</button>
                    <button class="btn-flag" onclick="flagAsset('${asset.id}', '${asset.assetTag}')">✖ Flag</button>
                </td>
            </tr>
        `;
    });
}

searchInput.addEventListener('input', renderChecklist);

// ==========================================
// 4. GLOBAL CHECKLIST ACTIONS
// ==========================================
window.updateAuditStatus = async (assetId, status, note = '') => {
    try {
        await updateDoc(doc(db, 'assets', assetId), {
            currentAuditStatus: status,
            auditNote: note,
            lastAudited: new Date().toISOString()
        });
        
        // Only show toast for manual flags to avoid spamming UI when verifying 50 items rapidly
        if (status === 'Flagged' && window.showToast) {
            window.showToast("Asset flagged for discrepancy.", "warning");
        }
    } catch (error) {
        console.error("Error updating audit status:", error);
    }
};

window.flagAsset = (assetId, assetTag) => {
    const reason = prompt(`Why are you flagging ${assetTag}? (e.g., Missing, Damaged, Wrong Location):`);
    if (reason !== null) { // If they didn't click Cancel
        window.updateAuditStatus(assetId, 'Flagged', reason.trim());
    }
};

// ==========================================
// 5. START / CLOSE AUDIT CYCLE LOGIC
// ==========================================
btnToggleAudit.addEventListener('click', async () => {
    const btn = btnToggleAudit;
    btn.disabled = true;

    try {
        if (!activeAuditId) {
            // --- START AUDIT ---
            const cycleName = prompt("Enter a name for this audit cycle (e.g., Q4 IT Audit):");
            if (!cycleName) return;

            btn.textContent = 'Starting...';

            // 1. Create the Audit Document
            await addDoc(collection(db, 'audits'), {
                name: cycleName,
                status: 'In Progress',
                startedAt: new Date().toISOString()
            });
            
            // 2. Reset all assets to "Pending"
            // Note: In production, this batch update should be done via a Cloud Function to bypass 
            // the 500-document batch limit on the client. For a hackathon demo, this works instantly.
            const assetsSnap = await getDocs(collection(db, 'assets'));
            
            // Execute sequentially to avoid overwhelming the client browser in a massive DB
            for (const assetDoc of assetsSnap.docs) {
                await updateDoc(doc(db, 'assets', assetDoc.id), {
                    currentAuditStatus: 'Pending',
                    auditNote: null
                });
            }
            
            if (window.showToast) window.showToast(`Audit "${cycleName}" started!`, "success");

        } else {
            // --- CLOSE AUDIT ---
            if(confirm("Are you sure you want to close this audit cycle? Discrepancies will be permanently logged.")) {
                btn.textContent = 'Closing...';
                
                // Close the audit record
                await updateDoc(doc(db, 'audits', activeAuditId), {
                    status: 'Closed',
                    closedAt: new Date().toISOString()
                });
                
                // Push flagged items into "Lost/Damaged" status globally
                // This prevents them from being booked or allocated in the future
                const flaggedAssets = auditAssets.filter(a => a.currentAuditStatus === 'Flagged');
                for (const asset of flaggedAssets) {
                    await updateDoc(doc(db, 'assets', asset.id), {
                        status: 'Lost/Damaged'
                    });
                }
                
                if (window.showToast) window.showToast("Audit closed successfully.", "info");
            }
        }
    } catch (error) {
        console.error("Audit cycle error:", error);
        if (window.showToast) window.showToast("Failed to process audit cycle change.", "error");
    } finally {
        btn.disabled = false;
        // Button text is reset by the real-time setupAuditListener() above
    }
});

// ==========================================
// INITIALIZE
// ==========================================
setupAuditListener();