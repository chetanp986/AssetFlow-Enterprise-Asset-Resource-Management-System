/**
 * ============================================================================
 * ASSETFLOW VALIDATION & SANITIZATION UTILITIES
 * ============================================================================
 * Centralized functions to validate user input before sending it to Firebase.
 */

/**
 * Validates if a string is a properly formatted email address.
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (!email) return false;
    // Standard RFC 5322 regex for email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailRegex.test(email.trim());
}

/**
 * Validates if a password meets enterprise security requirements.
 * (At least 8 characters, 1 uppercase, 1 lowercase, 1 number)
 * @param {string} password 
 * @returns {boolean}
 */
export function isStrongPassword(password) {
    if (!password) return false;
    // For a hackathon, we keep this slightly lenient, but in prod you want this strict.
    const passRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return passRegex.test(password);
}

/**
 * Basic HTML sanitizer to prevent Cross-Site Scripting (XSS) attacks.
 * Use this before rendering any user-generated text into innerHTML.
 * @param {string} input 
 * @returns {string} - Sanitized string
 */
export function sanitizeHTML(input) {
    if (!input) return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Checks if a required field is completely empty or just whitespace.
 * @param {string} value 
 * @returns {boolean} - True if empty, False if it has valid content
 */
export function isEmpty(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Validates our custom Asset Tag format (e.g., "LAP-26-4921").
 * @param {string} tag 
 * @returns {boolean}
 */
export function isValidAssetTag(tag) {
    if (!tag) return false;
    // Expects 3 uppercase letters, a dash, 2 digits, a dash, and 4 digits
    const tagRegex = /^[A-Z]{3}-\d{2}-\d{4}$/;
    return tagRegex.test(tag.trim());
}