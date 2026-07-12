/**
 * ============================================================================
 * ASSETFLOW DATE & TIME UTILITIES
 * ============================================================================
 * Centralized functions to keep date formatting consistent across the app.
 */

/**
 * Formats an ISO string or Date object into a readable short date.
 * Example: "Oct 12, 2026"
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatShortDate(dateVal) {
    if (!dateVal) return 'N/A';
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj)) return 'Invalid Date';

    return dateObj.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

/**
 * Formats an ISO string or Date object into a detailed timestamp.
 * Example: "Oct 12, 2026 2:30 PM"
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatTimestamp(dateVal) {
    if (!dateVal) return 'N/A';
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj)) return 'Invalid Date';

    return `${formatShortDate(dateObj)} ${dateObj.toLocaleTimeString([], {
        hour: '2-digit', 
        minute:'2-digit'
    })}`;
}

/**
 * Converts a 24-hour time string into a 12-hour format with AM/PM.
 * Example: "14:30" -> "2:30 PM"
 * @param {string} timeString - "HH:MM"
 * @returns {string}
 */
export function format12HourTime(timeString) {
    if (!timeString || !timeString.includes(':')) return timeString;
    
    const [h, m] = timeString.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Converts '0' or '12' to 12
    
    return `${hours}:${m} ${ampm}`;
}

/**
 * Calculates how many days have passed between a given date and today.
 * Useful for overdue calculations.
 * @param {string|Date} pastDateVal 
 * @returns {number} - Number of days overdue (positive) or days remaining (negative)
 */
export function calculateDaysLate(pastDateVal) {
    if (!pastDateVal) return 0;
    
    const pastDate = new Date(pastDateVal);
    const today = new Date();
    
    // Normalize both to midnight to avoid timezone/hour shifting issues
    pastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today - pastDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}