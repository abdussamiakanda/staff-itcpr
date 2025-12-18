import { supabaseClient } from './config.js';
import { markdownToHtml } from './email.js';

window.newsletterManager = {
    addNewsletterModal: showAddNewsletterModal,
    editNewsletterModal: showEditNewsletterModal,
    viewNewsletterModal: showViewNewsletterModal
};

export const initNewsletterManager = async () => {
    await loadNewsletterData();
};

export const refreshNewsletterData = async () => {
    await loadNewsletterData();
};

async function loadNewsletterData() {
    const newsletterGrid = document.getElementById('newsletterGrid');

    if (!newsletterGrid) return;
    newsletterGrid.innerHTML = '<div class="loading">Loading newsletters...</div>';

    try {
        const { data: newsData, error: fetchError } = await supabaseClient
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });
        if (fetchError) {
            throw fetchError;
        }
        if (!newsData || newsData.length === 0) {
            newsletterGrid.innerHTML = '<div class="empty-state"><span class="material-icons">inbox</span><p>No newsletters found.</p></div>';
            return;
        }
        newsletterGrid.innerHTML = newsData.map(news => `
            <div class="issue-card" data-id="${news.id}">
                <div class="issue-header">
                    <h4>${news.title}</h4>
                    <div class="issue-meta">
                        <div class="issue-date">
                            Created: ${new Date(news.created_at).toLocaleDateString( 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                        <div class="issue-type ${news.type}">
                            ${news.type.charAt(0).toUpperCase() + news.type.slice(1)}
                        </div>
                    </div>
                </div>
                <div class="issue-footer">
                    <button class="btn btn-sm btn-outline" onclick="window.newsletterManager.viewNewsletterModal('${news.id}')">View</button>
                    <button class="btn btn-sm btn-outline" onclick="window.newsletterManager.editNewsletterModal('${news.id}')">Edit</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        newsletterGrid.innerHTML = '<div class="error">Failed to load newsletters.</div>';
        console.error(error);
    }
}

function showAddNewsletterModal() {
    showNewsletterModal({});
}

async function showEditNewsletterModal(id) {
    const { data: newsData, error: fetchError } = await supabaseClient
        .from('news')
        .select('*')
        .eq('id', id)
        .single();

    const issue = newsData || {};
    showNewsletterModal(issue, true);
}

async function showViewNewsletterModal(id) {
    const { data: newsData, error: fetchError } = await supabaseClient
        .from('news')
        .select('*')
        .eq('id', id)
        .single();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; width: 100%;">
            <div class="modal-header">
                <h3>${newsData.title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="issue-details">
                    <div class="issue-header">
                        <div class="issue-meta">
                            <div class="issue-date">
                                Created: ${new Date(newsData.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <div class="issue-author">
                                Author: ${newsData.author}
                            </div>
                            <div class="issue-type ${newsData.type}">
                                ${newsData.type.charAt(0).toUpperCase() + newsData.type.slice(1)}
                            </div>
                        </div>
                    </div>
                    <div class="issue-description">
                        ${markdownToHtml(newsData.content)}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function showNewsletterModal(news = {}, isEdit = false) {
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('.modal-overlay');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; width: 100%;">
            <div class="modal-header" style="margin-bottom: 0;">
                <h3>${isEdit ? 'Edit' : 'Add'} Newsletter/Event</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="issueForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" id="title" name="title" value="${news.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="author">Author</label>
                        <input type="text" id="author" name="author" value="${news.author || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="content">Description</label>
                        <textarea id="content" name="content" required rows="4" placeholder="Enter description in markdown format">${news.content || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="type">Type</label>
                        <select id="type" name="type" onchange="toggleDateTime()" required>
                            <option value="issue" ${news.type === 'issue' ? 'selected' : ''}>Issue</option>
                            <option value="news" ${news.type === 'news' ? 'selected' : ''}>News</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="image">Image URL</label>
                        <input type="text" id="image" name="image" value="${news.image || ''}" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="submitNewsletter(${isEdit}, '${news.id || ''}')">
                    ${isEdit ? 'Update' : 'Add'} Newsletter
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
window.submitNewsletter = async function(isEdit, issueId) {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) {
        console.error('Modal not found');
        return;
    }

    const form = modal.querySelector('#issueForm');
    if (!form) {
        console.error('Newsletter form not found');
        return;
    }
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        if (isEdit && issueId) {
            await supabaseClient
                .from('news')
                .update([data])
                .eq('id', issueId);
        } else {
            await supabaseClient
                .from('news')
                .insert([data]);
        }
        
        // Remove modal after successful submission
        modal.remove();
        await loadNewsletterData();
    } catch (error) {
        console.error('Error submitting issue:', error);
        alert('Failed to submit issue. Please try again.');
    }
};