import { collection, query, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// Global state
let responsibilities = [];

// Initialize responsibilities manager
async function initResponsibilitiesManager() {
    try {
        await loadResponsibilities();
        renderResponsibilities();
    } catch (error) {
        console.error('Error initializing responsibilities manager:', error);
    }
}

// Load responsibilities from Firestore
async function loadResponsibilities() {
    try {
        if (!db) {
            console.warn('Firebase not initialized yet');
            return;
        }

        const responsibilitiesRef = collection(db, 'responsibilities');
        const q = query(responsibilitiesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        responsibilities = [];
        querySnapshot.forEach((doc) => {
            responsibilities.push({
                id: doc.id,
                ...doc.data()
            });
        });

    } catch (error) {
        console.error('Error loading responsibilities:', error);
    }
}

// Render responsibilities
function renderResponsibilities() {
    const responsibilitiesGrid = document.getElementById('responsibilitiesGrid');
    if (!responsibilitiesGrid) return;

    if (responsibilities.length === 0) {
        responsibilitiesGrid.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">description</span>
                <h3>No Policies Found</h3>
                <p>Start by adding your first staff policy or procedure using the "Add Policy" button above.</p>
            </div>
        `;
        return;
    }

    const responsibilitiesHTML = responsibilities.map(responsibility => `
        <div class="responsibility-card" data-id="${responsibility.id}">
            <div class="responsibility-header">
                <div class="responsibility-icon">
                    <span class="material-icons">${getResponsibilityIcon(responsibility.category)}</span>
                </div>
                <div class="responsibility-meta">
                    <span class="responsibility-category">${capitalize(responsibility.category)}</span>
                    <span class="responsibility-date">${formatDate(responsibility.createdAt)}</span>
                </div>
            </div>
            <div class="responsibility-content">
                <h3 class="responsibility-title">${responsibility.title}</h3>
                <p class="responsibility-description">${responsibility.description}</p>
                <div class="responsibility-steps">
                    <h4>Steps:</h4>
                    <ol>
                        ${responsibility.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                ${responsibility.notes ? `
                    <div class="responsibility-notes">
                        <h4>Notes:</h4>
                        <p>${responsibility.notes}</p>
                    </div>
                ` : ''}
            </div>
            <div class="responsibility-actions">
                <button class="btn-small btn-secondary" onclick="viewResponsibility('${responsibility.id}')">
                    <span class="material-icons">visibility</span>
                    View
                </button>
                <button class="btn-small btn-outline" onclick="editResponsibility('${responsibility.id}')">
                    <span class="material-icons">edit</span>
                    Edit
                </button>
                <button class="btn-small btn-danger" onclick="deleteResponsibility('${responsibility.id}')">
                    <span class="material-icons">delete</span>
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    responsibilitiesGrid.innerHTML = responsibilitiesHTML;
}

// Get icon for responsibility category
function getResponsibilityIcon(category) {
    const icons = {
        'user_management': 'people',
        'finance': 'account_balance_wallet',
        'applications': 'description',
        'emails': 'email',
        'general': 'assignment',
        'security': 'security',
        'maintenance': 'build',
        'reporting': 'assessment',
        'communication': 'chat',
        'training': 'school'
    };
    return icons[category] || 'description';
}

// Add responsibility modal
window.addResponsibilityModal = () => {
    const modalHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New Policy/Procedure</h3>
                <button class="btn-close" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="addResponsibilityForm">
                    <div class="form-group">
                        <label for="title">Title</label>
                        <input type="text" id="title" name="title" required placeholder="Enter policy title">
                    </div>

                    <div class="form-group">
                        <label for="category">Category</label>
                        <select id="category" name="category" required>
                            <option value="">Select Category</option>
                            <option value="user_management">User Management</option>
                            <option value="finance">Finance</option>
                            <option value="applications">Applications</option>
                            <option value="emails">Emails</option>
                            <option value="general">General</option>
                            <option value="security">Security</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="reporting">Reporting</option>
                            <option value="communication">Communication</option>
                            <option value="training">Training</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required placeholder="Brief description of the policy or procedure"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="steps">Steps (one per line)</label>
                        <textarea id="steps" name="steps" required placeholder="Enter each step on a new line"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="notes">Additional Notes (Optional)</label>
                        <textarea id="notes" name="notes" placeholder="Any additional information or important notes"></textarea>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button class="btn btn-primary" onclick="addResponsibility()">
                    Add Policy
                </button>
                <button class="btn btn-outline" onclick="closeModal()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHtml);
};

// Add responsibility
window.addResponsibility = async () => {
    try {
        const form = document.getElementById('addResponsibilityForm');
        const formData = new FormData(form);
        
        const title = formData.get('title');
        const category = formData.get('category');
        const description = formData.get('description');
        const stepsText = formData.get('steps');
        const notes = formData.get('notes');

        if (!title || !category || !description || !stepsText) {
            alert('Please fill in all required fields');
            return;
        }

        // Convert steps text to array
        const steps = stepsText.split('\n').filter(step => step.trim() !== '');

        if (steps.length === 0) {
            alert('Please enter at least one step');
            return;
        }

        const responsibilityData = {
            title,
            category,
            description,
            steps,
            notes: notes || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const responsibilitiesRef = collection(db, 'responsibilities');
        await setDoc(doc(responsibilitiesRef), responsibilityData);

        closeModal();
        await refreshResponsibilitiesData();
        alert('Policy added successfully');
    } catch (error) {
        console.error('Error adding responsibility:', error);
        alert('Error adding policy. Please try again.');
    }
};

// View responsibility
window.viewResponsibility = async (id) => {
    try {
        const responsibility = responsibilities.find(r => r.id === id);
        if (!responsibility) {
            alert('Policy not found');
            return;
        }

        const modalHtml = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3>${responsibility.title}</h3>
                    <button class="btn-close" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="responsibility-view">
                        <div class="responsibility-meta">
                            <span class="responsibility-category">${capitalize(responsibility.category)}</span>
                            <span class="responsibility-date">Created: ${formatDate(responsibility.createdAt)}</span>
                            ${responsibility.updatedAt && responsibility.updatedAt !== responsibility.createdAt ? 
                                `<span class="responsibility-date">Updated: ${formatDate(responsibility.updatedAt)}</span>` : ''}
                        </div>
                        
                        <div class="responsibility-description">
                            <h4>Description:</h4>
                            <p>${responsibility.description}</p>
                        </div>

                        <div class="responsibility-steps">
                            <h4>Steps:</h4>
                            <ol>
                                ${responsibility.steps.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                        </div>

                        ${responsibility.notes ? `
                            <div class="responsibility-notes">
                                <h4>Notes:</h4>
                                <p>${responsibility.notes}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="editResponsibility('${id}')">
                        <span class="material-icons">edit</span>
                        Edit
                    </button>
                    <button class="btn btn-outline" onclick="closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        showModal(modalHtml);
    } catch (error) {
        console.error('Error viewing responsibility:', error);
        alert('Error loading policy details');
    }
};

// Edit responsibility
window.editResponsibility = async (id) => {
    try {
        const responsibility = responsibilities.find(r => r.id === id);
        if (!responsibility) {
            alert('Policy not found');
            return;
        }

        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Policy/Procedure</h3>
                    <button class="btn-close" onclick="closeModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <form id="editResponsibilityForm">
                        <div class="form-group">
                            <label for="title">Title</label>
                            <input type="text" id="title" name="title" value="${responsibility.title}" required>
                        </div>

                        <div class="form-group">
                            <label for="category">Category</label>
                            <select id="category" name="category" required>
                                <option value="user_management" ${responsibility.category === 'user_management' ? 'selected' : ''}>User Management</option>
                                <option value="finance" ${responsibility.category === 'finance' ? 'selected' : ''}>Finance</option>
                                <option value="applications" ${responsibility.category === 'applications' ? 'selected' : ''}>Applications</option>
                                <option value="emails" ${responsibility.category === 'emails' ? 'selected' : ''}>Emails</option>
                                <option value="general" ${responsibility.category === 'general' ? 'selected' : ''}>General</option>
                                <option value="security" ${responsibility.category === 'security' ? 'selected' : ''}>Security</option>
                                <option value="maintenance" ${responsibility.category === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                <option value="reporting" ${responsibility.category === 'reporting' ? 'selected' : ''}>Reporting</option>
                                <option value="communication" ${responsibility.category === 'communication' ? 'selected' : ''}>Communication</option>
                                <option value="training" ${responsibility.category === 'training' ? 'selected' : ''}>Training</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description" required>${responsibility.description}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="steps">Steps (one per line)</label>
                            <textarea id="steps" name="steps" required>${responsibility.steps.join('\n')}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="notes">Additional Notes (Optional)</label>
                            <textarea id="notes" name="notes">${responsibility.notes || ''}</textarea>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="saveResponsibility('${id}')">
                        Save Changes
                    </button>
                    <button class="btn btn-outline" onclick="closeModal()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        showModal(modalHtml);
    } catch (error) {
        console.error('Error editing responsibility:', error);
        alert('Error loading policy for editing');
    }
};

// Save responsibility changes
window.saveResponsibility = async (id) => {
    try {
        const form = document.getElementById('editResponsibilityForm');
        const formData = new FormData(form);
        
        const title = formData.get('title');
        const category = formData.get('category');
        const description = formData.get('description');
        const stepsText = formData.get('steps');
        const notes = formData.get('notes');

        if (!title || !category || !description || !stepsText) {
            alert('Please fill in all required fields');
            return;
        }

        // Convert steps text to array
        const steps = stepsText.split('\n').filter(step => step.trim() !== '');

        if (steps.length === 0) {
            alert('Please enter at least one step');
            return;
        }

        const responsibilityRef = doc(db, 'responsibilities', id);
        await setDoc(responsibilityRef, {
            title,
            category,
            description,
            steps,
            notes: notes || '',
            updatedAt: serverTimestamp()
        }, { merge: true });

        closeModal();
        await refreshResponsibilitiesData();
        alert('Policy updated successfully');
    } catch (error) {
        console.error('Error saving responsibility:', error);
        alert('Error updating policy. Please try again.');
    }
};

// Delete responsibility
window.deleteResponsibility = async (id) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
        return;
    }

    try {
        const responsibilityRef = doc(db, 'responsibilities', id);
        await deleteDoc(responsibilityRef);

        await refreshResponsibilitiesData();
        alert('Policy deleted successfully');
    } catch (error) {
        console.error('Error deleting responsibility:', error);
        alert('Error deleting policy. Please try again.');
    }
};

// Helper functions
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
        // Firestore timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        // Already a Date object
        date = timestamp;
    } else {
        // String or number timestamp
        date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'N/A';
    }
    
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
    modal.id = 'responsibilityModal';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

// Close modal function
window.closeModal = function() {
    const modal = document.getElementById('responsibilityModal');
    if (modal) {
        modal.remove();
    }
};

// Refresh responsibilities data
async function refreshResponsibilitiesData() {
    await loadResponsibilities();
    renderResponsibilities();
}

// Initialize when DOM is ready
async function initializeResponsibilitiesManager() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the responsibilities page
        if (document.getElementById('responsibilitiesPage')) {
            await initResponsibilitiesManager();
            // Make functions globally available
            window.responsibilitiesManager = {
                refreshData: refreshResponsibilitiesData,
                addResponsibilityModal: window.addResponsibilityModal,
                viewResponsibility: window.viewResponsibility,
                editResponsibility: window.editResponsibility,
                deleteResponsibility: window.deleteResponsibility
            };
        }
    } catch (error) {
        console.error('Error initializing responsibilities manager:', error);
    }
}

// Start initialization
initializeResponsibilitiesManager();

// Export functions for use in navigation.js
export { initResponsibilitiesManager, refreshResponsibilitiesData }; 