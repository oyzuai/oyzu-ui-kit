import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppearanceControl } from "../../components/patterns/appearance-control";
import { RemoteBuildsPrototype } from "./prototype";
// The kit stylesheet loads last so the shared visual language wins, as in src/main.tsx.
import "../../styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RemoteBuildsPrototype />
    <AppearanceControl />
  </StrictMode>,
);
