// Firebase configuration
export const firebaseConfig = {
    apiKey: "AIzaSyD98sGUBL6C6NRFrjRwrfmmXm3U50qw4HU",
    authDomain: "itcpr-portal.firebaseapp.com",
    databaseURL: "https://itcpr-portal-default-rtdb.firebaseio.com",
    projectId: "itcpr-portal",
    storageBucket: "itcpr-portal.appspot.com",
    messagingSenderId: "489473112442",
    appId: "1:489473112442:web:2e907da1fc00f4663e3ec3",
    measurementId: "G-2BF3PMCHS7"
};

// Initialize Firebase - import Firebase modules first
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let app;
let auth;
let database;
let db;

try {
    // Verify Firebase functions are available
    if (typeof initializeApp !== 'function') {
        throw new Error('Firebase initializeApp is not available. Please check if Firebase SDK is loaded.');
    }
    if (typeof getAuth !== 'function') {
        throw new Error('Firebase getAuth is not available. Please check if Firebase Auth SDK is loaded.');
    }
    
    app = initializeApp(firebaseConfig);
    
    // Ensure app is initialized before getting services
    if (!app) {
        throw new Error('Failed to initialize Firebase app');
    }
    
    // Verify app has required properties
    if (!app.options || !app.options.apiKey) {
        throw new Error('Firebase app is not properly initialized');
    }
    
    // Initialize services with error handling for each
    // Wait a tiny bit to ensure Firebase Auth module is fully loaded
    try {
        // Verify getAuth is actually a function and not null/undefined
        if (!getAuth || typeof getAuth !== 'function') {
            throw new Error('getAuth is not a valid function');
        }
        
        // Call getAuth with the app instance
        auth = getAuth(app);
        
        if (!auth) {
            throw new Error('getAuth returned null or undefined');
        }
        
        // Verify auth object has expected properties
        if (typeof auth !== 'object') {
            throw new Error('getAuth did not return a valid auth object');
        }
    } catch (authError) {
        console.error('Error initializing Firebase Auth:', authError);
        console.error('Auth error details:', {
            error: authError,
            app: app ? 'exists' : 'null',
            getAuth: typeof getAuth,
            appOptions: app?.options
        });
        throw new Error(`Failed to initialize Firebase Auth: ${authError.message}`);
    }
    
    database = getDatabase(app);
    db = getFirestore(app);
    
    // Verify services were initialized correctly
    if (!db) {
        throw new Error('Failed to initialize Firestore');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        firebaseConfig: firebaseConfig ? 'present' : 'missing',
        initializeApp: typeof initializeApp,
        getAuth: typeof getAuth
    });
    throw error;
}

// Export for use in other modules
export { app, auth, database, db };

// Supabase is loaded via script tag in index.html
// Use the global supabase instance or import from config.js
// Don't initialize Supabase here to avoid conflicts with Firebase 