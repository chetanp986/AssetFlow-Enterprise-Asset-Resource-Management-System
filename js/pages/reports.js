import { db } from '../config/firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const btnExportCSV = document.getElementById('btn-export-csv');

// Chart Instances (Stored globally so we can destroy/re-render them if needed)
let statusChart, deptChart, catChart;
let rawAssetData = []; // Store for the CSV export

// Theme Colors (Matching your global.css variables for Chart.js)
const theme = {
    primary: '#0056b3',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    muted: '#6c757d'
};

// ==========================================
// 1. FETCH & AGGREGATE DATA
// ==========================================
async function loadAnalytics() {
    try {
        const snapshot = await getDocs(collection(db, 'assets'));
        
        // Data Aggregation Counters
        const statusCounts = { 'Available': 0, 'Allocated': 0, 'Maintenance': 0, 'Lost/Damaged': 0 };
        const deptCounts = {};
        const catCounts = {};

        rawAssetData = []; // Reset

        snapshot.forEach(docSnap => {
            const asset = docSnap.data();
            rawAssetData.push(asset); // Save for CSV export

            // A. Tally Status
            // (Using a fallback just in case an old test document has a weird status)
            if (statusCounts[asset.status] !== undefined) {
                statusCounts[asset.status]++;
            } else {
                statusCounts['Available'] = (statusCounts['Available'] || 0) + 1;
            }

            // B. Tally Department
            const dept = asset.department || 'Unassigned';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;

            // C. Tally Category
            const cat = asset.category || 'Uncategorized';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });

        // Push data to Chart.js
        renderCharts(statusCounts, deptCounts, catCounts);

        if (window.showToast) window.showToast("Analytics engine synced successfully.", "success");

    } catch (error) {
        console.error("Error loading analytics data:", error);
        if (window.showToast) window.showToast("Failed to load report data.", "error");
    }
}

// ==========================================
// 2. RENDER CHART.JS
// ==========================================
function renderCharts(statusCounts, deptCounts, catCounts) {
    // A. Status Doughnut Chart
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [theme.success, theme.primary, theme.warning, theme.danger],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // B. Department Bar Chart
    const ctxDept = document.getElementById('departmentChart').getContext('2d');
    deptChart = new Chart(ctxDept, {
        type: 'bar',
        data: {
            labels: Object.keys(deptCounts),
            datasets: [{
                label: 'Total Assets',
                data: Object.values(deptCounts),
                backgroundColor: theme.muted,
                borderRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // C. Category Bar Chart
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    catChart = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: Object.keys(catCounts),
            datasets: [{
                label: 'Assets per Category',
                data: Object.values(catCounts),
                backgroundColor: theme.info,
                borderRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// ==========================================
// 3. CSV EXPORT LOGIC
// ==========================================
btnExportCSV.addEventListener('click', () => {
    if (rawAssetData.length === 0) {
        if (window.showToast) window.showToast("No data available to export.", "warning");
        return;
    }

    // Define CSV Headers
    const headers = ['Asset Tag', 'Name', 'Category', 'Department', 'Status', 'Assigned To'];
    
    // Map JSON data to CSV rows, ensuring commas inside data don't break the CSV format
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add headers row

    rawAssetData.forEach(asset => {
        // Enclose every field in quotes to handle potential commas in user input
        const row = [
            `"${asset.assetTag || ''}"`,
            `"${asset.name || ''}"`,
            `"${asset.category || ''}"`,
            `"${asset.department || ''}"`,
            `"${asset.status || ''}"`,
            `"${asset.assignedToName || 'None'}"`
        ];
        csvRows.push(row.join(','));
    });

    // Create a Blob and trigger a fake download link
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', url);
    // Generate filename like: AssetFlow_Report_2026-07-12.csv
    downloadLink.setAttribute('download', `AssetFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    if (window.showToast) window.showToast("CSV Download started!", "info");
});

// ==========================================
// INITIALIZE
// ==========================================
loadAnalytics();