import { supabaseClient } from './config.js';

// Global state
let finances = [];

// Initialize finance manager
async function initFinanceManager() {
    try {
        await loadFinances();
        updateFinanceStats();
        renderFinanceList();
    } catch (error) {
        console.error('Error initializing finance manager:', error);
    }
}

// Load finances from Supabase
async function loadFinances() {
    try {
        const { data: financesData, error } = await supabaseClient
            .from('finances')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching finances:', error);
            return;
        }

        finances = financesData || [];
    } catch (error) {
        console.error('Error loading finances:', error);
    }
}

// Update finance statistics
function updateFinanceStats() {
    const parseAmount = (amount) => {
        const num = Number(amount);
        return isNaN(num) ? 0 : num;
    };

    const sumByTypeAndCurrency = (type, currency) =>
        finances
            .filter(finance => finance?.type === type && finance?.currency === currency)
            .reduce((acc, finance) => acc + parseAmount(finance.amount), 0);

    const totalIncomeUSD = sumByTypeAndCurrency('income', 'USD');
    const totalIncomeBDT = sumByTypeAndCurrency('income', 'BDT');
    const totalExpenseUSD = sumByTypeAndCurrency('expense', 'USD');
    const totalExpenseBDT = sumByTypeAndCurrency('expense', 'BDT');

    const currentBalanceUSDValue = totalIncomeUSD - totalExpenseUSD;
    const currentBalanceBDTValue = totalIncomeBDT - totalExpenseBDT;

    const formatCurrency = (value, symbol) => {
        const formattedValue = Math.abs(value).toFixed(2);
        return value > 0 ? `+ ${symbol} ${formattedValue}`
            : value === 0 ? `${symbol} ${formattedValue}`
            : `- ${symbol} ${formattedValue}`;
    };

    const currentBalanceUSD = formatCurrency(currentBalanceUSDValue, '$');
    const currentBalanceBDT = formatCurrency(currentBalanceBDTValue, '৳');

    // Update DOM elements
    const totalIncomeUSDElement = document.getElementById('totalIncomeUSD');
    const totalIncomeBDTElement = document.getElementById('totalIncomeBDT');
    const totalExpenseUSDElement = document.getElementById('totalExpenseUSD');
    const totalExpenseBDTElement = document.getElementById('totalExpenseBDT');
    const currentBalanceUSDElement = document.getElementById('currentBalanceUSD');
    const currentBalanceBDTElement = document.getElementById('currentBalanceBDT');

    if (totalIncomeUSDElement) totalIncomeUSDElement.textContent = `$ ${totalIncomeUSD.toFixed(2)}`;
    if (totalIncomeBDTElement) totalIncomeBDTElement.textContent = `৳ ${totalIncomeBDT.toFixed(2)}`;
    if (totalExpenseUSDElement) totalExpenseUSDElement.textContent = `$ ${totalExpenseUSD.toFixed(2)}`;
    if (totalExpenseBDTElement) totalExpenseBDTElement.textContent = `৳ ${totalExpenseBDT.toFixed(2)}`;
    if (currentBalanceUSDElement) {
        currentBalanceUSDElement.textContent = currentBalanceUSD;
        currentBalanceUSDElement.className = `stat-value finance-${currentBalanceUSD.charAt(0) === '-' ? 'negative' : 'positive'}`;
    }
    if (currentBalanceBDTElement) {
        currentBalanceBDTElement.textContent = currentBalanceBDT;
        currentBalanceBDTElement.className = `stat-value finance-${currentBalanceBDT.charAt(0) === '-' ? 'negative' : 'positive'}`;
    }
}

// Render finance list
function renderFinanceList() {
    const financeListElement = document.getElementById('financeList');
    if (!financeListElement) return;

    const formatDateTime = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            timeZone: 'UTC'
        });
    };

    const financeListHTML = finances.length > 0
        ? finances.map(finance => `
            <div data-id="${finance.id}" class="finance-item ${finance.type}" onclick="viewFinanceDetails('${finance.id}')">
                <div style="flex: 1;">${finance.description.slice(0, 50)}${finance.description.length > 50 ? '...' : ''}</div>
                <div>${finance.currency === 'USD' ? '$' : '৳'} ${finance.amount}</div>
                <div>${formatDateTime(finance.created_at)}</div>
            </div>
        `).join('')
        : `
            <div class="empty-state">
                <span class="material-icons">inbox</span>
                <p>No finance records</p>
            </div>
        `;

    financeListElement.innerHTML = financeListHTML;
}

// Add finance modal
window.addFinanceModal = () => {
    const modalHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add Finance</h3>
                <button class="btn-close" onclick="closeFinanceModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <form id="addFinanceForm">
                    <div class="form-group-row">
                        <div class="form-group">
                            <label for="type">Type</label>
                            <select id="type" name="type" onchange="updateCategories()" required>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="date">Date & Time</label>
                            <input type="date" id="date" name="date" required>
                        </div>
                    </div>

                    <div class="form-group-row">
                        <div class="form-group">
                            <label for="currency">Currency</label>
                            <select id="currency" name="currency" required>
                                <option value="USD">USD</option>
                                <option value="BDT">BDT</option>
                            </select>
                        </div>
        
                        <div class="form-group">
                            <label for="amount">Amount</label>
                            <input type="number" id="amount" name="amount" required>
                        </div>
                    </div>

                    <div class="form-group" id="finance-categories">
                        <label for="category">Income Category</label>
                        <select id="category" name="category" required>
                            <option value="">Select Income Category</option>
                            <optgroup label="Funding Sources">
                                <option value="individual_donations">Individual Donations</option>
                                <option value="corporate_sponsorships">Corporate Sponsorships</option>
                                <option value="research_grants">Research Grants</option>
                                <option value="industry_partnerships">Industry Partnerships</option>
                                <option value="academic_institutions">Academic Institution Support</option>
                            </optgroup>
                        </select>
                    </div>
    
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea style="resize: none;" id="description" name="description" required></textarea>
                    </div>
    
                    <div class="form-group">
                        <label for="receipt">Receipt</label>
                        <input type="file" accept="image/*" id="receipt" name="receipt">
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button class="btn btn-primary" onclick="addFinance()">
                    Add Finance
                </button>
                <button class="btn btn-outline" onclick="closeFinanceModal()">
                    Cancel
                </button>
            </div>
        </div>
    `;

    showFinanceModal(modalHtml);
};

// Update categories based on type
window.updateCategories = () => {
    const categoriesDiv = document.getElementById('finance-categories');
    const type = document.getElementById('type').value;
    if (type === 'income') {
        categoriesDiv.innerHTML = `
            <label for="category">Income Category</label>
            <select id="category" name="category" required>
                <option value="">Select Income Category</option>
                <optgroup label="Funding Sources">
                    <option value="individual_donations">Individual Donations</option>
                    <option value="corporate_sponsorships">Corporate Sponsorships</option>
                    <option value="research_grants">Research Grants</option>
                    <option value="industry_partnerships">Industry Partnerships</option>
                    <option value="academic_institutions">Academic Institution Support</option>
                </optgroup>
            </select>`;
    } else {
        categoriesDiv.innerHTML = `
            <label for="category">Expense Category</label>
            <select id="category" name="category" required>
                <option value="">Select Expense Category</option>
                <optgroup label="Research Expenditures">
                    <option value="research_traveling">Research Traveling</option>
                    <option value="publication">Publication</option>
                </optgroup>
                <optgroup label="Operational Costs">
                    <option value="facility_maintenance">Facility Maintenance</option>
                    <option value="server_maintenance">Server Maintenance</option>
                </optgroup>
                <optgroup label="Educational Initiatives">
                    <option value="educational_programs">Educational Programs</option>
                    <option value="student_support">Student Support</option>
                </optgroup>
                <optgroup label="Outreach & Communication">
                    <option value="community_engagement">Community Engagement</option>
                    <option value="promotional_activity">Promotional Activity</option>
                </optgroup>
            </select>`;
    }
};

// Add finance function
window.addFinance = async () => {
    try {
        showLoading();
        const form = document.getElementById('addFinanceForm');
        const formData = new FormData(form);
        const type = formData.get('type');
        const date = formData.get('date');
        const currency = formData.get('currency');
        const amount = formData.get('amount');
        const description = formData.get('description');
        const category = formData.get('category');

        if (!type || !date || !currency || !amount || !description || !category) {
            alert('Please fill all the fields');
            hideLoading();
            return;
        }

        const receiptFile = document.getElementById('receipt').files[0] || null;
        const receipt = receiptFile ? await imageToDataURL(receiptFile) : null;

        // Generate a UUID v4
        const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const { error } = await supabaseClient
            .from('finances')
            .insert({
                id,
                type,
                currency,
                amount,
                description,
                receipt,
                category,
                created_at: date
            });

        if (error) {
            console.error('Error adding finance:', error);
            alert('Failed to add finance record');
            hideLoading();
            closeFinanceModal();
            return;
        }

        closeFinanceModal();
        await refreshFinanceData();
        hideLoading();
    } catch (error) {
        console.error('Error in addFinance:', error);
        alert('Failed to add finance record');
        hideLoading();
        closeFinanceModal();
    }
};

// View finance details
window.viewFinanceDetails = async function(id) {
    try {
        const { data: finance, error } = await supabaseClient
            .from('finances')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching finance:', error);
            alert('Failed to load finance details');
            return;
        }

        const formatDateTime = (timestamp) => {
            return new Date(timestamp).toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                timeZone: 'UTC'
            });
        };

        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Finance Details</h3>
                    <button class="btn-close" onclick="closeFinanceModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="finance-details">
                        <div class="finance-detail-item">
                            <span class="finance-currency">${finance.currency === 'USD' ? '$' : '৳'}</span>
                            <span class="finance-amount">${finance.amount}</span>
                            <span class="finance-type ${finance.type}">${finance.type.charAt(0).toUpperCase() + finance.type.slice(1)}</span>
                        </div>

                        <div class="finance-detail-item">
                            <span class="material-icons">description</span>
                            <span class="finance-description">${finance.description}</span>
                        </div>

                        <div class="finance-detail-item">
                            <span class="material-icons">event</span>
                            <span class="finance-date">${formatDateTime(finance.created_at)}</span>
                        </div>

                        ${finance.receipt ? `
                            <div class="finance-detail-item">
                                <img src="${finance.receipt}" alt="Receipt">
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline btn-sm" onclick="editFinanceModal('${id}')">
                        <span class="material-icons">edit</span>
                        Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteFinanceModal('${id}')">
                        <span class="material-icons">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        showFinanceModal(modalHtml);
    } catch (error) {
        console.error('Error in viewFinanceDetails:', error);
        alert('Failed to load finance details');
    }
};

// Edit finance modal
window.editFinanceModal = async function(id) {
    closeFinanceModal();
    try {
        const { data: finance, error } = await supabaseClient
            .from('finances')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching finance:', error);
            alert('Failed to load finance details for editing');
            return;
        }

        // Format date for HTML date input (yyyy-MM-dd)
        const formatDateForInput = (dateString) => {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        };

        // Generate category dropdown based on finance type
        const generateCategoryDropdown = (type, currentCategory) => {
            if (type === 'income') {
                return `
                    <label for="category">Income Category</label>
                    <select id="category" name="category" required>
                        <option value="">Select Income Category</option>
                        <optgroup label="Funding Sources">
                            <option value="individual_donations" ${currentCategory === 'individual_donations' ? 'selected' : ''}>Individual Donations</option>
                            <option value="corporate_sponsorships" ${currentCategory === 'corporate_sponsorships' ? 'selected' : ''}>Corporate Sponsorships</option>
                            <option value="research_grants" ${currentCategory === 'research_grants' ? 'selected' : ''}>Research Grants</option>
                            <option value="industry_partnerships" ${currentCategory === 'industry_partnerships' ? 'selected' : ''}>Industry Partnerships</option>
                            <option value="academic_institutions" ${currentCategory === 'academic_institutions' ? 'selected' : ''}>Academic Institution Support</option>
                        </optgroup>
                    </select>`;
            } else {
                return `
                    <label for="category">Expense Category</label>
                    <select id="category" name="category" required>
                        <option value="">Select Expense Category</option>
                        <optgroup label="Research Expenditures">
                            <option value="research_traveling" ${currentCategory === 'research_traveling' ? 'selected' : ''}>Research Traveling</option>
                            <option value="publication" ${currentCategory === 'publication' ? 'selected' : ''}>Publication</option>
                        </optgroup>
                        <optgroup label="Operational Costs">
                            <option value="facility_maintenance" ${currentCategory === 'facility_maintenance' ? 'selected' : ''}>Facility Maintenance</option>
                            <option value="server_maintenance" ${currentCategory === 'server_maintenance' ? 'selected' : ''}>Server Maintenance</option>
                        </optgroup>
                        <optgroup label="Educational Initiatives">
                            <option value="educational_programs" ${currentCategory === 'educational_programs' ? 'selected' : ''}>Educational Programs</option>
                            <option value="student_support" ${currentCategory === 'student_support' ? 'selected' : ''}>Student Support</option>
                        </optgroup>
                        <optgroup label="Outreach & Communication">
                            <option value="community_engagement" ${currentCategory === 'community_engagement' ? 'selected' : ''}>Community Engagement</option>
                            <option value="promotional_activity" ${currentCategory === 'promotional_activity' ? 'selected' : ''}>Promotional Activity</option>
                        </optgroup>
                    </select>`;
            }
        };

        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Finance</h3>
                    <button class="btn-close" onclick="closeFinanceModal()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <form id="editFinanceForm">
                        <div class="form-group-row">
                            <div class="form-group">
                                <label for="type">Type</label>
                                <select id="type" name="type" onchange="updateCategories()" required>
                                    <option value="income" ${finance.type === 'income' ? 'selected' : ''}>Income</option>
                                    <option value="expense" ${finance.type === 'expense' ? 'selected' : ''}>Expense</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="date">Date & Time</label>
                                <input type="date" id="date" name="date" value="${formatDateForInput(finance.created_at)}" required>
                            </div>
                        </div>

                        <div class="form-group-row">
                            <div class="form-group">
                                <label for="currency">Currency</label>
                                <select id="currency" name="currency" required>
                                    <option value="USD" ${finance.currency === 'USD' ? 'selected' : ''}>USD</option>
                                    <option value="BDT" ${finance.currency === 'BDT' ? 'selected' : ''}>BDT</option>
                                </select>
                            </div>
            
                            <div class="form-group">
                                <label for="amount">Amount</label>
                                <input type="number" id="amount" name="amount" value="${finance.amount}" required>
                            </div>
                        </div>

                        <div class="form-group" id="finance-categories">
                            ${generateCategoryDropdown(finance.type, finance.category)}
                        </div>
        
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea style="resize: none;" id="description" name="description" required>${finance.description}</textarea>
                        </div>
        
                        <div class="form-group">
                            <label for="receipt">Receipt</label>
                            <input type="file" accept="image/*" id="receipt" name="receipt">
                            ${finance.receipt ? `<p>Current receipt: <a href="${finance.receipt}" target="_blank">View</a></p>` : ''}
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="saveFinance('${id}')">
                        Save Changes
                    </button>
                    <button class="btn btn-outline" onclick="closeFinanceModal()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        showFinanceModal(modalHtml);
    } catch (error) {
        console.error('Error in editFinanceModal:', error);
        alert('Failed to load finance details for editing');
    }
};

// Save finance changes
window.saveFinance = async function(id) {
    try {
        showLoading();
        const form = document.getElementById('editFinanceForm');
        const formData = new FormData(form);
        const type = formData.get('type');
        const date = formData.get('date');
        const currency = formData.get('currency');
        const amount = formData.get('amount');
        const description = formData.get('description');
        const category = formData.get('category');

        if (!type || !date || !currency || !amount || !description || !category) {
            alert('Please fill all the fields');
            hideLoading();
            return;
        }

        const receiptFile = document.getElementById('receipt').files[0] || null;
        let receipt = null;

        if (receiptFile) {
            receipt = await imageToDataURL(receiptFile);
        } else {
            // Keep existing receipt if no new file is uploaded
            const { data: existingFinance } = await supabaseClient
                .from('finances')
                .select('receipt')
                .eq('id', id)
                .single();
            receipt = existingFinance?.receipt;
        }

        const { error } = await supabaseClient
            .from('finances')
            .update({
                type,
                currency,
                amount,
                description,
                receipt,
                category,
                created_at: date
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating finance:', error);
            alert('Failed to update finance record');
            hideLoading();
            return;
        }

        closeFinanceModal();
        await refreshFinanceData();
        hideLoading();
    } catch (error) {
        console.error('Error in saveFinance:', error);
        alert('Failed to update finance record');
        hideLoading();
    }
};

// Delete finance modal
window.deleteFinanceModal = function(id) {
    closeFinanceModal();
    const modalHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Delete Finance Record</h3>
                <button class="btn-close" onclick="closeFinanceModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <p>Are you sure you want to delete this finance record? This action cannot be undone.</p>
            </div>

            <div class="modal-footer">
                <button class="btn btn-danger" onclick="deleteFinance('${id}')">
                    Delete
                </button>
                <button class="btn btn-outline" onclick="closeFinanceModal()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    showFinanceModal(modalHtml);
};

// Delete finance function
window.deleteFinance = async function(id) {
    try {
        showLoading();
        const { error } = await supabaseClient
            .from('finances')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting finance:', error);
            alert('Failed to delete finance record');
            hideLoading();
            return;
        }

        closeFinanceModal();
        await refreshFinanceData();
        hideLoading();
    } catch (error) {
        console.error('Error in deleteFinance:', error);
        alert('Failed to delete finance record');
        hideLoading();
    }
};

// Helper function to convert image to data URL
async function imageToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show modal function
function showFinanceModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'financeModal';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
}

// Close modal function
function closeFinanceModal() {
    const modal = document.getElementById('financeModal');
    if (modal) {
        modal.remove();
    }
}

window.closeFinanceModal = closeFinanceModal;

// Show loading function
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hide loading function
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Refresh finance data
async function refreshFinanceData() {
    await loadFinances();
    updateFinanceStats();
    renderFinanceList();
}

// Initialize when DOM is ready
async function initializeFinanceManager() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        // Only initialize if we're on the finance page
        if (document.getElementById('financePage')) {
            await initFinanceManager();
            // Make functions globally available
            window.financeManager = {
                refreshData: refreshFinanceData,
                addFinanceModal: window.addFinanceModal,
                viewFinanceDetails: window.viewFinanceDetails,
                editFinanceModal: window.editFinanceModal,
                deleteFinanceModal: window.deleteFinanceModal
            };
        }
    } catch (error) {
        console.error('Error initializing finance manager:', error);
    }
}

// Start initialization
initializeFinanceManager();

// Export functions for use in navigation.js
export { initFinanceManager, refreshFinanceData }; 