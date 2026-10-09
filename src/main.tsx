import { AppearanceControl } from "./components/patterns/appearance-control";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { DeviceAuthorizationPage } from "./examples/device-authorization-page";
// Loaded after the examples so the shared visual language overrides their experiment styles.
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {window.location.pathname === "/authorize/device" ? (
      <DeviceAuthorizationPage />
    ) : (
      <App />
    )}
    <AppearanceControl />
  </StrictMode>,
);
