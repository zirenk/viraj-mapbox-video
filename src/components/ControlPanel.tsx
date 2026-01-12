import React, { useEffect, useState } from 'react';
import { AbsoluteFill } from 'remotion';
import { Player } from '@remotion/player';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase_client';
import { MapRouteAnimation } from './MapRouteAnimation';

export const ControlPanel: React.FC = () => {
    // Animation Props State
    const [duration, setDuration] = useState(10); // Default to 10s for quicker preview
    const [fps, setFps] = useState(30);
    const [showWaypoints, setShowWaypoints] = useState(true);
    const [mapStyle, setMapStyle] = useState('outdoors-v11');
    const [cameraMode, setCameraMode] = useState<'locked' | 'free' | 'cinematic' | 'overhead'>('cinematic');
    const [revealPath, setRevealPath] = useState(true);

    // Route Selection State
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string>('');
    const [selectedRouteData, setSelectedRouteData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fetch Routes on Mount
    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                // Fetch public published routes
                const q = query(collection(db, 'published_routes'), where('isPublic', '==', true), limit(20));
                const snapshot = await getDocs(q);

                const fetchedRoutes: any[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    fetchedRoutes.push({
                        id: doc.id,
                        // Prioritize 'name' as requested by user, fallback to label/routeName
                        name: data.name || data.label || data.routeName || 'Untitled Route',
                        // Store full data to avoid re-fetching for now
                        fullData: data
                    });
                });

                console.log(`Loaded ${fetchedRoutes.length} public routes from Firebase`);
                setRoutes(fetchedRoutes);

                if (fetchedRoutes.length > 0) {
                    setSelectedRouteId(fetchedRoutes[0].id);
                    setSelectedRouteData(fetchedRoutes[0].fullData);
                }
            } catch (err) {
                console.error("Error fetching routes:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoutes();
    }, []);

    // Handle Route Change
    const handleRouteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const routeId = e.target.value;
        setSelectedRouteId(routeId);

        const route = routes.find(r => r.id === routeId);
        if (route) {
            console.log(`Selected route: ${routeId} (${route.name})`);
            setSelectedRouteData(route.fullData);
        }
    };

    // Construct Command
    // Construct Command
    // FIX: Using Windows/PowerShell compatible escaping (\") for inner JSON quotes.
    const command = `npx remotion render MapRouteVideo out-${selectedRouteId}.mp4 --props="{\\"routeId\\":\\"${selectedRouteId}\\", \\"durationInFrames\\":${duration * fps}, \\"fps\\":${fps}, \\"showWaypoints\\":${showWaypoints}, \\"mapStyle\\":\\"${mapStyle}\\", \\"cameraMode\\":\\"${cameraMode}\\", \\"revealPath\\":${revealPath}}"`;

    // NOTE: Passing complex route objects via CLI json is hard. 
    // The command above will use the DEFAULT fallback route unless we write a temp file.
    // For this UI task, we focus on the PREVIEW updating correctly.

    const inputProps = {
        routeData: selectedRouteData, // Pass the selected object directly
        routeId: selectedRouteId,
        showWaypoints,
        mapStyle,
        cameraMode,
        revealPath,
        animationDuration: duration * fps
    };

    // Handle "Prepare for Render" - Open MapRouteVideo composition with props
    const handlePrepareRender = () => {
        const propsJson = JSON.stringify({
            routeId: selectedRouteId,
            durationInFrames: duration * fps,
            fps,
            showWaypoints,
            mapStyle,
            cameraMode,
            revealPath
        });
        const url = `/compositions/MapRouteVideo?props=${encodeURIComponent(propsJson)}`;
        window.open(url, '_blank');
    };

    return (
        <AbsoluteFill style={{ backgroundColor: '#f9f9f9', fontFamily: 'sans-serif', flexDirection: 'row' }}>

            {/* LEFT PANEL: Controls */}
            <div style={{ width: '350px', padding: 20, borderRight: '1px solid #ddd', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h2>Controls</h2>

                {/* Route Selector */}
                <div>
                    <h3>Source Route</h3>
                    {loading ? (
                        <p>Loading routes...</p>
                    ) : (
                        <select
                            value={selectedRouteId}
                            onChange={handleRouteChange}
                            style={{ width: '100%', padding: 8, fontSize: 14 }}
                        >
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <hr style={{ width: '100%', borderColor: '#eee' }} />

                {/* Visual Settings */}
                <div>
                    <h3>Visuals</h3>
                    <label style={{ display: 'block', marginBottom: 5 }}>
                        <input type="checkbox" checked={showWaypoints} onChange={(e) => setShowWaypoints(e.target.checked)} /> Show Waypoints
                    </label>
                    <label style={{ display: 'block' }}>
                        <input type="checkbox" checked={revealPath} onChange={(e) => setRevealPath(e.target.checked)} /> Reveal Path
                    </label>
                </div>

                {/* Map Style */}
                <div>
                    <h3>Map Style</h3>
                    <select value={mapStyle} onChange={(e) => setMapStyle(e.target.value)} style={{ width: '100%', padding: 8 }}>
                        <option value="streets-v11">Streets</option>
                        <option value="satellite-v9">Satellite</option>
                        <option value="outdoors-v11">Outdoors</option>
                        <option value="dark-v11">Dark</option>
                        <option value="light-v10">Light</option>
                    </select>
                </div>

                {/* Camera Mode */}
                <div>
                    <h3>Camera Mode</h3>
                    <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value as any)} style={{ width: '100%', padding: 8 }}>
                        <option value="cinematic">Cinematic</option>
                        <option value="locked">Locked</option>
                        <option value="overhead">Overhead</option>
                    </select>
                </div>

                {/* Duration */}
                <div>
                    <h3>Duration</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[10, 20, 30].map(d => (
                            <label key={d}><input type="radio" checked={duration === d} onChange={() => setDuration(d)} /> {d}s</label>
                        ))}
                    </div>
                </div>

                {/* FPS */}
                <div>
                    <h3>FPS</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[24, 30, 60].map(f => (
                            <label key={f}><input type="radio" checked={fps === f} onChange={() => setFps(f)} /> {f} fps</label>
                        ))}
                    </div>
                </div>

                <hr style={{ width: '100%', borderColor: '#eee' }} />

                {/* CHECKPOINT: Route Summary */}
                {selectedRouteData && (
                    <div style={{ padding: 10, background: '#e6fffa', border: '1px solid #38b2ac', borderRadius: 4 }}>
                        <h4 style={{ margin: '0 0 5px', color: '#2c7a7b' }}>✓ Selection Summary</h4>
                        <div style={{ fontSize: 12, color: '#285e61' }}>
                            <p style={{ margin: 2 }}><strong>Name:</strong> {selectedRouteData.name || selectedRouteData.label || 'Untitled'}</p>
                            <p style={{ margin: 2 }}><strong>ID:</strong> {selectedRouteId.substring(0, 8)}...</p>
                            <p style={{ margin: 2 }}><strong>Waypoints:</strong> {selectedRouteData.waypoints ? selectedRouteData.waypoints.length : 0}</p>
                            <p style={{ margin: 2 }}><strong>Est. Duration:</strong> {duration}s</p>
                        </div>
                    </div>
                )}

                {/* Prepare for Render Button */}
                <div>
                    <button
                        onClick={handlePrepareRender}
                        style={{
                            width: '100%',
                            padding: 12,
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 'bold'
                        }}
                    >
                        Fetch Route & Prepare Render
                    </button>
                    <p style={{ marginTop: 5, fontSize: 11, color: '#666' }}>
                        Opens the Render View in a new tab with the selected route loaded.
                    </p>
                </div>

                {/* Command Output */}
                <div style={{ padding: 10, background: '#eee', borderRadius: 4, fontSize: 12 }}>
                    <strong>CLI Export Command (RECOMMENDED):</strong>
                    <code style={{ display: 'block', marginTop: 5, wordBreak: 'break-all', color: '#555' }}>
                        node render-video.js {selectedRouteId}
                    </code>
                    <p style={{ margin: '5px 0 0 0', color: 'green', fontSize: 10, fontWeight: 'bold' }}>
                        ✓ Use this simplified command. It runs a custom script that handles all settings automatically and avoids Windows glitches.
                    </p>
                </div>

            </div>

            {/* RIGHT PANEL: Player Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e0e0', padding: 20 }}>
                {selectedRouteData ? (
                    <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <Player
                            component={MapRouteAnimation}
                            inputProps={inputProps}
                            durationInFrames={duration * fps}
                            fps={fps}
                            compositionWidth={854}
                            compositionHeight={480}
                            style={{ width: 854, height: 480 }}
                            controls
                            autoPlay
                            loop
                        />
                    </div>
                ) : (
                    <p>Select a route to view preview</p>
                )}
                <p style={{ marginTop: 10, color: '#666' }}>Live Preview ({duration * fps} frames @ {fps} FPS)</p>
            </div>
        </AbsoluteFill>
    );
};
