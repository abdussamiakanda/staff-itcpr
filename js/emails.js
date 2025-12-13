import { collection, query, getDocs, where, orderBy, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { sendEmail, getEmailTemplate } from './email.js';

// Get Supabase client from global scope (loaded via script tag in index.html)
// Supabase is loaded as a script tag, so we can access it via window.supabase
let supabase = null;

function getSupabaseClient() {
    if (!supabase && typeof window !== 'undefined' && window.supabase) {
        const { createClient } = window.supabase;
        supabase = createClient(
            'https://fkhqjzzqbypkwrpnldgk.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHFqenpxYnlwa3dycG5sZGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MzM0OTAsImV4cCI6MjA2MzIwOTQ5MH0.O5LjcwITJT3hIbnNnXJNYYYPDeOGBKkLmU6EyUUY478'
        );
    }
    return supabase;
}

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
                                    <select id="emailList" required onchange="window.updateToField()">
                                        <option value="" disabled selected>Select email group</option>
                                        <option value="single">Single User</option>
                                        <option value="all">All Users</option>
                                        ${groupOptions}
                                        <option value="interns">Interns</option>
                                        <option value="members">Members</option>
                                        <option value="directors">Directors</option>
                                        <option value="server">Server Users</option>
                                        <option value="subscribers">Subscribers</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="emailSubject">Subject</label>
                                    <input type="text" id="emailSubject" placeholder="Enter email subject" required />
                                </div>
                            </div>
                            <div class="form-group-row" id="emailToDiv" style="display: none;">
                                <div class="form-group">
                                    <label for="emailTo">To</label>
                                    <input type="text" id="emailTo" placeholder="Enter email address" />
                                </div>
                                <div class="form-group">
                                    <label for="emailName">Name</label>
                                    <input type="text" id="emailName" placeholder="Enter name" />
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

window.updateToField = function() {
    const emailList = document.getElementById('emailList').value;
    const emailToDiv = document.getElementById('emailToDiv');

    // hide the to field if the email list is not single
    if (emailList !== 'single') {
        emailToDiv.style.display = 'none';
    } else {
        emailToDiv.style.display = 'grid';
    }
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
    } else if (emailList === 'subscribers') {
        // Fetch subscribers from Supabase
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            alert('Supabase is not available. Please refresh the page.');
            return;
        }
        const { data: subscribers, error } = await supabaseClient
            .from('subscribers')
            .select('email');

        if (error) {
            console.error('Error fetching subscribers:', error);
            alert('Error fetching subscribers. Please try again.');
            return;
        }

        targetUsers = subscribers.map(subscriber => ({
            email: subscriber.email,
            name: 'Subscriber'
        }));
    } else if (emailList === 'single') {
        targetUsers = [{email: document.getElementById('emailTo').value, name: document.getElementById('emailName').value}];
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
                if (emailList === 'subscribers') {
                    const result = await sendEmail(user.email, emailSubject, getEmailTemplate(user.name || 'User', markdownToHtml(emailBody), true));
                    if (result) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } else {
                    const result = await sendEmail(user.email, emailSubject, getEmailTemplate(user.name || 'User', markdownToHtml(emailBody)));
                    if (result) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                }
            } catch (error) {
                console.error(`Failed to send email to ${user.email}:`, error);
                failCount++;
            }
        }

        alert(`Email sent successfully to ${successCount} out of ${targetUsers.length} recipients.`);
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        alert('Error sending emails. Please try again.');
    }
}

function markdownToHtml(markdownText) {
    // Make sure 'marked' is available
    if (typeof marked === 'undefined') {
      throw new Error("The 'marked' library is required. Include it via CDN or install it.");
    }
  
    return marked.parse(markdownText);
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