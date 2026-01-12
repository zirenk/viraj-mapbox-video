const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-config.json');
const fs = require('fs');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const routeId = 'H5XYolDWQ8yOtXvo6jQL';

async function debugRoute() {
    console.log(`Fetching route ${routeId}...`);
    try {
        const docRef = doc(db, 'published_routes', routeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Route fetched. Saving to route_dump_clean.json...");
            fs.writeFileSync('route_dump_clean.json', JSON.stringify(data, null, 2));
            console.log("Done.");
        } else {
            console.log("Route not found!");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}
debugRoute();
