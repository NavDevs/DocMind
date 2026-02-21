const admin = require('firebase-admin');

let adminAuth = null;
let adminDB = null;
let adminFirestore = null;

/**
 * Initialize Firebase Admin SDK.
 * Called once at server startup.
 */
function initializeFirebaseAdmin() {
    if (!process.env.FIREBASE_DATABASE_URL || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.warn('⚠️  Firebase not configured — Google Sign-in and Realtime DB disabled.');
        console.warn('   Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL in server/.env');
        return;
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
        }

        adminAuth = admin.auth();
        adminDB = admin.database();
        adminFirestore = admin.firestore();

        console.log('🔥 Firebase Admin initialized (Auth, RTDB, Firestore)');
    } catch (err) {
        console.error('❌ Firebase Admin init failed:', err.message);
    }
}

const getAdminAuth = () => adminAuth;
const getAdminDB = () => adminDB;
const getAdminFirestore = () => adminFirestore;

module.exports = { initializeFirebaseAdmin, getAdminAuth, getAdminDB, getAdminFirestore };
