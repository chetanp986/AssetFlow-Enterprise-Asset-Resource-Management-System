import { auth, db } from '../config/firebase-config.js';
import { 
    collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// DOM ELEMENTS
// ==========================================
const selectResource = document.getElementById('select-resource');
const dateInput = document.getElementById('booking-date');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const purposeInput = document.getElementById('booking-purpose');
const formBooking = document.getElementById('form-booking');
const conflictError = document.getElementById('conflict-error');
const timelineContainer = document.getElementById('timeline-container');
const scheduleDateDisplay = document.getElementById('schedule-date-display');

let currentUserObj = null;

// Set default date to today
dateInput.valueAsDate = new Date();

// ==========================================
// 1. INITIALIZE AUTH & RESOURCES
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserObj = { 
            uid: user.uid, 
            name: user.displayName || user.email 
        };
        loadResources();
        if (dateInput.value) loadSchedule(); 
    }
});

function loadResources() {
    // For a real app, you might only query specific categories (e.g., 'Rooms', 'Vehicles').
    // For the demo, we will pull all available assets.
    const q = query(collection(db, 'assets')); 
    
    onSnapshot(q, (snapshot) => {
        selectResource.innerHTML = '<option value="" disabled selected>Select a resource...</option>';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            selectResource.innerHTML += `<option value="${docSnap.id}">${data.name} (${data.assetTag})</option>`;
        });
    });
}

// ==========================================
// 2. REAL-TIME SCHEDULE (TIMELINE)
// ==========================================
function loadSchedule() {
    const resourceId = selectResource.value;
    const selectedDate = dateInput.value;

    if (!resourceId || !selectedDate) {
        timelineContainer.innerHTML = '<div class="empty-state">Select a resource and date to view availability.</div>';
        scheduleDateDisplay.textContent = 'Select a date';
        return;
    }

    // Format date badge for UI
    scheduleDateDisplay.textContent = new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric' 
    });

    // Query bookings for this specific resource on this specific date
    const q = query(
        collection(db, 'bookings'),
        where('resourceId', '==', resourceId),
        where('date', '==', selectedDate)
    );

    onSnapshot(q, (snapshot) => {
        timelineContainer.innerHTML = '';
        
        if (snapshot.empty) {
            timelineContainer.innerHTML = '<div class="empty-state">No bookings for this date. Schedule is wide open!</div>';
            return;
        }

        // Sort by start time client-side (String comparison works perfectly for "HH:MM")
        const bookings = [];
        snapshot.forEach(docSnap => bookings.push({ id: docSnap.id, ...docSnap.data() }));
        bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));

        bookings.forEach(b => {
            const isMine = b.userId === currentUserObj.uid;
            const myBookingClass = isMine ? 'my-booking' : '';
            const cancelBtn = isMine 
                ? `<button class="btn-cancel" onclick="cancelBooking('${b.id}')">Cancel</button>` 
                : '';

            timelineContainer.innerHTML += `
                <div class="timeline-slot ${myBookingClass}">
                    <div class="time-block">
                        ${formatTime(b.startTime)} - ${formatTime(b.endTime)}
                    </div>
                    <div class="booking-details">
                        <strong>${b.userName}</strong>
                        <span>${b.purpose || 'No purpose specified'}</span>
                    </div>
                    ${cancelBtn}
                </div>
            `;
        });
    });
}

// Re-run schedule listener when resource or date changes
selectResource.addEventListener('change', loadSchedule);
dateInput.addEventListener('change', loadSchedule);


// ==========================================
// 3. FORM SUBMISSION & OVERLAP CHECK
// ==========================================
formBooking.addEventListener('submit', async (e) => {
    e.preventDefault();
    conflictError.style.display = 'none';
    const btnSubmit = document.getElementById('btn-submit');
    
    const resourceId = selectResource.value;
    const date = dateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    // Basic Validation: Time travel check
    if (startTime >= endTime) {
        if (window.showToast) window.showToast("End time must be after start time.", "error");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Checking availability...';

    try {
        // --- THE OVERLAP ENGINE ---
        // Fetch all existing bookings for this resource on this day
        const q = query(
            collection(db, 'bookings'),
            where('resourceId', '==', resourceId),
            where('date', '==', date)
        );
        
        const snapshot = await getDocs(q);
        let hasConflict = false;

        snapshot.forEach(docSnap => {
            const existing = docSnap.data();
            // Core Math: (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
            if (startTime < existing.endTime && endTime > existing.startTime) {
                hasConflict = true;
            }
        });

        // Abort if someone is already in the room
        if (hasConflict) {
            conflictError.style.display = 'block';
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Confirm Booking';
            return; 
        }

        // --- SAVE BOOKING ---
        btnSubmit.textContent = 'Reserving...';
        await addDoc(collection(db, 'bookings'), {
            resourceId,
            date,
            startTime,
            endTime,
            purpose: purposeInput.value.trim(),
            userId: currentUserObj.uid,
            userName: currentUserObj.name,
            createdAt: new Date().toISOString()
        });

        // Reset form (Keep date and resource selected for user convenience)
        startTimeInput.value = '';
        endTimeInput.value = '';
        purposeInput.value = '';
        
        if (window.showToast) window.showToast("Resource successfully booked!", "success");

    } catch (error) {
        console.error("Booking error:", error);
        if (window.showToast) window.showToast("Failed to create booking.", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Confirm Booking';
    }
});

// ==========================================
// 4. GLOBAL CANCEL ACTION
// ==========================================
window.cancelBooking = async (bookingId) => {
    if(confirm('Are you sure you want to cancel this reservation?')) {
        try {
            await deleteDoc(doc(db, 'bookings', bookingId));
            if (window.showToast) window.showToast("Booking cancelled.", "info");
        } catch (error) {
            console.error("Error cancelling booking:", error);
            if (window.showToast) window.showToast("Failed to cancel booking.", "error");
        }
    }
};

// ==========================================
// UTILITIES
// ==========================================
// Converts 24h "14:30" to "2:30 PM"
function formatTime(timeString) {
    const [h, m] = timeString.split(':');
    let hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${ampm}`;
}