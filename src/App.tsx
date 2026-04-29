/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Phase, type AppState } from './types';
import { DEFAULT_ZOOM, DEFAULT_PAN_X, DEFAULT_PAN_Y } from './constants';
import { LayoutMath } from './utils/math';
import { generatePdf } from './utils/pdf';
import { CanvasLayout } from './components/CanvasLayout';
import { LayoutModal } from './components/LayoutModal';
import { NotesModal } from './components/NotesModal';
import { FileModal } from './components/FileModal';
import { BottomBar } from './components/BottomBar';
import { UpdatePrompt } from './components/UpdatePrompt';
import { PortraitWarning } from './components/PortraitWarning';
import { Plus, Minus, Target, Eye, EyeOff, Trash2, Focus, Undo2, X, MonitorSmartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'PowerRail_Layout_Data';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // ignore
  }
};

const createDefaultPhase = (): Phase => ({
  postCount: 5,
  postSpanMm: 7998,
  posts: [],
  red: { startMm: 1000, endMm: 1000, totalMm: 9998, visible: true },
  blue: { startMm: 1000, endMm: 1000, totalMm: 9998, visible: true },
  lugs: [],
  cis: { start: false, end: false },
  iso: { start: false, end: false },
  ramp: { start: false, end: false },
  exp: { start: false, end: false },
  minMm: 0,
  maxMm: 9998,
  comments: "",
  view: { scale: DEFAULT_ZOOM, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y },
  showPosts: true
});

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("localStorage not accessible", e);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.phases && parsed.phases.length > 0) {
          // Deep merge defaults to prevent crashes on legacy local storage saves
          const defaultState = {
            isRTL: false,
            workDirection: "Zero Direction",
            activeIndex: 0,
            phases: []
          };
          const safePhases = parsed.phases.map((p: any) => ({
            ...createDefaultPhase(),
            ...p,
            red: { ...createDefaultPhase().red, ...(p.red || {}) },
            blue: { ...createDefaultPhase().blue, ...(p.blue || {}) },
            lugs: p.lugs || [],
            view: { scale: DEFAULT_ZOOM, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y, ...(p.view || {}) },
            showPosts: p.showPosts !== undefined ? p.showPosts : true,
            cis: { start: false, end: false, ...(p.cis || {}) },
            iso: { start: false, end: false, ...(p.iso || {}) },
            ramp: { start: false, end: false, ...(p.ramp || {}) },
            exp: { start: false, end: false, ...(p.exp || {}) }
          }));

          return {
            ...defaultState,
            ...parsed,
            phases: safePhases
          };
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
    return {
      isRTL: false,
      workDirection: "Zero Direction",
      activeIndex: 0,
      phases: [createDefaultPhase()]
    };
  });

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('AIS_PREFS');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return { uiSize: 'normal', canvasSize: 'normal' };
  });

  const [windowDim, setWindowDim] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const type = (target as HTMLInputElement).type;
        if (type !== 'radio' && type !== 'checkbox' && type !== 'file' && type !== 'range') {
          setTimeout(() => {
            try {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
              // Ignore scrollIntoView errors
            }
          }, 300);
        }
      }
    };
    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, []);

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowDim({ w: window.innerWidth, h: window.innerHeight });
      }, 50);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    safeSetItem('AIS_PREFS', JSON.stringify(prefs));
  }, [prefs]);

  const [modals, setModals] = useState({
    layout: false,
    notes: false,
    file: false,
    reset: false,
    deletePhase: false
  });

  const [navDirection, setNavDirection] = useState(1);
  const [exportLoadingProgress, setExportLoadingProgress] = useState<number | null>(null);
  const [preloadedPdfData, setPreloadedPdfData] = useState<string | null>(null);
  const [exportLoadingCancelled, setExportLoadingCancelled] = useState(false);

  const handleOpenFileMenu = async () => {
    setExportLoadingCancelled(false);
    setExportLoadingProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress > 90) progress = 90;
      setExportLoadingProgress(p => p !== null ? progress : null);
    }, 100);

    // Give UI a moment to paint the 0% loading screen
    await new Promise(r => setTimeout(r, 100));

    // Then synchronously map the PDF (which will block the thread for a moment)
    setTimeout(async () => {
      try {
        const doc = generatePdf(state, prefs?.unit);
        const dataUri = doc.output('datauristring');
        
        clearInterval(interval);
        
        // We must check if user cancelled during the blocking process (though unlikely, let's just use state inside the final timeout)
        setExportLoadingProgress(prev => {
          if (prev === null) return null; // aborted
          return 100;
        });
        
        setPreloadedPdfData(dataUri);

        setTimeout(() => {
          setExportLoadingProgress(prev => {
            if (prev === null) return null; // aborted
            setModals(m => ({ ...m, file: true }));
            return null;
          });
        }, 400);

      } catch (err) {
        clearInterval(interval);
        setExportLoadingProgress(null);
        console.error(err);
        setModals(m => ({ ...m, file: true })); // open anyway on error
      }
    }, 500); 
  };

  const handleCancelExportLoading = () => {
    setExportLoadingProgress(null);
    setPreloadedPdfData(null);
  };

  const historyRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const safePushHistory = (prevState: AppState) => {
    const stateWithoutView = {
      ...prevState,
      phases: prevState.phases.map(p => ({ ...p, view: null }))
    };
    const snap = JSON.stringify(stateWithoutView);
    const last = historyRef.current[historyRef.current.length - 1];
    if (snap !== last) {
      historyRef.current.push(snap);
      if (historyRef.current.length > 50) historyRef.current.shift();
      setCanUndo(true);
    }
  };

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prevStr = historyRef.current.pop();
    if (prevStr) {
      const parsed = JSON.parse(prevStr) as AppState;
      setState(currentState => {
        const newState = { ...parsed };
        newState.phases = newState.phases.map((p, idx) => {
          if (currentState.phases[idx]) {
            return { ...p, view: { ...currentState.phases[idx].view } };
          }
          return { 
            ...p, 
            view: p.view || { scale: DEFAULT_ZOOM, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y } 
          };
        });
        safeSetItem(STORAGE_KEY, JSON.stringify(newState));
        setCanUndo(historyRef.current.length > 0);
        return newState;
      });
    }
  }, []);

  // Calculate math whenever relevant state changes
  useEffect(() => {
    setState(prev => {
      const updated = LayoutMath.cascadeMath(prev);
      safeSetItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [state.isRTL, state.workDirection]);

  const updatePhase = useCallback((updater: (p: Phase) => void, saveHistory: boolean = true) => {
    setState(prev => {
      if (saveHistory) {
        safePushHistory(prev);
      }
      const newPhases = [...prev.phases];
      const p = { ...newPhases[prev.activeIndex] };
      updater(p);
      newPhases[prev.activeIndex] = p;
      const newState = { ...prev, phases: newPhases };
      const finalized = LayoutMath.cascadeMath(newState);
      safeSetItem(STORAGE_KEY, JSON.stringify(finalized));
      return finalized;
    });
  }, [state.activeIndex]);

  const updateState = useCallback((updater: (s: AppState) => AppState) => {
    setState(prev => {
        safePushHistory(prev);
        const next = updater(prev);
        const finalized = LayoutMath.cascadeMath(next);
        safeSetItem(STORAGE_KEY, JSON.stringify(finalized));
        return finalized;
    });
  }, []);

  const handleZoom = (factor: number) => {
    updatePhase(p => {
      const oldScale = p.view.scale;
      p.view.scale = Math.max(0.3, Math.min(oldScale * factor, 5));
    }, false);
  };

  const handleAutoFit = () => {
    updatePhase(p => {
      p.view.scale = DEFAULT_ZOOM;
      p.view.panX = DEFAULT_PAN_X;
      p.view.panY = DEFAULT_PAN_Y;
    }, false);
  };

  const currentPhase = state.phases[state.activeIndex];

  const getCanvasSizing = () => {
    return { maxH: 'max-h-full', maxW: 'max-w-none', aspect: 'auto' };
  };

  const canvasStyle = getCanvasSizing();
  const getUiScale = () => {
    const prefScale = prefs.uiSize === 'xlarge' ? 1.4 : prefs.uiSize === 'large' ? 1.2 : 1;
    const widthScale = windowDim.w / 1440;
    const heightScale = windowDim.h / 900;
    let baseScale = Math.min(widthScale, heightScale);
    baseScale = Math.max(0.5, Math.min(baseScale, 2.5));
    return baseScale * prefScale;
  };
  const uiZoomStyle: React.CSSProperties = { zoom: getUiScale() } as any;

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-zinc-950 font-sans text-white select-none touch-none">
      <PortraitWarning 
        phase={currentPhase}
        updatePhase={updatePhase}
        state={state}
        updateState={updateState}
      />

      <main className="absolute inset-0 p-[12px] flex flex-col overflow-hidden pointer-events-none z-10">
        <div className="w-full h-full relative flex items-stretch justify-center pointer-events-auto rounded-xl shadow-2xl" style={{ containerType: 'size' }}>
          <AnimatePresence mode="wait" custom={navDirection}>
            <motion.div
              key={state.activeIndex}
              custom={navDirection}
              variants={{
                initial: (dir: number) => {
                   const sign = state.isRTL ? -1 : 1;
                   return { opacity: 0, x: 50 * dir * sign };
                },
                animate: { opacity: 1, x: 0 },
                exit: (dir: number) => {
                   const sign = state.isRTL ? -1 : 1;
                   return { opacity: 0, x: -50 * dir * sign };
                }
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute inset-0 flex-shrink-0 w-full h-full ${canvasStyle.maxH} ${canvasStyle.maxW} flex justify-center items-center transition-all duration-500`}
              style={{ width: '100%', aspectRatio: canvasStyle.aspect }}
            >
              <CanvasLayout 
              phase={currentPhase} 
              state={state}
              startPostNum={LayoutMath.getStartPostNum(state.phases, state.activeIndex)} 
              updatePhase={updatePhase}
              updateState={updateState}
              onNavPrev={() => {
                if (state.activeIndex > 0) {
                  setNavDirection(-1);
                  setState(s => ({ ...s, activeIndex: s.activeIndex - 1 }));
                }
              }}
              onNavNext={() => {
                if (state.activeIndex < state.phases.length - 1) {
                  setNavDirection(1);
                  setState(s => ({ ...s, activeIndex: s.activeIndex + 1 }));
                }
              }}
              prefs={prefs}
            />
          </motion.div>
        </AnimatePresence>

        {/* Zoom Controls Overlay Bottom Right */}
        <div 
          className="absolute bottom-[130px] sm:bottom-[146px] right-2 flex flex-col z-30 transition-all duration-300 pointer-events-auto items-center bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl divide-y divide-white/10 overflow-hidden text-white"
          style={uiZoomStyle}
        >
         <button 
            onClick={handleAutoFit}
            className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] flex items-center justify-center transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] shadow-[0_0_0_transparent]"
            title="Reset View"
          >
            <Target size={28} /> 
          </button>
          <button 
             onClick={() => handleZoom(1.05)}
            className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] flex items-center justify-center transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] shadow-[0_0_0_transparent]"
          >
            <Plus size={28} />
          </button>
          <button 
            onClick={() => handleZoom(0.95)}
            className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] flex items-center justify-center transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] shadow-[0_0_0_transparent]"
          >
            <Minus size={28} />
          </button>
        </div>

        {/* Bottom Bar inserted here directly below controls */}
        <div style={uiZoomStyle} className="absolute bottom-2 left-2 right-2 z-40 pointer-events-none transition-all duration-300">
          <BottomBar 
            state={state}
            prefs={prefs}
            onPrev={() => {
               setNavDirection(-1);
               setState(s => ({ ...s, activeIndex: Math.max(0, s.activeIndex - 1) }));
            }}
            onNext={() => {
               setNavDirection(1);
               setState(s => ({ ...s, activeIndex: Math.min(s.phases.length - 1, s.activeIndex + 1) }));
            }}
            onAddPhase={() => {
               setNavDirection(1);
               setState(s => {
                  safePushHistory(s);
                  return { ...s, phases: [...s.phases, createDefaultPhase()], activeIndex: s.phases.length };
               });
            }}
            onDeletePhaseRequest={() => {
               setModals(m => ({ ...m, deletePhase: true }));
            }}
            onOpenLayout={() => setModals(m => ({ ...m, layout: true }))}
            onOpenNotes={() => setModals(m => ({ ...m, notes: true }))}
            onOpenFile={handleOpenFileMenu}
            onAutoFit={handleAutoFit}
            onReset={() => setModals(m => ({ ...m, reset: true }))}
            onToggleRTL={() => updateState(s => ({ ...s, isRTL: !s.isRTL }))}
            onTogglePosts={() => updatePhase(p => { p.showPosts = p.showPosts === false ? true : false; })}
            onUndo={handleUndo}
            canUndo={canUndo}
          />
        </div>

        </div>
      </main>

      <LayoutModal 
        isOpen={modals.layout} 
        onClose={() => setModals(m => ({ ...m, layout: false }))} 
        state={state}
        updatePhase={updatePhase}
        updateState={updateState}
        prefs={prefs}
        setPrefs={setPrefs}
      />

      <NotesModal 
        isOpen={modals.notes}
        onClose={() => setModals(m => ({ ...m, notes: false }))}
        phase={currentPhase}
        updatePhase={updatePhase}
        state={state}
        updateState={updateState}
      />

      <FileModal 
        isOpen={modals.file}
        onClose={() => setModals(m => ({ ...m, file: false }))}
        state={state}
        onLoad={(newState) => setState(newState)}
        preloadedPdfData={preloadedPdfData}
        prefs={prefs}
      />

      {/* Export Loading Window */}
      <AnimatePresence>
        {exportLoadingProgress !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={handleCancelExportLoading}
          >
            <div 
              className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm"
              onClick={e => e.stopPropagation()} // Prevent close on clicking inside window
            >
              <div className="flex flex-col items-center justify-center text-center gap-4">
                <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-widest leading-relaxed">
                  LOADING PDF FOR EXPORT OR SAVE, PLEASE WAIT.
                </h3>
                
                <div className="w-full bg-black/50 rounded-full h-3 sm:h-4 overflow-hidden relative border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${exportLoadingProgress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    className="bg-emerald-500 h-full rounded-full"
                  />
                </div>
                
                <div className="text-sm font-bold text-zinc-400">
                  {Math.round(exportLoadingProgress)}%
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modals.deletePhase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2">Delete Section?</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Are you sure you want to delete Section {state.activeIndex + 1}?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModals(m => ({ ...m, deletePhase: false }))}
                  className="px-4 py-2 hover:bg-zinc-800 text-zinc-300 text-sm font-bold rounded-lg transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={() => {
                    if (state.phases.length > 1) {
                      setNavDirection(-1);
                      updateState(s => {
                        const newPhases = [...s.phases];
                        newPhases.splice(s.activeIndex, 1);
                        const newIndex = Math.min(s.activeIndex, newPhases.length - 1);
                        return { ...s, phases: newPhases, activeIndex: newIndex };
                      });
                    }
                    setModals(m => ({ ...m, deletePhase: false }));
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Yes, Delete Section
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modals.reset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-2">Start Fresh?</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Are you sure you want to clear all sections and start a new layout?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModals(m => ({ ...m, reset: false }))}
                  className="px-4 py-2 hover:bg-zinc-800 text-zinc-300 text-sm font-bold rounded-lg transition-colors"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    updateState(s => ({
                      ...s,
                      isRTL: false,
                      workDirection: "Zero Direction",
                      activeIndex: 0,
                      phases: [createDefaultPhase()]
                    }));
                    setModals(m => ({ ...m, reset: false, notes: true }));
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Yes, Start Fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpdatePrompt />
    </div>
  );
}

