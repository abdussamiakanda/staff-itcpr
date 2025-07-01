import { collection, query, getDocs, where, doc, getDoc, deleteDoc, setDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { auth } from './firebase-config.js';
import { deauthenticateZeroTierMember } from './zerotier.js';
import { waitForAuth } from './applications.js';

// Global state
let users = [];
let terminatedUsers = [];

// Initialize users manager
async function initUsersManager() {
    try {
        await loadUsers();
        setupEventListeners();
        renderUserManagement();
    } catch (error) {
        console.error('Error initializing users manager:', error);
    }
}

// Load users from Firestore
async function loadUsers() {
    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        // Load active users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        users = usersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            status: 'active'
        }));

        // Load terminated users
        const terminatedUsersRef = collection(db, 'terminated_users');
        const terminatedUsersSnap = await getDocs(terminatedUsersRef);
        terminatedUsers = terminatedUsersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            status: 'terminated'
        }));
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // The button click will be handled by the onclick attribute in the HTML
}

// Render user management interface
function renderUserManagement() {
    const usersContent = document.querySelector('#usersPage .users-content');
    if (!usersContent) return;

    // Replace the content with the users table
    usersContent.innerHTML = `
        <div class="user-management">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Group</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    ${renderUsersTable()}
                </tbody>
            </table>
        </div>
    `;
}

// Render users table
function renderUsersTable() {
    let tableHTML = '';

    // Render active users first
    users.forEach(user => {
        tableHTML += `
            <tr class="active-user" data-id="${user.uid}">
                <td>${user.name || 'Unknown'}</td>
                <td>${user.email || 'No email'}</td>
                <td>${capitalize(user.group || 'N/A')}</td>
                <td>${capitalize(user.role || 'N/A')}</td>
                <td><span class="status-badge active">Active</span></td>
                <td>
                    <button class="btn-small btn-secondary" onclick="window.usersManager.viewUserDetails('${user.uid}', 'active')">
                        View
                    </button>
                    <button class="btn-small btn-danger" onclick="window.usersManager.terminateUser('${user.uid}')">
                        Terminate
                    </button>
                </td>
            </tr>
        `;
    });

    // Render terminated users at the bottom
    terminatedUsers.forEach(user => {
        tableHTML += `
            <tr class="terminated-user" data-id="${user.uid}">
                <td>${user.name || 'Unknown'}</td>
                <td>${user.email || 'No email'}</td>
                <td>${capitalize(user.group || 'N/A')}</td>
                <td>Terminated</td>
                <td><span class="status-badge terminated">Terminated</span></td>
                <td>
                    <button class="btn-small btn-secondary" onclick="window.usersManager.viewUserDetails('${user.uid}', 'terminated')">
                        View
                    </button>
                </td>
            </tr>
        `;
    });

    return tableHTML;
}

// View user details
async function viewUserDetails(userId, userType = 'active') {
    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        let userDetails = null;

        if (userType === 'terminated') {
            // Get terminated user details
            const terminatedUserRef = doc(db, 'terminated_users', userId);
            const terminatedUserSnap = await getDoc(terminatedUserRef);
            if (terminatedUserSnap.exists()) {
                userDetails = terminatedUserSnap.data();
            }
        } else {
            // Get active user details
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userDetails = userSnap.data();
            }
        }

        if (!userDetails) {
            alert('User not found');
            return;
        }

        showUserDetailsModal(userDetails, userType);
    } catch (error) {
        console.error('Error viewing user details:', error);
        alert('Error loading user details');
    }
}

// Show user details modal
function showUserDetailsModal(userDetails, userType = 'active') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" aria-label="Close modal">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-body">
                <div class="modal-staff-profile">
                    <div class="modal-staff-header">
                        <div class="modal-staff-avatar">
                            ${getInitials(userDetails.name)}
                        </div>
                        <div class="modal-staff-info">
                            <h2>${userDetails.name || 'Unknown User'}</h2>
                            <p class="modal-staff-title">${userType === 'terminated' ? 'Terminated' : capitalize(userDetails.role || 'N/A')}</p>
                            <p class="modal-staff-department">${capitalize(userDetails.group || 'N/A')}</p>
                            ${userType === 'terminated' ? `<p class="modal-staff-status terminated">Terminated on ${formatDate(userDetails.terminatedAt)}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="modal-staff-content">
                        <div class="modal-section">
                            <h3>User Information</h3>
                            <div class="user-details-grid">
                                <div class="detail-item">
                                    <label>Email:</label>
                                    <span>${userDetails.email || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Group:</label>
                                    <span>${capitalize(userDetails.group || 'N/A')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Role:</label>
                                    <span>${capitalize(userDetails.role || 'N/A')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>University:</label>
                                    <span>${userDetails.university || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Major:</label>
                                    <span>${userDetails.major || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Created:</label>
                                    <span>${formatDate(userDetails.createdAt)}</span>
                                </div>
                                ${userType === 'terminated' ? `
                                <div class="detail-item">
                                    <label>Terminated:</label>
                                    <span>${formatDate(userDetails.terminatedAt)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Terminated By:</label>
                                    <span>${userDetails.terminatedBy || 'N/A'}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Get user initials for avatar
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Terminate user
async function terminateUser(userId) {
    if (!confirm('Are you sure you want to terminate this user? This action cannot be undone.')) {
        return;
    }

    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            alert('User not found');
            return;
        }

        const userDetails = userSnap.data();
        if (userDetails.zerotierId) {
            await deauthenticateZeroTierMember(userDetails.zerotierId);
        }

        if (userDetails.discordId) {
            await removeDiscordUser(userDetails.discordId);
        }

        const user = await waitForAuth();
        const idToken = await user.getIdToken();

        await removePortalUser(userId, idToken);

        // Move user data to terminated_users collection
        const terminatedUserRef = doc(db, 'terminated_users', userId);
        await setDoc(terminatedUserRef, {
            ...userDetails,
            terminatedAt: serverTimestamp(),
            terminatedBy: auth.currentUser?.uid || 'unknown',
            originalRole: userDetails.role // Keep original role for reference
        });

        // Delete user from users collection
        await deleteDoc(userRef);

        // Send termination email (if email functionality is available)
        if (userDetails.pemail) {
            try {
                await sendTerminationEmail(userDetails.pemail, userDetails.name);
            } catch (error) {
                console.error('Error sending termination email:', error);
            }
        }

        // Refresh data
        await loadUsers();
        renderUserManagement();

        alert('User terminated successfully');
    } catch (error) {
        console.error('Error terminating user:', error);
        alert('Error terminating user. Please try again.');
    }
}

async function removeDiscordUser(userId) {
    try {
        const response = await fetch('https://api.itcpr.org/discord/remove_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log("User removed successfully:", result.message);
        } else {
            console.error("Failed to remove user:", result.error);
        }
    } catch (error) {
        console.error("Error during request:", error);
    }
}

async function removePortalUser(uid, idToken) {
    try {
        const response = await fetch('https://api.itcpr.org/portal/remove_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ uid })
        });

        const result = await response.json();

        if (response.ok && result.status === 'user_deleted') {
            console.log("User removed:", result.uid);
        } else {
            console.error("Error removing user:", result.error);
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

// Send termination email
async function sendTerminationEmail(email, name) {
    const message = `
        <p>
            We regret to inform you that your position at ITCPR has been terminated. To get
            more information about your termination, please contact us at info@itcpr.org.
        </p>
        <p>
            We appreciate your contributions and wish you the best in your future endeavors.
        </p>
    `;

    await sendEmail(email, 'Position Status at ITCPR', getEmailTemplate(name, message));
}

// Add user modal
function addUserModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" aria-label="Close modal">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-body">
                <div class="modal-header">
                    <h2>Add New User</h2>
                    <p>Enter user information to create a new account.</p>
                </div>
                
                <form id="addUserForm" class="add-staff-form">
                    <div class="form-group">
                        <label for="userName">Name:</label>
                        <input type="text" id="userName" class="form-control" required>
                    </div>
                
                    <div class="form-group">
                        <label for="userEmail">Email:</label>
                        <input type="email" id="userEmail" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="userGroup">Group:</label>
                        <select id="userGroup" class="form-control" required>
                            <option value="">Select a group...</option>
                            <option value="cs">Computer Science</option>
                            <option value="ai">Artificial Intelligence</option>
                            <option value="data">Data Science</option>
                            <option value="admin">Administration</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="userRole">Role:</label>
                        <select id="userRole" class="form-control" required>
                            <option value="">Select a role...</option>
                            <option value="student">Student</option>
                            <option value="researcher">Researcher</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Admin</option>
                            <option value="support">Support</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="userUniversity">University:</label>
                        <input type="text" id="userUniversity" class="form-control">
                    </div>

                    <div class="form-group">
                        <label for="userMajor">Major:</label>
                        <input type="text" id="userMajor" class="form-control">
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-primary" onclick="window.usersManager.addUser()">
                            <i class="fas fa-plus"></i>
                            Add User
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Add user
async function addUser() {
    const form = document.getElementById('addUserForm');
    if (!form) return;

    const userName = document.getElementById('userName').value;
    const userEmail = document.getElementById('userEmail').value;
    const userGroup = document.getElementById('userGroup').value;
    const userRole = document.getElementById('userRole').value;
    const userUniversity = document.getElementById('userUniversity').value;
    const userMajor = document.getElementById('userMajor').value;

    if (!userName || !userEmail || !userGroup || !userRole) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        const userData = {
            name: userName,
            email: userEmail,
            group: userGroup,
            role: userRole,
            university: userUniversity,
            major: userMajor,
            createdAt: serverTimestamp(),
            status: 'active'
        };

        // Add to users collection directly
        const usersRef = collection(db, 'users');
        await setDoc(doc(usersRef), userData);

        // Close modal
        document.querySelector('.modal-overlay').remove();

        // Refresh data
        await loadUsers();
        renderUserManagement();

        alert('User added successfully');
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user. Please try again.');
    }
}

// Capitalize first letter
function capitalize(str) {
    if (!str) return 'N/A';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Refresh users data
async function refreshUsersData() {
    await loadUsers();
    renderUserManagement();
}

// Initialize when DOM is ready
async function initializeUsersManager() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the users page
        if (document.getElementById('usersPage')) {
            await initUsersManager();
            // Make functions globally available
            window.usersManager = {
                refreshData: refreshUsersData,
                viewUserDetails: viewUserDetails,
                terminateUser: terminateUser,
                addUserModal: addUserModal,
                addUser: addUser,
                showUserManagement: renderUserManagement
            };
        }
    } catch (error) {
        console.error('Error initializing users manager:', error);
    }
}

// Start initialization
initializeUsersManager();

// Export functions for use in navigation.js
export { initUsersManager, refreshUsersData }; 