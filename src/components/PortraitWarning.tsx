import { PwaUpdater } from './PwaUpdater';
import { Smartphone, RotateCw, FileText } from 'lucide-react';
import { type Phase, type AppState } from '../types';

interface PortraitWarningProps {
  phase: Phase;
  updatePhase: (updater: (p: Phase) => void) => void;
  state: AppState;
  updateState: (updater: (s: AppState) => AppState) => void;
}

export const PortraitWarning = ({ phase, updatePhase, state, updateState }: PortraitWarningProps) => {
  const isValid = state.wo?.trim() && state.ts?.trim() && state.subSub?.trim();

  const handleLandscapeRequest = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch (lockErr) {
            // Ignore lock error, typically due to sandbox lack of allow-orientation-lock
          }
        }
      }
    } catch (err) {
      // Ignore fullscreen error
    }
  };

  return (
    <div className="portrait-lock">
      <button 
        type="button"
        onClick={handleLandscapeRequest}
        className="p-6 glass-panel rounded-3xl flex flex-col items-center justify-center text-center gap-5 mt-6 mb-6 shrink-0 w-full max-w-md cursor-pointer active:scale-95 transition-transform"
      >
        <div className="relative flex items-center justify-center w-20 h-20 mb-2">
          <Smartphone size={64} className="text-zinc-200 animate-phone-rotate" strokeWidth={1.25} />
          <RotateCw size={32} className="text-blue-400 absolute right-0 bottom-2 animate-spin-slow bg-zinc-950 rounded-full" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-black tracking-tight uppercase">Landscape Required</h2>
        <p className="text-zinc-200 text-base sm:text-lg font-medium max-w-sm leading-relaxed">
          Power rail 2D drafting tool only works with landscape orientation. Tap here to switch to landscape (or rotate your device). While here, you can add, edit, or check the details below.
        </p>
      </button>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col text-zinc-900 border border-zinc-200 shrink-0 mb-8">
        <div className="p-4 border-b flex justify-between items-center bg-zinc-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2 text-zinc-700">
            <FileText size={18} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Notes: Section {state.activeIndex + 1}</h3>
          </div>
          <div className="flex items-center gap-3">
            <PwaUpdater />
          </div>
        </div>

        <div className="p-5 border-b flex flex-col gap-5 bg-white shrink-0">
          <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-wo-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">WO:</label>
              <input 
                id="pw-wo-input"
                name="pw-wo-input"
                type="text"
                value={state.wo || ''}
                onChange={(e) => updateState(s => ({ ...s, wo: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() }))}
                placeholder="REQUIRED"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
              />
          </div>
          
          <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-ts-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">TS:</label>
              <input 
                id="pw-ts-input"
                name="pw-ts-input"
                type="text"
                value={state.ts || ''}
                onChange={(e) => updateState(s => ({ ...s, ts: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="REQUIRED (####)"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
              />
          </div>

          <div className="flex flex-col gap-1.5">
              <label htmlFor="pw-subsub-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Sub-sub:</label>
              <input 
                id="pw-subsub-input"
                name="pw-subsub-input"
                type="text"
                value={state.subSub || ''}
                onChange={(e) => updateState(s => ({ ...s, subSub: e.target.value.toUpperCase() }))}
                placeholder="REQUIRED (EX: JYZ)"
                className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
              />
          </div>
        </div>

        {!isValid && (
          <div className="px-4 pt-4 text-xs font-bold text-red-600 text-center uppercase shrink-0">
            Please fill in all details (WO, TS, and Sub-sub) to continue.
          </div>
        )}

        <div className="p-4 flex flex-col h-48">
          <textarea 
            id="pw-comments-input"
            name="pw-comments-input"
            aria-label="Comments"
            value={phase.comments}
            onChange={(e) => updatePhase(p => { p.comments = e.target.value.toUpperCase(); })}
            placeholder="TYPE TECHNICIAN COMMENTS, SITE OBSERVATIONS, OR SHOP ASSEMBLY NOTES HERE..."
            className="flex-1 min-h-0 w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-sm leading-relaxed uppercase"
          />
        </div>
      </div>
    </div>
  );
};

// Add to index.css if not there
// .animate-spin-slow { animation: spin 3s linear infinite; }
