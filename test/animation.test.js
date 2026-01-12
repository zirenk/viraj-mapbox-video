const turf = require('@turf/turf');
const fs = require('fs');
const path = require('path');

describe('Animation Logic Tests', () => {
    let routeData;

    beforeAll(() => {
        const routePath = path.join(__dirname, '../public/route.json');
        if (fs.existsSync(routePath)) {
            routeData = JSON.parse(fs.readFileSync(routePath, 'utf8'));
        } else {
            // Mock data if file doesn't exist (e.g. CI environment without fetch run)
            routeData = {
                geometry: {
                    type: 'LineString',
                    coordinates: [[0, 0], [10, 10]]
                }
            };
        }
    });

    test('Route JSON structure is valid', () => {
        expect(routeData).toBeDefined();
        expect(routeData.geometry).toBeDefined();
        expect(routeData.geometry.type).toBe('LineString');
        expect(Array.isArray(routeData.geometry.coordinates)).toBe(true);
        expect(routeData.geometry.coordinates.length).toBeGreaterThan(1);
    });

    test('Turf interpolation works correctly', () => {
        const line = turf.lineString(routeData.geometry.coordinates);
        const length = turf.length(line);
        expect(length).toBeGreaterThan(0);

        // Test Start (0%)
        const start = turf.along(line, 0);
        expect(start.geometry.coordinates).toEqual(routeData.geometry.coordinates[0]);

        // Test End (100%)
        // Turf along at length might be slightly off due to float math, but should be close to last point
        const end = turf.along(line, length);
        const lastCoord = routeData.geometry.coordinates[routeData.geometry.coordinates.length - 1];

        expect(end.geometry.coordinates[0]).toBeCloseTo(lastCoord[0], 4);
        expect(end.geometry.coordinates[1]).toBeCloseTo(lastCoord[1], 4);

        // Test Middle (50%)
        const mid = turf.along(line, length / 2);
        expect(mid.geometry.coordinates).toBeDefined();
    });

    test('Coordinates are within valid bounds (Lat -90 to 90, Lng -180 to 180)', () => {
        const coords = routeData.geometry.coordinates;
        coords.forEach(coord => {
            const [lng, lat] = coord;
            expect(lng).toBeGreaterThanOrEqual(-180);
            expect(lng).toBeLessThanOrEqual(180);
            expect(lat).toBeGreaterThanOrEqual(-90);
            expect(lat).toBeLessThanOrEqual(90);
        });
    });
});
