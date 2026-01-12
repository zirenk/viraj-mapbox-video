const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRoutes() {
    console.log("Checking 'published_routes' collection...");
    try {
        const snapshot = await getDocs(collection(db, 'published_routes'));
        console.log(`Found ${snapshot.size} documents.`);

        const validRoutes = [];
        const invalidRoutes = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const name = data.name || data.label || 'Untitled';

            if (data.geometry && data.geometry.coordinates && data.geometry.coordinates.length > 0) {
                validRoutes.push({ id, name, points: data.geometry.coordinates.length });
            } else {
                invalidRoutes.push({ id, name, reason: !data.geometry ? 'Missing geometry' : 'Empty coordinates' });
            }
        });

        console.log("\n--- VALID ROUTES (Ready to Render) ---");
        if (validRoutes.length === 0) console.log("NONE FOUND.");
        validRoutes.forEach(r => console.log(`✅ [${r.id}] ${r.name} (${r.points} points)`));

        console.log("\n--- INVALID ROUTES (Will Blank Screen) ---");
        if (invalidRoutes.length === 0) console.log("None.");
        invalidRoutes.forEach(r => console.log(`❌ [${r.id}] ${r.name} - ${r.reason}`));

    } catch (error) {
        console.error("Error fetching routes:", error);
    }
}

checkRoutes();
