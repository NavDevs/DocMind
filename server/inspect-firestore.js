require('dotenv').config();
const admin = require('firebase-admin');

async function listCollections() {
    console.log('--- Firestore Inspection Start ---');
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        console.log(`📡 Inspecting project: ${serviceAccount.project_id}`);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        const collections = await db.listCollections();

        if (collections.length === 0) {
            console.log('❌ No collections found in this database instance.');
        } else {
            console.log('✅ Found collections:', collections.map(c => c.id).join(', '));

            for (const col of collections) {
                const snapshot = await col.limit(1).get();
                console.log(`   - ${col.id}: ${snapshot.size} documents`);
            }
        }

        console.log('--- Inspection Finished ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Inspection Failed:', err);
        process.exit(1);
    }
}

listCollections();
