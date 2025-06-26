import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db, auth } from './firebase-config.js';
const { sendEmail, getEmailTemplate, sendAcceptApplicationEmail, sendRejectApplicationEmail } = await import('./email.js');

// Global state
let applications = [];
let isLoading = false;

// Wait for Firebase Auth to be ready
async function waitForAuth() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            unsubscribe();
            resolve(auth.currentUser);
        }, 5000);
    });
}

// Fetch all applications using Firebase authentication and Flask API
async function fetchAllApplications() {
  try {
    // 🔐 Wait for Firebase Auth to be ready
    const user = await waitForAuth();
    if (!user) {
      throw new Error("User not logged in");
    }

    const idToken = await user.getIdToken();

    // 🌐 Call the Flask API
    const response = await fetch("https://api.itcpr.org/apply/all", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${idToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch applications");
    }

    const data = await response.json();

    return data.applications;

  } catch (error) {
    console.error("Error fetching applications:", error.message);
    return [];
  }
}

// Initialize applications manager
async function initApplicationsManager() {
    try {
        await loadApplications();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing applications manager:', error);
    }
}

// Load applications from API
async function loadApplications() {
    try {
        if (isLoading) return;
        
        isLoading = true;
        showLoading();

        // Use the provided fetchAllApplications function
        const apiApplications = await fetchAllApplications();
        
        // Load status data from Firestore
        const statusRef = collection(db, 'applicationStatus');
        const statusSnap = await getDocs(statusRef);
        const statusData = {};
        
        statusSnap.docs.forEach(doc => {
            statusData[doc.id] = doc.data();
        });

        // Merge API data with Firestore status data
        applications = apiApplications.map(app => {
            const appId = app.id || app._id;
            const firestoreData = statusData[appId] || {};
            
            return {
                ...app, // Keep all original API data
                firestoreStatus: firestoreData.status || 'pending',
                interviewSent: firestoreData.interviewSent || false,
                statusUpdatedAt: firestoreData.updatedAt,
                statusUpdatedBy: firestoreData.updatedBy
            };
        });
        
        // Sort applications by createdAt and submittedAt (newest first)
        applications.sort((a, b) => {
            // Get the submission date for each application
            const dateA = new Date(a.createdAt || a.submittedAt || a.timestamp || 0);
            const dateB = new Date(b.createdAt || b.submittedAt || b.timestamp || 0);
            
            // Sort in descending order (newest first)
            return dateB - dateA;
        });
        
        renderApplications();
        updateApplicationStats();
    } catch (error) {
        console.error('Error loading applications from API:', error);
        showError(error.message);
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Render applications list
function renderApplications() {
    const applicationsList = document.getElementById('applicationsList');
    if (!applicationsList) return;

    if (applications.length === 0) {
        applicationsList.innerHTML = `
            <div class="app-empty-state">
                <span class="material-icons">description</span>
                <h3>No Applications Found</h3>
                <p>No applications have been submitted yet.</p>
            </div>
        `;
        return;
    }
    const dayNow = new Date();
    const dateToday = dayNow.getDate();


    const applicationsHTML = applications.map(application => {
        const appId = application.id || application._id;
        const firestoreStatus = application.firestoreStatus || 'pending';
        const interviewSent = application.interviewSent || false;
        
        return `
        <div class="app-card" data-id="${appId}">
            <div class="app-header">
                <div class="app-info">
                    <h3 class="app-name">${application.name || application.fullName || 'N/A'}</h3>
                    <p class="app-email">${application.email || 'N/A'}</p>
                </div>
                <div class="app-status ${firestoreStatus}">
                    <span class="app-status-badge">${capitalize(firestoreStatus)}</span>
                </div>
            </div>
            
            <div class="app-details">
                <div class="app-detail-row">
                    <span class="app-detail-label">Field:</span>
                    <span class="app-detail-value">${application.position || application.role || application.field || 'N/A'}</span>
                </div>
                <div class="app-detail-row">
                    <span class="app-detail-label">Submitted:</span>
                    <span class="app-detail-value">${formatDate(application.createdAt || application.submittedAt || application.timestamp)}</span>
                </div>
                ${application.contact || application.phone ? `
                    <div class="app-detail-row">
                        <span class="app-detail-label">Phone:</span>
                        <span class="app-detail-value">${application.contact || application.phone}</span>
                    </div>
                ` : ''}
                ${application.university ? `
                    <div class="app-detail-row">
                        <span class="app-detail-label">University:</span>
                        <span class="app-detail-value">${application.university}</span>
                    </div>
                ` : ''}
                ${application.education ? `
                    <div class="app-detail-row">
                        <span class="app-detail-label">Education:</span>
                        <span class="app-detail-value">${application.education}</span>
                    </div>
                ` : ''}
                ${application.major ? `
                    <div class="app-detail-row">
                        <span class="app-detail-label">Major:</span>
                        <span class="app-detail-value">${application.major}</span>
                    </div>
                ` : ''}
                ${application.year ? `
                    <div class="app-detail-row">
                        <span class="app-detail-label">Year:</span>
                        <span class="app-detail-value">${application.year}</span>
                    </div>
                ` : ''}
            </div>

            <div class="app-actions">
                <button class="app-btn app-btn-secondary" onclick="viewApplication('${appId}')">
                    <span class="material-icons">visibility</span>
                    View
                </button>
                ${firestoreStatus === 'pending' ? `
                    ${!interviewSent ? `
                        <button class="app-btn app-btn-warning" onclick="scheduleInterview('${appId}')">
                            <span class="material-icons">event</span>
                            Interview
                        </button>
                    ` : ''}
                    ${dateToday > 25 ? `
                        <button class="app-btn app-btn-success" onclick="updateApplicationStatus('${appId}', 'approved')">
                            <span class="material-icons">check</span>
                            Approve
                        </button>
                        <button class="app-btn app-btn-danger" onclick="updateApplicationStatus('${appId}', 'rejected')">
                            <span class="material-icons">close</span>
                            Reject
                        </button>
                    ` : `${26 - dateToday} day(s) to decide`}
                ` : ''}
            </div>
        </div>
    `}).join('');

    applicationsList.innerHTML = applicationsHTML;
}

// Update application status
window.updateApplicationStatus = async (applicationId, status) => {
    try {
        const user = await waitForAuth();
        if (!user) {
            throw new Error("User not logged in");
        }

        const application = applications.find(app => (app.id || app._id) === applicationId);
        if (!application) {
            throw new Error("Application not found");
        }

        // Send email based on status using portal's email functions
        let emailSent = false;

        if (status === 'approved') {
            emailSent = await sendAcceptApplicationEmail(application, application.field);
            await createUser(application);
        } else if (status === 'rejected') {
            const rejectReason = await showRejectReasonModal();
            if (rejectReason !== null) {
                console.log("Application rejected with reason:", rejectReason);
                emailSent = await sendRejectApplicationEmail(application, rejectReason);
            } else {
                console.log("Rejection canceled");
                return;
            }
        }

        // Store status data in Firestore only (don't update API)
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { db } = await import('./firebase-config.js');
        
        const statusData = {
            applicationId: applicationId,
            status: status,
            updatedBy: user.uid,
            updatedAt: new Date(),
            emailSent: emailSent
        };

        // Store in Firestore with the same application ID
        await setDoc(doc(db, 'applicationStatus', applicationId), statusData);

        // Update local state
        const applicationIndex = applications.findIndex(app => (app.id || app._id) === applicationId);
        if (applicationIndex !== -1) {
            applications[applicationIndex].firestoreStatus = status;
            renderApplications();
            updateApplicationStats();
        }

        // Close the modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }

        if (emailSent) {
            alert(`Application ${status} successfully and email sent!`);
        } else {
            alert(`Application ${status} successfully but email failed to send.`);
        }
    } catch (error) {
        console.error('Error updating application status:', error);
        alert('Error updating application status. Please try again.');
    }
};

async function showRejectReasonModal() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-reject';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reject Application</h3>
                    <textarea id="rejectReasonInput" placeholder="Please enter the reason for rejection" rows="5"></textarea>
                    <div class="button-group">
                        <button class="app-btn app-btn-primary" id="cancelRejectBtn">Close</button>
                        <button class="app-btn app-btn-danger" id="confirmRejectBtn">Reject</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handlers
        document.getElementById('cancelRejectBtn').onclick = () => {
            document.body.removeChild(modal);
            resolve(null);
        };

        document.getElementById('confirmRejectBtn').onclick = () => {
            const reason = document.getElementById('rejectReasonInput').value.trim();
            document.body.removeChild(modal);
            resolve(reason || null);
        };
    });
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
    return generateEmail(name+'1');
}

// Create user in portal
async function createUser(application) {
    const email = await generateEmail(application.name);

    try {
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
    
        const userData = {
            email: email,
            name: application.name,
            role: 'intern',
            group: application.field,
            pemail: application.email,
            photoURL: application.photoURL,
            createdAt: serverTimestamp(),
            uid: result.uid,
            university: application.university,
            status: 'pending'
        }
        await setDoc(doc(db, 'users', result.uid), userData);
        // send new user email
        const message = `
            <b>Your New ITCPR Email Credentials</b>
            <ul>
            <li>Email Address: ${email}</li>
            <li>Temporary Password: itcprnewuser</li>
            <li>Webmail: https://webmail.itcpr.org</li>
            </ul>
            <b>What You Need to Do</b>
            <ul>
            <li>Visit the Webmail Portal: https://webmail.itcpr.org</li>
            <li>Log in using the email and temporary password above</li>
            <li>Click on the person icon on the top right corner</li>
            <li>Click on Manage account, and change your password immediately</li>
            <li>Visit the portal: https://portal.itcpr.org</li>
            <li>Log in using the email and new password you just set</li>
            <li>After logging in, you will be prompted to join our Discord server</li>
            <li>Click Join button and join the server</li>
            <li>Download Discord desktop app and the mobile app to join the server</li>
            <li>You can now start using the portal and other services</li>
            </ul>
            <b>Expolre our services to be familiar with the portal. All our communication is done through Discord and the webmail.</b>
        `;
        const subject = `Welcome to ITCPR Portal`;
        await sendEmail(application.email, subject, getEmailTemplate(application.name, message));
        return result;
    
    } catch (error) {
        console.error("Error creating new user:", error.message);
        return { error: error.message };
    }
}

// View application details
window.viewApplication = async (applicationId) => {
    try {
        const application = applications.find(app => (app.id || app._id) === applicationId);
        if (!application) {
            alert('Application not found');
            return;
        }

        showApplicationModal(application);
    } catch (error) {
        console.error('Error loading application details:', error);
        alert('Error loading application details');
    }
};

// Show application modal
function showApplicationModal(application) {
    const modalHtml = `
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Application Details</h3>
                <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="app-modal-view">
                    <div class="app-modal-meta">
                        <span class="app-modal-status ${application.firestoreStatus || 'pending'}">${capitalize(application.firestoreStatus || 'pending')}</span>
                        <span class="app-modal-date">Submitted: ${formatDate(application.createdAt || application.submittedAt || application.timestamp)}</span>
                    </div>
                    
                    <div class="app-modal-section">
                        <h4>Personal Information</h4>
                        <div class="app-info-grid">
                            <div class="app-info-item">
                                <span class="app-info-label">Name:</span>
                                <span class="app-info-value">${application.name || application.fullName || 'N/A'}</span>
                            </div>
                            <div class="app-info-item">
                                <span class="app-info-label">Email:</span>
                                <span class="app-info-value">${application.email || 'N/A'}</span>
                            </div>
                            <div class="app-info-item">
                                <span class="app-info-label">Phone:</span>
                                <span class="app-info-value">${application.contact || application.phone || 'N/A'}</span>
                            </div>
                            ${application.address ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Address:</span>
                                    <span class="app-info-value">${application.address}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="app-modal-section">
                        <h4>Academic Information</h4>
                        <div class="app-info-grid">
                            ${application.university ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">University:</span>
                                    <span class="app-info-value">${application.university}</span>
                                </div>
                            ` : ''}
                            ${application.education ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Education Level:</span>
                                    <span class="app-info-value">${application.education}</span>
                                </div>
                            ` : ''}
                            ${application.major ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Major:</span>
                                    <span class="app-info-value">${application.major}</span>
                                </div>
                            ` : ''}
                            ${application.field ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Field of Interest:</span>
                                    <span class="app-info-value">${application.field}</span>
                                </div>
                            ` : ''}
                            ${application.year ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Current Year:</span>
                                    <span class="app-info-value">${application.year}</span>
                                </div>
                            ` : ''}
                            ${application.graduationdate ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Expected Graduation:</span>
                                    <span class="app-info-value">${application.graduationdate}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    ${(application.courses && application.courses !== 'N/A') || (application.experiences && application.experiences !== 'N/A') || (application.publications && application.publications !== 'N/A') || (application.skills && application.skills !== 'N/A') ? `
                        <div class="app-modal-section">
                            <h4>Experience & Skills</h4>
                            ${application.courses && application.courses !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Relevant Courses:</span>
                                    <span class="app-info-value">${application.courses}</span>
                                </div>
                            ` : ''}
                            ${application.experiences && application.experiences !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Research Experience:</span>
                                    <span class="app-info-value">${application.experiences}</span>
                                </div>
                            ` : ''}
                            ${application.publications && application.publications !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Publications:</span>
                                    <span class="app-info-value">${application.publications}</span>
                                </div>
                            ` : ''}
                            ${application.skills && application.skills !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Technical Skills:</span>
                                    <span class="app-info-value">${application.skills}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${(application.reason && application.reason !== 'N/A') || (application.expectation && application.expectation !== 'N/A') ? `
                        <div class="app-modal-section">
                            <h4>Motivation</h4>
                            ${application.reason && application.reason !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">Why do you want to join?</span>
                                    <span class="app-info-value">${application.reason}</span>
                                </div>
                            ` : ''}
                            ${application.expectation && application.expectation !== 'N/A' ? `
                                <div class="app-info-item">
                                    <span class="app-info-label">What are your expectations?</span>
                                    <span class="app-info-value">${application.expectation}</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${(application.fileUrls && (application.fileUrls.cv || application.fileUrls.coverLetter || application.fileUrls.transcript)) ? `
                        <div class="app-modal-section">
                            <h4>Attached Files</h4>
                            <div class="app-files-list">
                                ${application.fileUrls && application.fileUrls.cv ? `
                                    <div class="app-file-item">
                                        <span class="material-icons">description</span>
                                        <span class="app-file-name">CV: ${application.fileUrls.cv}</span>
                                        <button class="app-btn app-btn-outline" onclick="downloadFile('${application.fileUrls.cv}')">
                                            <span class="material-icons">open_in_new</span>
                                        </button>
                                    </div>
                                ` : ''}
                                ${application.fileUrls && application.fileUrls.coverLetter ? `
                                    <div class="app-file-item">
                                        <span class="material-icons">description</span>
                                        <span class="app-file-name">Cover Letter: ${application.fileUrls.coverLetter}</span>
                                        <button class="app-btn app-btn-outline" onclick="downloadFile('${application.fileUrls.coverLetter}')">
                                            <span class="material-icons">open_in_new</span>
                                        </button>
                                    </div>
                                ` : ''}
                                ${application.fileUrls && application.fileUrls.transcript ? `
                                    <div class="app-file-item">
                                        <span class="material-icons">description</span>
                                        <span class="app-file-name">Transcript: ${application.fileUrls.transcript}</span>
                                        <button class="app-btn app-btn-outline" onclick="downloadFile('${application.fileUrls.transcript}')">
                                            <span class="material-icons">open_in_new</span>
                                        </button>
                                    </div>
                                ` : ''}
                                ${application.fileUrls && application.fileUrls.additionalDocuments ? `
                                    <div class="app-file-item">
                                        <span class="material-icons">description</span>
                                        <span class="app-file-name">Additional Documents: ${application.fileUrls.additionalDocuments}</span>
                                        <button class="app-btn app-btn-outline" onclick="downloadFile('${application.fileUrls.additionalDocuments}')">
                                            <span class="material-icons">open_in_new</span>
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="modal-footer">
                ${(application.firestoreStatus || 'pending') === 'pending' ? `
                    <button class="app-btn app-btn-success" onclick="updateApplicationStatus('${application.id || application._id}', 'approved')">
                        <span class="material-icons">check</span>
                        Approve
                    </button>
                    ${!application.interviewSent ? `
                        <button class="app-btn app-btn-warning" onclick="scheduleInterview('${application.id || application._id}')">
                            <span class="material-icons">event</span>
                            Interview
                        </button>
                    ` : ''}
                    <button class="app-btn app-btn-danger" onclick="updateApplicationStatus('${application.id || application._id}', 'rejected')">
                        <span class="material-icons">close</span>
                        Reject
                    </button>
                ` : ''}
                <button class="app-btn app-btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Close
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHtml);
};

// Download file
window.downloadFile = async (fileUrl) => {
    try {
        // Construct the full URL if it's a relative path
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `https://apply.itcpr.org/${fileUrl}`;
        
        // Open file in new tab instead of downloading
        window.open(fullUrl, '_blank');
    } catch (error) {
        console.error('Error opening file:', error);
        alert('Error opening file');
    }
};

// Show loading state
function showLoading() {
    const applicationsList = document.getElementById('applicationsList');
    if (applicationsList) {
        applicationsList.innerHTML = `
            <div class="app-loading-state">
                <span class="material-icons app-rotating">refresh</span>
                <h3>Loading Applications</h3>
                <p>Please wait while we fetch the latest applications...</p>
            </div>
        `;
    }
}

// Hide loading state
function hideLoading() {
    // Loading state will be replaced by renderApplications()
}

// Show error state
function showError(message) {
    const applicationsList = document.getElementById('applicationsList');
    if (applicationsList) {
        applicationsList.innerHTML = `
            <div class="app-error-state">
                <span class="material-icons">error</span>
                <h3>Error Loading Applications</h3>
                <p>${message}</p>
                <button class="app-btn app-btn-secondary" onclick="loadApplications()">
                    <span class="material-icons">refresh</span>
                    Try Again
                </button>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Event listeners are handled by onclick attributes in HTML
}

// Helper functions
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show modal function
function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'applicationModal';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

// Close modal function
window.closeModal = function() {
    const modal = document.getElementById('applicationModal');
    if (modal) {
        modal.remove();
    }
};

// Refresh data
async function refreshApplicationsData() {
    await loadApplications();
}

// Initialize when DOM is ready
async function initializeApplicationsManager() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the applications page
        if (document.getElementById('applicationsPage')) {
            await initApplicationsManager();
            // Make functions globally available
            window.applicationsManager = {
                refreshData: refreshApplicationsData,
                loadApplications: loadApplications
            };
        }
    } catch (error) {
        console.error('Error initializing applications manager:', error);
    }
}

// Start initialization
initializeApplicationsManager();

// Export functions for use in navigation.js
export { initApplicationsManager, refreshApplicationsData };

// Schedule interview
window.scheduleInterview = async (applicationId) => {
    try {
        const user = await waitForAuth();
        if (!user) {
            throw new Error("User not logged in");
        }

        const application = applications.find(app => (app.id || app._id) === applicationId);
        if (!application) {
            throw new Error("Application not found");
        }

        // Send simple interview email
        const message = `
            <p>
                We are pleased to inform you that your application has been successfully
                shortlisted for the next stage, which is the interview process.
            </p>
            <p>
                At your earliest convenience, kindly reply to info@itcpr.org to coordinate
                a suitable time for your interview. Please provide your availability, and
                we will do our best to accommodate your schedule. Please specify your
                preferred language for the interview. Currently, we only offer interviews
                in English and Bangla. The interview will be conducted via Google Meet.
            </p>
            <p>
                If you have any questions or require further information, please feel free to
                reach out to info@itcpr.org. We look forward to speaking with you soon.
            </p>
        `;

        const subject = `Interview Invitation - ITCPR Internship Application`;

        const emailSent = await sendEmail(application.email, subject, getEmailTemplate(application.name, message));

        if (emailSent) {
            // Store interview data in Firestore only (don't update API)
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const { db } = await import('./firebase-config.js');
            
            const interviewData = {
                applicationId: applicationId,
                status: 'pending', // Keep status as pending
                interviewSent: true, // Mark interview as sent
                scheduledBy: user.uid,
                scheduledAt: new Date(),
                applicantName: application.name || application.fullName,
                applicantEmail: application.email,
                field: application.field,
                university: application.university,
                emailSent: true
            };

            // Store in Firestore
            await setDoc(doc(db, 'applicationStatus', applicationId), interviewData);

            // Update local state
            const applicationIndex = applications.findIndex(app => (app.id || app._id) === applicationId);
            if (applicationIndex !== -1) {
                applications[applicationIndex].interviewSent = true;
                renderApplications();
                updateApplicationStats();
            }

            alert('Interview email sent successfully!');
        } else {
            alert('Failed to send interview email. Please try again.');
        }
    } catch (error) {
        console.error('Error sending interview email:', error);
        alert('Error sending interview email. Please try again.');
    }
};

// Update application statistics
function updateApplicationStats() {
    const totalApplications = applications.length;
    const pendingApplications = applications.filter(app => (app.firestoreStatus || 'pending') === 'pending').length;
    const acceptedApplications = applications.filter(app => app.firestoreStatus === 'approved').length;
    const rejectedApplications = applications.filter(app => app.firestoreStatus === 'rejected').length;

    // Update the DOM elements
    const totalElement = document.getElementById('totalApplications');
    const pendingElement = document.getElementById('pendingApplications');
    const acceptedElement = document.getElementById('acceptedApplications');
    const rejectedElement = document.getElementById('rejectedApplications');

    if (totalElement) totalElement.textContent = totalApplications;
    if (pendingElement) pendingElement.textContent = pendingApplications;
    if (acceptedElement) acceptedElement.textContent = acceptedApplications;
    if (rejectedElement) rejectedElement.textContent = rejectedApplications;
}