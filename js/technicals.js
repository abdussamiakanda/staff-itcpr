import { collection, query, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { db, auth, database } from './firebase-config.js';

// Global state
let isLoading = false;

// Show loading function
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading function
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Initialize technicals manager
async function initTechnicalsManager() {
    try {
        setupEventListeners();
        renderTechnicalsPage();
    } catch (error) {
        console.error('Error initializing technicals manager:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add event listener for the sync button
    const syncButton = document.getElementById('syncUsersButton');
    if (syncButton) {
        syncButton.addEventListener('click', syncUsersToRealtimeDB);
    }
}

// Render technicals page
function renderTechnicalsPage() {
    const technicalsGrid = document.getElementById('technicalsGrid');
    if (!technicalsGrid) return;

    technicalsGrid.innerHTML = `
        <div class="technicals-simple">
            <div class="sync-section">
                <h3>User Data Synchronization</h3>
                <p>Sync user data from Firestore to Firebase Realtime Database</p>
                <button id="syncUsersButton" class="btn-primary">
                    <span class="material-icons">sync</span>
                    Sync Users to Realtime DB
                </button>
                <div id="syncStatus" class="sync-status"></div>
            </div>
        </div>
    `;

    // Setup event listener after rendering
    setupEventListeners();
}

// Sync users from Firestore to Realtime Database
async function syncUsersToRealtimeDB() {
    try {
        if (isLoading) return;
        
        isLoading = true;
        showLoading();
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.innerHTML = '<p>Starting sync process...</p>';
        }

        // Get all users from Firestore
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        let processedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        // Process each user
        for (const userDoc of querySnapshot.docs) {
            try {
                const userData = userDoc.data();
                const uid = userDoc.id;
                
                // Determine user type
                let userType = 'user'; // default
                if (userData.type) {
                    userType = userData.type;
                } else if (userData.position === 'staff') {
                    userType = 'staff';
                } else if (userData.role === 'admin') {
                    userType = 'admin';
                }

                // Update Realtime Database
                const userRef = ref(database, `users/${uid}`);
                await set(userRef, {
                    type: userType
                });

                updatedCount++;
                
                // Update status
                if (syncStatus) {
                    syncStatus.innerHTML = `<p>Processed ${processedCount + 1}/${querySnapshot.docs.length} users...</p>`;
                }
                
            } catch (error) {
                console.error(`Error processing user ${userDoc.id}:`, error);
                errorCount++;
            }
            
            processedCount++;
        }

        // Final status update
        if (syncStatus) {
            syncStatus.innerHTML = `
                <div class="sync-complete">
                    <h4>Sync Complete!</h4>
                    <p>✅ Processed: ${processedCount} users</p>
                    <p>✅ Updated: ${updatedCount} users</p>
                    ${errorCount > 0 ? `<p>❌ Errors: ${errorCount} users</p>` : ''}
                    <p>All user types have been synchronized to Firebase Realtime Database.</p>
                </div>
            `;
        }

        console.log(`Sync completed: ${processedCount} processed, ${updatedCount} updated, ${errorCount} errors`);

    } catch (error) {
        console.error('Error syncing users:', error);
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.innerHTML = `
                <div class="sync-error">
                    <h4>Sync Failed</h4>
                    <p>Error: ${error.message}</p>
                    <p>Please try again.</p>
                </div>
            `;
        }
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Refresh technicals data
async function refreshTechnicalsData() {
    // No overview stats to update since cards were removed
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize technicals manager when the page is loaded
    if (window.initTechnicalsManager) {
        window.initTechnicalsManager();
    }
});

// Export functions for use in navigation
export { initTechnicalsManager, refreshTechnicalsData }; 