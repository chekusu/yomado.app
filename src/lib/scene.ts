/**
 * The home page's short story on one timeline, in seconds.
 *
 *   0.0  your display, with your windows
 *   1.0  act 1: a virtual screen opens beside it and is named Codex
 *   3.9  act 2: Blender moves into Codex; your other windows stay
 *   6.9  act 3: the view widens, Marvelous Designer joins Blender on Codex and GrokBot gets a
 *        screen of its own with Chrome
 *   9.9  act 4: night falls, the screens draw together into the night-window mark
 *
 * The home page scrubs the first three acts with scroll and plays the last one in the finale; the
 * no-JavaScript still is rendered from the end of act 3 (scripts/render-film.mjs). The full film
 * has its own, longer timeline (src/lib/film.ts) with the same apps and screens. Poses are pure
 * functions of time and layout, so the page and its still always agree.
 */

export type Layout = 'wide' | 'tall';
export type ScreenId = 'codex' | 'grok';
export type WindowId = 'blender' | 'md' | 'chrome';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Stage size in scene units: wide is 16:9 (film 1920 × 1080), tall is 4:5 (film 1080 × 1350). */
export const STAGE: Record<Layout, { w: number; h: number }> = {
  wide: { w: 1600, h: 900 },
  tall: { w: 900, h: 1125 },
};

/** Natural sizes in scene units: the physical display's screen (16:10), a virtual screen (16:9), an app window. */
export const PHYS = { w: 1000, h: 625 };
export const VIRTUAL = { w: 640, h: 360 };
export const WINDOW = { w: 440, h: 290 };

export const DURATION = 16;

/** The finished state of each page act: Codex open, the app moved, both screens with their apps. */
export const ACT_END = [3.6, 6.8, 9.8] as const;

/** The finale plays from night to the finished mark. */
export const FINALE: readonly [number, number] = [12.0, 15.2];

type Span = readonly [number, number];

const BEAT = {
  open: [1.0, 3.0],
  reveal: [1.8, 3.1],
  name: [2.6, 3.4],
  lift: [3.9, 4.2],
  fly: [4.1, 5.5],
  settle: [5.4, 5.8],
  pair: [6.9, 8.5],
  grokReveal: [7.5, 8.7],
  grokName: [8.1, 8.9],
  md: [8.0, 8.7],
  chrome: [8.6, 9.3],
  night: [9.9, 11.9],
  codexNight: [9.9, 11.4],
  grokNight: [10.4, 11.9],
  gather: [12.2, 13.5],
  dim: [12.2, 12.8],
  lit: [12.7, 13.5],
  mark: [13.35, 13.8],
  bite: [13.6, 14.4],
  tile: [13.9, 14.8],
  word: [14.5, 15.2],
} satisfies Record<string, Span>;

const CHIPS: Record<ScreenId, { id: WindowId; at: Span }[]> = {
  codex: [
    { id: 'blender', at: [5.6, 6.0] },
    { id: 'md', at: [8.4, 8.8] },
  ],
  grok: [{ id: 'chrome', at: [9.0, 9.4] }],
};

export const ease = {
  linear: (u: number) => u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  out: (u: number) => 1 - (1 - u) ** 3,
  in: (u: number) => u * u * u,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;

/** Eased progress of `t` through `span`. */
export function prog(t: number, [a, b]: Span, e: (u: number) => number = ease.inOut): number {
  return e(clamp01((t - a) / (b - a)));
}

function mixBox(a: Box, b: Box, u: number): Box {
  return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), w: mix(a.w, b.w, u), h: mix(a.h, b.h, u) };
}

/** A box of width `w` with the aspect ratio of `size`. */
const sized = (size: { w: number; h: number }) => (x: number, y: number, w: number): Box => ({ x, y, w, h: (w * size.h) / size.w });
const physBox = sized(PHYS);
const virtualBox = sized(VIRTUAL);

/** The same box scaled about its centre. */
function scaled(b: Box, s: number): Box {
  return { x: b.x + (b.w * (1 - s)) / 2, y: b.y + (b.h * (1 - s)) / 2, w: b.w * s, h: b.h * s };
}

/** A window slot inside a screen, as fractions of that screen. Windows keep their own aspect ratio. */
interface Slot {
  x: number;
  y: number;
  w: number;
}
function slotIn(box: Box, slot: Slot): Box {
  const w = slot.w * box.w;
  return { x: box.x + slot.x * box.w, y: box.y + slot.y * box.h, w, h: (w * WINDOW.h) / WINDOW.w };
}
const mixSlot = (a: Slot, b: Slot, u: number): Slot => ({ x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), w: mix(a.w, b.w, u) });

const SLOT = {
  phys: { x: 0.5, y: 96 / 625, w: 0.44 },
  single: { x: 85 / 640, y: 36 / 360, w: 470 / 640 },
  first: { x: 26 / 640, y: 30 / 360, w: 340 / 640 },
  second: { x: 274 / 640, y: 110 / 360, w: 340 / 640 },
} satisfies Record<string, Slot>;

interface LayoutSpec {
  phys: { start: Box; open: Box; pair: Box; night: Box };
  codex: { open: Box; pair: Box; night: Box };
  grok: { pair: Box; night: Box };
  /** Centre and tile size of the finished mark. */
  mark: { cx: number; cy: number; size: number };
  /** Label row above each screen: chip size and gap. */
  label: { size: number; gap: number };
  /** Wordmark under the mark. */
  word: { y: number; size: number };
  /** How far the moving window arcs away from a straight line. */
  arc: number;
}

const LAYOUTS: Record<Layout, LayoutSpec> = {
  wide: {
    phys: {
      start: physBox(300, 64, 1000),
      open: physBox(84, 128, 860),
      pair: physBox(96, 196, 740),
      night: physBox(-860, 196, 740),
    },
    codex: { open: virtualBox(1018, 256, 480), pair: virtualBox(930, 118, 540), night: virtualBox(250, 306, 520) },
    grok: { pair: virtualBox(930, 532, 540), night: virtualBox(830, 306, 520) },
    mark: { cx: 800, cy: 425, size: 250 },
    label: { size: 30, gap: 14 },
    word: { y: 590, size: 60 },
    arc: 70,
  },
  tall: {
    phys: {
      start: physBox(40, 236, 820),
      open: physBox(140, 60, 620),
      pair: physBox(200, 150, 500),
      night: physBox(200, -620, 500),
    },
    codex: { open: virtualBox(110, 664, 680), pair: virtualBox(26, 700, 414), night: virtualBox(130, 230, 640) },
    grok: { pair: virtualBox(460, 700, 414), night: virtualBox(130, 690, 640) },
    mark: { cx: 450, cy: 480, size: 300 },
    label: { size: 40, gap: 16 },
    word: { y: 680, size: 76 },
    arc: 60,
  },
};

/** The ivory window inside the mark's tile, from the app icon's geometry (100-unit icon). */
export const ICON = { x: 28.63, y: 16.39, w: 42.74, h: 66.81, tl: 12.64, br: 4.73, r: 10.6, tile: 21 };

function markWindow(m: LayoutSpec['mark']): Box {
  const s = m.size / 100;
  return { x: m.cx - m.size / 2 + ICON.x * s, y: m.cy - m.size / 2 + ICON.y * s, w: ICON.w * s, h: ICON.h * s };
}

export interface ScreenPose {
  box: Box;
  /** Corner radii (top-left, others) in scene units; they become the mark's window while gathering. */
  radius: [number, number];
  /** 0 → 1 as the screen first lights up. */
  reveal: number;
  /** 0 → 1 as it fills with ivory light at the end. */
  lit: number;
  glow: number;
  opacity: number;
}

export interface LabelPose {
  x: number;
  y: number;
  w: number;
  /** 0 → 1 as the name types in. */
  name: number;
  meta: number;
  opacity: number;
  chips: { id: WindowId; pop: number }[];
}

export interface WindowPose {
  box: Box;
  opacity: number;
  /** 0 → 1 → 0 while it is picked up and set down. */
  lift: number;
  /** 0 → 1 as the agent works in it. */
  work: number;
}

export interface Pose {
  night: number;
  phys: { box: Box; opacity: number };
  screens: Record<ScreenId, ScreenPose>;
  labels: Record<ScreenId, LabelPose>;
  windows: Record<WindowId, WindowPose>;
  mark: { box: Box; opacity: number; bite: number; tile: number };
  word: { y: number; size: number; opacity: number };
}

export function pose(t: number, layout: Layout): Pose {
  const L = LAYOUTS[layout];
  const night = prog(t, BEAT.night);
  const dim = prog(t, BEAT.dim, ease.out);
  const lit = prog(t, BEAT.lit);
  const markIn = prog(t, BEAT.mark, ease.out);
  const target = markWindow(L.mark);

  // The physical display makes room, steps back, then leaves the frame at night.
  let phys = L.phys.start;
  phys = mixBox(phys, L.phys.open, prog(t, BEAT.open));
  phys = mixBox(phys, L.phys.pair, prog(t, BEAT.pair));
  phys = mixBox(phys, L.phys.night, prog(t, BEAT.night));
  const physOpacity = 1 - prog(t, [BEAT.night[0] + 0.5, BEAT.night[1]]);

  const screenAt = (from: Box, steps: [Box, Span][]): Box => {
    let box = from;
    for (const [to, span] of steps) box = mixBox(box, to, prog(t, span));
    return mixBox(box, target, prog(t, BEAT.gather));
  };
  const codex = screenAt(scaled(L.codex.open, 0.86), [
    [L.codex.open, BEAT.open],
    [L.codex.pair, BEAT.pair],
    [L.codex.night, BEAT.codexNight],
  ]);
  const grok = screenAt(scaled(L.grok.pair, 0.86), [
    [L.grok.pair, BEAT.grokReveal],
    [L.grok.night, BEAT.grokNight],
  ]);

  const glow = 0.35 + 0.65 * night;
  const gather = prog(t, BEAT.gather);
  const s = L.mark.size / 100;
  const radius: [number, number] = [mix(14, ICON.tl * s, gather), mix(14, ICON.br * s, gather)];
  const screens: Record<ScreenId, ScreenPose> = {
    codex: { box: codex, radius, reveal: prog(t, BEAT.reveal, ease.out), lit, glow, opacity: 1 - markIn },
    grok: { box: grok, radius, reveal: prog(t, BEAT.grokReveal, ease.out), lit, glow, opacity: 1 - markIn },
  };

  const label = (id: ScreenId, box: Box, name: Span): LabelPose => ({
    x: box.x,
    y: box.y - L.label.gap - L.label.size,
    w: box.w,
    name: prog(t, name, ease.linear),
    meta: prog(t, [name[1] - 0.15, name[1] + 0.35], ease.out),
    opacity: screens[id].reveal * (1 - dim),
    chips: CHIPS[id].map(({ id: chip, at }) => ({ id: chip, pop: prog(t, at, ease.out) })),
  });

  // Blender rides in the physical display, flies across, then lives in Codex.
  const fly = prog(t, BEAT.fly);
  let blender: Box;
  if (t < BEAT.fly[0]) {
    blender = slotIn(phys, SLOT.phys);
  } else if (t < BEAT.fly[1]) {
    const a = slotIn(phys, SLOT.phys);
    const b = slotIn(codex, SLOT.single);
    blender = mixBox(a, b, fly);
    const dx = b.x + b.w / 2 - (a.x + a.w / 2);
    const dy = b.y + b.h / 2 - (a.y + a.h / 2);
    const len = Math.hypot(dx, dy) || 1;
    const bend = L.arc * Math.sin(Math.PI * fly);
    blender.x += (dy / len) * bend;
    blender.y += (-dx / len) * bend;
  } else {
    blender = slotIn(codex, mixSlot(SLOT.single, SLOT.first, prog(t, BEAT.pair)));
  }
  const lift = prog(t, BEAT.lift, ease.out) * (1 - prog(t, BEAT.settle, ease.inOut));

  const appear = (span: Span, box: Box) => {
    const u = prog(t, span, ease.out);
    return { box: scaled(box, mix(0.9, 1, u)), opacity: u * (1 - dim) };
  };

  const windows: Record<WindowId, WindowPose> = {
    blender: { box: blender, opacity: 1 - dim, lift, work: prog(t, [5.8, 9.8], ease.linear) },
    md: { ...appear(BEAT.md, slotIn(codex, SLOT.second)), lift: 0, work: prog(t, [8.6, 12.4], ease.linear) },
    chrome: { ...appear(BEAT.chrome, slotIn(grok, SLOT.single)), lift: 0, work: prog(t, [8.8, 10.2], ease.out) },
  };

  const tileBox: Box = { x: L.mark.cx - L.mark.size / 2, y: L.mark.cy - L.mark.size / 2, w: L.mark.size, h: L.mark.size };

  return {
    night,
    phys: { box: phys, opacity: physOpacity },
    screens,
    labels: { codex: label('codex', codex, BEAT.name), grok: label('grok', grok, BEAT.grokName) },
    windows,
    mark: { box: tileBox, opacity: markIn, bite: prog(t, BEAT.bite), tile: prog(t, BEAT.tile) },
    word: { y: L.word.y + 16 * (1 - prog(t, BEAT.word, ease.out)), size: L.word.size, opacity: prog(t, BEAT.word, ease.out) },
  };
}
