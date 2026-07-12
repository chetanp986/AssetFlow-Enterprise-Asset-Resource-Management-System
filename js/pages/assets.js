import { db } from '../config/firebase-config.js';
import { 
    collection, addDoc, onSnapshot, query, orderBy, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Assuming you have this utility, otherwise we will generate it inline below
// import { generateAssetTag } from '../utils/assetTagGenerator.js';

// ==========================================
// DOM ELEMENTS
// ==========================================
const assetsTbody = document.getElementById('assets-tbody');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');

// Modal Elements
const modal = document.getElementById('asset-modal');
const formRegister = document.getElementById('form-register-asset');
const selectCategory = document.getElementById('asset-category');
const selectDept = document.getElementById('asset-department');

// Local State for fast client-side filtering
let allAssets = [];

// ==========================================
// 1. MODAL TOGGLES
// ==========================================
document.getElementById('btn-open-modal').onclick = () => {
    modal.style.display = 'flex';
    document.getElementById('asset-name').focus(); // UX touch
};
document.getElementById('btn-close-modal').onclick = () => modal.style.display = 'none';
document.getElementById('btn-cancel-modal').onclick = () => modal.style.display = 'none';

// ==========================================
// 2. FETCH DROPDOWN METADATA
// ==========================================
async function populateDropdowns() {
    try {
        const [catSnap, deptSnap] = await Promise.all([
            getDocs(collection(db, 'categories')),
            getDocs(collection(db, 'departments'))
        ]);

        selectCategory.innerHTML = '<option value="" disabled selected>Select Category</option>';
        catSnap.forEach(doc => {
            selectCategory.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
        });

        selectDept.innerHTML = '<option value="" disabled selected>Select Department</option>';
        deptSnap.forEach(doc => {
            selectDept.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
        });
    } catch (error) {
        console.error("Error loading dropdowns:", error);
        if (window.showToast) window.showToast("Failed to load categories/departments.", "error");
    }
}

// ==========================================
// 3. REAL-TIME ASSET LISTENER & RENDERING
// ==========================================
function setupAssetListener() {
    const q = query(collection(db, 'assets'), orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        allAssets = []; // Clear array
        snapshot.forEach(doc => {
            allAssets.push({ id: doc.id, ...doc.data() });
        });
        
        renderTable(); // Initial render
    });
}

function renderTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusTerm = filterStatus.value;

    assetsTbody.innerHTML = '';

    // 1. Filter Data Client-Side (Lightning Fast)
    const filteredAssets = allAssets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchTerm) || 
                              asset.assetTag.toLowerCase().includes(searchTerm);
        const matchesStatus = statusTerm === "" || asset.status === statusTerm;
        return matchesSearch && matchesStatus;
    });

    // 2. Render Empty State
    if (filteredAssets.length === 0) {
        assetsTbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted); font-style: italic;">
                    No assets found matching your criteria.
                </td>
            </tr>`;
        return;
    }

    // 3. Render Rows
    filteredAssets.forEach(asset => {
        let badgeClass = 'badge-available';
        if(asset.status === 'Allocated') badgeClass = 'badge-allocated';
        if(asset.status === 'Maintenance') badgeClass = 'badge-maintenance';
        if(asset.status === 'Lost/Damaged' || asset.status === 'Flagged') badgeClass = 'badge-danger';

        assetsTbody.innerHTML += `
            <tr>
                <td style="font-family: monospace; font-weight: bold; color: var(--primary-color);">
                    ${asset.assetTag}
                </td>
                <td style="font-weight: 500;">${asset.name}</td>
                <td>${asset.category}</td>
                <td><span class="badge ${badgeClass}">${asset.status}</span></td>
                <td>${asset.department}</td>
                <td>
                    <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size: 0.85rem;" onclick="viewAsset('${asset.id}')">View</button>
                </td>
            </tr>
        `;
    });
}

// Attach Event Listeners to Search and Filter inputs
searchInput.addEventListener('input', renderTable);
filterStatus.addEventListener('change', renderTable);

// ==========================================
// 4. FORM SUBMISSION (REGISTER ASSET)
// ==========================================
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Registering...';

    // Fallback tag generator if the utility isn't imported
    const generatedTag = `AF-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAsset = {
        assetTag: generatedTag,
        name: document.getElementById('asset-name').value.trim(),
        category: selectCategory.value,
        department: selectDept.value,
        serialNumber: document.getElementById('asset-serial').value.trim() || 'N/A',
        status: 'Available', // Default status on creation
        createdAt: new Date().toISOString(),
        
        // Null out allocation fields by default based on our schema
        assignedToId: null,
        assignedToName: null,
        checkoutDate: null,
        dueDate: null
    };

    try {
        await addDoc(collection(db, 'assets'), newAsset);
        
        formRegister.reset();
        modal.style.display = 'none';
        if (window.showToast) window.showToast(`${newAsset.name} registered successfully!`, "success");
        
    } catch (error) {
        console.error("Error registering asset:", error);
        if (window.showToast) window.showToast("Failed to register asset.", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Register Asset';
    }
});

// ==========================================
// 5. GLOBAL ACTIONS
// ==========================================
window.viewAsset = (id) => {
    // For the hackathon demo, a simple alert or opening an "Edit" modal is fine.
    console.log("Viewing asset ID:", id);
    if (window.showToast) window.showToast(`Asset details module not connected yet.`, "info");
};

// ==========================================
// INITIALIZE
// ==========================================
populateDropdowns();
setupAssetListener();