import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);
                        setIsStaff(data.position === 'staff');
                    } else {
                        setUserData(null);
                        setIsStaff(false);
                    }
                } catch (error) {
                    console.error('Error getting user data:', error);
                    setUserData(null);
                    setIsStaff(false);
                }
            } else {
                setUser(null);
                setUserData(null);
                setIsStaff(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithSSO = async () => {
        try {
            const ssoUrl = 'https://sso.itcpr.org?popup=true&parent=' + encodeURIComponent(window.location.origin);
            const popup = window.open(ssoUrl, 'SSO Login', 'width=500,height=600,scrollbars=yes,resizable=yes');
            
            const result = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('SSO authentication timeout'));
                }, 60000);
                
                const handler = (event) => {
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
                };
                
                window.addEventListener('message', handler);
            });
            
            if (popup && !popup.closed) {
                popup.close();
            }
            
            if (result && result.token) {
                await signInWithCustomToken(auth, result.token);
                localStorage.setItem('ssoData', JSON.stringify(result));
            }
        } catch (error) {
            console.error('SSO authentication error:', error);
            throw error;
        }
    };

    const signOutUser = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('ssoData');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    // Check for SSO data in URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const ssoParam = urlParams.get('sso');
        
        if (ssoParam) {
            try {
                const ssoData = JSON.parse(decodeURIComponent(ssoParam));
                if (ssoData && ssoData.token) {
                    signInWithCustomToken(auth, ssoData.token);
                    const newUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, document.title, newUrl);
                }
            } catch (error) {
                console.error('Error parsing SSO data:', error);
            }
        }
    }, []);

    // Listen for postMessage from SSO popup
    useEffect(() => {
        const handler = (event) => {
            if (event.origin !== 'https://sso.itcpr.org') {
                return;
            }
            
            const data = event.data;
            
            if (data && data.token && data.tokenType === 'custom_token') {
                signInWithCustomToken(auth, data.token);
            }
        };
        
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    return {
        user,
        userData,
        loading,
        isStaff,
        signInWithSSO,
        signOutUser
    };
};


