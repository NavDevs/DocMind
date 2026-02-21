require('dotenv').config();
const admin = require('firebase-admin');

async function testFirestore() {
    console.log('--- Firestore Test Start ---');

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.error('❌ Missing FIREBASE_SERVICE_ACCOUNT_JSON in .env');
        return;
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log(`📡 Initializing Admin SDK for project: ${serviceAccount.project_id}...`);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        console.log('📡 Attempting to write to collection "test_collection"...');

        const docRef = db.collection('test_collection').doc('connection_test');
        await docRef.set({
            status: 'success',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: 'If you see this, Firestore connectivity is working!'
        });

        console.log('✅ Write successful!');

        const doc = await docRef.get();
        console.log('📖 Read back data:', doc.data());

        console.log('--- Firestore Test Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Firestore Test Failed:', err);
        process.exit(1);
    }
}

testFirestore();
