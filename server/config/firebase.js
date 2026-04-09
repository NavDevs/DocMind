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

        console.log(`🔥 Firebase Admin initialized for project: ${serviceAccount.project_id}`);
    } catch (err) {
        console.error('❌ Firebase Admin init failed:', err.message);
    }
}

/**
 * Sync user profile to Firestore users collection
 */
async function syncUserToFirestore(user) {
    if (!adminFirestore || !user) {
        console.warn('⚠️ Firestore Sync Skipped: adminFirestore or user missing');
        return;
    }
    try {
        console.log(`📡 Syncing user ${user.email} to Firestore...`);
        await adminFirestore.collection('users').doc(user._id.toString()).set({
            name: user.name,
            email: user.email,
            plan: user.plan || 'free',
            lastActive: admin.firestore.FieldValue.serverTimestamp(),
            mongoId: user._id.toString()
        }, { merge: true });
        console.log(`✅ User ${user.email} synced successfully`);
    } catch (err) {
        console.error('❌ Firestore User Sync Error:', err.message);
    }
}

/**
 * Log a user event to Firestore userActivity collection
 * Non-blocking - failures are logged but don't interrupt flow
 */
async function logActivityToFirestore(userId, type, detail = {}) {
    if (!adminFirestore || !userId) {
        return;
    }
    try {
        await adminFirestore.collection('userActivity').add({
            userId: userId.toString(),
            type,
            ...detail,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        // Log warning but don't fail the operation
        console.warn('⚠️ Firestore activity log failed:', err.message);
    }
}

const getAdminAuth = () => adminAuth;
const getAdminDB = () => adminDB;
const getAdminFirestore = () => adminFirestore;

module.exports = {
    initializeFirebaseAdmin,
    getAdminAuth,
    getAdminDB,
    getAdminFirestore,
    syncUserToFirestore,
    logActivityToFirestore
};
