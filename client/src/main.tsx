import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite HMR WebSocket errors in development (non-critical)
if (import.meta.env.DEV) {
  // Catch unhandledrejection events
  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "");
    if (
      message.includes("Failed to construct 'WebSocket'") &&
      (message.includes("wss://localhost:undefined") || message.includes("localhost:undefined"))
    ) {
      event.preventDefault();
    }
  });

  // Also catch error events for WebSocket issues
  window.addEventListener("error", (event) => {
    const message = String(event.message || "");
    if (
      message.includes("WebSocket") &&
      (message.includes("localhost:undefined") || message.includes("invalid"))
    ) {
      event.preventDefault();
      return true;
    }
  }, true);
}

createRoot(document.getElementById("root")!).render(<App />);
