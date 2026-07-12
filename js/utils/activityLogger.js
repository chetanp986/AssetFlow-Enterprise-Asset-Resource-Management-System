/**
 * ============================================================================
 * ASSETFLOW ACTIVITY LOGGER
 * ============================================================================
 * Centralized utility to record system actions for the Audit Trail / Logs page.
 */

import { db } from '../config/firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Writes an event to the 'system_logs' Firestore collection.
 * * @param {string} actionType - Must be 'CREATE', 'UPDATE', 'DELETE', or 'SYSTEM'
 * @param {string} userName - Name of the user performing the action
 * @param {string} details - Human-readable description (e.g., "Registered new laptop AF-1042")
 */
export async function logActivity(actionType, userName, details) {
    // Basic validation to keep the logs clean
    const validActions = ['CREATE', 'UPDATE', 'DELETE', 'SYSTEM'];
    const safeAction = validActions.includes(actionType) ? actionType : 'SYSTEM';

    try {
        await addDoc(collection(db, 'system_logs'), {
            actionType: safeAction,
            userName: userName || 'Unknown User',
            details: details || 'No details provided.',
            timestamp: new Date().toISOString()
        });
        
        // Optional: Log to browser console during development
        // console.log(`[LOG: ${safeAction}] ${details}`);
        
    } catch (error) {
        // CRITICAL HACKATHON TRICK: Notice we use console.error but we DO NOT throw the error.
        // We never want a failure in the background logging system to crash the main UI
        // and prevent a user from completing their actual task (like checking out an asset).
        console.error("Non-fatal error: Failed to write to system_logs:", error);
    }
}