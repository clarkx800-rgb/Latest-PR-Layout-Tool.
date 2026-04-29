import { type Phase, type Hitbox, type HitboxType } from "../types";
import { RENDER_CONFIG } from "../constants";
import { getCutToFitLength } from "./math";

export const getVisualMm = (mm: number, p: Phase) => {
  return mm;
};

export const getAbsoluteMm = (vMm: number, p: Phase) => {
  return vMm;
};

export const getMargins = (p: Phase) => {
  let startGhosts = 0,
    endGhosts = 0;
  if (p.cis?.start) startGhosts++;
  if (p.iso?.start) startGhosts++;
  if (p.ramp?.start) startGhosts++;
  if (p.exp?.start) startGhosts++;

  if (p.cis?.end) endGhosts++;
  if (p.iso?.end) endGhosts++;
  if (p.ramp?.end) endGhosts++;
  if (p.exp?.end) endGhosts++;

  // Calculate pixel width used by ghost blocks extending outwards
  const lGhostsW = startGhosts > 0 ? (startGhosts - 1) * 90 + 80 : 0;
  const rGhostsW = endGhosts > 0 ? (endGhosts - 1) * 90 + 80 : 0;

  // Ensure left and right empty spaces are equal for perfect physical centering
  const basePadding = 120;

  return { 
    startPx: basePadding + lGhostsW, 
    endPx: basePadding + rGhostsW 
  };
};

export const getBasePixPerMm = (p: Phase, canvasWidth: number) => {
  const m = getMargins(p);
  const vMin = getVisualMm(p.minMm, p);
  const vMax = getVisualMm(p.maxMm, p);
  return (canvasWidth - m.startPx - m.endPx) / (vMax - vMin || 1);
};

const getPx = (mm: number, p: Phase, canvasWidth: number, isRTL: boolean) => {
  const m = getMargins(p);
  const leftMargin = isRTL ? m.endPx : m.startPx;
  const rightMargin = isRTL ? m.startPx : m.endPx;

  const vMm = getVisualMm(mm, p);
  const vMin = getVisualMm(p.minMm, p);
  const vMax = getVisualMm(p.maxMm, p);

  const pixPerMm =
    (canvasWidth - leftMargin - rightMargin) / (vMax - vMin || 1);
  const offsetFromMin = vMm - vMin;

  if (isRTL) {
    return canvasWidth - rightMargin - offsetFromMin * pixPerMm;
  } else {
    return leftMargin + offsetFromMin * pixPerMm;
  }
};

const drawDim = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  label: string,
  color: string,
  hitboxParams?: {
    hitboxes: Hitbox[];
    id: string;
    type: HitboxType;
    value: number;
    isHovered?: boolean;
  },
  invert: boolean = false,
) => {
  const leftX = Math.min(x1, x2);
  const rightX = Math.max(x1, x2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX - 5, y);
  ctx.lineTo(rightX + 5, y);
  ctx.moveTo(leftX, y - 8);
  ctx.lineTo(leftX, y + 8);
  ctx.moveTo(rightX, y - 8);
  ctx.lineTo(rightX, y + 8);
  ctx.stroke();

  const midX = leftX + (rightX - leftX) / 2;
  const isHovered = hitboxParams?.isHovered;
  const boxY = invert ? y - 4 : y - 40;
  const textY = invert ? y + 6 : y - 6;

  let textWidth = 0;
  ctx.font = "bold 21px Inter, sans-serif";
  if (label.includes("≯")) {
    const parts = label.split("≯");
    const w1 = ctx.measureText(parts[0]).width;
    ctx.font = "bold 34px Inter, sans-serif";
    const wBig = ctx.measureText("≯").width;
    ctx.font = "bold 21px Inter, sans-serif";
    const w2 = ctx.measureText(parts[1]).width;
    textWidth = w1 + wBig + w2;
  } else {
    textWidth = ctx.measureText(label).width;
  }

  if (isHovered) {
    ctx.save();
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    if ((ctx as any).roundRect) {
      ctx.beginPath();
      (ctx as any).roundRect(
        midX - textWidth / 2 - 15,
        boxY,
        textWidth + 30,
        44,
        6,
      );
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(midX - textWidth / 2 - 15, boxY, textWidth + 30, 44);
      ctx.strokeRect(midX - textWidth / 2 - 15, boxY, textWidth + 30, 44);
    }
    ctx.restore();
  }

  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.textBaseline = invert ? "top" : "bottom";

  if (label.includes("≯")) {
    const parts = label.split("≯");
    const p1 = parts[0];
    const p2 = parts[1];
    
    ctx.font = "bold 21px Inter, sans-serif";
    const w1 = ctx.measureText(p1).width;
    ctx.font = "bold 34px Inter, sans-serif";
    const wBig = ctx.measureText("≯").width;
    
    let currX = midX - textWidth / 2;
    ctx.textAlign = "left";
    
    ctx.font = "bold 21px Inter, sans-serif";
    ctx.strokeText(p1, currX, textY);
    ctx.fillStyle = isHovered ? "#059669" : color;
    ctx.fillText(p1, currX, textY);
    currX += w1;
    
    ctx.font = "bold 34px Inter, sans-serif";
    ctx.strokeText("≯", currX, textY + (invert ? -1 : 3)); 
    ctx.fillStyle = isHovered ? "#059669" : color;
    ctx.fillText("≯", currX, textY + (invert ? -1 : 3));
    currX += wBig;
    
    ctx.font = "bold 21px Inter, sans-serif";
    ctx.strokeText(p2, currX, textY);
    ctx.fillStyle = isHovered ? "#059669" : color;
    ctx.fillText(p2, currX, textY);
  } else {
    ctx.textAlign = "center";
    ctx.font = "bold 21px Inter, sans-serif";
    ctx.strokeText(label, midX, textY);
    ctx.fillStyle = isHovered ? "#059669" : color;
    ctx.fillText(label, midX, textY);
  }

  if (hitboxParams) {
    hitboxParams.hitboxes.push({
      id: hitboxParams.id,
      type: hitboxParams.type,
      x: midX - textWidth / 2 - 15,
      y: boxY,
      w: textWidth + 30,
      h: 44,
      value: hitboxParams.value,
    });
  }
};

export const drawLayout = (
  ctx: CanvasRenderingContext2D,
  phase: Phase,
  canvasWidth: number,
  canvasHeight: number,
  isRTL: boolean,
  startPostNum: number,
  hitboxes: Hitbox[] = [],
  showPosts: boolean = true,
  magnifierPos?: { x: number; y: number } | null,
  isExport: boolean = false,
  hoveredHitbox: string | null = null,
  activeDragHandle: string | null = null,
  indicatorsFlipped: boolean = false,
  activeIndex: number = 0,
  totalPhases: number = 1,
  wo?: string,
  ts?: string,
  subSub?: string,
) => {
  // Clear and draw background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw Grid
  ctx.strokeStyle = RENDER_CONFIG.COLORS.GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < canvasWidth; x += 50) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }
  for (let y = 0; y < canvasHeight; y += 50) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }
  ctx.stroke();

  ctx.save();
  ctx.translate(phase.view.panX, phase.view.panY);
  ctx.scale(phase.view.scale, phase.view.scale);

  const midY = canvasHeight / 2;
  const basePixPerMm = getBasePixPerMm(phase, canvasWidth);

  const SPACING = Math.max(40, RENDER_CONFIG.DIMS.SPACING_MM * basePixPerMm);
  const RAIL_H = Math.max(10, RENDER_CONFIG.DIMS.RAIL_H_MM * basePixPerMm);
  const POST_W = Math.max(10, RENDER_CONFIG.DIMS.POST_W_MM * basePixPerMm);
  const POST_EXTRA_H = Math.max(
    20,
    RENDER_CONFIG.DIMS.POST_EXTRA_H_MM * basePixPerMm,
  );

  const redY = midY - SPACING / 2;
  const blueY = midY + SPACING / 2;

  const firstPostPx = getPx(0, phase, canvasWidth, isRTL);
  const lastPostPx = getPx(phase.postSpanMm, phase, canvasWidth, isRTL);

  // Draw Posts
  if (showPosts && (phase.red.visible || phase.blue.visible)) {
    const numPosts = phase.posts.length;
    phase.posts.forEach((pMm, i) => {
      const px = getPx(pMm, phase, canvasWidth, isRTL);
      const isGhosted = phase.ghostedPosts?.includes(i);
      const isHovered = hoveredHitbox === `post-${i}`;

      const postH = SPACING + POST_EXTRA_H;
      ctx.save();

      if (isGhosted) {
        ctx.fillStyle = isHovered
          ? "rgba(100, 100, 100, 0.15)"
          : "rgba(200, 200, 200, 0.1)";
        ctx.strokeStyle = isHovered ? "#666666" : "#a0a0a0";
        // ISO phantom line pattern: long dash, short gap, short dash, short gap, short dash, short gap
        ctx.setLineDash([12, 4, 4, 4, 4, 4]);
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = isHovered ? "#333333" : RENDER_CONFIG.COLORS.BLACK;
        ctx.strokeStyle = RENDER_CONFIG.COLORS.BLACK;
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
      }

      ctx.beginPath();
      if ((ctx as any).roundRect)
        (ctx as any).roundRect(
          px - POST_W / 2,
          midY - postH / 2,
          POST_W,
          postH,
          2,
        );
      else ctx.rect(px - POST_W / 2, midY - postH / 2, POST_W, postH);
      ctx.fill();
      ctx.stroke();

      if (!isGhosted) {
        const cardH = Math.max(10, SPACING - RAIL_H - 8);
        const cardW = Math.max(25.2, POST_W * 1.96);
        
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = RENDER_CONFIG.COLORS.BLACK;
        ctx.lineWidth = 2; // Make border a bit thiccer for a better look
        
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(px - cardW / 2, midY - cardH / 2, cardW, cardH, 3);
        } else {
          ctx.rect(px - cardW / 2, midY - cardH / 2, cardW, cardH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = RENDER_CONFIG.COLORS.BLACK;
        const fontSize = Math.max(14, Math.min(cardH * 0.85, cardW * 0.75));
        ctx.font = `900 ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((startPostNum + i).toString(), px, midY + (fontSize * 0.05));
      }

      ctx.restore();

      if (!isExport && hitboxes) {
        hitboxes.push({
          id: `post-${i}`,
          type: "post-toggle",
          x: px - Math.max(POST_W, 40) / 2,
          y: midY - Math.max(postH, 80) / 2,
          w: Math.max(POST_W, 40),
          h: Math.max(postH, 80),
          value: i,
        });
      }
    });
  }

  const getEdgePx = (tipPx: number, centerPx: number) => {
    return tipPx < centerPx ? centerPx - POST_W / 2 : centerPx + POST_W / 2;
  };

  // Helper to draw a ghosted attachment extension (CIS, ISO, RAMP)
  const drawGhostBlock = (
    anchorPx: number,
    yPos: number,
    isLeftwards: boolean,
    text: string,
    currentShift: number = 0,
    hitboxId: string,
    isHovered: boolean = false,
    basePixPerMm?: number,
  ): number => {
    ctx.save();

    // Draw ISO under the rail if needed. The painter algorithm already draws this before rails, so it's fine.
    // However, if we need to put it behind other ghost blocks, we can't easily without a separate loop,
    // but drawing it first (which it is if it's the first attachment, though order is by user array)
    // usually suffices. Let's just draw it with standard overlap.

    const isGradient = text === "CIS" || text === "RAMP";
    const isIso = text === "ISO";
    const isExp = text === "EXP";
    const baseW = 80;

    let logicalW = baseW;
    let visualW = baseW;
    let visualH = RAIL_H;

    if (isExp) {
      logicalW = 3987 * (basePixPerMm || 0.05);
      visualW = logicalW;
      visualH = RAIL_H;
    } else if (isGradient) {
      const extraMM = text === "RAMP" ? 4000 : 500;
      logicalW = baseW + extraMM * (basePixPerMm || 0.05);
      visualW = logicalW;
    } else if (isIso) {
      logicalW = 280 * (basePixPerMm || 0.05);
      visualW = 685 * (basePixPerMm || 0.05);
      visualH = RAIL_H * 1.6;
    }

    const dir = isLeftwards ? -1 : 1;
    const shift = dir * currentShift;
    const currentAnchor = anchorPx + shift;

    const centerX =
      currentAnchor + (isLeftwards ? -logicalW / 2 : logicalW / 2);
    const drawX = centerX - visualW / 2;
    const drawY = yPos - visualH / 2;

    if (isExp) {
      ctx.setLineDash([]);

      // Ensure block is roughly centered behind the cut
      const boxW = 800 * (basePixPerMm || 0.05); // Rectangular block size on back side
      const boxH = RAIL_H * 1.6;
      const boxY = yPos - boxH / 2;

      // 1. Draw back side block
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = isHovered ? "rgba(16, 185, 129, 1)" : "#000000";
      ctx.lineWidth = isHovered ? 2 : 1;

      ctx.fillRect(centerX - boxW / 2, boxY, boxW, boxH);
      ctx.strokeRect(centerX - boxW / 2, boxY, boxW, boxH);

      // 2. Draw solid line rails with a diagonal cut adjoining them
      const cutW = 20; 
      ctx.fillStyle = "rgba(249, 115, 22, 1)"; // orange
      ctx.strokeStyle = isHovered ? "rgba(16, 185, 129, 1)" : "#000000";
      ctx.lineWidth = 1;
      
      // We will draw it as two polygons so they fit together
      // Left part polygon
      ctx.beginPath();
      ctx.moveTo(drawX, drawY);
      ctx.lineTo(centerX + cutW / 2, drawY);
      ctx.lineTo(centerX - cutW / 2, drawY + visualH);
      ctx.lineTo(drawX, drawY + visualH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right part polygon
      ctx.beginPath();
      ctx.moveTo(centerX + cutW / 2, drawY);
      ctx.lineTo(drawX + visualW, drawY);
      ctx.lineTo(drawX + visualW, drawY + visualH);
      ctx.lineTo(centerX - cutW / 2, drawY + visualH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw the diagonal cut only, 4px thick
      ctx.beginPath();
      ctx.moveTo(centerX + cutW / 2, drawY);
      ctx.lineTo(centerX - cutW / 2, drawY + visualH);
      ctx.lineWidth = 4;
      ctx.stroke();

    } else if (isGradient) {
      const grad = ctx.createLinearGradient(
        currentAnchor,
        yPos,
        isLeftwards ? currentAnchor - visualW : currentAnchor + visualW,
        yPos,
      );

      let startColor, midColor, endColor;
      if (text === "RAMP") {
        const rgb = "225, 113, 43";
        startColor = isHovered ? `rgba(${rgb}, 1)` : `rgba(${rgb}, 1)`;
        midColor = isHovered ? `rgba(${rgb}, 0.5)` : `rgba(${rgb}, 0.5)`;
        endColor = `rgba(${rgb}, 0)`;
      } else {
        startColor = isHovered
          ? "rgba(100, 100, 100, 0.2)"
          : "rgba(100, 100, 100, 0.1)";
        midColor = startColor;
        endColor = "rgba(100, 100, 100, 0)";
      }

      grad.addColorStop(0, startColor);
      if (text === "RAMP") grad.addColorStop(0.5, midColor);
      grad.addColorStop(1, endColor);
      ctx.fillStyle = grad;

      const borderGrad = ctx.createLinearGradient(
        currentAnchor,
        yPos,
        isLeftwards ? currentAnchor - visualW : currentAnchor + visualW,
        yPos,
      );

      let borderStart, borderMid, borderEnd;
      if (text === "RAMP") {
        borderStart = isHovered ? "rgba(16, 185, 129, 1)" : "rgba(0, 0, 0, 1)";
        borderMid = isHovered
          ? "rgba(16, 185, 129, 0.5)"
          : "rgba(0, 0, 0, 0.5)";
        borderEnd = "rgba(0, 0, 0, 0)";
      } else {
        borderStart = isHovered
          ? "rgba(16, 185, 129, 0.8)"
          : "rgba(150, 150, 150, 0.5)";
        borderMid = borderStart;
        borderEnd = "rgba(150, 150, 150, 0)";
      }

      borderGrad.addColorStop(0, borderStart);
      if (text === "RAMP") borderGrad.addColorStop(0.5, borderMid);
      borderGrad.addColorStop(1, borderEnd);

      ctx.strokeStyle = borderGrad;
    } else {
      if (isIso) {
        ctx.fillStyle = isHovered
          ? "rgba(0, 0, 0, 0.85)"
          : "rgba(0, 0, 0, 0.75)";
        ctx.strokeStyle = isHovered
          ? "rgba(0, 0, 0, 0.85)"
          : "rgba(0, 0, 0, 0.75)";
      } else {
        ctx.fillStyle = isHovered
          ? "rgba(100, 100, 100, 0.2)"
          : "rgba(100, 100, 100, 0.1)";
        ctx.strokeStyle = isHovered
          ? "rgba(16, 185, 129, 0.8)"
          : "rgba(150, 150, 150, 0.5)";
      }
    }

    if (!isExp) {
      if (text === "RAMP" || isIso) {
        ctx.setLineDash([]);
      } else {
        ctx.setLineDash([5, 5]);
      }
      ctx.lineWidth = isHovered ? 3 : 2;

      // Draw the box using visual constraints
      ctx.fillRect(drawX, drawY, visualW, visualH);
      ctx.strokeRect(drawX, drawY, visualW, visualH);
    }

    if (text === "EXP" || text === "RAMP") {
      ctx.fillStyle = isHovered ? "rgba(16, 185, 129, 1)" : "rgba(0, 0, 0, 1)";
    } else if (isIso) {
      ctx.fillStyle = isHovered ? "rgba(16, 185, 129, 1)" : "#ffffff";
    } else {
      ctx.fillStyle = isHovered
        ? "rgba(16, 185, 129, 1)"
        : "rgba(150, 150, 150, 0.8)";
    }

    ctx.font = `bold ${Math.max(10, Math.min(24, RAIL_H * 0.8))}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Place text at the "solid" side of the block or center of normal block
    let textX = centerX;
    if (isExp) {
      textX = isLeftwards ? currentAnchor - 40 : currentAnchor + 40;
    } else if (isGradient && text !== "RAMP") {
      textX = isLeftwards ? currentAnchor - 40 : currentAnchor + 40;
    }
    const displayText = text === "RAMP" ? "R A M P" : text;
    ctx.fillText(displayText, textX, yPos);
    ctx.restore();

    if (!isExport && hitboxes) {
      hitboxes.push({
        id: hitboxId,
        type: "ghost-block",
        x: drawX,
        y: drawY,
        w: visualW,
        h: visualH,
        value: 0,
      });
    }

    return logicalW; // Return logical width so caller can accumulate shift
  };

  const drawHandle = (
    px: number,
    py: number,
    id: string,
    type: HitboxType,
    color: string,
  ) => {
    if (isExport) return;
    const isHovered = hoveredHitbox === id;
    const isActive = activeDragHandle === type;
    const hW = isHovered || isActive ? 16 : 12;
    const hH = RAIL_H + (isHovered || isActive ? 28 : 20);

    ctx.save();

    if (isHovered || isActive) {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
    }

    ctx.fillStyle = isActive ? "#10b981" : color; // highlight greenish if actively dragging, else rail color
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = isActive ? 3 : 2;

    if ((ctx as any).roundRect) {
      ctx.beginPath();
      (ctx as any).roundRect(px - hW / 2, py - hH / 2, hW, hH, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(px - hW / 2, py - hH / 2, hW, hH);
      ctx.strokeRect(px - hW / 2, py - hH / 2, hW, hH);
    }

    ctx.restore();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    const gap = isHovered || isActive ? 3 : 2;
    ctx.moveTo(px - gap, py - 8);
    ctx.lineTo(px - gap, py + 8);
    ctx.moveTo(px + gap, py - 8);
    ctx.lineTo(px + gap, py + 8);
    ctx.stroke();

    hitboxes.push({
      id,
      type,
      x: px - 24,
      y: py - hH,
      w: 48,
      h: hH * 2,
      value: 0,
    });
  };

  // Lugs migration handled elsewhere, but let's grab our fallback arrays
  const startAtts =
    phase.startAttachments ??
    (["cis", "iso", "ramp", "exp"] as const).filter((t) => phase[t]?.start);
  const endAtts =
    phase.endAttachments ??
    (["cis", "iso", "ramp", "exp"] as const).filter((t) => phase[t]?.end);

  const drawVisibilityToggle = (
    isVisible: boolean,
    railName: "red" | "blue",
    py: number,
  ) => {
    if (isExport) return;
    const isHovered = hoveredHitbox === `${railName}-visibility-toggle`;
    const btnW = 100;
    const btnH = 32;
    // Position near the right side of the canvas, or center it based on first/last post.
    // Actually, center it horizontally relative to the posts.
    // Shift slightly right to avoid overlapping with "Positive Rail" and "Total" text
    const cx = (firstPostPx + lastPostPx) / 2 + 140;
    // Offset Y a bit if the rail is hidden, to not float aimlessly. If it's visible, maybe don't draw it, or draw it smaller?
    // User requested: "feature ... where I could toggle to hide the power rail"
    const px = cx;
    const offsetPy = railName === "red" ? py - 80 : py + 80;
    const pxBtn = px - btnW / 2;
    const pyBtn = offsetPy - btnH / 2;

    ctx.save();
    ctx.fillStyle = isHovered
      ? railName === "red"
        ? "#fee2e2"
        : "#e0e7ff"
      : "#f3f4f6";
    ctx.strokeStyle = isHovered
      ? railName === "red"
        ? "#ef4444"
        : "#3b82f6"
      : "#d1d5db";
    ctx.lineWidth = 2;

    if ((ctx as any).roundRect) {
      ctx.beginPath();
      (ctx as any).roundRect(pxBtn, pyBtn, btnW, btnH, 16);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(pxBtn, pyBtn, btnW, btnH);
      ctx.strokeRect(pxBtn, pyBtn, btnW, btnH);
    }

    ctx.fillStyle = isHovered
      ? railName === "red"
        ? "#b91c1c"
        : "#1d4ed8"
      : "#6b7280";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${isVisible ? "Hide" : "Show"} ${railName === "red" ? "(+)" : "(-)"}`,
      px,
      offsetPy,
    );
    ctx.restore();

    if (hitboxes) {
      hitboxes.push({
        id: `${railName}-visibility-toggle`,
        type: "rail-visibility-toggle",
        x: pxBtn,
        y: pyBtn,
        w: btnW,
        h: btnH,
        value: 0,
      });
    }
  };

  drawVisibilityToggle(phase.red.visible, "red", redY);
  drawVisibilityToggle(phase.blue.visible, "blue", blueY);

  // Red Rail
  const drawDropLine = (px: number, y1: number, y2: number, color: string) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(px, y1);
    ctx.lineTo(px, y2);
    ctx.stroke();
    ctx.restore();
  };

  if (phase.red.visible) {
    const startRefIdx =
      typeof phase.red.startRefPostIndex === "number"
        ? phase.red.startRefPostIndex
        : 0;
    const endRefIdx =
      typeof phase.red.endRefPostIndex === "number"
        ? phase.red.endRefPostIndex
        : phase.posts.length - 1;
    const startRefAbsoluteMm = phase.posts[startRefIdx] || 0;
    const endRefAbsoluteMm = phase.posts[endRefIdx] || phase.postSpanMm;

    const rsPx = getPx(
      startRefAbsoluteMm - phase.red.startMm,
      phase,
      canvasWidth,
      isRTL,
    );
    const rePx = getPx(
      endRefAbsoluteMm + phase.red.endMm,
      phase,
      canvasWidth,
      isRTL,
    );

    let redStartAccW = 0,
      redEndAccW = 0;
    startAtts.forEach((t) => {
      const drawnW = drawGhostBlock(
        rsPx,
        redY,
        !isRTL,
        t.toUpperCase(),
        redStartAccW,
        `ghost-${t}-start`,
        hoveredHitbox === `ghost-${t}-start`,
        basePixPerMm,
      );
      redStartAccW += drawnW;
    });

    endAtts.forEach((t) => {
      const drawnW = drawGhostBlock(
        rePx,
        redY,
        isRTL,
        t.toUpperCase(),
        redEndAccW,
        `ghost-${t}-end`,
        hoveredHitbox === `ghost-${t}-end`,
        basePixPerMm,
      );
      redEndAccW += drawnW;
    });

    const leftPx = Math.min(rsPx, rePx);
    const width = Math.abs(rePx - rsPx);

    const isCutToFit = phase.red.isCutToFit;
    ctx.fillStyle = isCutToFit ? "#e5e7eb" : RENDER_CONFIG.COLORS.RED_RAIL;
    ctx.strokeStyle = isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.BLACK;
    ctx.lineWidth = 2;
    ctx.fillRect(leftPx, redY - RAIL_H / 2, width, RAIL_H);
    ctx.strokeRect(leftPx, redY - RAIL_H / 2, width, RAIL_H);

    if (isCutToFit) {
      const redTipAbsoluteMm = startRefAbsoluteMm - phase.red.startMm;
      const redEndAbsoluteMm = endRefAbsoluteMm + phase.red.endMm;
      const railMinMm = Math.min(redTipAbsoluteMm, redEndAbsoluteMm);
      const railMaxMm = Math.max(redTipAbsoluteMm, redEndAbsoluteMm);
      
      const intervals = phase.lugs
        .filter(l => l.rail === "red")
        .map(l => {
          const wMm = l.type === "5" ? RENDER_CONFIG.DIMS.LUG_TYPE_5_W : RENDER_CONFIG.DIMS.LUG_TYPE_1_W;
          const nearestEdgeMm = l.ref === "start" ? redTipAbsoluteMm + l.dist : redEndAbsoluteMm - l.dist;
          const lugCenterMm = l.ref === "start" ? nearestEdgeMm + wMm / 2 : nearestEdgeMm - wMm / 2;
          return { min: lugCenterMm - wMm / 2 - 50, max: lugCenterMm + wMm / 2 + 50 };
        })
        .sort((a, b) => a.min - b.min);
      
      let maxGapX = railMinMm + (railMaxMm - railMinMm) / 2;
      let maxGapWidth = 0;
      
      let curr = railMinMm;
      for (const inv of intervals) {
        if (inv.min > curr) {
          const gap = inv.min - curr;
          if (gap > maxGapWidth) {
            maxGapWidth = gap;
            maxGapX = curr + gap / 2;
          }
        }
        curr = Math.max(curr, inv.max);
      }
      if (railMaxMm - curr > maxGapWidth) {
        maxGapWidth = railMaxMm - curr;
        maxGapX = curr + (railMaxMm - curr) / 2;
      }
      
      const textPx = getPx(maxGapX, phase, canvasWidth, isRTL);
      ctx.save();
      ctx.fillStyle = "#6b7280";
      ctx.font = `bold ${Math.max(8, Math.min(22, RAIL_H * 0.8))}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ON-SITE-CUT", textPx, redY);
      ctx.restore();
    }

    if (hitboxes) {
      hitboxes.push({
        id: "red-rail-body",
        type: "red-rail-body",
        x: leftPx,
        y: redY - RAIL_H / 2,
        w: width,
        h: RAIL_H,
        value: 0,
      });
    }

    drawHandle(
      rsPx,
      redY,
      "red-start",
      "red-start-handle",
      isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.RED_RAIL,
    );
    drawHandle(
      rePx,
      redY,
      "red-end",
      "red-end-handle",
      isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.RED_RAIL,
    );

    const redGapY = redY - 50;
    if (showPosts) {
      if (phase.red.startMm !== 0 || startRefIdx > 0) {
        const refPostPx = getPx(startRefAbsoluteMm, phase, canvasWidth, isRTL);
        const edgePx = getEdgePx(rsPx, refPostPx);
        drawDim(
          ctx,
          rsPx,
          edgePx,
          redGapY,
          `${phase.red.startMm > 0 ? "+" : ""}${phase.red.startMm.toFixed(0)} mm`,
          RENDER_CONFIG.COLORS.RED_RAIL,
          {
            hitboxes,
            id: "red-start",
            type: "red-start",
            value: phase.red.startMm,
            isHovered: hoveredHitbox === "red-start",
          },
        );
        drawDropLine(edgePx, redGapY, redY, RENDER_CONFIG.COLORS.RED_RAIL);
      }
      if (phase.red.endMm !== 0 || endRefIdx < phase.posts.length - 1) {
        const refPostPx = getPx(endRefAbsoluteMm, phase, canvasWidth, isRTL);
        const edgePx = getEdgePx(rePx, refPostPx);
        drawDim(
          ctx,
          rePx,
          edgePx,
          redGapY,
          `${phase.red.endMm > 0 ? "+" : ""}${phase.red.endMm.toFixed(0)} mm`,
          RENDER_CONFIG.COLORS.RED_RAIL,
          {
            hitboxes,
            id: "red-end",
            type: "red-end",
            value: phase.red.endMm,
            isHovered: hoveredHitbox === "red-end",
          },
        );
        drawDropLine(edgePx, redGapY, redY, RENDER_CONFIG.COLORS.RED_RAIL);
      }
    }
    const redTotalY = redGapY - 50;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = RENDER_CONFIG.COLORS.RED_RAIL;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText("Positive Rail", rsPx + (rePx - rsPx) / 2, redTotalY - 35);
    ctx.fillText("Positive Rail", rsPx + (rePx - rsPx) / 2, redTotalY - 35);
    ctx.restore();

    const roundedTotalRed = isCutToFit
      ? getCutToFitLength(phase.red.totalMm)
      : phase.red.totalMm;
    const redTotalText = isCutToFit
      ? `(+) ON-SITE-CUT ≯${roundedTotalRed} mm`
      : `(+) Total: ${phase.red.totalMm.toFixed(0)} mm`;

    drawDim(
      ctx,
      rsPx,
      rePx,
      redTotalY,
      redTotalText,
      RENDER_CONFIG.COLORS.BLACK,
      {
        hitboxes,
        id: "red-total",
        type: "red-total",
        value: phase.red.totalMm,
        isHovered: hoveredHitbox === "red-total",
      },
    );
  }

  // Blue Rail
  if (phase.blue.visible) {
    const startRefIdx =
      typeof phase.red.startRefPostIndex === "number"
        ? phase.red.startRefPostIndex
        : 0;
    const endRefIdx =
      typeof phase.red.endRefPostIndex === "number"
        ? phase.red.endRefPostIndex
        : phase.posts.length - 1;
    const startRefAbsoluteMm = phase.posts[startRefIdx] || 0;
    const endRefAbsoluteMm = phase.posts[endRefIdx] || phase.postSpanMm;

    const redTipAbsoluteMm = startRefAbsoluteMm - phase.red.startMm;
    const redEndAbsoluteMm = endRefAbsoluteMm + phase.red.endMm;

    let blueTipAbsoluteMm = redTipAbsoluteMm + phase.blue.startMm;
    if (phase.blue.startRefType === "post") {
      const blueStartRefIdx =
        typeof phase.blue.startRefPostIndex === "number"
          ? phase.blue.startRefPostIndex
          : 0;
      blueTipAbsoluteMm =
        (phase.posts[blueStartRefIdx] || 0) - phase.blue.startMm;
    } else if (phase.blue.startRefType === "red-end") {
      blueTipAbsoluteMm = redEndAbsoluteMm + phase.blue.startMm;
    }

    let blueEndAbsoluteMm = redEndAbsoluteMm + phase.blue.endMm;
    if (phase.blue.endRefType === "post") {
      const blueEndRefIdx =
        typeof phase.blue.endRefPostIndex === "number"
          ? phase.blue.endRefPostIndex
          : phase.posts.length - 1;
      blueEndAbsoluteMm =
        (phase.posts[blueEndRefIdx] || phase.postSpanMm) + phase.blue.endMm;
    } else if (phase.blue.endRefType === "red-start") {
      blueEndAbsoluteMm = redTipAbsoluteMm + phase.blue.endMm;
    }

    const bsPx = getPx(blueTipAbsoluteMm, phase, canvasWidth, isRTL);
    const bePx = getPx(blueEndAbsoluteMm, phase, canvasWidth, isRTL);

    let blueStartAccW = 0,
      blueEndAccW = 0;
    startAtts.forEach((t) => {
      const drawnW = drawGhostBlock(
        bsPx,
        blueY,
        !isRTL,
        t.toUpperCase(),
        blueStartAccW,
        `ghost-${t}-start`,
        hoveredHitbox === `ghost-${t}-start`,
        basePixPerMm,
      );
      blueStartAccW += drawnW;
    });

    endAtts.forEach((t) => {
      const drawnW = drawGhostBlock(
        bePx,
        blueY,
        isRTL,
        t.toUpperCase(),
        blueEndAccW,
        `ghost-${t}-end`,
        hoveredHitbox === `ghost-${t}-end`,
        basePixPerMm,
      );
      blueEndAccW += drawnW;
    });

    const leftPx = Math.min(bsPx, bePx);
    const width = Math.abs(bePx - bsPx);

    const isCutToFit = phase.blue.isCutToFit;
    ctx.fillStyle = isCutToFit ? "#e5e7eb" : RENDER_CONFIG.COLORS.BLUE_RAIL;
    ctx.strokeStyle = isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.BLACK;
    ctx.lineWidth = 2;
    ctx.fillRect(leftPx, blueY - RAIL_H / 2, width, RAIL_H);
    ctx.strokeRect(leftPx, blueY - RAIL_H / 2, width, RAIL_H);

    if (isCutToFit) {
      const railMinMm = Math.min(blueTipAbsoluteMm, blueEndAbsoluteMm);
      const railMaxMm = Math.max(blueTipAbsoluteMm, blueEndAbsoluteMm);
      
      const intervals = phase.lugs
        .filter(l => l.rail === "blue")
        .map(l => {
          const wMm = l.type === "5" ? RENDER_CONFIG.DIMS.LUG_TYPE_5_W : RENDER_CONFIG.DIMS.LUG_TYPE_1_W;
          const nearestEdgeMm = l.ref === "start" ? blueTipAbsoluteMm + l.dist : blueEndAbsoluteMm - l.dist;
          const lugCenterMm = l.ref === "start" ? nearestEdgeMm + wMm / 2 : nearestEdgeMm - wMm / 2;
          return { min: lugCenterMm - wMm / 2 - 50, max: lugCenterMm + wMm / 2 + 50 };
        })
        .sort((a, b) => a.min - b.min);
      
      let maxGapX = railMinMm + (railMaxMm - railMinMm) / 2;
      let maxGapWidth = 0;
      
      let curr = railMinMm;
      for (const inv of intervals) {
        if (inv.min > curr) {
          const gap = inv.min - curr;
          if (gap > maxGapWidth) {
            maxGapWidth = gap;
            maxGapX = curr + gap / 2;
          }
        }
        curr = Math.max(curr, inv.max);
      }
      if (railMaxMm - curr > maxGapWidth) {
        maxGapWidth = railMaxMm - curr;
        maxGapX = curr + (railMaxMm - curr) / 2;
      }
      
      const textPx = getPx(maxGapX, phase, canvasWidth, isRTL);
      ctx.save();
      ctx.fillStyle = "#6b7280";
      ctx.font = `bold ${Math.max(8, Math.min(22, RAIL_H * 0.8))}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ON-SITE-CUT", textPx, blueY);
      ctx.restore();
    }

    if (hitboxes) {
      hitboxes.push({
        id: "blue-rail-body",
        type: "blue-rail-body",
        x: leftPx,
        y: blueY - RAIL_H / 2,
        w: width,
        h: RAIL_H,
        value: 0,
      });
    }

    drawHandle(
      bsPx,
      blueY,
      "blue-start",
      "blue-start-handle",
      isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.BLUE_RAIL,
    );
    drawHandle(
      bePx,
      blueY,
      "blue-end",
      "blue-end-handle",
      isCutToFit ? "#9ca3af" : RENDER_CONFIG.COLORS.BLUE_RAIL,
    );

    const blueGapY = blueY + 50;
    if (showPosts) {
      if (phase.blue.startMm !== 0 || phase.blue.startRefType) {
        let refAbsMm = redTipAbsoluteMm; // default 'red-start'
        if (phase.blue.startRefType === "post") {
          const blueStartRefIdx =
            typeof phase.blue.startRefPostIndex === "number"
              ? phase.blue.startRefPostIndex
              : 0;
          refAbsMm = phase.posts[blueStartRefIdx] || 0;
        } else if (phase.blue.startRefType === "red-end")
          refAbsMm = redEndAbsoluteMm;

        const refPx = getPx(refAbsMm, phase, canvasWidth, isRTL);
        const edgePx =
          phase.blue.startRefType === "post" ? getEdgePx(bsPx, refPx) : refPx;
        drawDim(
          ctx,
          bsPx,
          edgePx,
          blueGapY,
          `${phase.blue.startMm > 0 ? "+" : ""}${phase.blue.startMm.toFixed(0)} mm`,
          RENDER_CONFIG.COLORS.BLUE_RAIL,
          {
            hitboxes,
            id: "blue-start",
            type: "blue-start",
            value: phase.blue.startMm,
            isHovered: hoveredHitbox === "blue-start",
          },
          true,
        );
        drawDropLine(edgePx, blueGapY, blueY, RENDER_CONFIG.COLORS.BLUE_RAIL);
      }
      if (phase.blue.endMm !== 0 || phase.blue.endRefType) {
        let refAbsMm = redEndAbsoluteMm; // default 'red-end'
        if (phase.blue.endRefType === "post") {
          const blueEndRefIdx =
            typeof phase.blue.endRefPostIndex === "number"
              ? phase.blue.endRefPostIndex
              : phase.posts.length - 1;
          refAbsMm = phase.posts[blueEndRefIdx] || phase.postSpanMm;
        } else if (phase.blue.endRefType === "red-start")
          refAbsMm = redTipAbsoluteMm;

        const refPx = getPx(refAbsMm, phase, canvasWidth, isRTL);
        const edgePx =
          phase.blue.endRefType === "post" ? getEdgePx(bePx, refPx) : refPx;
        drawDim(
          ctx,
          bePx,
          edgePx,
          blueGapY,
          `${phase.blue.endMm > 0 ? "+" : ""}${phase.blue.endMm.toFixed(0)} mm`,
          RENDER_CONFIG.COLORS.BLUE_RAIL,
          {
            hitboxes,
            id: "blue-end",
            type: "blue-end",
            value: phase.blue.endMm,
            isHovered: hoveredHitbox === "blue-end",
          },
          true,
        );
        drawDropLine(edgePx, blueGapY, blueY, RENDER_CONFIG.COLORS.BLUE_RAIL);
      }
    }
    const blueTotalY = blueGapY + 50;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = RENDER_CONFIG.COLORS.BLUE_RAIL;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText("Negative Rail", bsPx + (bePx - bsPx) / 2, blueTotalY - 10);
    ctx.fillText("Negative Rail", bsPx + (bePx - bsPx) / 2, blueTotalY - 10);
    ctx.restore();

    const roundedTotalBlue = isCutToFit
      ? getCutToFitLength(phase.blue.totalMm)
      : phase.blue.totalMm;
    const blueTotalText = isCutToFit
      ? `(-) ON-SITE-CUT ≯${roundedTotalBlue} mm`
      : `(-) Total: ${phase.blue.totalMm.toFixed(0)} mm`;

    drawDim(
      ctx,
      bsPx,
      bePx,
      blueTotalY,
      blueTotalText,
      RENDER_CONFIG.COLORS.BLACK,
      {
        hitboxes,
        id: "blue-total",
        type: "blue-total",
        value: phase.blue.totalMm,
        isHovered: hoveredHitbox === "blue-total",
      },
      true,
    );
  }

  // Lugs
  let redLugIndex = 0;
  let blueLugIndex = 0;

  phase.lugs.forEach((l) => {
    const railData = l.rail === "red" ? phase.red : phase.blue;
    if (!railData.visible) return;

    const lugIndex = l.rail === "red" ? redLugIndex++ : blueLugIndex++;

    const startRefIdx =
      typeof phase.red.startRefPostIndex === "number"
        ? phase.red.startRefPostIndex
        : 0;
    const endRefIdx =
      typeof phase.red.endRefPostIndex === "number"
        ? phase.red.endRefPostIndex
        : phase.posts.length - 1;
    const startRefAbsoluteMm = phase.posts[startRefIdx] || 0;
    const endRefAbsoluteMm = phase.posts[endRefIdx] || phase.postSpanMm;

    const redTipAbsoluteMm = startRefAbsoluteMm - phase.red.startMm;
    const redEndAbsoluteMm = endRefAbsoluteMm + phase.red.endMm;

    let blueTipAbsoluteMm = redTipAbsoluteMm + phase.blue.startMm;
    if (phase.blue.startRefType === "post") {
      const blueStartRefIdx =
        typeof phase.blue.startRefPostIndex === "number"
          ? phase.blue.startRefPostIndex
          : 0;
      blueTipAbsoluteMm =
        (phase.posts[blueStartRefIdx] || 0) - phase.blue.startMm;
    } else if (phase.blue.startRefType === "red-end") {
      blueTipAbsoluteMm = redEndAbsoluteMm + phase.blue.startMm;
    }

    let blueEndAbsoluteMm = redEndAbsoluteMm + phase.blue.endMm;
    if (phase.blue.endRefType === "post") {
      const blueEndRefIdx =
        typeof phase.blue.endRefPostIndex === "number"
          ? phase.blue.endRefPostIndex
          : phase.posts.length - 1;
      blueEndAbsoluteMm =
        (phase.posts[blueEndRefIdx] || phase.postSpanMm) + phase.blue.endMm;
    } else if (phase.blue.endRefType === "red-start") {
      blueEndAbsoluteMm = redTipAbsoluteMm + phase.blue.endMm;
    }

    const absStart = l.rail === "red" ? redTipAbsoluteMm : blueTipAbsoluteMm;
    const absEnd = l.rail === "red" ? redEndAbsoluteMm : blueEndAbsoluteMm;

    const wMm =
      l.type === "5"
        ? RENDER_CONFIG.DIMS.LUG_TYPE_5_W
        : RENDER_CONFIG.DIMS.LUG_TYPE_1_W;

    const nearestEdgeMm =
      l.ref === "start" ? absStart + l.dist : absEnd - l.dist;
    const lugCenterMm =
      l.ref === "start" ? nearestEdgeMm + wMm / 2 : nearestEdgeMm - wMm / 2;

    const yOffset = l.rail === "red" ? redY : blueY;

    // Lugs are physical so 1:1 using basePixPerMm
    const centerPx = getPx(lugCenterMm, phase, canvasWidth, isRTL);
    const pxW = wMm * basePixPerMm;
    const drawLeft = centerPx - pxW / 2;
    const lugH = RAIL_H;

    const isDotOnly = l.type === "ground" || l.type === "blue-light";

    if (!isDotOnly) {
      ctx.fillStyle = "#C0C5CE";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if ((ctx as any).roundRect)
        (ctx as any).roundRect(drawLeft, yOffset - lugH / 2, pxW, lugH, 2);
      else ctx.rect(drawLeft, yOffset - lugH / 2, pxW, lugH);
      ctx.fill();
      ctx.stroke();
    }

    const drawHole = (off: number) => {
      ctx.beginPath();
      const holeX = centerPx + off * basePixPerMm * (isRTL ? -1 : 1);
      ctx.arc(holeX, yOffset, isDotOnly ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (isDotOnly) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.strokeStyle = "#475569"; // Reset
      }
    };

    if (l.type === "ground") {
      ctx.fillStyle = "#22c55e";
      drawHole(0);
    } else if (l.type === "blue-light") {
      ctx.fillStyle = "#3b82f6";
      drawHole(0);
    } else if (l.type === "5") {
      ctx.fillStyle = "#1E293B";
      [-260, -130, 0, 130, 260].forEach(drawHole);
    } else {
      ctx.fillStyle = "#1E293B";
      drawHole(0);
    }

    const dimY =
      l.rail === "red"
        ? redY - 150 - lugIndex * 50
        : blueY + 150 + lugIndex * 50;
    const startPx =
      l.ref === "start"
        ? getPx(absStart, phase, canvasWidth, isRTL)
        : getPx(absEnd, phase, canvasWidth, isRTL);

    const visualLeftEdge = drawLeft;
    const visualRightEdge = drawLeft + pxW;
    const visualEdgePx = isDotOnly
      ? centerPx
      : isRTL
        ? l.ref === "start"
          ? visualRightEdge
          : visualLeftEdge
        : l.ref === "start"
          ? visualLeftEdge
          : visualRightEdge;

    ctx.beginPath();
    const lineColor =
      l.type === "ground"
        ? "#22c55e"
        : l.type === "blue-light"
          ? "#3b82f6"
          : "#856404";
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(visualEdgePx, dimY);
    ctx.lineTo(visualEdgePx, yOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    let dimText = `${l.dist}mm`;
    if (l.type === "ground") dimText += " (GS Cable)";
    else if (l.type === "blue-light") dimText += " (Blue Light)";
    else dimText += ` (${l.type}-Lug)`;

    drawDim(
      ctx,
      startPx,
      visualEdgePx,
      dimY,
      dimText,
      lineColor,
      {
        hitboxes,
        id: l.id,
        type: "lug-dist",
        value: l.dist,
        isHovered: hoveredHitbox === l.id,
      },
      l.rail === "blue",
    );
  });

  ctx.restore();

  if (magnifierPos) {
    const { x, y } = magnifierPos;
    const r = 80;
    const zoom = 2;
    const yOffset = -120; // Float above cursor

    ctx.save();

    // Draw outer glow/shadow
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y + yOffset, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.beginPath();
    ctx.arc(x, y + yOffset, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    const sx = x - r / zoom;
    const sy = y - r / zoom;
    const sw = (r * 2) / zoom;
    const sh = (r * 2) / zoom;

    const dx = x - r;
    const dy = y + yOffset - r;
    const dw = r * 2;
    const dh = r * 2;

    ctx.drawImage(ctx.canvas, sx, sy, sw, sh, dx, dy, dw, dh);

    // Inner styling
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#3b82f6";
    ctx.stroke();

    // Crosshair
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(x - 12, y + yOffset);
    ctx.lineTo(x + 12, y + yOffset);
    ctx.moveTo(x, y + yOffset - 12);
    ctx.lineTo(x, y + yOffset + 12);
    ctx.stroke();

    ctx.restore();
  }

  // Draw indicators ZERO and ONE at top corners (outside of phase scale/pan)
  const leftText = indicatorsFlipped ? "ONE" : "ZERO";
  const rightText = indicatorsFlipped ? "ZERO" : "ONE";

  ctx.save();
  ctx.font = "900 36px Inter, sans-serif";
  ctx.textBaseline = "top";

  // Left Indicator
  ctx.textAlign = "left";
  ctx.fillStyle =
    hoveredHitbox === "flip-indicators-left"
      ? "#0f172a"
      : "rgba(15, 23, 42, 0.4)";
  ctx.fillText(leftText, 40, 30);

  // Right Indicator
  ctx.textAlign = "right";
  ctx.fillStyle =
    hoveredHitbox === "flip-indicators-right"
      ? "#0f172a"
      : "rgba(15, 23, 42, 0.4)";
  ctx.fillText(rightText, canvasWidth - 40, 30);

  // Center Details Indicator
  if (wo || ts || subSub) {
    const detailsText = `WO: ${wo || "N/A"}   |   TS: ${ts || "N/A"}   |   SUB-SUB: ${subSub || "N/A"}`;
    ctx.textAlign = "center";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillText(detailsText, canvasWidth / 2, 40);
  }

  ctx.restore();

  // Draw arrows to indicate adjacent sections
  const drawPhaseIndicator = (
    side: "left" | "right",
    text: string,
    isHovered: boolean,
  ) => {
    ctx.save();

    // Check if we need to dynamically size font based on name, we will stick to fixed dimensions
    const w = 155;
    const h = 40;
    const headW = 24;
    const marginX = 20;
    // Move originY directly below ZERO/ONE (which are drawn at y=30, height approx 36, so y=90 is good)
    const originY = 120;

    if (isHovered) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.1)";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
      ctx.canvas.style.cursor = "pointer";
    } else {
      ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
    }
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    if (side === "left") {
      const tipX = marginX;
      ctx.moveTo(tipX, originY);
      ctx.lineTo(tipX + headW, originY - h / 2);
      ctx.lineTo(tipX + w, originY - h / 2);
      ctx.lineTo(tipX + w, originY + h / 2);
      ctx.lineTo(tipX + headW, originY + h / 2);
    } else {
      const tipX = canvasWidth - marginX;
      ctx.moveTo(tipX, originY);
      ctx.lineTo(tipX - headW, originY - h / 2);
      ctx.lineTo(tipX - w, originY - h / 2);
      ctx.lineTo(tipX - w, originY + h / 2);
      ctx.lineTo(tipX - headW, originY + h / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isHovered) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    } else {
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    }
    ctx.font = "800 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (side === "left") {
      ctx.fillText(text, marginX + headW + (w - headW) / 2, originY);
    } else {
      ctx.fillText(
        text,
        canvasWidth - marginX - headW - (w - headW) / 2,
        originY,
      );
    }

    ctx.restore();
  };

  const prevSectionSide = isRTL ? "right" : "left";
  const nextSectionSide = isRTL ? "left" : "right";

  if (!isExport) {
    if (activeIndex > 0) {
      drawPhaseIndicator(
        prevSectionSide,
        `SECTION ${activeIndex}`,
        hoveredHitbox === "nav-prev",
      );
    }

    // Draw the current section ghosted indicator, 15% larger and centered horizontally
    ctx.save();
    const centerW = 155 * 1.15;
    const centerH = 40 * 1.15;
    const centerOriginY = 120;
    const centerX = canvasWidth / 2 - centerW / 2;
    const centerY = centerOriginY - centerH / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.roundRect(centerX, centerY, centerW, centerH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.font = `800 ${16 * 1.15}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `SECTION ${activeIndex + 1}`,
      canvasWidth / 2,
      centerOriginY + 1,
    );
    ctx.restore();

    if (activeIndex < totalPhases - 1) {
      drawPhaseIndicator(
        nextSectionSide,
        `SECTION ${activeIndex + 2}`,
        hoveredHitbox === "nav-next",
      );
    }
  }

  if (!isExport && hitboxes) {
    // We add hitboxes in screen space for these
    hitboxes.push({
      id: "flip-indicators-left",
      type: "flip-indicators",
      x: 20,
      y: 20,
      w: 130,
      h: 60,
      value: 0,
    });
    hitboxes.push({
      id: "flip-indicators-right",
      type: "flip-indicators",
      x: canvasWidth - 150,
      y: 20,
      w: 130,
      h: 60,
      value: 0,
    });

    if (activeIndex > 0) {
      hitboxes.push(
        prevSectionSide === "left"
          ? {
              id: "nav-prev",
              type: "nav-prev",
              x: 20,
              y: 100,
              w: 155,
              h: 40,
              value: 0,
            }
          : {
              id: "nav-prev",
              type: "nav-prev",
              x: canvasWidth - 175,
              y: 100,
              w: 155,
              h: 40,
              value: 0,
            },
      );
    }
    if (activeIndex < totalPhases - 1) {
      hitboxes.push(
        nextSectionSide === "left"
          ? {
              id: "nav-next",
              type: "nav-next",
              x: 20,
              y: 100,
              w: 155,
              h: 40,
              value: 0,
            }
          : {
              id: "nav-next",
              type: "nav-next",
              x: canvasWidth - 175,
              y: 100,
              w: 155,
              h: 40,
              value: 0,
            },
      );
    }
  }
};
