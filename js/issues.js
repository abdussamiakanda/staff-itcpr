// staff@itcpr/js/issues.js
// Full Issues & Comments Feature for Staff Portal
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sendEmail, getEmailTemplate } from './email.js';
import { userData } from './auth.js';

let issues = [];
let currentIssueView = null; // Track if we're viewing issue details

// Loading state management
function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <span class="material-icons loading-spinner">sync</span>
            Loading...
        `;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

function setButtonLoadingById(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    setButtonLoading(button, isLoading);
}

// Initialize the issues manager immediately
window.issuesManager = {
    addIssueModal: showAddIssueModal,
    editIssueModal: showEditIssueModal,
    deleteIssue: deleteIssue,
    resolveIssue: resolveIssue,
    unresolveIssue: unresolveIssue,
    viewIssueModal: showViewIssueModal,
    addCommentModal: showAddCommentModal,
    editCommentModal: showEditCommentModal,
    deleteComment: deleteComment,
    backToIssues: backToIssues
};

export async function initIssuesManager() {
    await loadIssues();
}

export async function refreshIssuesData() {
    await loadIssues();
}

async function loadIssues() {
    const issuesGrid = document.getElementById('issuesGrid');
    if (!issuesGrid) return;
    issuesGrid.innerHTML = '<div class="loading">Loading issues...</div>';
    try {
        const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        issues = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderIssues(issues);
        updateStats(issues);
    } catch (error) {
        issuesGrid.innerHTML = '<div class="error">Failed to load issues.</div>';
        console.error(error);
    }
}

function renderIssues(issues) {
    const issuesGrid = document.getElementById('issuesGrid');
    if (!issuesGrid) return;
    if (!issues.length) {
        issuesGrid.innerHTML = '<div class="empty-state"><span class="material-icons">inbox</span><p>No issues or events found.</p></div>';
        return;
    }
    issuesGrid.innerHTML = issues.map(issue => `
        <div class="issue-card" data-id="${issue.id}">
            <div class="issue-header">
                <h4>${issue.title}</h4>
                <div class="issue-meta">
                    <div class="issue-date">
                        ${issue.date ? `
                            Event Date: ${formatEventDate(issue.date, issue.time, issue.timezone)}
                        ` : `
                            Created: ${formatDate(issue.createdAt)}
                        `}
                    </div>
                    <div class="issue-type ${issue.type === 'event' ? 'hide' : issue.resolvedAt ? 'event' : 'issue'}">
                        ${issue.resolvedAt ? 'Resolved' : 'Pending'}
                    </div>
                </div>
                ${issue.resolvedAt ? `
                    <div class="issue-meta">
                        Resolved: ${formatDate(issue.resolvedAt)}
                    </div>
                ` : ''}
            </div>
            <p class="issue-description">${issue.description || 'No description'}</p>
            <div class="issue-footer">
                <button class="btn btn-sm btn-outline" onclick="window.issuesManager.viewIssueModal('${issue.id}')">Manage</button>
            </div>
        </div>
    `).join('');
}

function updateStats(issues) {
    const total = issues.length;
    const pending = issues.filter(i => !i.resolvedAt && i.type === 'issue').length;
    const resolved = issues.filter(i => i.resolvedAt && i.type === 'issue').length;
    const events = issues.filter(i => i.type === 'event').length;
    document.getElementById('totalIssues').textContent = total;
    document.getElementById('pendingIssues').textContent = pending;
    document.getElementById('resolvedIssues').textContent = resolved;
    document.getElementById('totalEvents').textContent = events;
}

function showAddIssueModal() {
    // Set loading state for the Add Issue button
    const addButton = document.getElementById('addIssueButton');
    setButtonLoading(addButton, true);
    
    // Small delay to show loading state, then show modal
    setTimeout(() => {
        setButtonLoading(addButton, false);
        showIssueModal({});
    }, 100);
}

function showEditIssueModal(id) {
    const issue = issues.find(i => i.id === id);
    if (issue) showIssueModal(issue, true);
}

function showViewIssueModal(id) {
    viewIssueDetails(id);
}

function showAddCommentModal(issueId) {
    // Set loading state for the Add Comment button
    const addCommentBtn = document.getElementById('addCommentBtn');
    if (addCommentBtn) {
        setButtonLoading(addCommentBtn, true);
    }
    
    // Small delay to show loading state, then show modal
    setTimeout(() => {
        if (addCommentBtn) {
            setButtonLoading(addCommentBtn, false);
        }
        showCommentModal(issueId);
    }, 100);
}

function showEditCommentModal(issueId, commentId) {
    showCommentModal(issueId, commentId, true);
}

async function deleteComment(issueId, commentId) {
    if (!confirm('Delete this comment?')) return;
    
    // Find the delete button and set loading state
    const deleteButton = document.querySelector(`button[onclick*="deleteComment('${issueId}','${commentId}')"]`);
    setButtonLoading(deleteButton, true);
    
    try {
        await deleteDoc(doc(db, 'issues', issueId, 'comments', commentId));
        await notifyAdmins(`A Comment was Deleted in ITCPR Staff Portal`, `<b>${userData.name}</b> deleted a comment.`);
        
        // If we're currently viewing this issue, refresh the comments
        if (currentIssueView === issueId) {
            await loadComments(issueId);
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment. Please try again.');
        setButtonLoading(deleteButton, false);
    }
}

async function deleteIssue(id) {
    if (!confirm('Delete this issue?')) return;
    
    // Find the delete button and set loading state
    const deleteButton = document.querySelector(`button[onclick*="deleteIssue('${id}')"]`);
    setButtonLoading(deleteButton, true);
    
    try {
        await deleteDoc(doc(db, 'issues', id));
        await notifyAdmins(`An Issue was Deleted in ITCPR Staff Portal`, `<b>${userData.name}</b> deleted an issue.`);
        backToIssues();
    } catch (error) {
        console.error('Error deleting issue:', error);
        alert('Failed to delete issue. Please try again.');
        setButtonLoading(deleteButton, false);
    }
}

async function resolveIssue(id) {
    // Find the resolve button and set loading state
    const resolveButton = document.querySelector(`button[onclick*="resolveIssue('${id}')"]`);
    setButtonLoading(resolveButton, true);
    
    try {
        await updateDoc(doc(db, 'issues', id), { resolvedAt: serverTimestamp() });
        await notifyAdmins(`An Issue was Resolved in ITCPR Staff Portal`, `<b>${userData.name}</b> resolved an issue.`);
        backToIssues();
    } catch (error) {
        console.error('Error resolving issue:', error);
        alert('Failed to resolve issue. Please try again.');
        setButtonLoading(resolveButton, false);
    }
}

async function unresolveIssue(id) {
    // Find the unresolve button and set loading state
    const unresolveButton = document.querySelector(`button[onclick*="unresolveIssue('${id}')"]`);
    setButtonLoading(unresolveButton, true);
    
    try {
        await updateDoc(doc(db, 'issues', id), { resolvedAt: null });
        await notifyAdmins(`An Issue was Unresolved in ITCPR Staff Portal`, `<b>${userData.name}</b> marked an issue as unresolved.`);
        backToIssues();
    } catch (error) {
        console.error('Error unresolving issue:', error);
        alert('Failed to unresolve issue. Please try again.');
        setButtonLoading(unresolveButton, false);
    }
}

async function viewIssueDetails(id) {
    const issueRef = doc(db, 'issues', id);
    const issueDoc = await getDoc(issueRef);
    const issue = { id, ...issueDoc.data() };
    const isAdmin = userData?.type === 'admin';
    
    // Set current issue view
    currentIssueView = id;
    
    // Load the issue details into the issueDetailsPage
    const issueDetailsContainer = document.getElementById('issueDetailsContainer');
    if (!issueDetailsContainer) return;
    
    issueDetailsContainer.innerHTML = `
        <div class="issue-page-header">
            <div class="issue-header">
                <div class="issue-navigation">
                    <button class="btn btn-outline btn-sm" onclick="window.issuesManager.backToIssues()">
                        <span class="material-icons">arrow_back</span>
                        Back to Issues
                    </button>
                </div>
                <h2>${issue.title}</h2>
                <div class="issue-meta">
                    <div class="issue-date">
                        ${issue.date ? `
                            Event Date: ${formatEventDate(issue.date, issue.time, issue.timezone)}
                        ` : `
                            Created: ${formatDate(issue.createdAt)}
                        `}
                    </div>
                    <div class="issue-type ${issue.type === 'event' ? 'hide' : issue.resolvedAt ? 'event' : 'issue'}">
                        ${issue.resolvedAt ? 'Resolved' : 'Pending'}
                    </div>
                </div>
                <div class="issue-meta">
                    Created by: ${issue.userName || 'Unknown'}
                </div>
                ${issue.resolvedAt ? `
                    <div class="issue-meta">
                        Resolved: ${formatDate(issue.resolvedAt)}
                    </div>
                ` : ''}
                <p class="issue-description"><b>Description:</b> ${issue.description}</p>
                ${isAdmin ? `
                    <div class="issue-footer">
                        ${issue.type === 'issue' && !issue.resolvedAt ? `
                            <button class="btn btn-sm btn-primary" onclick="window.issuesManager.resolveIssue('${id}')">
                                Resolve
                            </button>
                        ` : `
                            ${issue.type === 'issue' ? `
                                <button class="btn btn-sm btn-danger" onclick="window.issuesManager.unresolveIssue('${id}')">
                                    Unresolve
                                </button>
                            ` : ''}
                        `}
                        <button class="btn btn-sm btn-outline" onclick="window.issuesManager.editIssueModal('${id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline btn-danger" onclick="window.issuesManager.deleteIssue('${id}')">
                            Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Comments Management -->
        <div class="section">
            <div class="issue-section-header">
                <h3>Comments</h3>
                <button class="btn btn-primary" id="addCommentBtn" onclick="window.issuesManager.addCommentModal('${id}')">
                    Add Comment
                </button>
            </div>
            <div class="issue-comments-grid" id="issue-comments-grid"></div>
        </div>
    `;
    
    // Show the issue details page
    if (window.navigation && window.navigation.loadPage) {
        window.navigation.loadPage('issueDetails');
    } else {
        // Fallback: manually show the issue details page
        const pages = ['staff', 'applications', 'technicals', 'users', 'finance', 'emails', 'responsibilities', 'issues', 'issueDetails'];
        pages.forEach(page => {
            const pageElement = document.getElementById(page + 'Page');
            if (pageElement) {
                pageElement.classList.remove('active');
            }
        });
        
        const issueDetailsPage = document.getElementById('issueDetailsPage');
        if (issueDetailsPage) {
            issueDetailsPage.classList.add('active');
        }
    }
    
    await loadComments(id);
}

async function loadComments(issueId) {
    const commentsGrid = document.getElementById('issue-comments-grid');
    if (!commentsGrid) return;
    const commentsRef = collection(db, 'issues', issueId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    commentsGrid.innerHTML = comments.length ? comments.map(comment => `
        <div class="issue-comment-card" data-id="${comment.id}">
            <div class="issue-comment-header">
                <span class="issue-comment-user">
                    <span class="material-icons">person</span>
                    <b>${comment.userName}</b> commented on ${formatDate(comment.createdAt)}
                </span>
            </div>
            <div class="issue-comment-description">${formatContent(comment.comment)}</div>
            ${(comment.userId === userData?.uid) ? `
                <div class="issue-comment-footer">
                    <button class="btn btn-sm btn-outline" onclick="window.issuesManager.editCommentModal('${issueId}','${comment.id}')">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline btn-danger" onclick="window.issuesManager.deleteComment('${issueId}','${comment.id}')">
                        Delete
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('') : '<div class="empty-state"><span class="material-icons">inbox</span><p>No comments found</p></div>';
}

function showCommentModal(issueId, commentId = null, isEdit = false) {
    let commentData = { comment: '' };
    if (isEdit) {
        // Find the comment
        // We'll fetch it fresh for edit
        getDoc(doc(db, 'issues', issueId, 'comments', commentId)).then(docSnap => {
            if (docSnap.exists()) {
                commentData = docSnap.data();
                renderCommentModal(issueId, commentId, isEdit, commentData);
            }
        });
    } else {
        renderCommentModal(issueId, commentId, isEdit, commentData);
    }
}

function renderCommentModal(issueId, commentId, isEdit, commentData) {
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('.modal-overlay');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'Add'} Comment</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="commentForm">
                    <div class="form-group">
                        <label for="comment">Comment</label>
                        <textarea id="comment" name="comment" required rows="4">${commentData.comment || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="submitComment('${issueId}', '${commentId || ''}', ${isEdit})">
                    ${isEdit ? 'Update' : 'Add'} Comment
                </button>
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Global function for comment submission
window.submitComment = async function(issueId, commentId, isEdit) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    // Find the submit button and set loading state
    const submitButton = modal.querySelector('.btn-primary');
    setButtonLoading(submitButton, true);
    
    // Try multiple selectors to find the textarea
    let textarea = modal.querySelector('textarea[name="comment"]');
    if (!textarea) {
        textarea = modal.querySelector('#comment');
    }
    if (!textarea) {
        textarea = modal.querySelector('textarea');
    }
    
    if (!textarea) {
        console.error('Comment textarea not found');
        console.log('Available elements in modal:', modal.innerHTML);
        setButtonLoading(submitButton, false);
        return;
    }
    
    const comment = textarea.value.trim();
    if (!comment) {
        alert('Please enter a comment');
        setButtonLoading(submitButton, false);
        return;
    }
    
    try {
        if (isEdit) {
            await updateDoc(doc(db, 'issues', issueId, 'comments', commentId), { comment, createdAt: serverTimestamp() });
            await notifyAdmins(`A Comment was Edited in ITCPR Staff Portal`, `<b>${userData.name}</b> edited a comment.<br>Comment: ${comment}`);
        } else {
            await addDoc(collection(db, 'issues', issueId, 'comments'), {
                comment,
                userId: userData.uid,
                userName: userData.name,
                createdAt: serverTimestamp()
            });
            await notifyAdmins(`A New Comment was Created in ITCPR Staff Portal`, `<b>${userData.name}</b> added a comment.<br>Comment: ${comment}`);
        }
        
        // Remove modal after successful submission
        modal.remove();
        
        // If we're currently viewing this issue, refresh the comments
        if (currentIssueView === issueId) {
            await loadComments(issueId);
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment. Please try again.');
        setButtonLoading(submitButton, false);
    }
};

function showIssueModal(issue = {}, isEdit = false) {
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('.modal-overlay');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'Add'} Issue/Event</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="issueForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" id="title" name="title" value="${issue.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required rows="4">${issue.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="type">Type</label>
                        <select id="type" name="type" onchange="toggleDateTime()" required>
                            <option value="issue" ${issue.type === 'issue' ? 'selected' : ''}>Issue</option>
                            <option value="event" ${issue.type === 'event' ? 'selected' : ''}>Event</option>
                        </select>
                    </div>
                    <div class="form-group-row" id="issue-date-time" style="display: ${issue.type === 'event' ? 'flex' : 'none'}">
                        <div class="form-group">
                            <label for="date">Date</label>
                            <input type="date" id="date" name="date" value="${issue.date || ''}">
                        </div>
                        <div class="form-group">
                            <label for="time">Time</label>
                            <input type="time" id="time" name="time" value="${issue.time || ''}">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="submitIssue(${isEdit}, '${issue.id || ''}')">
                    ${isEdit ? 'Update' : 'Add'} Issue
                </button>
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Global function for issue submission
window.submitIssue = async function(isEdit, issueId) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    // Find the submit button and set loading state
    const submitButton = modal.querySelector('.btn-primary');
    setButtonLoading(submitButton, true);
    
    const form = modal.querySelector('#issueForm');
    if (!form) {
        console.error('Issue form not found');
        setButtonLoading(submitButton, false);
        return;
    }
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.createdAt = serverTimestamp();
        if (data.type === 'event') {
            data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        
        if (isEdit && issueId) {
            await updateDoc(doc(db, 'issues', issueId), data);
            await notifyAdmins(`An Issue was Edited in ITCPR Staff Portal`, `<b>${userData.name}</b> edited an issue.<br>Title: ${data.title}`);
        } else {
            data.userId = userData.uid;
            data.userName = userData.name;
            await addDoc(collection(db, 'issues'), data);
            await notifyAdmins(`A New Issue was Created in ITCPR Staff Portal`, `<b>${userData.name}</b> created a new issue.<br>Title: ${data.title}`);
        }
        
        // Remove modal after successful submission
        modal.remove();
        await loadIssues();
    } catch (error) {
        console.error('Error submitting issue:', error);
        alert('Failed to submit issue. Please try again.');
        setButtonLoading(submitButton, false);
    }
};

// Global function for date/time toggle
window.toggleDateTime = function() {
    const type = document.getElementById('type').value;
    const dateTimeDiv = document.getElementById('issue-date-time');
    if (dateTimeDiv) {
        dateTimeDiv.style.display = type === 'event' ? 'flex' : 'none';
    }
};

// Helper: Format content with markdown (like portal)
function formatContent(content) {
    if (!content) return '';
    
    marked.setOptions({
        breaks: true,        // Convert \n to <br>
        gfm: true,          // Enable GitHub Flavored Markdown
        headerIds: false,    // Disable header IDs
        mangle: false,      // Disable header ID mangling
        sanitize: false,    // Allow HTML links
        smartLists: true,   // Use smarter list behavior
        smartypants: true,  // Use smart typography
    });

    try {
        return marked.parse(content);
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return content;
    }
}

// Helper: Notify all admins/staff
async function notifyAdmins(subject, message) {
    // Query all users with type: 'admin' or position: 'staff'
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const admins = usersSnap.docs.filter(doc => {
        const d = doc.data();
        return d.type === 'admin' || d.position === 'staff';
    });
    for (const admin of admins) {
        await sendEmail(admin.data().email, subject, getEmailTemplate(admin.data().name, message));
    }
}

function formatDate(ts) {
    if (!ts) return '';
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    if (typeof ts === 'string') return new Date(ts).toLocaleString();
    return '';
}

function formatEventDate(date, time, timezone) {
    if (!date || !time) return '';
    try {
        const dateTime = new Date(`${date}T${time}`);
        return dateTime.toLocaleString();
    } catch (error) {
        return `${date} ${time}`;
    }
}

function backToIssues() {
    // Clear current issue view
    currentIssueView = null;
    
    // Return to the issues page using the navigation system
    if (window.navigation && window.navigation.loadPage) {
        window.navigation.loadPage('issues');
    } else {
        // Fallback: manually show the issues page
        const pages = ['staff', 'applications', 'technicals', 'users', 'finance', 'emails', 'responsibilities', 'issues', 'issueDetails'];
        pages.forEach(page => {
            const pageElement = document.getElementById(page + 'Page');
            if (pageElement) {
                pageElement.classList.remove('active');
            }
        });
        
        const issuesPage = document.getElementById('issuesPage');
        if (issuesPage) {
            issuesPage.classList.add('active');
        }
    }
} 