const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const webpack = require('webpack');
require('dotenv').config();

const routeId = process.argv[2];
const outputName = `out-hud-debug.mp4`;

console.log(`[Script] Env Check - MAPBOX_PUBLIC_TOKEN length: ${process.env.MAPBOX_PUBLIC_TOKEN ? process.env.MAPBOX_PUBLIC_TOKEN.length : 'MISSING'}`);

if (!routeId) {
    console.error("Error: Please provide a Route ID.");
    process.exit(1);
}

const start = async () => {
    console.log(`[Script] Starting 1-Frame HUD DIAGNOSTIC for Route ID: ${routeId}`);

    const bundleLocation = await bundle({
        entryPoint: path.resolve('./src/index.ts'),
        webpackOverride: (config) => {
            config.plugins.push(new webpack.DefinePlugin({
                'process.env.MAPBOX_PUBLIC_TOKEN': JSON.stringify(process.env.MAPBOX_PUBLIC_TOKEN),
            }));
            return config;
        }
    });

    const inputProps = {
        routeId: routeId,
        routeData: null,
        showWaypoints: true,
        mapStyle: 'streets-v11',
        cameraMode: 'cinematic',
        revealPath: true,
        animationDuration: 5
    };

    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'MapRouteVideo',
        inputProps,
    });

    console.log(`[Script] Rendering to ${outputName}...`);
    await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputName,
        inputProps,
        frameRange: [0, 0], // 1 frame
        concurrency: 1,
        verbose: true, // VERBOSE
        chromiumOptions: {
            gl: 'swiftshader',
        },
    });

    console.log(`[Script] Success! Video saved to ${outputName}`);
};

start().catch((err) => {
    console.error(err);
    process.exit(1);
});
