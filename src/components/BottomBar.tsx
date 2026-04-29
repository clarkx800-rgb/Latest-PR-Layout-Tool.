import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings, FileText, Save, Maximize, Target, Eye, EyeOff, Undo2, X, Trash2, RotateCcw, MonitorSmartphone, ArrowRight, ArrowLeft } from 'lucide-react';
import { type AppState } from '../types';
import { generatePdf } from '../utils/pdf';
import { PdfViewer } from './PdfViewer';
import { motion, AnimatePresence } from 'motion/react';

interface BottomBarProps {
  state: AppState;
  onPrev: () => void;
  onNext: () => void;
  onAddPhase: () => void;
  onDeletePhaseRequest: () => void;
  onOpenLayout: () => void;
  onOpenNotes: () => void;
  onOpenFile: () => void;
  onAutoFit: () => void;
  onReset: () => void;
  onToggleRTL?: () => void;
  onTogglePosts?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  prefs?: any;
}

export const BottomBar = ({ 
  state, onPrev, onNext, onAddPhase, onDeletePhaseRequest, onOpenLayout, onOpenNotes, onOpenFile, onAutoFit, onReset,
  onToggleRTL, onTogglePosts, onUndo, canUndo, prefs
}: BottomBarProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(e.target as Node)) {
        setIsPreviewOpen(false);
      }
    };
    if (isPreviewOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPreviewOpen]);

  const handlePreviewOpen = () => {
    setIsPreviewOpen(!isPreviewOpen);
  };

  const [pdfData, setPdfData] = useState<string | null>(null);

  useEffect(() => {
    if (isPreviewOpen) {
      setPdfData(null); // Clear previous data
      const timer = setTimeout(() => {
        try {
          const doc = generatePdf(state, prefs?.unit);
          // Using datauristring avoids strict cross-origin web worker blob blocking
          // and transfers seamlessly to react-pdf Document.
          const dataUri = doc.output('datauristring');
          setPdfData(dataUri);
        } catch (err) {
          console.error("Failed to generate PDF preview", err);
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setPdfData(null);
    }
  }, [isPreviewOpen, state]);

  const toggleFullscreen = () => {
    try {
      const doc = window.document as any;
      const docEl = doc.documentElement;

      const requestFullscreen = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;

      const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

      if (!isFullscreen) {
        if (requestFullscreen) {
          requestFullscreen.call(docEl).catch((e: Error) => {
            console.warn('Fullscreen Error:', e);
            // Fallback for some browsers (like certain Samsung Internet versions) that prefer body
            if (doc.body && (doc.body as any).requestFullscreen) {
               (doc.body as any).requestFullscreen();
            }
          });
        }
      } else {
        if (exitFullscreen) {
          const promise = exitFullscreen.call(doc);
          if (promise) {
            promise.catch((e: Error) => console.warn('Exit Fullscreen Error:', e));
          }
        }
      }
    } catch (err) {
      console.warn("Fullscreen API not supported", err);
    }
  };

  const btnClass = "h-[60px] sm:h-[70px] px-5 sm:px-6 flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const sqBtnClass = "h-[60px] sm:h-[70px] px-5 sm:px-6 flex items-center justify-center transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const redBtnClass = "h-[60px] sm:h-[70px] px-5 sm:px-6 text-red-400 hover:text-red-300 flex items-center gap-2 transition-all hover:bg-white/5 active:bg-gradient-to-r active:from-red-500/20 active:to-red-400/20 active:shadow-[inset_0_0_20px_rgba(239,68,68,0.3)] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      <div className="flex w-full justify-between items-end gap-4 text-black">
        <div className="flex items-center bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl pointer-events-auto divide-x divide-white/10 overflow-hidden text-xs sm:text-sm font-bold text-white">
          {onToggleRTL && (
            <button 
              onClick={onToggleRTL}
              className={`${btnClass} px-6 sm:px-8`}
              title="Toggle Layout Orientation"
            >
              <span className="font-mono tracking-widest flex items-center">
                {state.isRTL ? (
                  <><ArrowLeft size={28} strokeWidth={2.5} className="text-zinc-400 mr-2" /><span className="hidden 2xl:inline text-lg">RTL</span></>
                ) : (
                  <><span className="hidden 2xl:inline text-lg">LTR</span><ArrowRight size={28} strokeWidth={2.5} className="text-zinc-400 ml-2" /></>
                )}
              </span>
            </button>
          )}

          {onTogglePosts && (
            <button 
              onClick={onTogglePosts}
              className={`${sqBtnClass}`}
              title={state.phases[state.activeIndex]?.showPosts ? "Hide Posts" : "Show Posts"}
            >
              {state.phases[state.activeIndex]?.showPosts ? <Eye size={28} /> : <EyeOff size={28} />}
            </button>
          )}

          {onUndo && (
            <button 
              onClick={onUndo}
              disabled={!canUndo}
              className={`${sqBtnClass}`}
              title="Undo"
            >
              <Undo2 size={28} />
            </button>
          )}
          <button 
            onClick={onAddPhase}
            className={`${btnClass} text-emerald-400`}
          >
            <Plus size={28} /> <span className="hidden 2xl:inline text-lg">Add Section</span>
          </button>

          <button 
            onClick={onReset}
            className={`${redBtnClass}`}
            title="Start Fresh"
          >
            <RotateCcw size={26} /> <span className="hidden 2xl:inline text-lg">Start Fresh</span>
          </button>

          <button 
            onClick={onDeletePhaseRequest}
            disabled={state.phases.length <= 1}
            className={`${redBtnClass}`}
            title="Delete Section"
          >
            <Trash2 size={26} /> <span className="hidden 2xl:inline text-lg">Delete Section</span>
          </button>
        </div>

        <div className="flex items-center bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl pointer-events-auto divide-x divide-white/10 overflow-hidden text-xs sm:text-sm font-bold text-white">
          <button 
            onClick={toggleFullscreen}
            className="flex h-[60px] sm:h-[70px] px-5 sm:px-6 hover:bg-white/5 active:bg-gradient-to-r active:from-emerald-500/20 active:to-emerald-400/20 active:shadow-[inset_0_0_20px_rgba(16,185,129,0.3)] items-center justify-center transition-all flex-shrink-0"
            title="Toggle Fullscreen"
          >
            <Maximize size={28} />
          </button>

          <button 
            onClick={onOpenLayout}
            className={`${btnClass}`}
          >
            <Settings size={28} /> <span className="hidden 2xl:inline text-lg">Layout</span>
          </button>
          
          <button 
            onClick={onOpenNotes}
            className={`${btnClass}`}
          >
            <FileText size={28} /> <span className="hidden 2xl:inline text-lg">Notes</span>
          </button>

          <button 
            onClick={handlePreviewOpen}
            className={`${btnClass} ${isPreviewOpen ? 'bg-emerald-600/30' : ''}`}
          >
            <Eye size={28} /> <span className="hidden 2xl:inline text-lg">Preview</span>
          </button>

          <button 
            onClick={onOpenFile}
            className={`${btnClass}`}
          >
            <Save size={28} /> <span className="hidden 2xl:inline text-lg">File</span>
          </button>
        </div>
      </div>
    
      <AnimatePresence>
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-5 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white md:rounded-xl shadow-2xl w-full h-full md:max-h-full flex flex-col pointer-events-auto overflow-hidden"
          >
            <div className="bg-black px-6 flex justify-between items-center shrink-0 border-b border-black" style={{ height: '57.7727px' }}>
              <span className="text-white font-bold uppercase tracking-wider text-[16.5px] leading-[18px]">PDF Report Preview</span>
              <button onClick={() => setIsPreviewOpen(false)} className="text-white hover:text-gray-300 flex items-center justify-center p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                <span className="sr-only">Close</span>
                <X size={30} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-zinc-200 relative md:p-4 flex items-center justify-center">
              {pdfData ? (
                <div className="w-full h-full md:rounded shadow-sm overflow-hidden bg-white">
                  <PdfViewer pdfData={pdfData} />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 font-medium space-y-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-lg text-emerald-800">Generating Preview...</span>
                    <span className="text-sm text-zinc-400">This might take a few moments for large layouts</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
};
