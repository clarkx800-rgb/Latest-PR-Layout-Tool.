import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[200] bg-zinc-900 border border-emerald-500/30 shadow-2xl rounded-xl p-4 text-white"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1 text-emerald-400">
                {offlineReady ? 'App Ready Offline' : 'Update Available'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {offlineReady
                  ? 'App has been downloaded and can be used completely offline.'
                  : 'A new version of the app is available! Please refresh to apply changes.'}
              </p>
            </div>
            <button
              onClick={close}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
            >
              <RefreshCcw size={16} /> Update Now
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
