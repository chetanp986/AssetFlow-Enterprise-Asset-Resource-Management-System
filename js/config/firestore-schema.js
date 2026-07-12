/**
 * ============================================================================
 * ASSETFLOW FIRESTORE SCHEMA REFERENCE
 * ============================================================================
 * * Note: Firestore is a schemaless NoSQL database. This file does NOT enforce 
 * these rules (that is what firestore.rules is for). This file exists purely 
 * as a developer reference so the team knows what fields belong where.
 */

export const SchemaReference = {

    // 1. USERS COLLECTION (Document ID: Firebase Auth UID)
    users: {
        email: "string",           // e.g., "jane@company.com"
        displayName: "string",     // e.g., "Jane Doe"
        role: "string",            // "employee" | "admin"
        createdAt: "ISOString"
    },

    // 2. METADATA COLLECTIONS (Document ID: Auto-generated)
    categories: {
        name: "string"             // e.g., "Laptops", "Vehicles"
    },
    
    departments: {
        name: "string"             // e.g., "Engineering", "HR"
    },

    // 3. ASSETS COLLECTION (Document ID: Auto-generated)
    assets: {
        assetTag: "string",        // e.g., "AF-1042"
        name: "string",            // e.g., "MacBook Pro M2"
        category: "string",        // References categories.name
        department: "string",      // References departments.name
        serialNumber: "string",    // e.g., "SN-123456"
        status: "string",          // "Available" | "Allocated" | "Maintenance" | "Lost/Damaged"
        createdAt: "ISOString",
        
        // Fields populated only when status === 'Allocated'
        assignedToId: "string | null",   // User UID
        assignedToName: "string | null",
        checkoutDate: "ISOString | null",
        dueDate: "ISOString | null",
        
        // Fields populated during Audit Cycles
        currentAuditStatus: "string", // "Pending" | "Verified" | "Flagged"
        auditNote: "string | null",
        lastAudited: "ISOString"
    },

    // 4. BOOKINGS COLLECTION (Document ID: Auto-generated)
    bookings: {
        resourceId: "string",      // References assets document ID
        date: "YYYY-MM-DD",        // Used for fast querying
        startTime: "HH:MM",        // e.g., "14:30"
        endTime: "HH:MM",
        purpose: "string",
        userId: "string",          // User UID
        userName: "string",
        createdAt: "ISOString"
    },

    // 5. MAINTENANCE TICKETS (Document ID: Auto-generated)
    maintenance_tickets: {
        assetId: "string",
        assetTag: "string",
        assetName: "string",
        priority: "string",        // "Low" | "Medium" | "High"
        description: "string",
        status: "string",          // "Open" | "Resolved"
        reportedById: "string",
        reportedByName: "string",
        createdAt: "ISOString",
        resolvedAt: "ISOString | null"
    },

    // 6. AUDIT CYCLES (Document ID: Auto-generated)
    audits: {
        name: "string",            // e.g., "Q4 2024 Tech Audit"
        status: "string",          // "In Progress" | "Closed"
        startedAt: "ISOString",
        closedAt: "ISOString | null"
    },

    // 7. SYSTEM LOGS (Document ID: Auto-generated)
    system_logs: {
        actionType: "string",      // "CREATE" | "UPDATE" | "DELETE" | "SYSTEM"
        userName: "string",        // e.g., "Jane Doe" or "System"
        details: "string",         // e.g., "Assigned asset AF-1042 to John Smith"
        timestamp: "ISOString"     // Used for sorting the feed
    }
};