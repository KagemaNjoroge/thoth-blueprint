import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { registerSW } from 'virtual:pwa-register';

// Register service worker with error handling
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update available notification
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegisterError(error) {
    console.error('SW registration error', error);
  },
});

// Make updateSW available globally for the PWA hook
window.updateSW = updateSW;

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);