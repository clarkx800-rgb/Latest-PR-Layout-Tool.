import React, { useEffect, useRef, useState, MouseEvent } from "react";
import { Delete, CornerDownLeft } from "lucide-react";
import {
  type Phase,
  type Hitbox,
  type HitboxType,
  type AppState,
} from "../types";
import { RENDER_CONFIG } from "../constants";
import {
  drawLayout,
  getBasePixPerMm,
  getAbsoluteMm,
  getVisualMm,
  getMargins,
} from "../utils/drawer";

interface CanvasLayoutProps {
  phase: Phase;
  state: AppState;
  startPostNum: number;
  updatePhase: (updater: (p: Phase) => void, saveHistory?: boolean) => void;
  updateState: (updater: (s: AppState) => AppState) => void;
  onNavPrev?: () => void;
  onNavNext?: () => void;
  prefs?: any;
}

export const CanvasLayout = ({
  phase,
  state,
  startPostNum,
  updatePhase,
  updateState,
  onNavPrev,
  onNavNext,
  prefs,
}: CanvasLayoutProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCanvasToDomTransforms = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const rect = container.getBoundingClientRect();
    const scale = Math.min(
      rect.width / canvas.width,
      rect.height / canvas.height,
    );
    const renderedWidth = canvas.width * scale;
    const renderedHeight = canvas.height * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    return {
      rect,
      scale,
      offsetX,
      offsetY,
      toInternal: (clientX: number, clientY: number) => ({
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      }),
      toScreen: (
        internalX: number,
        internalY: number,
        internalW: number,
        internalH: number,
      ) => ({
        left: internalX * scale + offsetX,
        top: internalY * scale + offsetY,
        width: internalW * scale,
        height: internalH * scale,
      }),
    };
  };

  // We keep a local transient state for panning during touch actions
  // to avoid causing heavy React re-renders up the tree.
  const [localPan, setLocalPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const activeDragHandle = useRef<HitboxType | null>(null);

  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressActiveRef = useRef(false);

  const hitboxesRef = useRef<Hitbox[]>([]);
  const [editingHitbox, setEditingHitbox] = useState<{
    hitbox: Hitbox;
    strValue: string;
  } | null>(null);
  const [confirmDeleteHitboxId, setConfirmDeleteHitboxId] = useState<
    string | null
  >(null);

  const [hoveredHitbox, setHoveredHitbox] = useState<string | null>(null);
  const [pointerRaw, setPointerRaw] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [tempOverrides, setTempOverrides] = useState<{
    rail: "red" | "blue";
    startMm?: number;
    endMm?: number;
  } | null>(null);

  // Reset local pan when phase pan changes from outside
  useEffect(() => {
    setLocalPan({ x: phase.view.panX, y: phase.view.panY });
  }, [phase.view.panX, phase.view.panY, phase.view.scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const transforms = getCanvasToDomTransforms();
      if (!transforms) return;

      if (e.ctrlKey || e.metaKey) {
        updatePhase((p) => {
          const pt = transforms.toInternal(e.clientX, e.clientY);
          const internalX = pt.x;
          const internalY = pt.y;

          const worldX = (internalX - p.view.panX) / p.view.scale;
          const worldY = (internalY - p.view.panY) / p.view.scale;

          const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
          const newScale = Math.max(
            0.3,
            Math.min(p.view.scale * zoomFactor, 5),
          );

          p.view.panX = internalX - worldX * newScale;
          p.view.panY = internalY - worldY * newScale;
          p.view.scale = newScale;
        }, false);
      } else {
        updatePhase((p) => {
          p.view.panX -= e.deltaX / transforms.scale;
          p.view.panY -= e.deltaY / transforms.scale;
        }, false);
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [phase, updatePhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let renderRed = { ...phase.red };
    let renderBlue = { ...phase.blue };

    if (tempOverrides) {
      if (tempOverrides.rail === "red") {
        renderRed = { ...renderRed, ...tempOverrides };
        const startRefIdx =
          typeof renderRed.startRefPostIndex === "number"
            ? renderRed.startRefPostIndex
            : 0;
        const endRefIdx =
          typeof renderRed.endRefPostIndex === "number"
            ? renderRed.endRefPostIndex
            : phase.posts.length - 1;
        const startRefAbs = phase.posts[startRefIdx] || 0;
        const endRefAbs = phase.posts[endRefIdx] || phase.postSpanMm;
        renderRed.totalMm =
          renderRed.startMm + (endRefAbs - startRefAbs) + renderRed.endMm;
      } else if (tempOverrides.rail === "blue") {
        renderBlue = { ...renderBlue, ...tempOverrides };
        const startRefIdx =
          typeof renderRed.startRefPostIndex === "number"
            ? renderRed.startRefPostIndex
            : 0;
        const startRefAbs = phase.posts[startRefIdx] || 0;
        const endRefIdx =
          typeof renderRed.endRefPostIndex === "number"
            ? renderRed.endRefPostIndex
            : phase.posts.length - 1;
        const endRefAbs = phase.posts[endRefIdx] || phase.postSpanMm;

        const redTipAbs = startRefAbs - renderRed.startMm;
        const blueTipAbs = redTipAbs + renderBlue.startMm;
        const redEndAbs = endRefAbs + renderRed.endMm;
        const blueEndAbs = redEndAbs + renderBlue.endMm;
        renderBlue.totalMm = blueEndAbs - blueTipAbs;
      }
    }

    // Use a copy of the phase with the local ephemeral panning coordinates
    const renderPhase: Phase = {
      ...phase,
      red: renderRed,
      blue: renderBlue,
      view: {
        ...phase.view,
        panX: localPan.x,
        panY: localPan.y,
      },
    };

    const showMagnifier =
      pointerRaw &&
      (activeDragHandle.current || hoveredHitbox?.includes("-handle"));

    hitboxesRef.current = [];
    drawLayout(
      ctx,
      renderPhase,
      canvas.width,
      canvas.height,
      state.isRTL,
      startPostNum,
      hitboxesRef.current,
      phase.showPosts ?? true,
      showMagnifier ? pointerRaw : null,
      false,
      hoveredHitbox,
      activeDragHandle.current,
      !!state.indicatorsFlipped,
      state.activeIndex,
      state.phases.length,
      state.wo,
      state.ts,
      state.subSub,
      prefs?.unit,
    );
  }, [
    phase,
    state.isRTL,
    startPostNum,
    localPan,
    phase.showPosts,
    tempOverrides,
    pointerRaw,
    hoveredHitbox,
    state.indicatorsFlipped,
    state.activeIndex,
    state.phases.length,
    state.wo,
    state.ts,
    state.subSub,
  ]);

  const handlePointerDown = (e: React.PointerEvent) => {
    lastPos.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    if (canvasRef.current && containerRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);

      const transforms = getCanvasToDomTransforms();
      if (!transforms) return;

      const pt = transforms.toInternal(e.clientX, e.clientY);
      const internalX = pt.x;
      const internalY = pt.y;

      const worldX = (internalX - localPan.x) / phase.view.scale;
      const worldY = (internalY - localPan.y) / phase.view.scale;

      let hit: Hitbox | null = null;
      for (const h of hitboxesRef.current) {
        if (
          worldX >= h.x &&
          worldX <= h.x + h.w &&
          worldY >= h.y &&
          worldY <= h.y + h.h
        ) {
          hit = h;
          break;
        }
      }

      longPressActiveRef.current = false;
      if (hit && hit.type.includes("-handle")) {
        activeDragHandle.current = hit.type;
        isPanning.current = false;
      } else {
        isPanning.current = true;
      }

      if (
        hit &&
        (hit.type === "red-rail-body" || hit.type === "blue-rail-body")
      ) {
        longPressTimerRef.current = setTimeout(() => {
          longPressActiveRef.current = true;
          updatePhase((p) => {
            if (hit!.type === "red-rail-body")
              p.red.isCutToFit = !p.red.isCutToFit;
            if (hit!.type === "blue-rail-body")
              p.blue.isCutToFit = !p.blue.isCutToFit;
          });
          setEditingHitbox(null);
        }, 500); // 500ms long press
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Clear long press if pointer moves significantly
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if ((dx > 5 || dy > 5) && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const transforms = getCanvasToDomTransforms();
    if (!transforms) return;

    const pt = transforms.toInternal(e.clientX, e.clientY);
    const internalX = pt.x;
    const internalY = pt.y;

    setPointerRaw({ x: internalX, y: internalY });

    const worldX = (internalX - localPan.x) / phase.view.scale;
    const worldY = (internalY - localPan.y) / phase.view.scale;

    // Hover detection
    if (!isPanning.current && !activeDragHandle.current) {
      let hit: Hitbox | null = null;
      for (const h of hitboxesRef.current) {
        const isScreenSpace =
          h.type === "flip-indicators" ||
          h.type === "nav-prev" ||
          h.type === "nav-next";
        const checkX = isScreenSpace ? internalX : worldX;
        const checkY = isScreenSpace ? internalY : worldY;
        if (
          checkX >= h.x &&
          checkX <= h.x + h.w &&
          checkY >= h.y &&
          checkY <= h.y + h.h
        ) {
          hit = h;
          break;
        }
      }
      setHoveredHitbox(hit ? hit.id : null);
    }

    if (activeDragHandle.current) {
      // We are dragging a handle directly via pixel coordinates mapping tightly back to mm geometry
      const vMin = getVisualMm(phase.minMm, phase);
      const vMax = getVisualMm(phase.maxMm, phase);
      const m = getMargins(phase);
      const leftMargin = state.isRTL ? m.endPx : m.startPx;
      const rightMargin = state.isRTL ? m.startPx : m.endPx;

      const pixPerMm =
        (canvas.width - leftMargin - rightMargin) / (vMax - vMin || 1);

      // Reverse of the new getPx linear formula
      let vMm;
      if (state.isRTL) {
        // return (canvasWidth - rightMargin) - (offsetFromMin * pixPerMm);
        // worldX = (canvas.width - rightMargin) - ((vMm - vMin) * pixPerMm)
        // ((vMm - vMin) * pixPerMm) = (canvas.width - rightMargin) - worldX
        // vMm = (((canvas.width - rightMargin) - worldX) / pixPerMm) + vMin
        vMm = (canvas.width - rightMargin - worldX) / pixPerMm + vMin;
      } else {
        // return leftMargin + (offsetFromMin * pixPerMm);
        // worldX = leftMargin + ((vMm - vMin) * pixPerMm)
        // ((vMm - vMin) * pixPerMm) = worldX - leftMargin
        // vMm = ((worldX - leftMargin) / pixPerMm) + vMin
        vMm = (worldX - leftMargin) / pixPerMm + vMin;
      }

      const realMm = getAbsoluteMm(vMm, phase);

      const handleType = activeDragHandle.current;
      const snapStep = e.shiftKey ? 1 : 10;

      const snap = (val: number) => Math.round(val / snapStep) * snapStep;

      setTempOverrides((prev) => {
        const next = prev
          ? { ...prev }
          : {
              rail: handleType.includes("red")
                ? "red"
                : ("blue" as "red" | "blue"),
            };

        const startRefIdx =
          typeof phase.red.startRefPostIndex === "number"
            ? phase.red.startRefPostIndex
            : 0;
        const endRefIdx =
          typeof phase.red.endRefPostIndex === "number"
            ? phase.red.endRefPostIndex
            : phase.posts.length - 1;
        const startRefAbs = phase.posts[startRefIdx] || 0;
        const endRefAbs = phase.posts[endRefIdx] || phase.postSpanMm;

        const redTipAbsoluteMm = startRefAbs - phase.red.startMm;
        const redEndAbsoluteMm = endRefAbs + phase.red.endMm;

        if (handleType === "red-start-handle") {
          next.startMm = snap(startRefAbs - realMm);
        } else if (handleType === "blue-start-handle") {
          let refAbsMm = redTipAbsoluteMm;
          if (phase.blue.startRefType === "post") {
            const blueStartRefIdx =
              typeof phase.blue.startRefPostIndex === "number"
                ? phase.blue.startRefPostIndex
                : 0;
            refAbsMm = phase.posts[blueStartRefIdx] || 0;
          } else if (phase.blue.startRefType === "red-end")
            refAbsMm = redEndAbsoluteMm;

          if (phase.blue.startRefType === "post") {
            next.startMm = snap(refAbsMm - realMm);
          } else {
            next.startMm = snap(realMm - refAbsMm);
          }
        } else if (handleType === "red-end-handle") {
          next.endMm = snap(realMm - endRefAbs);
        } else if (handleType === "blue-end-handle") {
          let refAbsMm = redEndAbsoluteMm;
          if (phase.blue.endRefType === "post") {
            const blueEndRefIdx =
              typeof phase.blue.endRefPostIndex === "number"
                ? phase.blue.endRefPostIndex
                : phase.posts.length - 1;
            refAbsMm = phase.posts[blueEndRefIdx] || phase.postSpanMm;
          } else if (phase.blue.endRefType === "red-start")
            refAbsMm = redTipAbsoluteMm;

          next.endMm = snap(realMm - refAbsMm);
        }
        return next;
      });
    } else if (isPanning.current) {
      const dx = (e.clientX - lastPos.current.x) / transforms.scale;
      const dy = (e.clientY - lastPos.current.y) / transforms.scale;

      setLocalPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }

    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    if (activeDragHandle.current) {
      // Commit CAD handle drag adjustments
      updatePhase((p) => {
        const handleType = activeDragHandle.current;
        const startRefIdx =
          typeof p.red.startRefPostIndex === "number"
            ? p.red.startRefPostIndex
            : 0;
        const endRefIdx =
          typeof p.red.endRefPostIndex === "number"
            ? p.red.endRefPostIndex
            : p.posts.length - 1;
        const startRefAbs = p.posts[startRefIdx] || 0;
        const endRefAbs = p.posts[endRefIdx] || p.postSpanMm;

        if (
          handleType === "red-start-handle" &&
          tempOverrides?.startMm !== undefined
        ) {
          p.red.startMm = tempOverrides.startMm;
          p.red.totalMm = Math.min(9999, p.red.startMm + (endRefAbs - startRefAbs) + p.red.endMm);
        } else if (
          handleType === "blue-start-handle" &&
          tempOverrides?.startMm !== undefined
        ) {
          p.blue.startMm = tempOverrides.startMm;
        } else if (
          handleType === "red-end-handle" &&
          tempOverrides?.endMm !== undefined
        ) {
          p.red.endMm = tempOverrides.endMm;
          p.red.totalMm = Math.min(9999, p.red.startMm + (endRefAbs - startRefAbs) + p.red.endMm);
        } else if (
          handleType === "blue-end-handle" &&
          tempOverrides?.endMm !== undefined
        ) {
          p.blue.endMm = tempOverrides.endMm;
        }
      });
      activeDragHandle.current = null;
      setTempOverrides(null);
    }

    const wasPanning = isPanning.current;
    isPanning.current = false;

    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Tap detection
    if (dx < 5 && dy < 5 && canvas && container) {
      const transforms = getCanvasToDomTransforms();
      if (!transforms) return;

      const pt = transforms.toInternal(e.clientX, e.clientY);
      const internalX = pt.x;
      const internalY = pt.y;

      const worldX = (internalX - localPan.x) / phase.view.scale;
      const worldY = (internalY - localPan.y) / phase.view.scale;

      let hit: Hitbox | null = null;
      for (const h of hitboxesRef.current) {
        const isScreenSpace =
          h.type === "flip-indicators" ||
          h.type === "nav-prev" ||
          h.type === "nav-next";
        const checkX = isScreenSpace ? internalX : worldX;
        const checkY = isScreenSpace ? internalY : worldY;
        if (
          !h.type.includes("-handle") &&
          checkX >= h.x &&
          checkX <= h.x + h.w &&
          checkY >= h.y &&
          checkY <= h.y + h.h
        ) {
          hit = h;
          break;
        }
      }

      if (hit?.type === "nav-prev") {
        onNavPrev?.();
        setEditingHitbox(null);
      } else if (hit?.type === "nav-next") {
        onNavNext?.();
        setEditingHitbox(null);
      } else if (hit?.type === "flip-indicators") {
        updateState((s) => {
          return { ...s, indicatorsFlipped: !s.indicatorsFlipped };
        });
        setEditingHitbox(null);
      } else if (hit?.type === "post-toggle") {
        updatePhase((p) => {
          const currentGhosted = p.ghostedPosts ? [...p.ghostedPosts] : [];
          const hitValue = hit!.value as number;
          const index = currentGhosted.indexOf(hitValue);
          if (index > -1) {
            currentGhosted.splice(index, 1);
          } else {
            currentGhosted.push(hitValue);
          }
          p.ghostedPosts = currentGhosted;
        });
        setEditingHitbox(null);
      } else if (hit?.type === "rail-visibility-toggle") {
        updatePhase((p) => {
          if (hit!.id === "red-visibility-toggle") {
            p.red.visible = !p.red.visible;
          }
          if (hit!.id === "blue-visibility-toggle") {
            p.blue.visible = !p.blue.visible;
          }
        });
        setEditingHitbox(null);
      } else if (hit?.type === "red-rail-body") {
        if (!longPressActiveRef.current) {
          updatePhase((p) => {
            p.red.isCutToFit = !p.red.isCutToFit;
          });
        }
        setEditingHitbox(null);
      } else if (hit?.type === "blue-rail-body") {
        if (!longPressActiveRef.current) {
          updatePhase((p) => {
            p.blue.isCutToFit = !p.blue.isCutToFit;
          });
        }
        setEditingHitbox(null);
      } else if (hit) {
        setEditingHitbox({ hitbox: hit, strValue: hit.value.toString() });
      } else {
        setConfirmDeleteHitboxId(null);
        setEditingHitbox(null);
      }
    } else if (wasPanning) {
      // If it was a pan, sync the final pan to the parent state when they release
      updatePhase((p) => {
        p.view.panX = localPan.x;
        p.view.panY = localPan.y;
      }, false);
    }
  };

  const handleCommitEdit = (state: typeof editingHitbox) => {
    if (!state) return;
    const val = parseFloat(state.strValue);
    if (isNaN(val)) {
      setEditingHitbox(null);
      return;
    }

    updatePhase((p) => {
      const hit = state.hitbox;
      if (hit.type === "red-start") p.red.startMm = val;
      if (hit.type === "red-end") p.red.endMm = val;
      if (hit.type === "red-total") p.red.totalMm = Math.min(9999, val);
      if (hit.type === "blue-start") p.blue.startMm = val;
      if (hit.type === "blue-end") p.blue.endMm = val;
      if (hit.type === "blue-total") {
        p.blue.totalMm = Math.min(9999, val);
        const startRefIdx =
          typeof p.red.startRefPostIndex === "number"
            ? p.red.startRefPostIndex
            : 0;
        const endRefIdx =
          typeof p.red.endRefPostIndex === "number"
            ? p.red.endRefPostIndex
            : p.posts.length - 1;
        const startRefAbs = p.posts[startRefIdx] || 0;
        const endRefAbs = p.posts[endRefIdx] || p.postSpanMm;

        const redTipAbs = startRefAbs - p.red.startMm;
        const redEndAbs = endRefAbs + p.red.endMm;

        let blueTipAbs = redTipAbs + p.blue.startMm;
        if (p.blue.startRefType === "post") {
          const blueStartRefIdx =
            typeof p.blue.startRefPostIndex === "number"
              ? p.blue.startRefPostIndex
              : 0;
          blueTipAbs = (p.posts[blueStartRefIdx] || 0) - p.blue.startMm;
        } else if (p.blue.startRefType === "red-end") {
          blueTipAbs = redEndAbs + p.blue.startMm;
        }

        let blueEndAbs = blueTipAbs + val;
        if (p.blue.endRefType === "post") {
          const blueEndRefIdx =
            typeof p.blue.endRefPostIndex === "number"
              ? p.blue.endRefPostIndex
              : p.posts.length - 1;
          p.blue.endMm = blueEndAbs - (p.posts[blueEndRefIdx] || p.postSpanMm);
        } else if (p.blue.endRefType === "red-start") {
          p.blue.endMm = blueEndAbs - redTipAbs;
        } else {
          p.blue.endMm = blueEndAbs - redEndAbs;
        }
      }
      if (hit.type === "lug-dist") {
        const l = p.lugs.find((lg) => lg.id === hit.id);
        if (l) l.dist = val;
      }
    });
    setConfirmDeleteHitboxId(null);
    setEditingHitbox(null);
  };

  const getScreenRect = (hit: Hitbox) => {
    const transforms = getCanvasToDomTransforms();
    if (!transforms) return { left: 0, top: 0, width: 0, height: 0 };

    let internalX = hit.x;
    let internalY = hit.y;
    let internalW = hit.w;
    let internalH = hit.h;

    if (hit.type !== "flip-indicators") {
      internalX = hit.x * phase.view.scale + localPan.x;
      internalY = hit.y * phase.view.scale + localPan.y;
      internalW = hit.w * phase.view.scale;
      internalH = hit.h * phase.view.scale;
    }

    return transforms.toScreen(internalX, internalY, internalW, internalH);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative touch-none select-none ${hoveredHitbox?.includes("-handle") ? "cursor-ew-resize" : hoveredHitbox ? "cursor-pointer" : isPanning.current ? "cursor-grabbing" : "cursor-grab"}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={RENDER_CONFIG.DIMS.CANVAS_W}
        height={RENDER_CONFIG.DIMS.CANVAS_H}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full object-contain bg-white rounded-xl shadow-xl touch-none pointer-events-auto"
      />
      {editingHitbox &&
        (() => {
          const r = getScreenRect(editingHitbox.hitbox);
          if (editingHitbox.hitbox.type === "ghost-block") {
            const parts = editingHitbox.hitbox.id.split("-"); // e.g. "ghost-cis-start"
            const currentType = parts[1];
            const position = parts[2] as "start" | "end";

            const toggleGhost = (
              targetType: "cis" | "iso" | "ramp" | "exp",
            ) => {
              updatePhase((p) => {
                const currentVal = !!p[targetType]?.[position];
                const nextVal = !currentVal;

                p[targetType] = {
                  ...(p[targetType] || { start: false, end: false }),
                };
                p[targetType]![position] = nextVal;

                const arrKey =
                  position === "start" ? "startAttachments" : "endAttachments";
                let arr =
                  p[arrKey] ??
                  (["cis", "iso", "ramp", "exp"] as const).filter(
                    (t) => p[t]?.[position],
                  );

                if (nextVal) {
                  if (!arr.includes(targetType)) arr = [...arr, targetType];
                } else {
                  arr = arr.filter((t: string) => t !== targetType);
                }
                p[arrKey] = arr as any;
              });
            };

            const isTypeActive = (t: string) => {
              if (t === "cis") return phase.cis?.[position];
              if (t === "iso") return phase.iso?.[position];
              if (t === "ramp") return phase.ramp?.[position];
              if (t === "exp") return phase.exp?.[position];
              return false;
            };

            return (
              <div
                className="absolute z-50 flex flex-col items-stretch justify-center p-1 bg-zinc-800 shadow-2xl border-2 border-zinc-700 rounded-md gap-1"
                style={{
                  left: Math.max(0, r.left),
                  top: Math.max(0, r.top + r.height + 10),
                  minWidth: 140,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] text-zinc-500 px-2 flex justify-between py-1 uppercase font-black tracking-widest text-center border-b border-zinc-700 mb-1 items-center">
                  <span>Manage {position.toUpperCase()}</span>
                  <button
                    onClick={() => setEditingHitbox(null)}
                    className="text-zinc-400 hover:text-white p-1 -mr-2 bg-zinc-700 hover:bg-zinc-600 rounded"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                {(["cis", "iso", "ramp", "exp"] as const).map((t) => {
                  const isActive = isTypeActive(t);
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => toggleGhost(t)}
                      className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded transition-colors ${isActive ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
                    >
                      <span>{t.toUpperCase()}</span>
                      <div
                        className={`w-3 h-3 rounded flex items-center justify-center font-bold border ${isActive ? "bg-white border-white text-blue-600 text-[10px]" : "border-zinc-500"}`}
                      >
                        {isActive && "✓"}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          }

          const isRightEdge =
            containerRef.current &&
            r.left + 300 > containerRef.current.clientWidth;

          return (
            <>
              <div
                className="absolute inset-0 z-40 bg-black/10"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCommitEdit(editingHitbox);
                }}
              />
              <div
                className="absolute z-50 p-1 bg-white shadow-2xl border-2 border-blue-500 rounded-md ring-4 ring-blue-500/20"
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  left: r.left - 20,
                  top: r.top - 10,
                  width: Math.max(90, r.width + 40),
                  height: Math.max(40, r.height + 20),
                }}
              >
                <input
                  id="editing-hitbox-input"
                  name="editing-hitbox-input"
                  autoFocus
                  className="w-full h-full text-center font-bold outline-none text-blue-900 bg-transparent text-xl"
                  value={editingHitbox.strValue}
                  type="text"
                  inputMode="none"
                  style={{ WebkitTouchCallout: "none" }}
                  onFocus={(e) => e.target.select()}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onChange={(e) =>
                    setEditingHitbox((s) =>
                      s
                        ? {
                            ...s,
                            strValue: e.target.value.replace(/[^0-9.]/g, ""),
                          }
                        : null,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCommitEdit(editingHitbox);
                    else if (e.key === "Escape") {
                      setConfirmDeleteHitboxId(null);
                      setEditingHitbox(null);
                    }
                  }}
                />

                <div
                  className="absolute bg-zinc-900 p-1.5 rounded-xl shadow-2xl grid grid-cols-3 gap-1 border border-zinc-800 shrink-0 w-[150px] select-none"
                  style={{
                    WebkitTouchCallout: "none",
                    top: "50%",
                    transform: "translateY(-50%)",
                    ...(isRightEdge
                      ? { right: "100%", marginRight: "16px" }
                      : { left: "100%", marginLeft: "16px" }),
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const input = document.getElementById(
                          "editing-hitbox-input",
                        ) as HTMLInputElement;
                        if (input && document.activeElement === input) {
                          const start = input.selectionStart || 0;
                          const end = input.selectionEnd || 0;
                          setEditingHitbox((s) => {
                            if (!s) return s;
                            const newVal =
                              s.strValue.slice(0, start) +
                              n +
                              s.strValue.slice(end);
                            setTimeout(() => {
                              input.setSelectionRange(start + 1, start + 1);
                            }, 0);
                            return { ...s, strValue: newVal };
                          });
                        } else {
                          setEditingHitbox((s) =>
                            s ? { ...s, strValue: s.strValue + n } : null,
                          );
                        }
                      }}
                      className={`h-10 bg-zinc-800 text-white rounded-lg flex items-center justify-center text-xl font-bold hover:bg-zinc-700 active:bg-zinc-600 transition-colors ${n === 0 ? "col-start-2 row-start-4" : ""}`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => handleCommitEdit(editingHitbox)}
                    className="h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 transition-colors col-start-1 row-start-4"
                  >
                    <CornerDownLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const input = document.getElementById(
                        "editing-hitbox-input",
                      ) as HTMLInputElement;
                      if (input && document.activeElement === input) {
                        const start = input.selectionStart || 0;
                        const end = input.selectionEnd || 0;
                        setEditingHitbox((s) => {
                          if (!s) return s;
                          if (start === end && start > 0) {
                            const newVal =
                              s.strValue.slice(0, start - 1) +
                              s.strValue.slice(end);
                            setTimeout(() => {
                              input.setSelectionRange(start - 1, start - 1);
                            }, 0);
                            return { ...s, strValue: newVal };
                          } else if (start !== end) {
                            const newVal =
                              s.strValue.slice(0, start) +
                              s.strValue.slice(end);
                            setTimeout(() => {
                              input.setSelectionRange(start, start);
                            }, 0);
                            return { ...s, strValue: newVal };
                          }
                          return s;
                        });
                      } else {
                        setEditingHitbox((s) =>
                          s
                            ? { ...s, strValue: s.strValue.slice(0, -1) }
                            : null,
                        );
                      }
                    }}
                    className="h-10 bg-zinc-800 text-red-400 rounded-lg flex items-center justify-center hover:bg-zinc-700 active:bg-zinc-600 transition-colors col-start-3 row-start-4"
                  >
                    <Delete size={18} />
                  </button>
                  {editingHitbox.hitbox.type === "lug-dist" && (
                    <div className="col-span-3 mt-1 flex">
                      {confirmDeleteHitboxId === editingHitbox.hitbox.id ? (
                        <div className="flex w-full gap-1">
                          <button
                            type="button"
                            className="flex-1 h-10 bg-red-600 text-white font-bold rounded flex items-center justify-center text-sm hover:bg-red-500"
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => {
                              updatePhase((p) => {
                                p.lugs = p.lugs.filter(
                                  (l) => l.id !== editingHitbox.hitbox.id,
                                );
                              });
                              setEditingHitbox(null);
                              setConfirmDeleteHitboxId(null);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="flex-1 h-10 bg-zinc-700 text-white font-bold rounded flex items-center justify-center text-sm hover:bg-zinc-600"
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => setConfirmDeleteHitboxId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex-1 w-full h-10 bg-zinc-800 text-red-500 font-bold rounded flex items-center justify-center text-sm hover:bg-zinc-700 transition-colors"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() =>
                            setConfirmDeleteHitboxId(editingHitbox.hitbox.id)
                          }
                        >
                          Remove Connector
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
    </div>
  );
};
