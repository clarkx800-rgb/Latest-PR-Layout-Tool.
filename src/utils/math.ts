import { type Phase, type AppState } from "../types";
import { RENDER_CONFIG } from "../constants";

export class LayoutMath {
  static calc(phase: Phase) {
    if (
      typeof phase.postCount !== "number" ||
      isNaN(phase.postCount) ||
      phase.postCount < 0
    )
      phase.postCount = 0;
    phase.postCount = Math.min(50, phase.postCount);

    let startRefIdx =
      typeof phase.red.startRefPostIndex === "number"
        ? phase.red.startRefPostIndex
        : 0;
    let endRefIdx =
      typeof phase.red.endRefPostIndex === "number"
        ? phase.red.endRefPostIndex
        : phase.postCount - 1;

    // Bounds check to ensure indices do not exceed postCount
    startRefIdx = Math.min(startRefIdx, Math.max(0, phase.postCount - 1));
    endRefIdx = Math.min(endRefIdx, Math.max(0, phase.postCount - 1));

    // We solve for postSpanMm given:
    // totalMm = startMm + postSpanMm * (endRefIdx - startRefIdx) / (postCount - 1) + endMm
    const validSpanIndices = endRefIdx > startRefIdx && phase.postCount > 1;
    if (validSpanIndices) {
      phase.postSpanMm = Math.max(
        0,
        ((phase.red.totalMm - phase.red.startMm - phase.red.endMm) *
          (phase.postCount - 1)) /
          (endRefIdx - startRefIdx),
      );
    } else {
      phase.postSpanMm = Math.max(
        0,
        phase.red.totalMm - phase.red.startMm - phase.red.endMm,
      ); // Fallback
    }

    phase.posts = [];
    const step =
      phase.postCount > 1 ? phase.postSpanMm / (phase.postCount - 1) : 0;
    for (let i = 0; i < phase.postCount; i++) {
      phase.posts.push(i * step);
    }

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
      const blueStartRefAbsoluteMm = phase.posts[blueStartRefIdx] || 0;
      blueTipAbsoluteMm = blueStartRefAbsoluteMm - phase.blue.startMm;
    } else if (phase.blue.startRefType === "red-end") {
      blueTipAbsoluteMm = redEndAbsoluteMm + phase.blue.startMm;
    }

    let blueEndAbsoluteMm = redEndAbsoluteMm + phase.blue.endMm;
    if (phase.blue.endRefType === "post") {
      const blueEndRefIdx =
        typeof phase.blue.endRefPostIndex === "number"
          ? phase.blue.endRefPostIndex
          : phase.postCount - 1;
      const blueEndRefAbsoluteMm =
        phase.posts[blueEndRefIdx] || phase.postSpanMm;
      blueEndAbsoluteMm = blueEndRefAbsoluteMm + phase.blue.endMm;
    } else if (phase.blue.endRefType === "red-start") {
      blueEndAbsoluteMm = redTipAbsoluteMm + phase.blue.endMm;
    }

    phase.blue.totalMm = blueEndAbsoluteMm - blueTipAbsoluteMm;

    phase.minMm = Math.min(redTipAbsoluteMm, blueTipAbsoluteMm, 0);
    phase.maxMm = Math.max(
      redEndAbsoluteMm,
      blueEndAbsoluteMm,
      phase.postSpanMm,
    );

    phase.lugs.forEach((l) => {
      const railData = l.rail === "red" ? phase.red : phase.blue;
      if (!railData.visible) return;

      const absStart = l.rail === "red" ? redTipAbsoluteMm : blueTipAbsoluteMm;
      const absEnd = l.rail === "red" ? redEndAbsoluteMm : blueEndAbsoluteMm;
      const holeMm = l.ref === "start" ? absStart + l.dist : absEnd - l.dist;

      const outerHoleOffset =
        l.type === "5" ? RENDER_CONFIG.DIMS.LUG_TYPE_5_OUTER : 0;
      const lugCenterMm =
        l.ref === "start" ? holeMm + outerHoleOffset : holeMm - outerHoleOffset;
      const halfW =
        l.type === "5"
          ? RENDER_CONFIG.DIMS.LUG_TYPE_5_W / 2
          : RENDER_CONFIG.DIMS.LUG_TYPE_1_W / 2;

      phase.minMm = Math.min(phase.minMm, lugCenterMm - halfW);
      phase.maxMm = Math.max(phase.maxMm, lugCenterMm + halfW);
    });
  }

  static getStartPostNum(phases: Phase[], currentIndex: number) {
    let count = 1;
    for (let i = 0; i < currentIndex; i++) {
      count += phases[i].postCount - (i > 0 ? 0 : 0); // Logic from original app was slightly ambiguous, usually posts are cumulative
    }
    // Correcting the cumulative post logic:
    let totalPostsBefore = 0;
    for (let i = 0; i < currentIndex; i++) {
      totalPostsBefore += phases[i].postCount;
    }
    return totalPostsBefore + 1;
  }

  static cascadeMath(state: AppState) {
    const newState = {
      ...state,
      phases: state.phases.map((p) => ({
        ...p,
        red: { ...p.red },
        blue: { ...p.blue },
        lugs: (p.lugs || []).map((l) => ({ ...l })),
        posts: p.posts ? [...p.posts] : [],
      })),
    };
    for (let i = 0; i < newState.phases.length; i++) {
      const curr = newState.phases[i];
      this.calc(curr);
    }
    return newState;
  }
}
