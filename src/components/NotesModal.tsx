import { X, FileText, CheckCircle2 } from 'lucide-react';
import { type Phase, type AppState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  phase: Phase;
  updatePhase: (updater: (p: Phase) => void) => void;
  state: AppState;
  updateState: (updater: (s: AppState) => AppState) => void;
}

export const NotesModal = ({ isOpen, onClose, phase, updatePhase, state, updateState }: NotesModalProps) => {

  if (!isOpen) return null;

  const isValid = state.wo?.trim() && state.ts?.trim() && state.subSub?.trim();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-full flex flex-col text-zinc-900 overflow-hidden"
        >
          <div className="px-4 border-b flex justify-between items-center bg-zinc-50 rounded-t-xl shrink-0" style={{ height: '40px' }}>
            <div className="flex items-center gap-2 text-zinc-700">
              <FileText size={18} />
              <h3 className="font-bold uppercase tracking-wider text-sm">Notes: Section {state.activeIndex + 1}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose} 
                disabled={!isValid}
                className={`p-1.5 -mr-2 rounded-full transition-colors shrink-0 ${isValid ? "hover:bg-zinc-200" : "opacity-50 cursor-not-allowed"}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-6 sm:px-8 border-b grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white shrink-0" style={{ paddingTop: '14px', paddingBottom: '10px', marginBottom: '-2px' }}>
            <div className="flex flex-col gap-2">
               <label htmlFor="wo-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">WO:</label>
               <input 
                 id="wo-input"
                 name="wo-input"
                 type="text"
                 value={state.wo || ''}
                 onChange={(e) => updateState(s => ({ ...s, wo: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() }))}
                 placeholder="REQUIRED"
                 className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
               />
            </div>
            
            <div className="flex flex-col gap-2">
               <label htmlFor="ts-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">TS:</label>
               <input 
                 id="ts-input"
                 name="ts-input"
                 type="text"
                 value={state.ts || ''}
                 onChange={(e) => updateState(s => ({ ...s, ts: e.target.value.replace(/[^0-9\s-]/g, '').slice(0, 11) }))}
                 placeholder="EX: 1000-1005"
                 className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
               />
            </div>

            <div className="flex flex-col gap-2">
               <label htmlFor="subsub-input" className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">Sub-sub:</label>
               <input 
                 id="subsub-input"
                 name="subsub-input"
                 type="text"
                 value={state.subSub || ''}
                 onChange={(e) => updateState(s => ({ ...s, subSub: e.target.value.toUpperCase() }))}
                 placeholder="(EX: JYZ-NAZ or JYZ-NAZ to NAZ-BWZ-IB)"
                 className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase placeholder:text-zinc-400"
               />
            </div>
          </div>

          {!isValid && (
            <div className="px-4 pt-4 text-xs font-bold text-red-600 text-center uppercase shrink-0">
              Fill in all details (WO, TS, and Sub-sub) to continue.
            </div>
          )}

          <div className="flex-1 min-h-0 p-4 pb-0 flex flex-col">
            <textarea 
              id="comments-input"
              name="comments-input"
              aria-label="Comments"
              value={phase.comments}
              onChange={(e) => updatePhase(p => { p.comments = e.target.value.toUpperCase(); })}
              placeholder="COMMENTS, SITE OBSERVATIONS, OR SHOP ASSEMBLY NOTES HERE..."
              className="flex-1 min-h-0 w-full bg-zinc-50 border border-zinc-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all text-sm leading-relaxed uppercase"
            />
          </div>

          <div className="p-4 flex justify-between items-center shrink-0">
             <span className="text-[#3b82f6] text-base font-medium"> 💀 This app is optional. Go scribble.</span>
             <button
                onClick={onClose}
                disabled={!isValid}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold uppercase transition-all ${
                  isValid ? 'bg-black text-white hover:bg-zinc-800' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
             >
                <CheckCircle2 size={18} />
                Okay
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
