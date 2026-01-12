import "./index.css";
import { Composition } from "remotion";
import { MapRouteAnimation } from "./components/MapRouteAnimation";
import { ControlPanel } from "./components/ControlPanel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MapRouteVideo"
        component={MapRouteAnimation}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          showWaypoints: true,
          mapStyle: "outdoors-v11",
          cameraMode: "cinematic",
          revealPath: true
        }}
      />
      <Composition
        id="ControlPanel"
        component={ControlPanel}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
