import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, continueRender, delayRender } from 'remotion';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PIN_IMAGE_DATA } from './PinImage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase_client';
import { FuturisticOverlay } from '../FuturisticOverlay';

// Initialize Mapbox Token
mapboxgl.accessToken = process.env.MAPBOX_PUBLIC_TOKEN || process.env.REMOTION_MAPBOX_PUBLIC_TOKEN || '';

interface MapRouteAnimationProps {
    routeDataUrl?: string;
    routeData?: any; // Direct data (e.g. from ControlPanel)
    routeId?: string; // Route ID for fetching (e.g. from CLI)
    showWaypoints?: boolean;
    mapStyle?: string;
    cameraMode?: 'locked' | 'free' | 'cinematic' | 'overhead';
    revealPath?: boolean;
    animationDuration?: number;
}

export const MapRouteAnimation: React.FC<MapRouteAnimationProps> = ({
    routeDataUrl = '/route.json',
    routeData = null,
    routeId,
    showWaypoints = true,
    mapStyle = 'streets-v11',
    cameraMode = 'cinematic',
    revealPath = false,
    animationDuration
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [route, setRoute] = useState<any>(null);
    const [error, setError] = useState<string | null>(null); // New Error State
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const effectiveDuration = animationDuration || durationInFrames;
    const [handle] = useState(() => delayRender("Loading Mapbox map"));

    // Helper to format time (e.g. 90 mins -> 1h 30m)
    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = Math.floor(mins % 60);
        return `${h > 0 ? h + 'h ' : ''}${Math.floor(m)}m`;
    };

    // Derived Telemetry (Recalculate on every frame/route change)
    const totalDistKm = route?.totalDistance || (route?.geometry ? turf.length(turf.lineString(route.geometry.coordinates)) : 0);
    const progress = Math.min(frame / (effectiveDuration - 1), 1);
    const currentDist = (totalDistKm * progress).toFixed(1);

    // Time Estimate (Assume 40km/h avg speed if totalDuration not available, or parse it)
    let totalTimeMins = (totalDistKm / 40) * 60;
    const remainingTimeMins = totalTimeMins * (1 - progress);
    const timeDisplay = formatDuration(remainingTimeMins);


    // Load Route Data
    useEffect(() => {
        // 1. If routeData is passed directly (UI Preview), use it.
        if (routeData) {
            setRoute(routeData);
            return;
        }

        // 2. If routeId is passed (CLI Render), fetch from Firebase.
        if (routeId) {
            console.log(`[MapRouteAnimation] Fetching route ${routeId} from Firebase...`);
            const fetchRouteById = async () => {
                try {
                    const docRef = doc(db, 'published_routes', routeId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log(`[MapRouteAnimation] Fetched Route Data Keys: ${Object.keys(data).join(', ')}`);
                        if (!data.geometry) console.error("[MapRouteAnimation] CRITICAL: Route data missing 'geometry' field!");
                        setRoute(data);
                    } else {
                        console.error("No such route document!");
                        continueRender(handle); // Prevent hang
                    }
                } catch (e) {
                    console.error("Error fetching route by ID:", e);
                    continueRender(handle); // Prevent hang
                }
            };
            fetchRouteById();
            return;
        }

        // 3. Fallback to static loading (Dev/Default)
        try {
            const data = require('../../assets/route.json');
            setRoute(data);
        } catch (err) {
            console.error("Failed to load default route:", err);
        }
    }, [routeData, routeId]);

    // Safety Timeout to prevent infinite spinner
    useEffect(() => {
        const timer = setTimeout(() => {
            console.warn("MapRouteAnimation timed out found. Force unblocking render.");
            continueRender(handle);
        }, 30000); // 30 seconds timeout (increased for safety)
        return () => clearTimeout(timer);
    }, [handle]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || !route) return;
        if (map.current) return; // Initialize only once

        const token = process.env.MAPBOX_PUBLIC_TOKEN || process.env.REMOTION_MAPBOX_PUBLIC_TOKEN;
        console.log(`[MapRouteAnimation] Initializing Mapbox with token: ${token ? (token.substring(0, 5) + '...') : 'MISSING'}`);

        if (map.current) return; // Initialize only once

        // CHECK DATA VALIDITY
        if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {

            // FALLBACK: Try to calculate route using Mapbox Directions API
            if (route.waypoints && route.waypoints.length > 0) {
                console.log("[MapRouteAnimation] Route geometry missing. Calculating via Mapbox Directions API...");

                const fetchDirections = async () => {
                    try {
                        let coords = [];

                        // Add start location
                        if (route.startLocation && route.startLocation.location) {
                            coords.push(`${route.startLocation.location.lng},${route.startLocation.location.lat}`);
                        } else if (route.waypoints[0]) {
                            // Fallback if startLocation missing
                            console.warn("No startLocation found, utilizing waypoints only.");
                        }

                        // Add waypoints
                        route.waypoints.forEach((wp: any) => {
                            if (wp.position) {
                                coords.push(`${wp.position.lng},${wp.position.lat}`);
                            } else if (wp.lng && wp.lat) {
                                coords.push(`${wp.lng},${wp.lat}`);
                            }
                        });

                        if (coords.length < 2) {
                            throw new Error("Not enough points to calculate a route (Need Start + End).");
                        }

                        const coordinatesString = coords.join(';');
                        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?geometries=geojson&access_token=${token}`;

                        const response = await fetch(directionsUrl);
                        const json = await response.json();

                        if (json.routes && json.routes.length > 0) {
                            console.log("[MapRouteAnimation] Directions calculated successfully.");
                            const newGeometry = json.routes[0].geometry;

                            // Update route with new geometry and continue
                            setRoute({ ...route, geometry: newGeometry });
                        } else {
                            throw new Error(json.message || "No route found.");
                        }

                    } catch (apiErr: any) {
                        console.error("[MapRouteAnimation] Auto-calc failed:", apiErr);
                        setError(`Auto-Route Failed: ${apiErr.message}`);
                        continueRender(handle);
                    }
                };

                fetchDirections();
                return; // Wait for fetch to update state
            }

            console.error("[MapRouteAnimation] Invalid route geometry:", route);
            setError("Invalid Route Data: Geometry missing & No waypoints to calculate.");
            continueRender(handle);
            return;
        }

        const startCoord = route.geometry.coordinates[0];

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: `mapbox://styles/mapbox/${mapStyle}`,
                center: startCoord,
                zoom: 13,
                pitch: 45,
                bearing: 0,
                interactive: false
            });

            map.current.on('style.load', () => {
                console.log("[MapRouteAnimation] Map Style Loaded");
            });

            // Handle Map Loading Errors (e.g., auth failed)
            map.current.on('error', (e) => {
                console.error("[MapRouteAnimation] Mapbox Error:", e);
                continueRender(handle);
            });

        } catch (err) {
            console.error("[MapRouteAnimation] Failed to create map:", err);
            continueRender(handle);
            return;
        }

        map.current.on('load', () => {
            console.log("[MapRouteAnimation] Map Load Event Fired");
            if (!map.current) return;

            // Add 3D Terrain
            map.current.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
            // add the DEM source as a terrain layer with exaggerated height
            map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

            // Add Route Line
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry
                }
            });

            // Road Filling (Reveal Path) Logic
            if (revealPath) {
                map.current.addLayer({
                    id: 'route-bg',
                    type: 'line',
                    source: 'route',
                    paint: {
                        'line-color': '#cccccc',
                        'line-width': 8,
                        'line-opacity': 0.5
                    }
                });
            }

            map.current.addSource('progress', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            map.current.addLayer({
                id: 'progress-line',
                type: 'line',
                source: 'progress',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3b9ddd',
                    'line-width': 8
                }
            });

            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    'visibility': revealPath ? 'none' : 'visible'
                },
                paint: {
                    'line-color': '#3b9ddd',
                    'line-width': 8
                }
            });

            // Load Images and Add Marker (Moving Pin)
            const addMarkerLayer = () => {
                if (!map.current || map.current.getSource('point')) return;

                map.current.addSource('point', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'Point',
                                coordinates: startCoord
                            }
                        }]
                    }
                });

                map.current.addLayer({
                    id: 'point',
                    type: 'symbol',
                    source: 'point',
                    layout: {
                        'icon-image': 'custom-marker',
                        'icon-size': 0.2,
                        'icon-allow-overlap': true
                    }
                });
            };

            // Ensure we wait for image load or handle errors gracefully
            if (!map.current.hasImage('custom-marker')) {
                map.current.loadImage(PIN_IMAGE_DATA, (error, image) => {
                    if (error) {
                        console.error('Error loading pin image:', error);
                        continueRender(handle);
                        return;
                    }
                    if (map.current && !map.current.hasImage('custom-marker') && image) {
                        map.current.addImage('custom-marker', image);
                    }
                    addMarkerLayer();
                    continueRender(handle);
                });
            } else {
                addMarkerLayer();
                continueRender(handle);
            }

            // Add Waypoints
            if (route.waypoints && route.waypoints.length > 0) {
                const waypointFeatures = route.waypoints.map((wp: any) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
                    properties: { title: wp.label }
                }));

                map.current.addSource('waypoints', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: waypointFeatures
                    }
                });

                map.current.addLayer({
                    id: 'waypoints-layer',
                    type: 'circle',
                    source: 'waypoints',
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#ffffff',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#3b9ddd'
                    },
                    layout: {
                        visibility: showWaypoints ? 'visible' : 'none'
                    }
                });

                map.current.addLayer({
                    id: 'waypoints-labels',
                    type: 'symbol',
                    source: 'waypoints',
                    layout: {
                        'text-field': ['get', 'title'],
                        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                        'text-offset': [0, 1.25],
                        'text-anchor': 'top',
                        'text-size': 12,
                        'visibility': showWaypoints ? 'visible' : 'none'
                    },
                    paint: {
                        'text-color': '#333333',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1
                    }
                });
            }
        });

        return () => map.current?.remove();
    }, [route]);

    // Animation Logic
    useEffect(() => {
        if (!map.current || !route) return;

        const line = turf.lineString(route.geometry.coordinates);
        const pathLength = turf.length(line);

        // Calculate progress based on frame
        const progress = Math.min(frame / (effectiveDuration - 1), 1);
        const distanceTraveled = pathLength * progress;

        const currentPoint = turf.along(line, distanceTraveled);
        const currentCoord = currentPoint.geometry.coordinates as [number, number];

        try {
            // Update Marker
            const pointSource = map.current.getSource('point') as mapboxgl.GeoJSONSource;
            if (pointSource) {
                pointSource.setData({
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: currentCoord
                        }
                    }]
                });
            }

            // Update Progress Line (Road Filling)
            if (revealPath) {
                const progressSource = map.current.getSource('progress') as mapboxgl.GeoJSONSource;
                if (progressSource) {
                    const sliced = turf.lineSlice(turf.point(route.geometry.coordinates[0]), currentPoint, line);
                    progressSource.setData(sliced);
                }
            }

            // Camera Logic
            let targetBearing = 0;
            let targetPitch = 60;
            let targetZoom = 14;

            if (cameraMode === 'overhead') {
                targetBearing = 0;
                targetPitch = 0;
                targetZoom = 13;
            } else {
                // Calculate bearing
                const lookAheadDist = Math.min(distanceTraveled + 0.1, pathLength); // 0.1km ahead
                const lookAheadPoint = turf.along(line, lookAheadDist);
                const rawBearing = turf.bearing(currentPoint, lookAheadPoint);

                if (cameraMode === 'locked') {
                    targetBearing = rawBearing;
                } else if (cameraMode === 'cinematic') {
                    // Smooth bearing logic
                    const smoothLookAhead = turf.along(line, Math.min(distanceTraveled + 0.3, pathLength));
                    targetBearing = turf.bearing(currentPoint, smoothLookAhead);
                }
            }

            map.current.jumpTo({
                center: currentCoord,
                bearing: targetBearing,
                pitch: targetPitch,
                zoom: targetZoom
            });
        } catch (e) {
            console.error("Animation Loop Error:", e);
        }

    }, [frame, route, effectiveDuration]);

    const token = process.env.MAPBOX_PUBLIC_TOKEN || process.env.REMOTION_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
        return <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: 'white' }}>
            <h1>Missing MAPBOX_PUBLIC_TOKEN</h1>
            <p>Please Ensure REMOTION_MAPBOX_PUBLIC_TOKEN is set or update Root.tsx logic.</p>
        </AbsoluteFill>;
    }

    if (error) {
        return (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', background: '#ffebee', color: '#c62828' }}>
                <h1>⚠️ Render Error</h1>
                <p>{error}</p>
                <p>Route ID: {routeId}</p>
            </AbsoluteFill>
        );
    }

    return (
        <AbsoluteFill>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* NEW: Futuristic HUD Overlay */}
            <FuturisticOverlay
                distance={currentDist}
                time={timeDisplay}
                progress={progress * 100}
            />
        </AbsoluteFill>
    );
};
