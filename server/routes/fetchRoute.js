const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load Firebase Config
const configPath = path.join(__dirname, '../../firebase-config.json');
if (!fs.existsSync(configPath)) {
    console.error('firebase-config.json not found. Run "npx firebase apps:sdkconfig ..." first.');
    process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchAndSnapRoute(docId) {
    console.log(`Fetching route document: ${docId}`);

    // 1. Fetch from Firestore (Client SDK)
    const docRef = doc(db, 'routes', docId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
        throw new Error(`Route document ${docId} not found in Firestore.`);
    }

    const data = snapshot.data();
    console.log(`Route Found: ${data.name || 'Unnamed Route'}`);

    // 2. Extract Coordinates (Start -> Waypoints -> End)
    // Structure Assumption:
    // startLocation: { location: { lat, lng }, address }
    // waypoints: [ { position: { lat, lng }, address/notes } ]

    const points = [];

    // Start
    if (data.startLocation && data.startLocation.location) {
        points.push({
            type: 'start',
            lat: data.startLocation.location.lat,
            lng: data.startLocation.location.lng,
            label: data.startLocation.address || 'Start'
        });
    }

    // Waypoints
    if (data.waypoints && Array.isArray(data.waypoints)) {
        data.waypoints.forEach((wp, index) => {
            if (wp.position) {
                points.push({
                    type: 'waypoint',
                    lat: wp.position.lat,
                    lng: wp.position.lng,
                    label: wp.notes || wp.address || `Stop ${index + 1}`
                });
            }
        });
    }

    if (points.length < 2) {
        throw new Error('Not enough points to form a route (need at least 2).');
    }

    console.log(`Extracted ${points.length} points for routing.`);

    // 3. Call Mapbox Directions API
    const coordinatesString = points.map(p => `${p.lng},${p.lat}`).join(';');
    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN;

    if (!token) throw new Error('Mapbox Token not found in environment.');

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?geometries=geojson&overview=full&access_token=${token}`;

    console.log('Requesting route from Mapbox...');
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Mapbox API Error: ${response.status} - ${txt}`);
    }

    const routeJson = await response.json();

    if (!routeJson.routes || routeJson.routes.length === 0) {
        throw new Error('Mapbox returned no routes.');
    }

    const snappedRoute = routeJson.routes[0];

    // 4. Save Enrichment Result
    const outputData = {
        metadata: {
            name: data.name,
            description: data.description,
            totalDistance: snappedRoute.distance,
            totalDuration: snappedRoute.duration,
            generatedAt: new Date().toISOString()
        },
        waypoints: points,
        geometry: snappedRoute.geometry
    };

    const outputPath = path.join(__dirname, '../../src/assets/route.json');
    // Ensure dir exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`✅ Success! Route JSON saved to: ${outputPath}`);
}

// CLI usage: node server/routes/fetchRoute.js <DOC_ID>
const args = process.argv.slice(2);
const docId = args[0] || 'su2DUZE5eZy13oqfOoMB';

fetchAndSnapRoute(docId).catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
