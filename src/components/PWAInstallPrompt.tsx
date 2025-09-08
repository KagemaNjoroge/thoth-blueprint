import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { shouldShowInstallPrompt, getPromptState, savePromptState, type PromptState } from '@/utils/pwaUtils';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isInstalled || !isInstallable) {
      setShouldShow(false);
      return;
    }
    setShouldShow(shouldShowInstallPrompt());
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShouldShow(false);
    }
  };

  const handleDismiss = () => {
    const currentState = getPromptState();
    let state: PromptState;

    if (currentState) {
      state = {
        ...currentState,
        dismissCount: currentState.dismissCount + 1,
        lastDismissed: Date.now(),
        dismissed: true,
      };
    } else {
      state = {
        dismissed: true,
        dismissCount: 1,
        lastDismissed: Date.now(),
        permanentlyDismissed: false,
      };
    }

    if (state.dismissCount >= 3) {
      state.permanentlyDismissed = true;
    }

    savePromptState(state);
    setShouldShow(false);
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install ThothBlueprint</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Install the app for a better experience with offline access
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}