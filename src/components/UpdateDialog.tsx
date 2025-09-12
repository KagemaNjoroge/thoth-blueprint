import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

interface UpdateDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type UpdateStatus = 'idle' | 'checking' | 'no-update' | 'update-found';

export function UpdateDialog({ isOpen, onOpenChange }: UpdateDialogProps) {
  const { updateAvailable, reloadApp } = usePWA();
  const [status, setStatus] = useState<UpdateStatus>('idle');

  useEffect(() => {
    if (updateAvailable) {
      setStatus('update-found');
    }
  }, [updateAvailable]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setStatus('idle'), 300);
    }
  }, [isOpen]);

  const handleCheckForUpdate = () => {
    setStatus('checking');
    const updateSW = (window as any).updateSW;

    if (!updateSW) {
      console.error("Service worker update function not found.");
      setStatus('no-update');
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleUpdateFound = () => {
      clearTimeout(timeoutId);
      setStatus('update-found');
    };

    window.addEventListener('sw-update-available', handleUpdateFound, { once: true });

    timeoutId = setTimeout(() => {
      setStatus('no-update');
      window.removeEventListener('sw-update-available', handleUpdateFound);
    }, 7000);

    updateSW(false);
  };

  const renderStatus = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking for updates...
          </div>
        );
      case 'no-update':
        return (
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            You are on the latest version.
          </div>
        );
      case 'update-found':
        return (
          <div className="flex items-center justify-center text-blue-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            A new version is available!
          </div>
        );
      case 'idle':
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check for Updates</DialogTitle>
          <DialogDescription>
            Manage application updates and version information.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {appVersion && appVersion !== '0.0.0' && (
            <div className="text-sm text-center">
              Current Version: <span className="font-semibold">{appVersion}</span>
            </div>
          )}
          <div className="h-6 flex items-center justify-center">
            {renderStatus()}
          </div>
        </div>
        <DialogFooter>
          {status === 'update-found' ? (
            <Button onClick={reloadApp} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update and Restart
            </Button>
          ) : (
            <Button onClick={handleCheckForUpdate} disabled={status === 'checking'} className="w-full">
              {status === 'checking' ? 'Checking...' : 'Check for Updates'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}