import { db } from '../config/firebase-config.js';
import { 
    collection, addDoc, deleteDoc, doc, onSnapshot, query, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const listCategories = document.getElementById('list-categories');
const listDepartments = document.getElementById('list-departments');
const usersTbody = document.getElementById('users-tbody');

const formCategory = document.getElementById('form-category');
const formDepartment = document.getElementById('form-department');
const inputCategory = document.getElementById('new-category');
const inputDepartment = document.getElementById('new-department');

// ==========================================
// 1. REAL-TIME DATA LISTENERS
// ==========================================
function setupListeners() {
    // A. Listen for Categories
    onSnapshot(query(collection(db, 'categories')), (snapshot) => {
        listCategories.innerHTML = '';
        if (snapshot.empty) {
            listCategories.innerHTML = '<li class="empty-state">No categories found.</li>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            listCategories.innerHTML += `
                <li>
                    <span>${data.name}</span>
                    <button class="btn-danger-text" onclick="deleteItem('categories', '${docSnap.id}', '${data.name}')">Remove</button>
                </li>
            `;
        });
    });

    // B. Listen for Departments
    onSnapshot(query(collection(db, 'departments')), (snapshot) => {
        listDepartments.innerHTML = '';
        if (snapshot.empty) {
            listDepartments.innerHTML = '<li class="empty-state">No departments found.</li>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            listDepartments.innerHTML += `
                <li>
                    <span>${data.name}</span>
                    <button class="btn-danger-text" onclick="deleteItem('departments', '${docSnap.id}', '${data.name}')">Remove</button>
                </li>
            `;
        });
    });

    // C. Listen for Users (Role Management)
    onSnapshot(query(collection(db, 'users')), (snapshot) => {
        usersTbody.innerHTML = '';
        if (snapshot.empty) {
            usersTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            
            // Format badges based on role
            const isAdmin = user.role === 'admin';
            const roleBadge = isAdmin 
                ? '<span class="badge" style="background:var(--primary-color); color:white;">Admin</span>' 
                : '<span class="badge" style="background:var(--text-muted); color:white;">Employee</span>';
            
            // Only show promote button for non-admins
            const actionBtn = !isAdmin 
                ? `<button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;" onclick="promoteUser('${docSnap.id}', '${user.displayName || user.email}')">Promote to Admin</button>`
                : `<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Max Clearance</span>`;

            usersTbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${user.displayName || 'Unknown User'}</strong><br>
                        <small style="color:var(--text-muted);">${user.email}</small>
                    </td>
                    <td>${roleBadge}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    });
}

// ==========================================
// 2. FORM SUBMISSIONS (ADD ITEMS)
// ==========================================
formCategory.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = inputCategory.value.trim();
    if (!val) return;
    
    try {
        await addDoc(collection(db, 'categories'), { name: val });
        inputCategory.value = ''; // Reset input
        if (window.showToast) window.showToast(`Category "${val}" added.`, 'success');
    } catch (error) {
        console.error("Error adding category:", error);
        if (window.showToast) window.showToast("Failed to add category.", 'error');
    }
});

formDepartment.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = inputDepartment.value.trim();
    if (!val) return;
    
    try {
        await addDoc(collection(db, 'departments'), { name: val });
        inputDepartment.value = ''; // Reset input
        if (window.showToast) window.showToast(`Department "${val}" added.`, 'success');
    } catch (error) {
        console.error("Error adding department:", error);
        if (window.showToast) window.showToast("Failed to add department.", 'error');
    }
});

// ==========================================
// 3. GLOBAL ACTIONS (DELETION & PROMOTION)
// ==========================================
window.deleteItem = async (collectionName, docId, itemName) => {
    // A simple browser confirm is fine for a hackathon, though a custom modal is better for prod
    if (confirm(`Are you sure you want to permanently delete "${itemName}"?`)) {
        try {
            await deleteDoc(doc(db, collectionName, docId));
            if (window.showToast) window.showToast(`Removed "${itemName}".`, 'info');
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            if (window.showToast) window.showToast("Failed to delete item.", 'error');
        }
    }
};

window.promoteUser = async (userId, userName) => {
    if (confirm(`Are you sure you want to grant Admin privileges to ${userName}? They will have full system access.`)) {
        try {
            // NOTE: In a real production app, this action should be secured heavily by 
            // Firestore Security Rules ensuring ONLY existing admins can change the 'role' field.
            await updateDoc(doc(db, 'users', userId), {
                role: 'admin'
            });
            if (window.showToast) window.showToast(`${userName} is now an Admin.`, 'success');
        } catch (error) {
            console.error("Error promoting user:", error);
            if (window.showToast) window.showToast("Failed to promote user.", 'error');
        }
    }
};

// ==========================================
// INITIALIZE
// ==========================================
setupListeners();