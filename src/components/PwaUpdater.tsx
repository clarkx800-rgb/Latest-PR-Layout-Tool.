import { RefreshCcw, DownloadCloud } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [isChecking, setIsChecking] = useState(false);

  const checkUpdate = async () => {
    setIsChecking(true);
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.update();
      }
    } catch (e) {
      console.error('Update check error', e);
    }
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  };

  if (needRefresh) {
    return (
      <button 
        onClick={() => updateServiceWorker(true)}
        className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold shadow-sm transition-colors uppercase whitespace-nowrap"
      >
        <DownloadCloud size={14} />
        Update App
      </button>
    );
  }

  return (
    <button 
      onClick={checkUpdate}
      disabled={isChecking}
      className={`text-[10px] text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50 flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-all uppercase whitespace-nowrap ${isChecking ? 'opacity-50' : ''}`}
    >
      <RefreshCcw size={12} className={isChecking ? "animate-spin" : ""} />
      {isChecking ? "Checking..." : "PWA v2.4"}
    </button>
  );
}
