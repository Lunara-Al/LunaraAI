import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite HMR WebSocket errors in development (non-critical)
if (import.meta.env.DEV) {
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.message?.includes("Failed to construct 'WebSocket'") &&
      event.reason?.message?.includes("wss://localhost:undefined")
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
