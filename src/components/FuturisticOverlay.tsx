import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { loadFont } from "@remotion/google-fonts/Rajdhani";

// Load the font
const { fontFamily } = loadFont();

// The "Iron Man" style glow colors
const HUD_COLORS = {
    primary: '#00f2ff', // Cyan Neon
    secondary: '#ff0055', // Red Alert
    glass: 'rgba(16, 20, 24, 0.75)', // Dark Glass
    border: 'rgba(0, 242, 255, 0.3)'
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        fontFamily: fontFamily, // Tech font
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        zIndex: 100, // Ensure it's on top
        pointerEvents: 'none' // Allow visuals but pass clicks if needed (though video is non-interactive)
    },
    // The Glass Card
    statsPanel: {
        position: 'absolute',
        bottom: '40px',
        left: '40px',
        width: '300px',
        background: HUD_COLORS.glass,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${HUD_COLORS.border}`,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: `0 0 20px ${HUD_COLORS.border}, inset 0 0 10px rgba(0,0,0,0.5)`,
        clipPath: 'polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%)', // Cut corner look
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '5px'
    },
    label: {
        fontSize: '12px',
        color: '#8899a6',
    },
    value: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: HUD_COLORS.primary,
        textShadow: `0 0 10px ${HUD_COLORS.primary}`, // The Glow Effect
    },
    // The Route Progress Bar
    progressBarContainer: {
        position: 'absolute',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        borderRadius: '2px'
    },
    progressBarFill: {
        height: '100%',
        background: `linear-gradient(90deg, ${HUD_COLORS.primary}, ${HUD_COLORS.secondary})`,
        boxShadow: `0 0 15px ${HUD_COLORS.primary}`,
        transition: 'width 0.1s linear'
    }
};

interface FuturisticOverlayProps {
    distance: string | number;
    time: string;
    progress: number; // 0 to 100
}

export const FuturisticOverlay: React.FC<FuturisticOverlayProps> = ({ distance, time, progress }) => {
    return (
        <AbsoluteFill style={styles.container}>
            {/* Top Progress Bar */}
            <div style={styles.progressBarContainer}>
                <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
            </div>

            {/* Bottom Left Stats HUD */}
            <div style={styles.statsPanel}>
                <div style={styles.row}>
                    <div>
                        <div style={styles.label}>DIST</div>
                        <div style={styles.value}>{distance} <span style={{ fontSize: '12px' }}>KM</span></div>
                    </div>
                    <div>
                        <div style={styles.label}>ETE</div>
                        <div style={styles.value}>{time}</div>
                    </div>
                </div>
                <div style={{ fontSize: '10px', color: HUD_COLORS.secondary }}>
                    ● RECORDING TELEMETRY
                </div>
            </div>

            {/* Decorative Grid Lines */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '100px 100px',
                pointerEvents: 'none'
            }} />
        </AbsoluteFill>
    );
};
