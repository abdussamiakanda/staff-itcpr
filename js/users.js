import { collection, query, getDocs, where, updateDoc, doc, getDoc, deleteDoc, setDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { auth } from './firebase-config.js';
import { deauthenticateZeroTierMember } from './zerotier.js';
import { waitForAuth } from './applications.js';
import { sendEmail, getEmailTemplate } from './email.js';

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
        // Load active users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        users = usersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
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
                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                <td>
                    <button class="btn-small btn-secondary" onclick="window.usersManager.viewUserDetails('${user.uid}', 'active')">
                        View
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
                <td><span class="status-badge maintenance">Terminated</span></td>
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
                    ${userType === 'active' || userType === 'flagged' ? `
                        <div class="modal-staff-footer">
                            <button class="btn-small btn-danger" onclick="window.usersManager.terminateUser('${userDetails.uid}')">
                                Terminate
                            </button>
                            <button class="btn-small btn-danger" onclick="window.usersManager.changeUserStatus('${userDetails.uid}')">
                                ${userDetails.status === 'active' ? 'Flag User' : 'Reinstate User'}
                            </button>
                        </div>` : ''
                    }
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

// change user status
async function changeUserStatus(userId) {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        alert('User not found');
        return;
    }

    const userDetails = userSnap.data();
    const newStatus = userDetails.status === 'active' ? 'flagged' : 'active';

    try {
        await updateDoc(userRef, { status: newStatus });
        await loadUsers();
        renderUserManagement();
        document.querySelector('.modal-overlay').remove();
    } catch (error) {
        console.error('Error changing user status:', error);
    }
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
            We are informing you that your position at ITCPR has been terminated. To get
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
                <div class="modal-header" style="display: flex; flex-direction: column; align-items: flex-start; padding: 0 0 20px 0;">
                    <h2 style="margin: 0;">Add New User</h2>
                    <p>Enter user information to create a new account.</p>
                </div>
                
                <form id="addUserForm" class="add-staff-form" style="gap: 0;">
                    <div class="form-group" style="gap: 0;">
                        <label for="newUserName">Full Name:</label>
                        <input type="text" id="newUserName" name="newUserName" class="form-control" required>
                    </div>

                    <div class="form-group" style="gap: 0;">
                        <label for="newUserEmail">Personal Email:</label>
                        <input type="email" id="newUserEmail" name="newUserEmail" class="form-control" required>
                    </div>

                    <div class="form-group" style="gap: 0;">
                        <label for="newUserGroup">Group:</label>
                        <select id="newUserGroup" name="newUserGroup" class="form-control" required>
                            <option value="">Select a group...</option>
                            <option value="spintronics">Spintronics</option>
                            <option value="photonics">Photonics</option>
                        </select>
                    </div>

                    <div class="form-group" style="gap: 0;">
                        <label for="newUserRole">Role:</label>
                        <select id="newUserRole" name="newUserRole" class="form-control" required>
                            <option value="">Select a role...</option>
                            <option value="member">Member</option>
                            <option value="collaborator">Collaborator</option>
                            <option value="supervisor">Supervisor</option>
                        </select>
                    </div>

                    <div class="form-group" style="gap: 0;">
                        <label for="newUserUniversity">University:</label>
                        <input type="text" id="newUserUniversity" name="newUserUniversity" class="form-control">
                    </div>

                    <div class="form-group" style="gap: 0;">
                        <label for="newUserMajor">Major:</label>
                        <input type="text" id="newUserMajor" name="newUserMajor" class="form-control">
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-primary" onclick="window.usersManager.addUser()" style="padding: 10px 20px;">
                            <i class="fas fa-plus"></i>
                            Add User
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="padding: 10px 20px;">
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

    const userName = document.getElementById('newUserName').value.trim();
    const userEmail = document.getElementById('newUserEmail').value.trim();
    const userGroup = document.getElementById('newUserGroup').value;
    const userRole = document.getElementById('newUserRole').value;
    const userUniversity = document.getElementById('newUserUniversity').value.trim();
    const userMajor = document.getElementById('newUserMajor').value.trim();

    if (!userName || !userEmail || !userGroup || !userRole) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const email = await generateEmail(userName);

        const user = auth.currentUser;
        if (!user) {
        throw new Error("User not logged in");
        }
    
        const idToken = await user.getIdToken();
    
        const response = await fetch("https://api.itcpr.org/portal/newuser", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.trim().toLowerCase()
            })
        });
    
        const result = await response.json();
    
        if (!response.ok) {
        throw new Error(result.error || "Unknown error");
        }

        const newUserData = {
            email: email,
            name: userName,
            role: userRole,
            group: userGroup,
            pemail: userEmail,
            photoURL: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541",
            createdAt: serverTimestamp(),
            uid: result.uid,
            university: userUniversity,
            status: 'active',
            major: userMajor
        }
        await setDoc(doc(db, 'users', result.uid), newUserData);
        // send new user email
        const message = `
            <b>Your New ITCPR Email Credentials</b>
            <ul>
            <li>Email Address: ${email}</li>
            <li>Temporary Password: itcprnewuser</li>
            </ul>
            <b>What You Need to Do</b>
            <ul>
            <li>Visit the portal: https://portal.itcpr.org</li>
            <li>Log in using the email and temporary password above</li>
            <li>After logging in, you will be prompted to join our Discord server</li>
            <li>Click Join button and join the server</li>
            <li>Download Discord desktop app and the mobile app to join the server</li>
            <li>Click on the person icon on the top right corner in the portal.</li>
            <li>Click on change password, and change your password immediately</li>
            <li>You can now start using the portal and other services</li>
            </ul>
            <b>Explore our services to be familiar with the portal. All our communication is done through Discord and the webmail.</b>
        `;
        const subject = `Welcome to ITCPR Portal`;
        await sendEmail(userEmail, subject, getEmailTemplate(userName, message));

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

async function generateEmail(name) {
    const parts = name.trim().toLowerCase().split(/\s+/);
  
    if (parts.length === 0) return '';
  
    const initials = parts.slice(0, -1).map(part => part[0] || '').join('');
    const lastName = parts[parts.length - 1];
  
    const email = (initials + lastName).replace(/[^a-z0-9]/g, '') + '@mail.itcpr.org';
    const userRef = collection(db, 'users');
    const q = query(userRef, where('email', '==', email));
    const qSnap = await getDocs(q);
    if (qSnap.empty) {
        return email;
    }
    return await generateEmail(name+'1');
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
                changeUserStatus : changeUserStatus,
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