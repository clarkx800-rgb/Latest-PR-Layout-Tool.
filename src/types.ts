/**
 * Power Rail Layout Tool Types
 */

export interface Lug {
  id: string;
  rail: 'red' | 'blue';
  type: '1' | '5' | 'ground' | 'blue-light';
  ref: 'start' | 'end';
  dist: number;
}

export interface RailData {
  startMm: number;
  endMm: number;
  totalMm: number;
  visible: boolean;
  startRefPostIndex?: number;
  endRefPostIndex?: number;
  startRefType?: 'post' | 'red-start' | 'red-end';
  endRefType?: 'post' | 'red-start' | 'red-end';
  isCutToFit?: boolean;
}

export interface ViewState {
  scale: number;
  panX: number;
  panY: number;
}

export type AttachmentType = 'cis' | 'iso' | 'ramp' | 'exp';

export interface Phase {
  postCount: number;
  postSpanMm: number;
  posts: number[];
  red: RailData;
  blue: RailData;
  lugs: Lug[];
  
  // Legacy
  cis?: { start: boolean; end: boolean; };
  iso?: { start: boolean; end: boolean; };
  ramp?: { start: boolean; end: boolean; };
  exp?: { start: boolean; end: boolean; };

  // Reorderable Arrays
  startAttachments?: AttachmentType[];
  endAttachments?: AttachmentType[];

  minMm: number;
  maxMm: number;
  comments: string;
  view: ViewState;
  showPosts?: boolean;
  ghostedPosts?: number[]; // indices of posts that are ghosted
}

export interface AppState {
  isRTL: boolean;
  workDirection: string;
  activeIndex: number;
  phases: Phase[];
  indicatorsFlipped?: boolean;
  wo?: string;
  ts?: string;
  subSub?: string;
}

export type HitboxType = 'red-start' | 'red-end' | 'red-total' | 'blue-start' | 'blue-end' | 'blue-total' | 'lug-dist' | 'post-count' | 'red-start-handle' | 'red-end-handle' | 'blue-start-handle' | 'blue-end-handle' | 'ghost-block' | 'flip-indicators' | 'nav-prev' | 'nav-next' | 'post-toggle' | 'rail-visibility-toggle' | 'red-rail-body' | 'blue-rail-body';

export interface Hitbox {
  id: string;
  type: HitboxType;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
}
