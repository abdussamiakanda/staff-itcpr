import { initApplicationsManager, refreshApplicationsData } from './applications.js';
import { initUsersManager, refreshUsersData } from './users.js';
import { initFinanceManager, refreshFinanceData } from './finance.js';
import { initEmailsManager, refreshEmailsData } from './emails.js';
import { initStaffDirectory, refreshStaffData } from './staff.js';
import { initResponsibilitiesManager, refreshResponsibilitiesData } from './responsibilities.js';
import { initTechnicalsManager, refreshTechnicalsData } from './technicals.js';

// Global state
let currentPage = 'staff';
let pageManagers = {};

// Initialize navigation
async function initNavigation() {
    try {
        setupEventListeners();
        await loadPage('staff');
    } catch (error) {
        console.error('Error initializing navigation:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = e.target.closest('a').getAttribute('data-page');
            if (page) {
                await loadPage(page);
            }
        });
    });
}

// Load page content
async function loadPage(pageName) {
    try {
        // Update current page
        currentPage = pageName;
        
        // Update active state in sidebar
        updateActiveState(pageName);
        
        // Hide all pages
        hideAllPages();
        
        // Show selected page
        const pageElement = document.getElementById(pageName + 'Page');
        if (pageElement) {
            pageElement.classList.add('active');
            
            // Initialize page manager if needed
            await initializePageManager(pageName);
        }
    } catch (error) {
        console.error(`Error loading page ${pageName}:`, error);
    }
}

// Update active state in sidebar
function updateActiveState(activePage) {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === activePage) {
            link.classList.add('active');
        }
    });
}

// Hide all pages
function hideAllPages() {
    const pages = ['staff', 'applications', 'technicals', 'users', 'finance', 'emails', 'responsibilities'];
    pages.forEach(page => {
        const pageElement = document.getElementById(page + 'Page');
        if (pageElement) {
            pageElement.classList.remove('active');
        }
    });
}

// Initialize page manager
async function initializePageManager(pageName) {
    try {
        // Check if manager is already initialized
        if (pageManagers[pageName]) {
            return;
        }

        // Initialize based on page
        switch (pageName) {
            case 'staff':
                await initStaffDirectory();
                pageManagers.staff = {
                    refreshData: refreshStaffData
                };
                break;
                
            case 'applications':
                await initApplicationsManager();
                pageManagers.applications = {
                    refreshData: refreshApplicationsData
                };
                break;
                
            case 'users':
                await initUsersManager();
                pageManagers.users = {
                    refreshData: refreshUsersData
                };
                break;
                
            case 'finance':
                await initFinanceManager();
                pageManagers.finance = {
                    refreshData: refreshFinanceData
                };
                break;
                
            case 'emails':
                await initEmailsManager();
                pageManagers.emails = {
                    refreshData: refreshEmailsData
                };
                break;
                
            case 'responsibilities':
                await initResponsibilitiesManager();
                pageManagers.responsibilities = {
                    refreshData: refreshResponsibilitiesData
                };
                break;
                
            case 'technicals':
                await initTechnicalsManager();
                pageManagers.technicals = {
                    refreshData: refreshTechnicalsData
                };
                break;
                
            default:
                console.log(`No specific manager needed for ${pageName}`);
        }
    } catch (error) {
        console.error(`Error initializing page manager for ${pageName}:`, error);
    }
}

// Refresh current page data
async function refreshCurrentPage() {
    try {
        const manager = pageManagers[currentPage];
        if (manager && manager.refreshData) {
            await manager.refreshData();
        }
    } catch (error) {
        console.error('Error refreshing current page:', error);
    }
}

// Get current page
function getCurrentPage() {
    return currentPage;
}

// Initialize when DOM is ready
async function initializeNavigation() {
    try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        await initNavigation();
        
        // Make functions globally available
        window.navigation = {
            loadPage: loadPage,
            refreshCurrentPage: refreshCurrentPage,
            getCurrentPage: getCurrentPage
        };
    } catch (error) {
        console.error('Error initializing navigation:', error);
    }
}

// Start initialization
initializeNavigation();

// Export functions for use in other modules
export { loadPage, refreshCurrentPage, getCurrentPage }; 