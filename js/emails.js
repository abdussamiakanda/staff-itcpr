import { collection, query, getDocs, where, orderBy, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { sendEmail, getEmailTemplate } from './email.js';

// Global state
let users = [];

// Initialize emails manager
async function initEmailsManager() {
    try {
        await loadUsers();
        showEmailSender();
    } catch (error) {
        console.error('Error initializing emails manager:', error);
        showEmailSender(); // Show sender even if there's an error
    }
}

// Load users from Firestore
async function loadUsers() {
    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        users = [];
        querySnapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Show simple email sender interface
function showEmailSender() {
    const emailsPage = document.getElementById('emailsPage');
    if (!emailsPage) return;

    // Get unique groups from users, filter out empty/null values and ensure uniqueness
    const groups = [...new Set(
        users
            .filter(user => user.group && user.group.trim() !== '')
            .map(user => user.group.trim())
    )].sort();
    
    const groupOptions = groups.map(group => `
        <option value="${group}">${capitalize(group)} Group</option>
    `).join('');

    emailsPage.innerHTML = `
        <div class="container">
            <section class="emails-section">
                <div class="section-header">
                    <div class="section-title">
                        <h2>Send Bulk Emails</h2>
                        <p>Send emails to users and groups</p>
                    </div>
                </div>
                <div class="emails-content">
                    <div class="email-sender">
                        <form id="emailForm">
                            <div class="form-group-row">
                                <div class="form-group">
                                    <label for="emailList">Email Group</label>
                                    <select id="emailList" required>
                                        <option value="" disabled selected>Select email group</option>
                                        <option value="all">All Users</option>
                                        ${groupOptions}
                                        <option value="interns">Interns</option>
                                        <option value="members">Members</option>
                                        <option value="directors">Directors</option>
                                        <option value="server">Server Users</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="emailSubject">Subject</label>
                                    <input type="text" id="emailSubject" placeholder="Enter email subject" required />
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="emailBody">Body</label>
                                <textarea id="emailBody" placeholder="Enter email body" rows="10" required></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="window.emailsManager.clearForm()">
                                    Clear
                                </button>
                                <button type="button" class="btn-primary" onclick="window.emailsManager.sendBulkEmails()">
                                    Send Emails
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    `;
}

// Send bulk emails
async function sendBulkEmails() {
    const emailList = document.getElementById('emailList').value;
    const emailSubject = document.getElementById('emailSubject').value;
    const emailBody = document.getElementById('emailBody').value;

    if (!emailList || !emailSubject || !emailBody) {
        alert('Please fill in all fields.');
        return;
    }

    let targetUsers = [];

    if (emailList === 'all') {
        targetUsers = users.filter(user => user.email);
    } else if (emailList === 'interns') {
        targetUsers = users.filter(user => user.role === 'intern' && user.email);
    } else if (emailList === 'members') {
        targetUsers = users.filter(user => user.role !== 'intern' && user.email);
    } else if (emailList === 'directors') {
        targetUsers = users.filter(user => user.position === 'staff' && user.email);
    } else if (emailList === 'server') {
        targetUsers = users.filter(user => user.zerotierId && user.email);
    } else {
        targetUsers = users.filter(user => user.group === emailList && user.email);
    }

    if (targetUsers.length === 0) {
        alert('No users found for the selected group.');
        return;
    }

    if (!confirm(`Send email to ${targetUsers.length} users?`)) {
        return;
    }

    try {
        let successCount = 0;
        let failCount = 0;

        for (const user of targetUsers) {
            try {
                const result = await sendEmail(user.email, emailSubject, getEmailTemplate(user.name || 'User', emailBody));
                if (result) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`Failed to send email to ${user.email}:`, error);
                failCount++;
            }
        }

        alert(`Email sent successfully to ${successCount} out of ${targetUsers.length} recipients.`);
        clearForm();
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        alert('Error sending emails. Please try again.');
    }
}

// Clear form
function clearForm() {
    document.getElementById('emailForm').reset();
}

// Helper function to capitalize
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Refresh data
async function refreshEmailsData() {
    await loadUsers();
}

// Initialize when DOM is ready
async function initializeEmailsManager() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the emails page
        if (document.getElementById('emailsPage')) {
            await initEmailsManager();
            // Make functions globally available
            window.emailsManager = {
                refreshData: refreshEmailsData,
                sendBulkEmails: sendBulkEmails,
                clearForm: clearForm
            };
        }
    } catch (error) {
        console.error('Error initializing emails manager:', error);
    }
}

// Start initialization
initializeEmailsManager();

// Export functions for use in navigation.js
export { initEmailsManager, refreshEmailsData }; 