import "./shared/i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./app/App";
import { initializeTheme } from "./shared/theme/theme";
import { initializeV2Palette } from "./shared/theme/v2Palettes";

initializeTheme();
initializeV2Palette();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
