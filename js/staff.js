// Staff website functionality with Firestore integration
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Global state
let allStaff = [];
let filteredStaff = [];
let currentFilters = {
    search: '',
    role: '',
    department: ''
};

// Initialize staff directory
async function initStaffDirectory() {
    try {
        await loadStaffFromFirestore();
        setupEventListeners();
        renderStaffGrid();
    } catch (error) {
        console.error('Error initializing staff directory:', error);
    }
}

// Load staff from Firestore
async function loadStaffFromFirestore() {
    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        // Query users collection for staff members
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("position", "==", "staff"));
        const querySnapshot = await getDocs(q);
        
        allStaff = [];
        
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            const staffMember = {
                id: doc.id,
                uid: doc.id,
                name: userData.name,
                group: userData.group,
                email: userData.email,
                position_title: userData.position_title,
                avatar: userData.photoURL,
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt
            };
            
            allStaff.push(staffMember);
        });
        
        // Sort by name
        allStaff.sort((a, b) => a.name.localeCompare(b.name));
        
        filteredStaff = [...allStaff];
        
        // If no staff found, show a helpful message
        if (allStaff.length === 0) {
            console.log('No staff members found in Firestore. Make sure users have position: "staff"');
        }
        
    } catch (error) {
        console.error('Error loading staff from Firestore:', error);
        // Fallback to empty array
        allStaff = [];
        filteredStaff = [];
        
        // Show user-friendly error message
        const staffGrid = document.getElementById('staffGrid');
        if (staffGrid) {
            staffGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Unable to load staff data</h3>
                    <p>There was an error connecting to the database. Please try refreshing the page or contact support if the problem persists.</p>
                    <button onclick="window.staffDirectory.refreshStaffData()" class="btn-refresh">
                        <i class="fas fa-sync-alt"></i>
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Map group name
function mapGroup(group) {
    return group.charAt(0).toUpperCase() + group.slice(1);
}

// Setup event listeners
function setupEventListeners() {
    // Close modal on outside click
    const modal = document.getElementById('staffModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeStaffModal();
            }
        });
    }

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeStaffModal();
        }
    });
}

// Render staff grid
function renderStaffGrid() {
    const staffGrid = document.getElementById('staffGrid');
    if (!staffGrid) return;

    if (filteredStaff.length === 0) {
        staffGrid.innerHTML = renderEmptyState();
        return;
    }

    staffGrid.innerHTML = filteredStaff.map(staff => renderStaffCard(staff)).join('');
}

// Render staff card
function renderStaffCard(staff) {
    const initials = getInitials(staff.name);
    const avatar = staff.avatar ? 
        `<img src="${staff.avatar}" alt="${staff.name}" />` : 
        initials;

    return `
        <div class="staff-card" onclick="openStaffModal('${staff.uid}')">
            <div class="staff-header">
                <div class="staff-avatar">
                    ${avatar}
                </div>
                <div class="staff-info">
                    <h3 class="staff-name">${staff.name}</h3>
                    <span class="staff-role">${staff.group}</span>
                </div>
            </div>
            <div class="staff-details">
                <div class="staff-detail-item">
                    <i class="fas fa-building"></i>
                    <span>${staff.position_title}</span>
                </div>
                <div class="staff-detail-item">
                    <i class="fas fa-envelope"></i>
                    <a href="mailto:${staff.email}">${staff.email}</a>
                </div>
                ${staff.phone ? `
                    <div class="staff-detail-item">
                        <i class="fas fa-phone"></i>
                        <a href="tel:${staff.phone}">${staff.phone}</a>
                    </div>
                ` : ''}
                ${staff.office ? `
                    <div class="staff-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${staff.office}</span>
                    </div>
                ` : ''}
            </div>
            ${staff.expertise && staff.expertise.length > 0 ? `
                <div class="staff-expertise">
                    <h4>Expertise</h4>
                    <div class="expertise-tags">
                        ${staff.expertise.slice(0, 3).map(skill => 
                            `<span class="expertise-tag">${skill}</span>`
                        ).join('')}
                        ${staff.expertise.length > 3 ? 
                            `<span class="expertise-tag">+${staff.expertise.length - 3} more</span>` : ''
                        }
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Render empty state
function renderEmptyState() {
    return `
        <div class="empty-state">
            <i class="fas fa-users"></i>
            <h3>No staff members found</h3>
            <p>Try adjusting your search criteria or filters.</p>
        </div>
    `;
}

// Get initials from name
function getInitials(name) {
    return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Open staff modal
function openStaffModal(staffUid) {
    const staff = allStaff.find(s => s.uid === staffUid);
    if (!staff) return;

    const modal = document.getElementById('staffModal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    modalBody.innerHTML = renderStaffModal(staff);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Render staff modal
function renderStaffModal(staff) {
    const initials = getInitials(staff.name);
    const avatar = staff.avatar ? 
        `<img src="${staff.avatar}" alt="${staff.name}" />` : 
        initials;

    return `
        <div class="modal-staff-profile">
            <div class="modal-staff-header">
                <div class="modal-staff-avatar">
                    ${avatar}
                </div>
                <div class="modal-staff-info">
                    <h2>${staff.name}</h2>
                    <p class="modal-staff-title">${staff.position_title}</p>
                    <p class="modal-staff-department">${mapGroup(staff.group)}</p>
                </div>
            </div>
            
            <div class="modal-staff-content">
                ${staff.bio ? `
                    <div class="modal-section">
                        <h3>About</h3>
                        <p>${staff.bio}</p>
                    </div>
                ` : ''}
                
                <div class="modal-section">
                    <h3>Contact Information</h3>
                    <div class="contact-info">
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <a href="mailto:${staff.email}">${staff.email}</a>
                        </div>
                    </div>
                </div>
                <div class="modal-section actions">
                    <div class="action-item">
                        <button class="btn-delete" onclick="deleteStaffMember('${staff.uid}')">
                            <i class="fas fa-trash"></i>
                            Remove from Staff
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Close staff modal
function closeStaffModal() {
    const modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Refresh staff data
async function refreshStaffData() {
    await loadStaffFromFirestore();
    renderStaffGrid();
}

// Delete staff member
async function deleteStaffMember(staffUid) {
    if (!confirm('Are you sure you want to remove this person from the staff directory?')) {
        return;
    }

    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        // Remove position and position_title fields
        const updateData = {
            position: null,
            position_title: null,
            updatedAt: new Date()
        };

        // Update the user document
        await updateDoc(doc(db, 'users', staffUid), updateData);
        
        // Close the modal
        closeStaffModal();
        
        // Refresh staff data
        await refreshStaffData();
        
    } catch (error) {
        console.error('Error removing staff member:', error);
        alert('Failed to remove staff member. Please try again.');
    }
}

// Initialize when DOM is ready
async function initializeStaffDirectory() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the staff page
        if (document.getElementById('staffPage')) {
            await initStaffDirectory();
            // Make functions globally available
            window.staffDirectory = {
                refreshStaffData: refreshStaffData,
                openStaffModal: openStaffModal,
                closeStaffModal: closeStaffModal,
                deleteStaffMember: deleteStaffMember
            };
        }
    } catch (error) {
        console.error('Error initializing staff directory:', error);
    }
}

// Global functions for modal (for backward compatibility)
window.openStaffModal = function(staffUid) {
    if (window.staffDirectory) {
        window.staffDirectory.openStaffModal(staffUid);
    }
};

window.closeStaffModal = function() {
    if (window.staffDirectory) {
        window.staffDirectory.closeStaffModal();
    }
};

window.deleteStaffMember = function(staffUid) {
    if (window.staffDirectory) {
        window.staffDirectory.deleteStaffMember(staffUid);
    }
};

// Initialize staff directory when user is authenticated
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is authenticated, initialize staff directory
        if (document.getElementById('staffPage')) {
            await initializeStaffDirectory();
        }
    } else {
        // User is not authenticated, clear staff directory
        window.staffDirectory = null;
    }
});

// Start initialization
initializeStaffDirectory();

// Export functions for use in navigation.js
export { initStaffDirectory, refreshStaffData };