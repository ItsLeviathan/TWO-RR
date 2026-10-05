/**
 * The home page story: one turn of the TWO RR clock. A single timeline (scroll progress 0 → 1)
 * drives both the 3D camera and the HTML chapters, so text and scene always stay in sync.
 */

export type Vec3 = [number, number, number];

export type CameraKey = {
  /** Scroll progress at which the camera arrives here. */
  at: number;
  pos: Vec3;
  look: Vec3;
  /**
   * Shifts camera + target sideways (world units, along the camera's right vector) on wide
   * screens, moving the subject away from the side where the chapter text sits.
   */
  shiftWide?: number;
  /** Same idea vertically on tall/portrait screens, where text sits at the bottom. */
  shiftTall?: number;
  /** Pulls the camera back on portrait screens so the subject fits above the text. */
  dollyTall?: number;
};

/** World layout (metres): back wall at z = -4, floor y = 0, counter top y ≈ 1.07. */
export const CAFE_CAMERA_PATH: CameraKey[] = [
  { at: 0.0, pos: [0, 3.55, 0.55], look: [0, 3.55, -3.9], shiftWide: -1.35, shiftTall: -1.45, dollyTall: 2.8 },
  { at: 0.18, pos: [0.7, 2.55, 1.0], look: [0.05, 1.55, -2.4], shiftWide: -0.4, shiftTall: -0.3 },
  { at: 0.36, pos: [0.42, 1.36, -1.22], look: [0.1, 1.13, -1.86], shiftWide: -0.16, shiftTall: -0.06 },
  { at: 0.58, pos: [-0.5, 1.42, -1.3], look: [0.1, 1.17, -1.86], shiftWide: 0.16, shiftTall: -0.06 },
  { at: 0.79, pos: [1.1, 2.5, -1.0], look: [2.55, 2.72, -3.95], shiftWide: -0.42, shiftTall: -0.85, dollyTall: 1.1 },
  { at: 1.0, pos: [0.25, 2.5, 4.7], look: [0.05, 2.35, -3.2], shiftWide: 0, shiftTall: -0.6, dollyTall: 1.2 },
];

/** About page: a short, slow move around the clock on the café wall. */
export const ABOUT_CAMERA_PATH: CameraKey[] = [
  { at: 0.0, pos: [0.0, 3.55, 0.3], look: [0, 3.55, -3.9], shiftWide: -1.3, shiftTall: -1.3, dollyTall: 2.6 },
  { at: 1.0, pos: [1.7, 2.9, 0.6], look: [0.1, 3.0, -3.9], shiftWide: -1.0, shiftTall: -0.75, dollyTall: 1.4 },
];

export type ChapterId = "welcome" | "coffee" | "moments" | "menu" | "visit";

export type Chapter = {
  id: ChapterId;
  /** Clock position shown in the progress dial and eyebrow (12 → 3 → 6 → 9 → 12). */
  hour: number;
  label: string;
  /** Progress where the chapter is fully visible (the camera key it belongs to). */
  focus: number;
  /** Half-width of the fully-visible window, and fade length either side. */
  hold: number;
  fade: number;
  side: "left" | "right" | "center";
};

export const CHAPTERS: Chapter[] = [
  { id: "welcome", hour: 12, label: "Welcome", focus: 0, hold: 0.06, fade: 0.06, side: "left" },
  { id: "coffee", hour: 3, label: "Good Coffee", focus: 0.36, hold: 0.06, fade: 0.05, side: "left" },
  { id: "moments", hour: 6, label: "Great Moments", focus: 0.58, hold: 0.06, fade: 0.05, side: "right" },
  { id: "menu", hour: 9, label: "The Menu", focus: 0.79, hold: 0.05, fade: 0.05, side: "left" },
  { id: "visit", hour: 12, label: "Visit", focus: 1, hold: 0.06, fade: 0.06, side: "center" },
];

/** 0 → 1 visibility of a chapter at a given progress (1 inside the hold window). */
export function chapterVisibility(c: Chapter, p: number): number {
  const d = Math.abs(p - c.focus);
  if (d <= c.hold) return 1;
  const t = 1 - (d - c.hold) / c.fade;
  return t <= 0 ? 0 : t * t * (3 - 2 * t);
}

/** Bean "swirl" strength over the story: beans lift around the cup during the Great Moments chapter. */
export function swirlAmount(p: number): number {
  const rise = smooth(0.42, 0.53, p);
  const fall = 1 - smooth(0.66, 0.76, p);
  return Math.min(rise, fall);
}

export function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
