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

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const db = getFirestore(app);

// Export for use in other modules
export { app, auth, database, db }; 