require('dotenv').config();

async function fetchRoute() {
    const token = process.env.MAPBOX_SECRET_TOKEN;
    if (!token) {
        throw new Error('MAPBOX_SECRET_TOKEN is missing from .env');
    }

    // Tekirdağ -> Uçmakdere
    const start = [27.51528, 40.97778];
    const end = [27.363385, 40.799734];
    const coords = `${start.join(',')};${end.join(',')}`;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${token}`;

    console.log(`Fetching route for: ${coords}`);
    const response = await fetch(url);

    if (!response.ok) {
        const errortext = await response.text();
        throw new Error(`Failed to fetch route: ${response.status} ${response.statusText} - ${errortext}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes returned by Mapbox API');
    }

    const route = data.routes[0];
    const distanceKm = (route.distance / 1000).toFixed(2);
    const geometry = route.geometry;

    console.log('Route fetched successfully!');
    console.log(`Distance: ${distanceKm} km`);
    console.log(`First Coordinate: ${JSON.stringify(geometry.coordinates[0])}`);
    console.log(`Last Coordinate: ${JSON.stringify(geometry.coordinates[geometry.coordinates.length - 1])}`);

    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'public', 'route.json');

    // Ensure public dir exists
    if (!fs.existsSync(path.join(__dirname, 'public'))) {
        fs.mkdirSync(path.join(__dirname, 'public'));
    }

    fs.writeFileSync(outputPath, JSON.stringify(route, null, 2));
    console.log(`Route saved to ${outputPath}`);

    return route;
}

if (require.main === module) {
    fetchRoute().catch(err => {
        console.error('Error fetching route:', err);
        process.exit(1);
    });
}

module.exports = { fetchRoute };
