import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if all required config keys are present
const isConfigured = !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app = null;
let auth = null;
let googleProvider = null;

if (isConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    googleProvider = new GoogleAuthProvider();
    // Add required scopes (no forced account-picker — returning users login instantly)
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
} else {
    console.warn('⚠️ Firebase not configured — Google Sign-in disabled. Set VITE_FIREBASE_* in client/.env');
}

export { auth, googleProvider, signInWithPopup, signOut, isConfigured };
