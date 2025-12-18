import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const firebaseDatabaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;
const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const firebaseStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const firebaseMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID;
const firebaseMeasurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

if (!firebaseApiKey || !firebaseAuthDomain || !firebaseProjectId) {
    throw new Error('Missing Firebase environment variables. Please check your .env file.');
}

export const firebaseConfig = {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    databaseURL: firebaseDatabaseURL,
    projectId: firebaseProjectId,
    storageBucket: firebaseStorageBucket,
    messagingSenderId: firebaseMessagingSenderId,
    appId: firebaseAppId,
    measurementId: firebaseMeasurementId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);

export default app;


