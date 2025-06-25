import { auth, db } from './firebase-config.js';
import { signInWithCustomToken, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { checkAdminAccess } from './admin.js';

let ssoData = null;
let userData = null;

// Check for SSO data on page load
function checkForSSOData() {
    const urlParams = new URLSearchParams(window.location.search);
    const ssoParam = urlParams.get('sso');
    
    if (ssoParam) {
        try {
            ssoData = JSON.parse(decodeURIComponent(ssoParam));
            
            // Clear the URL parameter
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            
            // Handle SSO authentication
            handleSSOAuthentication();
        } catch (error) {
            console.error('Error parsing SSO data:', error);
        }
    }
}

// Handle SSO authentication
async function handleSSOAuthentication() {
    if (!ssoData || !ssoData.token) {
        console.error('Invalid SSO data');
        return;
    }

    try {
        await signInWithCustomToken(auth, ssoData.token);
        
        localStorage.setItem('ssoData', JSON.stringify(ssoData));
        
    } catch (error) {
        console.error('SSO authentication failed:', error);
    }
}

// Listen for postMessage from SSO popup
window.addEventListener('message', function(event) {
    // Verify the origin for security
    if (event.origin !== 'https://sso.itcpr.org') {
        return;
    }
    
    const data = event.data;
    
    if (data && data.token && data.tokenType === 'custom_token') {
        ssoData = data;
        handleSSOAuthentication();
    } else if (data && data.success === false) {
        console.error('SSO error received:', data.error);
    }
});

// SSO login function
window.signInWithSSO = async function() {
    try {
        // Open SSO login in popup
        const ssoUrl = 'https://sso.itcpr.org?popup=true&parent=' + encodeURIComponent(window.location.origin);
        const popup = window.open(ssoUrl, 'SSO Login', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
        // Wait for SSO authentication result
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('SSO authentication timeout'));
            }, 60000); // 60 second timeout
            
            window.addEventListener('message', function handler(event) {
                // Verify the origin for security
                if (event.origin !== 'https://sso.itcpr.org') {
                    return;
                }
                
                const data = event.data;
                
                if (data && data.token && data.tokenType === 'custom_token') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(data);
                } else if (data && data.success === false) {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    reject(new Error(data.error || 'SSO authentication failed'));
                }
            });
        });
        
        // Close popup if still open
        if (popup && !popup.closed) {
            popup.close();
        }
        
        // Handle successful SSO authentication
        ssoData = result;
        await handleSSOAuthentication();
        
    } catch (error) {
        console.error('SSO authentication error:', error);
        alert('Failed to login. Please try again.');
    }
}

// Sign out function
window.signOutUser = async function(reload = true) {
    try {
        await signOut(auth);
        
        // Clear SSO data
        localStorage.removeItem('ssoData');
        ssoData = null;
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Get user data from database
async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Check if user is staff
async function checkStaffAccess(userData) {
    try {
        // Check if user has position set to 'staff'
        if (userData && userData.position === 'staff') {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking staff access:', error);
        return false;
    }
}

// Show alert function
function showAlert(message) {
    alert(message);
}

// Authentication state observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Get user data from database
        userData = await getUserData(user.uid);
        
        if (userData) {
            // Check if user is staff
            const isStaff = await checkStaffAccess(userData);
            
            if (isStaff) {
                // User is staff, show authenticated content
                showAuthenticatedContent();
                updateUserInfo(userData);
                // Check admin access
                checkAdminAccess(userData);
            } else {
                // User is not staff, show access denied
                showAccessDenied();
                await signOut(auth);
            }
        } else {
            // User not found in database, sign out
            await signOut(auth);
        }
    } else {
        // User is signed out
        showLoginScreen();
    }
});

// Show login screen
function showLoginScreen() {
    const loginSection = document.getElementById('loginSection');
    const staffSection = document.getElementById('staffSection');
    
    if (loginSection && staffSection) {
        loginSection.classList.remove('hidden');
        staffSection.classList.add('hidden');
    }
    
    // Enable login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.disabled = false;
    }
}

// Show authenticated content
function showAuthenticatedContent() {
    const loginSection = document.getElementById('loginSection');
    const staffSection = document.getElementById('staffSection');
    
    if (loginSection && staffSection) {
        loginSection.classList.add('hidden');
        staffSection.classList.remove('hidden');
    }
}

// Show access denied screen
function showAccessDenied() {
    const loginSection = document.getElementById('loginSection');
    const staffSection = document.getElementById('staffSection');
    
    if (loginSection && staffSection) {
        loginSection.classList.remove('hidden');
        staffSection.classList.add('hidden');
        
        // Update login section to show access denied message
        const loginHeader = loginSection.querySelector('.login-header');
        if (loginHeader) {
            loginHeader.innerHTML = `
                <div class="nav-brand">
                    <span class="material-icons">percent</span>
                    <div>
                        <h1>ITCPR Staff Directory</h1>
                    </div>
                </div>
                <p class="login-subtitle">Access Denied</p>
                <p style="color: var(--error); margin-top: var(--spacing-md);">
                    You don't have permission to access the staff directory. 
                    Please contact an administrator if you believe this is an error.
                </p>
            `;
        }
        
        // Hide the login button
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.style.display = 'none';
        }
    }
}

// Update user info in header
function updateUserInfo(userData) {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement && userData.name) {
        userNameElement.textContent = userData.name;
    }
    
    if (userAvatarElement && userData.photoURL) {
        userAvatarElement.src = userData.photoURL;
    }
}

// Initialize SSO check on page load
document.addEventListener('DOMContentLoaded', function() {
    checkForSSOData();
});

// Export for use in other modules
export { auth, db, userData, ssoData };
