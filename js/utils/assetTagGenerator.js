/**
 * Generates a smart, human-readable asset tag.
 * * @param {string} categoryName - The category of the asset (e.g., "Laptops", "Vehicles")
 * @returns {string} - A formatted asset tag (e.g., "LAP-26-4921")
 */
export function generateAssetTag(categoryName) {
    // 1. Generate a Prefix (First 3 letters, uppercase)
    // Fallback to 'GEN' (General) if no category is provided
    let prefix = 'GEN';
    if (categoryName && typeof categoryName === 'string') {
        // Remove spaces and grab the first 3 characters
        prefix = categoryName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    }

    // 2. Get the current 2-digit year (e.g., "26" for 2026)
    const year = new Date().getFullYear().toString().slice(-2);

    // 3. Generate a random 4-digit identifier (1000 - 9999)
    // Hackathon trick: Using random numbers prevents race conditions during a demo
    // without needing complex database transactions to find the "next sequential" number.
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    // Combine them into a professional-looking tag
    return `${prefix}-${year}-${randomNum}`;
}