# Viraj Ride Share Video Project - Developer Documentation

## Overview
This project is a **Remotion-based video generation tool** designed to create high-quality, programmatic videos overlaying ride metrics and route data onto Mapbox maps. It is used to generate visual content for the "Viraj" ride-sharing platform, likely for social media or in-app ride summaries.

Key features include:
-   **Dynamic Map Overlays**: Uses Mapbox GL to render routes and map styles.
-   **Data Visualization**: Displays telemetry data like speed, distance, and time.
-   **Futuristic HUD**: Includes a custom "Futuristic Overlay" component for a sci-fi aesthetic.
-   **Programmatic Video**: Built with Remotion to allow code-driven video creation.

## Technology Stack
-   **Core Framework**: [Remotion](https://www.remotion.dev/) (Video creation in React)
-   **UI Library**: [React](https://react.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Maps**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
-   **Backend/Data**: [Firebase](https://firebase.google.com/) (Data persistence and storage)
-   **Utilities**: Node.js scripts for fetching routes and auditing data.

## Project Structure
-   **`src/`**: Main application source code.
    -   `src/Root.tsx`: Entry point for Remotion compositions.
    -   `src/components/`: Reusable React components (e.g., `FuturisticOverlay`, `MapRouteAnimation`).
    -   `src/lib/`: Helper functions and utilities.
-   **`server/`**: Server-side logic, likely for handling routes or data fetching (contains `routes/`).
-   **`public/`**: Static assets.
-   **Root Scripts**:
    -   `audit-mapbox.js`, `check-routes.js`: Maintenance scripts for validating map data and routes.
    -   `remotion.config.ts`: Remotion configuration.

## Getting Started

### Prerequisites
-   Node.js (LTS recommended)
-   npm or yarn
-   Git

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/zirenk/viraj-mapbox-video.git
    cd viraj-mapbox-video
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration
Ensure you have a `.env` file in the root directory with necessary API keys (Mapbox, Firebase, etc.). Refer to `test_env.md` (if accurate) or ask the project lead for credentials.

### Running the Project

**Start Remotion Studio (Preview Mode):**
This opens the interactive editor where you can preview and adjust your video compositions.
```bash
npm run studio
```

**Render a Video:**
To generate the final MP4 output.
```bash
npm run render
```

**Other Scripts:**
-   `npm run lint`: Run ESLint and TypeScript checks.
-   `npm run upgrade`: Upgrade Remotion packages.

## Workflow
1.  **Develop**: Create or modify components in `src/components`.
2.  **Preview**: Use `npm run studio` to visualize changes in real-time.
3.  **Render**: Generate the final asset using `npm run render`.

## Troubleshooting
-   **Missing Dependencies**: Run `npm install` to ensure all packages are up to date.
-   **Mapbox Errors**: Verify your Mapbox access token in `.env`.
-   **Render Failures**: Check `render_*.log` files for detailed error messages.
