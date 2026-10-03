import { AppearanceControl } from "./components/patterns/appearance-control";
import "./dark-theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DeviceAuthorizationPage } from "./examples/device-authorization-page";

import "./visual-language.css";

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
