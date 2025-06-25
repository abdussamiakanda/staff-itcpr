// Simplified admin functionality for adding staff members
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

class AdminPanel {
    constructor() {
        this.allUsers = [];
        // Don't auto-init, wait for authentication
    }

    async init() {
        await this.loadAllUsers();
        this.setupEventListeners();
        this.renderUserSelect();
    }

    async loadAllUsers() {
        try {
            // Get all users from the users collection
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            
            this.allUsers = [];
            
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const user = {
                    uid: doc.id,
                    ...userData,
                    name: userData.name || userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
                };
                
                // Only show users who are not already staff
                if (userData.position !== 'staff') {
                    this.allUsers.push(user);
                }
            });
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.allUsers = [];
        }
    }

    setupEventListeners() {
        // Form submission
        const addStaffForm = document.getElementById('addStaffForm');
        if (addStaffForm) {
            addStaffForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addStaffMember();
            });
        }
    }

    renderUserSelect() {
        const userSelect = document.getElementById('userSelect');
        if (!userSelect) return;

        userSelect.innerHTML = '<option value="">Select a user...</option>';
        
        this.allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.uid;
            option.textContent = user.name + (user.email ? ` (${user.email})` : '');
            userSelect.appendChild(option);
        });
    }

    async addStaffMember() {
        const userUid = document.getElementById('userSelect').value;
        const positionTitle = document.getElementById('staffPosition').value;
        
        if (!userUid) {
            alert('Please select a user first.');
            return;
        }

        if (!positionTitle) {
            alert('Please select a position title.');
            return;
        }

        try {
            const staffData = {
                position: 'staff',
                position_title: positionTitle,
                updatedAt: new Date()
            };

            // Update the user document
            await updateDoc(doc(db, 'users', userUid), staffData);
            
            // Refresh data
            await this.loadAllUsers();
            this.renderUserSelect();
            
            // Clear form
            this.clearForm();
            
            // Close modal
            closeAddStaffModal();
            
            // Refresh staff directory
            if (window.staffDirectory) {
                await window.staffDirectory.refreshStaffData();
            }
            
        } catch (error) {
            console.error('Error adding staff member:', error);
            alert('Failed to add staff member. Please try again.');
        }
    }

    clearForm() {
        document.getElementById('userSelect').value = '';
        document.getElementById('staffPosition').value = '';
    }

    // Method to refresh user data
    async refreshData() {
        await this.loadAllUsers();
        this.renderUserSelect();
    }
}

// Global functions for add staff modal
window.openAddStaffModal = function() {
    const modal = document.getElementById('addStaffModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Refresh user data when opening modal
        if (window.adminPanel) {
            window.adminPanel.refreshData();
        }
    }
};

window.closeAddStaffModal = function() {
    const modal = document.getElementById('addStaffModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear form when closing
        if (window.adminPanel) {
            window.adminPanel.clearForm();
        }
    }
};

// Check if user is admin and show add staff button
function checkAdminAccess(userData) {
    const addStaffButton = document.getElementById('addStaffButton');
    if (addStaffButton) {
        // Show add staff button if user type is admin
        if (userData && userData.type === 'admin') {
            addStaffButton.style.display = 'flex';
        } else {
            addStaffButton.style.display = 'none';
        }
    }
}

// Initialize admin panel when user is authenticated
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is authenticated, initialize admin panel
        if (!window.adminPanel) {
            window.adminPanel = new AdminPanel();
            await window.adminPanel.init();
        }
    } else {
        // User is not authenticated, clear admin panel
        window.adminPanel = null;
    }
});

// Export the checkAdminAccess function for use in auth.js
export { checkAdminAccess }; 