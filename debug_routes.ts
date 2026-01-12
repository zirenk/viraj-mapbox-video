import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-config.json';

// Polyfill for fetch (Node environment)
// global.fetch = require('node-fetch'); // Not needed in Node 18+

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listRoutes() {
    console.log("Attempting to fetch published_routes...");
    try {
        const querySnapshot = await getDocs(collection(db, "published_routes"));
        if (querySnapshot.empty) {
            console.log("No matching documents.");
            return;
        }

        console.log(`Found ${querySnapshot.size} routes:`);
        if (!querySnapshot.empty) {
            const sample = querySnapshot.docs[0].data();
            console.log("Sample Data Keys:", Object.keys(sample));
            console.log("Sample Data:", JSON.stringify(sample, null, 2));
        }
    } catch (error) {
        console.error("Error getting documents: ", error);
        // console.error(JSON.stringify(error, null, 2));
    }
}

listRoutes();
