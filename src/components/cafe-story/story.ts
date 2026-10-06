import type { Film, Move, Scene } from "./filmStage";

/**
 * The home page story: one cup of coffee, made in front of you. A single timeline (scroll
 * progress 0 → 1) scrubs real footage of each step and drives the HTML chapters, so text and film
 * always stay in sync. Between steps the camera moves the way a real one would, so each cut is
 * hidden inside the motion: it pushes into the beans and lands on the grinder, whips along the
 * bar, tilts down after the coffee, pushes into the glass and lands in the latte.
 */

export type ChapterId = "beans" | "grind" | "tamp" | "pull" | "pour" | "cup";

export type Chapter = {
  id: ChapterId;
  label: string;
  /** Progress where the chapter is fully visible. */
  focus: number;
  /** Half-width of the fully-visible window, and fade length either side. */
  hold: number;
  fade: number;
  side: "left" | "right" | "center";
  /**
   * Footage behind the chapter, scrubbed by scroll (see public/story/CREDITS.md). `poster` is the
   * frame shown before the film loads and in the reduced-motion layout.
   */
  film: Film & { alt: string; poster: number };
  /** The camera move into the next chapter. */
  move?: Move;
  /** Where the camera pushes in (leaving) and where it lands (arriving), as 0–1 screen points. */
  diveAt?: [number, number];
  landAt?: [number, number];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "beans",
    label: "The Beans",
    focus: 0,
    hold: 0.045,
    fade: 0.04,
    side: "left",
    film: { dir: "/story/frames/beans", count: 40, poster: 8, alt: "A brass scoop pouring roasted coffee beans over a linen bag" },
    move: "push",
    diveAt: [0.58, 0.66],
  },
  {
    id: "grind",
    label: "The Grind",
    focus: 0.2,
    hold: 0.04,
    fade: 0.035,
    side: "left",
    film: { dir: "/story/frames/grind", count: 40, poster: 30, alt: "A grinder dosing freshly ground coffee into a portafilter" },
    landAt: [0.52, 0.48],
    move: "left",
  },
  {
    id: "tamp",
    label: "The Tamp",
    focus: 0.4,
    hold: 0.04,
    fade: 0.035,
    side: "left",
    film: { dir: "/story/frames/tamp", count: 40, poster: 14, alt: "A barista tamping the coffee grounds, then locking the portafilter into the machine" },
    move: "down",
  },
  {
    id: "pull",
    label: "The Pull",
    focus: 0.6,
    hold: 0.04,
    fade: 0.035,
    side: "left",
    film: { dir: "/story/frames/pull", count: 40, poster: 39, alt: "An espresso shot pouring into a glass at the machine" },
    move: "push",
    diveAt: [0.5, 0.78],
  },
  {
    id: "pour",
    label: "The Pour",
    focus: 0.8,
    hold: 0.04,
    fade: 0.035,
    side: "left",
    film: { dir: "/story/frames/pour", count: 40, poster: 39, alt: "Milk pouring into a cup and drawing latte art" },
    landAt: [0.6, 0.68],
    move: "up",
  },
  {
    id: "cup",
    label: "Your Cup",
    focus: 1,
    hold: 0.045,
    fade: 0.04,
    side: "center",
    film: { dir: "/story/frames/cup", count: 40, poster: 20, alt: "A finished cup of coffee steaming on a saucer over roasted beans" },
  },
];

export const ABOUT_FILM: Film & { alt: string; poster: number } = {
  dir: "/story/frames/about",
  count: 32,
  poster: 0,
  alt: "Milk pouring slowly into a latte",
};

/** Half-width (in progress) of the camera move between two chapters. */
const TURN = 0.05;
const CENTRE: [number, number] = [0.5, 0.5];

/**
 * What is on screen at a given progress: the current step's film, and — during a camera move —
 * the next one, with how far the move has gone (`e`, 0 → 1). Each film plays over its own span
 * (from the start of the move that brings it in to the end of the move that takes it away), so
 * the footage keeps running through the move.
 */
export function storyScene(p: number): Scene {
  let i = 0;
  while (i < CHAPTERS.length - 1 && p > CHAPTERS[i + 1]!.focus) i++;
  const next = CHAPTERS[i + 1];
  const mid = next ? (CHAPTERS[i]!.focus + next.focus) / 2 : 1;
  const e = next ? smooth(mid - TURN, mid + TURN, p) : 0;
  const shot = (k: number) => {
    const prev = CHAPTERS[k - 1];
    const after = CHAPTERS[k + 1];
    const from = prev ? (prev.focus + CHAPTERS[k]!.focus) / 2 - TURN : 0;
    const to = after ? (CHAPTERS[k]!.focus + after.focus) / 2 + TURN : 1;
    return { film: k, local: Math.min(1, Math.max(0, (p - from) / (to - from))) };
  };
  if (e >= 1) return { a: shot(i + 1), b: null, e: 0, move: "push", diveAt: CENTRE, landAt: CENTRE };
  return {
    a: shot(i),
    b: e > 0 && next ? shot(i + 1) : null,
    e,
    move: CHAPTERS[i]!.move ?? "push",
    diveAt: CHAPTERS[i]!.diveAt ?? CENTRE,
    landAt: next?.landAt ?? CENTRE,
  };
}

/** 0 → 1 visibility of a chapter at a given progress (1 inside the hold window). */
export function chapterVisibility(c: Chapter, p: number): number {
  const d = Math.abs(p - c.focus);
  if (d <= c.hold) return 1;
  const t = 1 - (d - c.hold) / c.fade;
  return t <= 0 ? 0 : t * t * (3 - 2 * t);
}

export function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
