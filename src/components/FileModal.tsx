import React, { useState, useEffect } from 'react';
import { X, Download, Upload, FileJson, FileType, FileText } from 'lucide-react';
import { type AppState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { drawLayout } from '../utils/drawer';
import { LayoutMath } from '../utils/math';
import { RENDER_CONFIG, DEFAULT_ZOOM, DEFAULT_PAN_X, DEFAULT_PAN_Y } from '../constants';

import { generatePdf } from '../utils/pdf';
import { PdfViewer } from './PdfViewer';

interface FileModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onLoad: (state: AppState) => void;
  preloadedPdfData?: string | null;
  prefs?: any;
}

export const FileModal = ({ isOpen, onClose, state, onLoad, preloadedPdfData, prefs }: FileModalProps) => {
  const [pdfData, setPdfData] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preloadedPdfData) {
        setPdfData(preloadedPdfData);
      } else {
        try {
          const doc = generatePdf(state, prefs?.unit);
          // Using datauristring to avoid strict cross-origin web worker blob blocking
          const dataUri = doc.output('datauristring');
          setPdfData(dataUri);
        } catch (err) {
          console.error("Failed to generate PDF preview", err);
        }
      }
    } else {
      setPdfData(null);
    }
  }, [isOpen, state, preloadedPdfData]);

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Format: TS-####-Date.json
    const tsFormat = state.ts ? state.ts.toString().padStart(4, '0') : 'XXXX';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `TS-${tsFormat}-${dateStr}.json`;
    
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result as string);
        if (data && data.phases) {
          const defaultState = { isRTL: false, workDirection: "Zero Direction", activeIndex: 0, phases: [] };
          const safePhases = data.phases.map((p: any) => ({
            postCount: 5, postSpanMm: 7998, posts: [], minMm: 0, maxMm: 9998, comments: "",
            ...p,
            red: { startMm: 1000, endMm: 1000, totalMm: 9998, visible: true, ...(p.red || {}) },
            blue: { startMm: 1000, endMm: 1000, totalMm: 9998, visible: true, ...(p.blue || {}) },
            lugs: p.lugs || [],
            view: { scale: DEFAULT_ZOOM, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y, ...(p.view || {}) },
            cis: { start: false, end: false, ...(p.cis || {}) },
            iso: { start: false, end: false, ...(p.iso || {}) },
            ramp: { start: false, end: false, ...(p.ramp || {}) },
            exp: { start: false, end: false, ...(p.exp || {}) }
          }));

          onLoad({ ...defaultState, ...data, phases: safePhases });
          onClose();
        }
      } catch (err) {
        alert("File corrupt or incompatible.");
      }
    };
    reader.readAsText(file);
  };

  const handleExportPdf = () => {
    const doc = generatePdf(state, prefs?.unit);
    const tsFormat = state.ts ? state.ts.toString().padStart(4, '0') : 'XXXX';
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`TS-${tsFormat}-${dateStr}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col text-zinc-900 overflow-hidden"
        >
          <div className="px-4 border-b flex justify-between items-center bg-zinc-50 shrink-0" style={{ height: '40px' }}>
            <div className="flex items-center gap-2 text-zinc-700">
              <FileText size={20} />
              <h3 className="font-bold uppercase tracking-wider text-sm">PDF Report & Data</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col landscape:flex-row md:flex-row" style={{ paddingTop: '14px', paddingBottom: '10px', marginBottom: '-2px' }}>
            {/* PDF Preview Area */}
            <div className="flex-1 min-h-[300px] landscape:min-h-0 md:min-h-0 bg-zinc-200 border-r border-zinc-200 p-4 overflow-hidden relative">
              {pdfData ? (
                <div className="w-full h-full rounded shadow-sm overflow-hidden bg-white">
                  <PdfViewer pdfData={pdfData} />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium">Generating preview...</div>
              )}
            </div>

            {/* Actions Area */}
            <div className="w-full md:w-80 landscape:w-80 p-6 shrink-0 bg-white flex flex-col gap-6 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-zinc-500 uppercase tracking-widest border-b pb-2">Export Document</h4>
                <p className="text-sm text-zinc-600">Download the shop report containing the layouts and notes for all sections.</p>
                <button 
                  onClick={handleExportPdf}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <FileType size={20} />
                  Export PDF
                </button>
              </div>
              
              <div className="h-px bg-zinc-100 w-full" />

              <div className="space-y-4">
                <h4 className="font-bold text-sm text-zinc-500 uppercase tracking-widest border-b pb-2">Workspace Data</h4>
                <p className="text-sm text-zinc-600">Save your workspace raw data to a json file to continue working later.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleDownloadJson}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all"
                  >
                    <Download size={18} />
                    <span className="text-[10px] uppercase">Save Workspace</span>
                  </button>
                  <label 
                    htmlFor="file-upload"
                    className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload size={18} />
                    <span className="text-[10px] uppercase">Load Workspace</span>
                    <input id="file-upload" name="file-upload" type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

