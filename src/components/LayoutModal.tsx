import { useState, useEffect } from "react";
import { X, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { type Phase, type AppState } from "../types";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "motion/react";

interface LayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  updatePhase: (updater: (p: Phase) => void) => void;
  updateState: (updater: (s: AppState) => AppState) => void;
  prefs?: any;
  setPrefs?: any;
}

const EditableDistInput = ({
  dist,
  id,
  onSave,
}: {
  dist: number;
  id?: string;
  onSave: (val: number) => void;
}) => {
  const [value, setValue] = useState(dist.toString());

  useEffect(() => {
    setValue(dist.toString());
  }, [dist]);

  const handleCommit = () => {
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      onSave(parsed);
    } else {
      setValue(dist.toString());
    }
  };

  return (
    <input
      id={id || "editable-dist-input"}
      name={id || "editable-dist-input"}
      type="text"
      inputMode="numeric"
      value={value}
      aria-label="Distance in mm"
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onChange={(e) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
        setValue(val);
      }}
      className="bg-zinc-100 hover:bg-zinc-200 outline-none border border-transparent focus:border-zinc-400 focus:bg-white rounded px-1 min-w-[52px] max-w-[80px] text-xs text-center font-black transition-colors flex-shrink-0"
    />
  );
};

const LugItem = ({ lug, updatePhase }: { lug: any; updatePhase: any }) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={lug}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.02,
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        zIndex: 50,
        backgroundColor: "#ffffff",
      }}
      className="flex items-center justify-between bg-white border border-zinc-200 shadow-sm rounded-md px-2 py-1.5 text-[10px] font-mono group hover:border-zinc-300 transition-colors relative"
    >
      <div className="flex items-center gap-1 overflow-hidden">
        <div
          className="cursor-grab active:cursor-grabbing hover:bg-zinc-100 p-0.5 rounded transition-colors"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical size={14} className="text-zinc-400 flex-shrink-0" />
        </div>
        <span
          className={`flex items-center ${lug.rail === "red" ? "text-red-700" : "text-blue-700"}`}
        >
          <span className="font-black border-r border-current pr-1 mr-1 opacity-80">
            {lug.rail === "red" ? "+" : "-"}
          </span>
          <span>
            {lug.type === "ground"
              ? "GS Cable"
              : lug.type === "blue-light"
                ? "BLU-L"
                : `${lug.type}L`}
          </span>
          <span className="text-zinc-300 mx-1">|</span>
          <EditableDistInput
            id={`dist-input-${lug.id}`}
            dist={lug.dist}
            onSave={(newDist) => {
              updatePhase((phase: any) => {
                const l = phase.lugs.find((l: any) => l.id === lug.id);
                if (l) l.dist = newDist;
              });
            }}
          />
          <span className="ml-[2px]">mm</span>
          <span className="text-zinc-500 tracking-tight uppercase ml-1 flex-shrink-0">
            {lug.ref}
          </span>
        </span>
      </div>
      <button
        onClick={() =>
          updatePhase((phase: any) => {
            phase.lugs = phase.lugs.filter((l: any) => l.id !== lug.id);
          })
        }
        className="text-zinc-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors active:scale-95"
        type="button"
      >
        <Trash2 size={12} />
      </button>
    </Reorder.Item>
  );
};

const AttachmentItem = ({
  type,
  updatePhase,
  isStart,
}: {
  type: string;
  updatePhase: any;
  isStart: boolean;
}) => {
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={type}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        zIndex: 50,
        backgroundColor: "#18181b", // zinc-900
      }}
      className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded px-2 py-1 flex-shrink-0 relative"
    >
      <div className="flex items-center gap-2">
        <div
          className="cursor-grab active:cursor-grabbing hover:bg-zinc-800 p-0.5 rounded transition-colors"
          onPointerDown={(e) => controls.start(e)}
        >
          <GripVertical size={14} className="text-zinc-500" />
        </div>
        <span className="text-xs font-bold text-zinc-200">
          {type.toUpperCase()}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          updatePhase((ph: any) => {
            if (isStart) {
              ph.startAttachments = (
                ph.startAttachments ??
                (["cis", "iso", "ramp", "exp"] as const).filter(
                  (typ) => ph[typ]?.start,
                )
              ).filter((a: string) => a !== type);
              if (ph[type]) ph[type]!.start = false;
            } else {
              ph.endAttachments = (
                ph.endAttachments ??
                (["cis", "iso", "ramp", "exp"] as const).filter(
                  (typ) => ph[typ]?.end,
                )
              ).filter((a: string) => a !== type);
              if (ph[type]) ph[type]!.end = false;
            }
          })
        }
        className="text-zinc-500 hover:text-red-400 focus:outline-none"
      >
        <X size={14} />
      </button>
    </Reorder.Item>
  );
};

export const LayoutModal = ({
  isOpen,
  onClose,
  state,
  updatePhase,
  updateState,
  prefs,
  setPrefs,
}: LayoutModalProps) => {
  const p = state.phases[state.activeIndex];

  // Local state for the new lug form to avoid ref usage for segmented controls
  const [newLug, setNewLug] = useState<{
    rail: "red" | "blue";
    type: "1" | "5" | "ground" | "blue-light";
    ref: "start" | "end";
    dist: string;
  }>({
    rail: "red",
    type: "5",
    ref: "start",
    dist: "",
  });

  if (!isOpen) return null;

  const handleAddLug = () => {
    const dist = parseFloat(newLug.dist);
    if (isNaN(dist)) return;

    const newLugItem = {
      id: Math.random().toString(36).substr(2, 9),
      rail: newLug.rail,
      type: newLug.type,
      ref: newLug.ref,
      dist,
    };

    updatePhase((phase) => {
      phase.lugs = [...phase.lugs, newLugItem];
    });
    setNewLug((prev) => ({ ...prev, dist: "" }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col text-zinc-900"
        >
          <div
            className="px-3 border-b flex justify-between items-center bg-zinc-50"
            style={{ height: "40px" }}
          >
            <h3 className="font-bold text-zinc-700 uppercase tracking-tight text-sm">
              Section {state.activeIndex + 1} Settings
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-3 sm:px-5 grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-5 items-start"
            style={{
              paddingTop: "14px",
              paddingBottom: "10px",
              marginBottom: "-2px",
            }}
          >
            {/* Global Layout */}
            <div className="lg:col-span-1 space-y-3 bg-zinc-50/80 p-3 rounded-lg border border-zinc-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest border-b pb-1 mb-3">
                  Global Layout
                </h4>

                <div className="flex flex-col landscape:max-lg:flex-row gap-3">
                  <div className="flex flex-col gap-3 landscape:max-lg:flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase whitespace-nowrap min-w-[70px]">
                        Orientation
                      </div>
                      <div className="flex bg-zinc-200/50 p-0.5 rounded border border-zinc-200 w-full max-w-[120px]">
                        <button
                          onClick={() =>
                            updateState((s) => ({ ...s, isRTL: false }))
                          }
                          className={`flex-1 text-[10px] sm:text-xs py-1 sm:py-1.5 rounded-[3px] font-bold transition-all ${!state.isRTL ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                        >
                          LTR →
                        </button>
                        <button
                          onClick={() =>
                            updateState((s) => ({ ...s, isRTL: true }))
                          }
                          className={`flex-1 text-[10px] sm:text-xs py-1 sm:py-1.5 rounded-[3px] font-bold transition-all ${state.isRTL ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                        >
                          ← RTL
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor="mount-posts-input"
                        className="text-[10px] font-bold text-zinc-500 uppercase whitespace-nowrap min-w-[70px]"
                      >
                        Mount Posts
                      </label>
                      <input
                        id="mount-posts-input"
                        name="mount-posts-input"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={p.postCount}
                        onChange={(e) =>
                          updatePhase((phase) => {
                            let val = parseInt(e.target.value) || 0;
                            phase.postCount = Math.min(50, Math.max(0, val));
                          })
                        }
                        className="w-full max-w-[120px] bg-white border border-zinc-200 rounded px-2 py-1.5 sm:py-2 font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-center"
                      />
                    </div>
                  </div>

                  {prefs && setPrefs && (
                    <div className="flex flex-col justify-start mt-2 pt-3 border-t border-zinc-200/60 landscape:max-lg:mt-0 landscape:max-lg:pt-0 landscape:max-lg:border-t-0 landscape:max-lg:border-l landscape:max-lg:pl-3 landscape:max-lg:flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase whitespace-nowrap min-w-[70px]">
                          Display
                        </div>
                        <div className="flex bg-zinc-200/50 p-0.5 rounded border border-zinc-200 w-full max-w-[120px]">
                          {(["normal", "large", "xlarge"] as const).map(
                            (size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() =>
                                  setPrefs((p: any) => ({ ...p, uiSize: size }))
                                }
                                className={`flex-1 text-[9px] sm:text-[10px] py-1 sm:py-1.5 rounded-[3px] font-bold transition-all ${prefs.uiSize === size ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                              >
                                {size === "normal"
                                  ? "Norm"
                                  : size === "large"
                                    ? "Large"
                                    : "XL"}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Combined Rails Group - Using 2 Columns horizontally matched */}
            <div className="lg:col-span-3 bg-zinc-50/80 p-3 rounded-lg border border-zinc-100 shadow-sm flex flex-col gap-2">
              <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-between border-b pb-1">
                <span>Measurements Mapping</span>
                <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 rounded mix-blend-multiply">
                  LINKED AXIS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Positive Rail */}
                <div className="space-y-2 bg-red-50/50 p-2 sm:p-3 rounded-md border border-red-200/60 shadow-sm">
                  <div className="flex items-center justify-between border-b border-red-200/50 pb-1 px-1">
                    <h4 className="text-[11px] sm:text-xs font-black text-red-600 uppercase tracking-widest text-center flex-1 ml-4">
                      Positive (+)
                    </h4>
                    <button
                      onClick={() =>
                        updatePhase((phase) => {
                          phase.red.visible = !phase.red.visible;
                        })
                      }
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title={
                        p.red.visible
                          ? "Hide Positive Rail"
                          : "Show Positive Rail"
                      }
                    >
                      {p.red.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <label
                      htmlFor="positive-total-input"
                      className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase text-center sm:text-left"
                    >
                      Total{" "}
                      <span className="text-zinc-400 normal-case">(mm)</span>
                    </label>
                    <input
                      id="positive-total-input"
                      name="positive-total-input"
                      type="number"
                      inputMode="numeric"
                      value={p.red.totalMm}
                      onChange={(e) =>
                        updatePhase((phase) => {
                          phase.red.totalMm = parseFloat(e.target.value) || 0;
                          phase.red.visible = phase.red.totalMm > 0;
                        })
                      }
                      className="w-full bg-white border border-red-100 rounded px-1.5 sm:px-2 py-2 font-black text-xs sm:text-sm text-red-700 focus:ring-2 focus:ring-red-500 outline-none text-center shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="positive-start-input"
                        className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase"
                      >
                        Start Offset
                      </label>
                      <select
                        value={p.red.startRefPostIndex ?? 0}
                        onChange={(e) =>
                          updatePhase((phase) => {
                            phase.red.startRefPostIndex = parseInt(
                              e.target.value,
                            );
                          })
                        }
                        className="text-[9px] bg-red-100 text-red-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-red-200"
                      >
                        {Array.from({ length: p.postCount }).map((_, i) => (
                          <option key={i} value={i}>
                            Post {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      id="positive-start-input"
                      name="positive-start-input"
                      type="number"
                      inputMode="numeric"
                      value={p.red.startMm === 0 ? "" : p.red.startMm}
                      placeholder="0"
                      onChange={(e) =>
                        updatePhase((phase) => {
                          phase.red.startMm =
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value) || 0;
                          const startRefIdx =
                            typeof phase.red.startRefPostIndex === "number"
                              ? phase.red.startRefPostIndex
                              : 0;
                          const endRefIdx =
                            typeof phase.red.endRefPostIndex === "number"
                              ? phase.red.endRefPostIndex
                              : phase.posts.length - 1;
                          const startRefAbs = phase.posts[startRefIdx] || 0;
                          const endRefAbs =
                            phase.posts[endRefIdx] || phase.postSpanMm;
                          phase.red.totalMm =
                            phase.red.startMm +
                            (endRefAbs - startRefAbs) +
                            phase.red.endMm;
                          phase.red.visible = phase.red.totalMm > 0;
                        })
                      }
                      className="w-full bg-white border border-red-100 rounded px-1.5 sm:px-2 py-2 font-bold text-xs sm:text-sm text-red-900 focus:ring-2 focus:ring-red-500 outline-none text-center shadow-inner placeholder:text-red-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="positive-end-input"
                        className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase"
                      >
                        End Offset
                      </label>
                      <select
                        value={p.red.endRefPostIndex ?? p.posts.length - 1}
                        onChange={(e) =>
                          updatePhase((phase) => {
                            phase.red.endRefPostIndex = parseInt(
                              e.target.value,
                            );
                          })
                        }
                        className="text-[9px] bg-red-100 text-red-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-red-200"
                      >
                        {Array.from({ length: p.postCount }).map((_, i) => (
                          <option key={i} value={i}>
                            Post {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      id="positive-end-input"
                      name="positive-end-input"
                      type="number"
                      inputMode="numeric"
                      value={p.red.endMm === 0 ? "" : p.red.endMm}
                      placeholder="0"
                      onChange={(e) =>
                        updatePhase((phase) => {
                          phase.red.endMm =
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value) || 0;
                          const startRefIdx =
                            typeof phase.red.startRefPostIndex === "number"
                              ? phase.red.startRefPostIndex
                              : 0;
                          const endRefIdx =
                            typeof phase.red.endRefPostIndex === "number"
                              ? phase.red.endRefPostIndex
                              : phase.posts.length - 1;
                          const startRefAbs = phase.posts[startRefIdx] || 0;
                          const endRefAbs =
                            phase.posts[endRefIdx] || phase.postSpanMm;
                          phase.red.totalMm =
                            phase.red.startMm +
                            (endRefAbs - startRefAbs) +
                            phase.red.endMm;
                          phase.red.visible = phase.red.totalMm > 0;
                        })
                      }
                      className="w-full bg-white border border-red-100 rounded px-1.5 sm:px-2 py-2 font-bold text-xs sm:text-sm text-red-900 focus:ring-2 focus:ring-red-500 outline-none text-center shadow-inner placeholder:text-red-300"
                    />
                  </div>
                </div>

                {/* Negative Rail */}
                <div className="space-y-2 bg-blue-50/50 p-2 sm:p-3 rounded-md border border-blue-200/60 shadow-sm">
                  <div className="flex items-center justify-between border-b border-blue-200/50 pb-1 px-1">
                    <h4 className="text-[11px] sm:text-xs font-black text-blue-600 uppercase tracking-widest text-center flex-1 ml-4">
                      Negative (-)
                    </h4>
                    <button
                      onClick={() =>
                        updatePhase((phase) => {
                          phase.blue.visible = !phase.blue.visible;
                        })
                      }
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title={
                        p.blue.visible
                          ? "Hide Negative Rail"
                          : "Show Negative Rail"
                      }
                    >
                      {p.blue.visible ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <label
                      htmlFor="negative-total-input"
                      className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase text-center sm:text-left"
                    >
                      Total{" "}
                      <span className="text-zinc-400 normal-case">(mm)</span>
                    </label>
                    <input
                      id="negative-total-input"
                      name="negative-total-input"
                      type="number"
                      inputMode="numeric"
                      value={p.blue.totalMm === 0 ? "" : p.blue.totalMm}
                      placeholder="0"
                      onChange={(e) =>
                        updatePhase((phase) => {
                          const val =
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value) || 0;
                          phase.blue.totalMm = val;
                          phase.blue.visible = val > 0;
                          const startRefIdx =
                            typeof phase.red.startRefPostIndex === "number"
                              ? phase.red.startRefPostIndex
                              : 0;
                          const endRefIdx =
                            typeof phase.red.endRefPostIndex === "number"
                              ? phase.red.endRefPostIndex
                              : phase.posts.length - 1;
                          const startRefAbs = phase.posts[startRefIdx] || 0;
                          const endRefAbs =
                            phase.posts[endRefIdx] || phase.postSpanMm;
                          const redTipAbs = startRefAbs - phase.red.startMm;
                          const redEndAbs = endRefAbs + phase.red.endMm;

                          let blueTipAbs = redTipAbs + phase.blue.startMm;
                          if (phase.blue.startRefType === "post") {
                            const blueStartRefIdx =
                              typeof phase.blue.startRefPostIndex === "number"
                                ? phase.blue.startRefPostIndex
                                : 0;
                            blueTipAbs =
                              (phase.posts[blueStartRefIdx] || 0) -
                              phase.blue.startMm;
                          } else if (phase.blue.startRefType === "red-end") {
                            blueTipAbs = redEndAbs + phase.blue.startMm;
                          }

                          let blueEndAbs = blueTipAbs + val;
                          if (phase.blue.endRefType === "post") {
                            const blueEndRefIdx =
                              typeof phase.blue.endRefPostIndex === "number"
                                ? phase.blue.endRefPostIndex
                                : phase.posts.length - 1;
                            phase.blue.endMm =
                              blueEndAbs -
                              (phase.posts[blueEndRefIdx] || phase.postSpanMm);
                          } else if (phase.blue.endRefType === "red-start") {
                            phase.blue.endMm = blueEndAbs - redTipAbs;
                          } else {
                            phase.blue.endMm = blueEndAbs - redEndAbs;
                          }
                        })
                      }
                      className="w-full bg-white border border-blue-100 rounded px-1.5 sm:px-2 py-2 font-black text-xs sm:text-sm text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner placeholder:text-blue-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="negative-start-input"
                        className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase"
                      >
                        Start Offset
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={p.blue.startRefType || "red-start"}
                          onChange={(e) =>
                            updatePhase((phase) => {
                              phase.blue.startRefType = e.target.value as any;
                            })
                          }
                          className="text-[9px] bg-blue-100 text-blue-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-blue-200"
                        >
                          <option value="red-start">(+) Rail Start</option>
                          <option value="red-end">(+) Rail End</option>
                          <option value="post">Post</option>
                        </select>
                        {p.blue.startRefType === "post" && (
                          <select
                            value={p.blue.startRefPostIndex ?? 0}
                            onChange={(e) =>
                              updatePhase((phase) => {
                                phase.blue.startRefPostIndex = parseInt(
                                  e.target.value,
                                );
                              })
                            }
                            className="text-[9px] bg-blue-100 text-blue-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-blue-200"
                          >
                            {Array.from({ length: p.postCount }).map((_, i) => (
                              <option key={i} value={i}>
                                Post {i + 1}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <input
                      id="negative-start-input"
                      name="negative-start-input"
                      type="number"
                      inputMode="numeric"
                      value={p.blue.startMm === 0 ? "" : p.blue.startMm}
                      placeholder="0"
                      onChange={(e) =>
                        updatePhase((phase) => {
                          phase.blue.startMm =
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value) || 0;
                        })
                      }
                      className="w-full bg-white border border-blue-100 rounded px-1.5 sm:px-2 py-2 font-bold text-xs sm:text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner placeholder:text-blue-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="negative-end-input"
                        className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase"
                      >
                        End Offset
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={p.blue.endRefType || "red-end"}
                          onChange={(e) =>
                            updatePhase((phase) => {
                              phase.blue.endRefType = e.target.value as any;
                            })
                          }
                          className="text-[9px] bg-blue-100 text-blue-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-blue-200"
                        >
                          <option value="red-end">(+) Rail End</option>
                          <option value="red-start">(+) Rail Start</option>
                          <option value="post">Post</option>
                        </select>
                        {p.blue.endRefType === "post" && (
                          <select
                            value={p.blue.endRefPostIndex ?? p.postCount - 1}
                            onChange={(e) =>
                              updatePhase((phase) => {
                                phase.blue.endRefPostIndex = parseInt(
                                  e.target.value,
                                );
                              })
                            }
                            className="text-[9px] bg-blue-100 text-blue-800 rounded-sm outline-none cursor-pointer px-1 py-0.5 border border-blue-200"
                          >
                            {Array.from({ length: p.postCount }).map((_, i) => (
                              <option key={i} value={i}>
                                Post {i + 1}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <input
                      id="negative-end-input"
                      name="negative-end-input"
                      type="number"
                      inputMode="numeric"
                      value={p.blue.endMm === 0 ? "" : p.blue.endMm}
                      placeholder="0"
                      onChange={(e) =>
                        updatePhase((phase) => {
                          phase.blue.endMm =
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value) || 0;
                        })
                      }
                      className="w-full bg-white border border-blue-100 rounded px-1.5 sm:px-2 py-2 font-bold text-xs sm:text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none text-center shadow-inner placeholder:text-blue-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Connectors */}
            <div className="lg:col-span-4 space-y-3 bg-zinc-50/80 p-3 rounded-lg border border-zinc-100 shadow-sm">
              <h4 className="flex items-center justify-between text-[11px] font-black text-zinc-500 uppercase tracking-widest border-b pb-1">
                <span>Connectors</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-200 font-mono text-zinc-600 rounded">
                  {p.lugs.length}
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Form Side */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex bg-zinc-200/50 p-0.5 rounded border border-zinc-200">
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, rail: "red" }))}
                      className={`flex-1 text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.rail === "red" ? "bg-red-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      + RED
                    </button>
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, rail: "blue" }))}
                      className={`flex-1 text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.rail === "blue" ? "bg-blue-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      - BLU
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1 bg-zinc-200/50 p-1 rounded border border-zinc-200">
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, type: "1" }))}
                      className={`text-[10px] sm:text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.type === "1" ? "bg-white shadow-sm text-zinc-900 border border-zinc-200/50" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      1-Lug
                    </button>
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, type: "5" }))}
                      className={`text-[10px] sm:text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.type === "5" ? "bg-white shadow-sm text-zinc-900 border border-zinc-200/50" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      5-Lug
                    </button>
                    <button
                      onClick={() =>
                        setNewLug((l) => ({ ...l, type: "ground" }))
                      }
                      className={`text-[9.5px] sm:text-[10px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.type === "ground" ? "bg-white shadow-sm text-green-700 border border-zinc-200/50" : "text-zinc-500 hover:text-green-700"}`}
                    >
                      GS Cable
                    </button>
                    <button
                      onClick={() =>
                        setNewLug((l) => ({ ...l, type: "blue-light" }))
                      }
                      className={`text-[9.5px] sm:text-[10px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.type === "blue-light" ? "bg-white shadow-sm text-blue-700 border border-zinc-200/50" : "text-zinc-500 hover:text-blue-700"}`}
                    >
                      Blue L.
                    </button>
                  </div>

                  <div className="flex bg-zinc-200/50 p-0.5 rounded border border-zinc-200">
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, ref: "start" }))}
                      className={`flex-1 text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.ref === "start" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      Start
                    </button>
                    <button
                      onClick={() => setNewLug((l) => ({ ...l, ref: "end" }))}
                      className={`flex-1 text-[11px] py-1.5 sm:py-2 rounded-[3px] font-bold transition-all ${newLug.ref === "end" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      End
                    </button>
                  </div>

                  <label htmlFor="dist-input" className="sr-only">
                    Distance (mm)
                  </label>
                  <input
                    id="dist-input"
                    name="dist-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="Distance (mm)"
                    value={newLug.dist}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setNewLug((l) => ({ ...l, dist: val }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newLug.dist) handleAddLug();
                      }
                    }}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-2 sm:py-2.5 text-sm sm:text-base font-bold focus:ring-2 focus:ring-zinc-900 outline-none text-center shadow-inner placeholder:text-zinc-400 placeholder:font-normal"
                  />

                  <button
                    type="button"
                    onClick={handleAddLug}
                    disabled={!newLug.dist}
                    className="w-full bg-zinc-900 text-white rounded py-2.5 text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Plus size={14} /> Add Connector
                  </button>
                </div>

                {/* List Side */}
                <div className="bg-zinc-100/50 rounded-md p-1.5 border border-zinc-200/80 flex flex-col h-full min-h-[160px]">
                  {p.lugs.length > 0 ? (
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={p.lugs}
                      onReorder={(newLugs) =>
                        updatePhase((phase) => {
                          phase.lugs = newLugs;
                        })
                      }
                      className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 flex-1"
                    >
                      {p.lugs.map((lug) => (
                        <LugItem
                          key={lug.id}
                          lug={lug}
                          updatePhase={updatePhase}
                        />
                      ))}
                    </Reorder.Group>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs font-medium italic py-4">
                      No connectors added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ghosted Attachments */}
            <div className="lg:col-span-4 space-y-3 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-md mt-4">
              <h4 className="flex items-center justify-between text-xs font-black text-zinc-300 uppercase tracking-widest border-b border-zinc-700 pb-2">
                <span>Ghosted Attachments</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">
                    Layout Start
                  </span>
                  {(() => {
                    const activeAtts =
                      p.startAttachments ??
                      (["cis", "iso", "ramp", "exp"] as const).filter(
                        (t) => p[t]?.start,
                      );
                    return (
                      <>
                        {activeAtts.length > 0 && (
                          <Reorder.Group
                            as="div"
                            axis="y"
                            values={activeAtts}
                            onReorder={(arr) =>
                              updatePhase((ph) => {
                                ph.startAttachments = arr;
                              })
                            }
                            className="space-y-1"
                          >
                            {activeAtts.map((t) => (
                              <AttachmentItem
                                key={t}
                                type={t}
                                updatePhase={updatePhase}
                                isStart={true}
                              />
                            ))}
                          </Reorder.Group>
                        )}
                        <div className="flex gap-2">
                          {(["cis", "iso", "ramp", "exp"] as const).map((t) => {
                            if (activeAtts.includes(t)) return null;
                            return (
                              <button
                                type="button"
                                key={t}
                                onClick={() =>
                                  updatePhase((phase) => {
                                    const current =
                                      phase.startAttachments ??
                                      (
                                        ["cis", "iso", "ramp", "exp"] as const
                                      ).filter((typ) => phase[typ]?.start);
                                    phase.startAttachments = [...current, t];
                                    phase[t] = {
                                      ...(phase[t] || {
                                        start: false,
                                        end: false,
                                      }),
                                    };
                                    phase[t]!.start = true;
                                  })
                                }
                                className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                              >
                                + {t.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">
                    Layout End
                  </span>
                  {(() => {
                    const activeAtts =
                      p.endAttachments ??
                      (["cis", "iso", "ramp", "exp"] as const).filter(
                        (t) => p[t]?.end,
                      );
                    return (
                      <>
                        {activeAtts.length > 0 && (
                          <Reorder.Group
                            as="div"
                            axis="y"
                            values={activeAtts}
                            onReorder={(arr) =>
                              updatePhase((ph) => {
                                ph.endAttachments = arr;
                              })
                            }
                            className="space-y-1"
                          >
                            {activeAtts.map((t) => (
                              <AttachmentItem
                                key={t}
                                type={t}
                                updatePhase={updatePhase}
                                isStart={false}
                              />
                            ))}
                          </Reorder.Group>
                        )}
                        <div className="flex gap-2">
                          {(["cis", "iso", "ramp", "exp"] as const).map((t) => {
                            if (activeAtts.includes(t)) return null;
                            return (
                              <button
                                type="button"
                                key={t}
                                onClick={() =>
                                  updatePhase((phase) => {
                                    const current =
                                      phase.endAttachments ??
                                      (
                                        ["cis", "iso", "ramp", "exp"] as const
                                      ).filter((typ) => phase[typ]?.end);
                                    phase.endAttachments = [...current, t];
                                    phase[t] = {
                                      ...(phase[t] || {
                                        start: false,
                                        end: false,
                                      }),
                                    };
                                    phase[t]!.end = true;
                                  })
                                }
                                className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                              >
                                + {t.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
