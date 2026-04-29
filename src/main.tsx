import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends React.Component<any, any> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "20px", color: "red" }}>
          <h1>App crashed</h1>
          <pre>{(this.state.error as Error).stack}</pre>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

window.addEventListener('error', (e) => console.error("Global Error: " + e.message));
window.addEventListener('unhandledrejection', (e) => console.error("Unhandled Rejection: " + e.reason));

// Force unregister any stuck service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(() => {
        // Only log, do not reload automatically because that might infinite loop if not careful!
        console.log('Unregistered service worker');
      });
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
