/**
 * The one-minute product film on one timeline, in seconds. Every pose is a pure function of time
 * and layout, so any frame can be rendered on its own (scripts/render-film.mjs) and the stills,
 * posters and review frames always agree with the film.
 *
 *   0.0  1 · the need     Your display, Dock and windows; the view moves into Blender, where Codex
 *                         takes a screenshot, then clicks. It widens again to both your displays.
 *                         (Frame 0 is the poster: no text, the apps' own icons in the Dock.)
 *   7.6  2 · the panel    yomado's menu bar icon opens the control panel; a new virtual screen
 *                         appears to the right of your displays and is renamed Codex.
 *  19.0  3 · the move     Blender and Marvelous Designer are dragged onto Codex in the panel (lift,
 *                         hover, wiggle, snap); their windows cross to the new screen, yours stay.
 *  31.0  4 · the loop     On Codex: screenshot, Add Modifier → Subdivision Surface, type 3 ⏎, turn
 *                         the view, switch to Rendered, screenshot again. One shared pointer.
 *  43.5  5 · the return   A second screen, GrokBot, gets Chrome; Marvelous Designer is dragged back;
 *                         the menu bar menu lists each screen's apps and closes GrokBot, whose
 *                         window returns to its display first.
 *  54.0  6 · the close    Night falls, Codex lights up and becomes the night-window mark.
 *
 * World coordinates are logical display points: Studio Display 1 is 2560 × 1440 at the origin.
 * The camera turns them into frame pixels. Interface text is the app's own (Simplified Chinese);
 * the supers and the "simulated" label come from the locale (src/i18n, filmScript).
 */

export type FilmLayout = 'wide' | 'tall';
export type ScreenId = 'one' | 'two' | 'codex' | 'grok';
export type FilmWindowId = 'blender' | 'md' | 'chrome' | 'notes' | 'mail' | 'photos';
export type PanelApp = 'blender' | 'md' | 'wechat' | 'chrome';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Span = readonly [number, number];
type Ease = (u: number) => number;

export const FILM_DURATION = 60;
export const FILM_SIZE: Record<FilmLayout, { w: number; h: number }> = {
  wide: { w: 1920, h: 1080 },
  tall: { w: 1080, h: 1350 },
};

/* ------------------------------------------------------------------ easing and time */

export const ease = {
  linear: (u: number) => u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  out: (u: number) => 1 - (1 - u) ** 3,
  outQuart: (u: number) => 1 - (1 - u) ** 4,
  outExpo: (u: number) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u)),
  in: (u: number) => u * u * u,
  /** A softer in-out for the camera: quintic smootherstep. */
  smooth: (u: number) => u * u * u * (u * (u * 6 - 15) + 10),
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;

/** Eased progress of `t` through `span`. */
export function prog(t: number, [a, b]: Span, e: Ease = ease.inOut): number {
  return e(clamp01((t - a) / (b - a)));
}

/** 0 → 1 over `fadeIn`, 1 until `out[0]`, then → 0: a span that appears and disappears. */
function window_(t: number, inSpan: Span, outSpan: Span, e: Ease = ease.out): number {
  return prog(t, inSpan, e) * (1 - prog(t, outSpan, ease.inOut));
}
export { window_ as span };

function mixBox(a: Box, b: Box, u: number): Box {
  return { x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), w: mix(a.w, b.w, u), h: mix(a.h, b.h, u) };
}

/* ------------------------------------------------------------------ the world */

type ScreenInfo = Box & { name: string; logical: string; virtual: boolean };
const ONE: ScreenInfo = { x: 0, y: 0, w: 2560, h: 1440, name: 'Studio Display 1', logical: '2560 × 1440', virtual: false };
const TWO: ScreenInfo = { x: 2740, y: 0, w: 2560, h: 1440, name: 'Studio Display 2', logical: '2560 × 1440', virtual: false };
const virtualScreen = (name: string, x: number, y: number): ScreenInfo => ({ x, y, w: 1920, h: 1080, name, logical: '1920 × 1080', virtual: true });

/**
 * Screen areas of the displays, in world points. Wide: the virtual screens sit to the right of
 * yours, as the panel lists them, GrokBot under Codex. Tall: each sits under one of your displays,
 * so a window's move reads top to bottom in a portrait frame.
 */
export const SCREENS_BY_LAYOUT: Record<FilmLayout, Record<ScreenId, ScreenInfo>> = {
  wide: { one: ONE, two: TWO, codex: virtualScreen('Codex', 5640, 0), grok: virtualScreen('GrokBot', 5640, 1300) },
  tall: { one: ONE, two: TWO, codex: virtualScreen('Codex', 320, 1720), grok: virtualScreen('GrokBot', 3060, 1720) },
};
/** The wide arrangement; your two displays are the same in both. */
export const SCREENS = SCREENS_BY_LAYOUT.wide;

/** Menu bar height on every screen. */
export const MENUBAR = 24;

/** App windows: size and their place on each screen they visit (screen coordinates). */
export const WINDOWS: Record<FilmWindowId, { w: number; h: number; home: ScreenId; at: Partial<Record<ScreenId, [number, number]>>; mine?: boolean }> = {
  mail: { w: 900, h: 560, home: 'one', at: { one: [420, 790] }, mine: true },
  notes: { w: 640, h: 480, home: 'one', at: { one: [1800, 120] }, mine: true },
  md: { w: 1240, h: 780, home: 'one', at: { one: [1200, 440], codex: [620, 250] } },
  blender: { w: 1500, h: 900, home: 'one', at: { one: [130, 110], codex: [40, 60] } },
  photos: { w: 760, h: 540, home: 'two', at: { two: [1660, 720] }, mine: true },
  chrome: { w: 1440, h: 880, home: 'two', at: { two: [300, 150], grok: [240, 110] } },
};

/** Where the menu bar puts yomado's icon on Studio Display 1 (its centre, world points). */
export const STATUS_ICON = { x: SCREENS.one.x + SCREENS.one.w - 330, y: SCREENS.one.y + MENUBAR / 2 };

/* ------------------------------------------------------------------ yomado's menu bar menu */

export type MenuRow = { kind: 'item'; label: string; disabled?: boolean; sub?: boolean; icon?: PanelApp } | { kind: 'sep' };

/** The menu as app/Yomado.m builds it: before any screen exists, and with Codex and GrokBot. */
export function statusRows(phase: 'first' | 'second'): MenuRow[] {
  const i = (label: string, more: Partial<MenuRow & { kind: 'item' }> = {}): MenuRow => ({ kind: 'item', label, ...more });
  const sep: MenuRow = { kind: 'sep' };
  const screens = phase === 'first' ? [i('尚无运行中的虚拟屏', { disabled: true })] : [i('虚拟屏 1 · Codex · 1 个应用', { sub: true }), i('虚拟屏 2 · GrokBot · 1 个应用', { sub: true })];
  return [i('打开控制面板'), sep, ...screens, i('添加或启动虚拟屏…', { sub: true }), sep, i('yomado 0.3.3', { disabled: true }), i('检查更新…'), sep, i('完全退出 yomado')];
}

/** GrokBot's submenu: its app, then managing and closing the screen. */
export const GROK_ROWS: MenuRow[] = [
  { kind: 'item', label: 'Google Chrome · 1 个窗口', icon: 'chrome' },
  { kind: 'sep' },
  { kind: 'item', label: '在控制面板中管理…' },
  { kind: 'item', label: '关闭这个虚拟屏' },
];

/** Menu metrics in points: rows, separators and the padding above the first row. */
export const MENU = { item: 22, sep: 11, pad: 5, w: 268, subW: 236 };

/** Top of a row inside its menu. */
export function rowTop(rows: MenuRow[], index: number): number {
  let y = MENU.pad;
  for (let i = 0; i < index; i++) y += rows[i].kind === 'sep' ? MENU.sep : MENU.item;
  return y;
}

export function menuHeight(rows: MenuRow[]): number {
  return rowTop(rows, rows.length) + MENU.pad;
}

/** The menu hangs under the icon; GrokBot's submenu opens to its left, as the screen edge is near. */
export const STATUS_MENU = { x: STATUS_ICON.x - 9, y: MENUBAR + 3 };
export const GROK_ROW = 3;
export function grokSubmenuAt() {
  return { x: STATUS_MENU.x - MENU.subW + 5, y: STATUS_MENU.y + rowTop(statusRows('second'), GROK_ROW) - MENU.pad };
}

/* ------------------------------------------------------------------ the control panel */

/** The panel window on Studio Display 1: top-left of its frame (title bar included). */
export const PANEL_WIN = { x: 760, y: 290 };
export const PANEL_TITLEBAR = 28;
/** Origin of the panel's content (below the title bar), in world points. */
export const PANEL_ORIGIN = { x: PANEL_WIN.x, y: PANEL_WIN.y + PANEL_TITLEBAR };

/** Card boxes in panel content coordinates, with all four screens present (src/lib/panel.ts). */
const CARD_W = { phys: 334.4, virt: 250.8 };
const CARD_H = { phys: (334.4 * 9) / 16, virt: (250.8 * 9) / 16 };
export const CARDS: Record<ScreenId, Box> = {
  one: { x: 24, y: 70, w: CARD_W.phys, h: CARD_H.phys },
  two: { x: 24 + CARD_W.phys + 16, y: 70, w: CARD_W.phys, h: CARD_H.phys },
  codex: { x: 24 + 2 * (CARD_W.phys + 16), y: 70, w: CARD_W.virt, h: CARD_H.virt },
  grok: { x: 24 + 2 * (CARD_W.phys + 16) + CARD_W.virt + 16, y: 70, w: CARD_W.virt, h: CARD_H.virt },
};

/** The i-th icon slot of a card (relative to the card), as app/AppWorkspaceView.m lays it out. */
export function slot(cardW: number, i: number): Box {
  const inner = cardW - 16;
  const columns = Math.max(1, Math.floor((inner + 6) / 54));
  const total = 48 * columns + 6 * (columns - 1);
  const start = Math.max(0, (inner - total) / 2);
  return { x: 8 + start + (i % columns) * 54 + 4, y: 40 + Math.floor(i / columns) * 48 + 4, w: 40, h: 40 };
}

/** Panel content width: 1000 points, growing as GrokBot's card is added. */
const PANEL_W = { three: 1000, four: CARDS.grok.x + CARD_W.virt + 24 };

/** Panel content coordinates of a few controls the pointer uses. */
export const PANEL_UI = {
  add: { x: 1000 - 24 - 18, y: 14 + 20 },
  addMenu: { x: 1000 - 24 - 36, y: 14 + 34, w: 150 },
  manage: (card: Box) => ({ x: card.x + card.w - 5 - 11, y: card.y + card.h - 4 - 11 }),
  manageMenu: (card: Box) => ({ x: card.x + card.w - 16, y: card.y + card.h + 2, w: 168 }),
};

/* ------------------------------------------------------------------ Blender's window */

/**
 * Blender's window layout in window points (1500 × 900, title bar included). FilmStage.astro
 * draws from these numbers and the pointer aims at them, so they cannot drift apart.
 */
export const BLENDER = {
  titlebar: 28,
  topbar: { y: 28, h: 26 },
  view: { x: 0, y: 54, w: 1128, h: 682 },
  viewHeader: 26,
  side: { x: 1130, w: 370 },
  outliner: { y: 54, h: 236 },
  props: { y: 292, h: 582 },
  timeline: { y: 738, h: 138 },
  status: { y: 876, h: 24 },
  /** Properties editor content, relative to the window. */
  addModifier: { x: 1130 + 40 + 12, y: 292 + 70, w: 370 - 40 - 24, h: 26 },
  modifierMenu: { x: 1130 + 40 + 12, y: 292 + 98, w: 190, item: 24 },
  generateMenu: { w: 196, item: 22 },
  levels: { x: 1130 + 40 + 12 + 150, y: 292 + 166, w: 370 - 40 - 24 - 150, h: 22 },
  /** The viewport's shading buttons (wireframe, solid, material, rendered), centres. */
  shading: (i: number) => ({ x: 1128 - 22 - (3 - i) * 26, y: 54 + 13 }),
  /** The navigation gizmo's centre, top right of the viewport. */
  gizmo: { x: 1128 - 70, y: 54 + 26 + 62 },
};
export const MODIFIER_MENU = ['Edit', 'Generate', 'Deform', 'Normals', 'Physics'];
export const GENERATE_MENU = ['Array', 'Bevel', 'Boolean', 'Build', 'Decimate', 'Edge Split', 'Geometry Nodes', 'Mask', 'Mirror', 'Multiresolution', 'Remesh', 'Screw', 'Skin', 'Solidify', 'Subdivision Surface', 'Triangulate', 'Volume to Mesh', 'Weld', 'Wireframe'];

/* ------------------------------------------------------------------ beats */

export const SHOTS: Span[] = [
  [0, 7.6],
  [7.6, 19.0],
  [19.0, 31.0],
  [31.0, 43.5],
  [43.5, 54.0],
  [54.0, 60.0],
];

const B = {
  // 1 · the need
  s1Shot: [2.6, 3.7] as Span,
  s1Click: 4.15,
  // 2 · the panel
  menuOpen: 9.3,
  menuPick: 10.15,
  panelOpen: [10.25, 10.65] as Span,
  addClick: 11.85,
  addPick: 12.45,
  cardIn: [12.55, 13.15] as Span,
  codexOn: [12.7, 13.8] as Span,
  manageClick: 13.75,
  renamePick: 14.3,
  alert: [14.4, 14.65] as Span,
  typeFrom: 14.95,
  typeStep: 0.14,
  save: 15.95,
  // 3 · the move
  dragBlender: { down: 20.9, up: 22.35 },
  flyBlender: [22.5, 23.9] as Span,
  dragMd: { down: 23.2, up: 24.5 },
  flyMd: [24.65, 26.05] as Span,
  // 4 · the loop
  shot1: [32.2, 33.6] as Span,
  addModifier: 34.75,
  generate: 35.25,
  subdivision: 35.75,
  levelsClick: 36.35,
  key3: 36.85,
  keyEnter: 37.2,
  orbit: [38.3, 39.75] as Span,
  rendered: 40.3,
  shot2: [41.0, 42.4] as Span,
  // 5 · the return
  addClick2: 44.75,
  addPick2: 45.25,
  grokCardIn: [45.35, 45.95] as Span,
  grokOn: [45.5, 46.6] as Span,
  dragChrome: { down: 46.15, up: 47.15 },
  flyChrome: [47.3, 48.6] as Span,
  dragMdBack: { down: 47.65, up: 48.75 },
  flyMdBack: [48.9, 50.2] as Span,
  statusOpen: 50.75,
  statusHover: 51.25,
  closePick: 52.05,
  flyChromeBack: [52.25, 53.45] as Span,
  grokOff: [53.25, 54.0] as Span,
  // 6 · the close
  night: [54.0, 56.0] as Span,
  lit: [55.2, 56.3] as Span,
  gather: [55.9, 57.3] as Span,
  mark: [57.0, 57.5] as Span,
  bite: [57.2, 58.0] as Span,
  tile: [57.4, 58.2] as Span,
  word: [57.9, 58.6] as Span,
  cta: [58.4, 59.1] as Span,
};
export const BEATS = B;

/* ------------------------------------------------------------------ the camera */

/** A camera key: the world point at the frame's centre and the zoom (frame pixels per point). */
interface CamKey {
  t: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Between two keys, zoom moves in log space and the centre moves in step with the visible width,
 * so pull-backs and push-ins read as one straight dolly rather than a pan plus a zoom.
 */
function camera(keys: CamKey[], t: number): CamKey {
  if (t <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t > b.t) continue;
    const u = ease.smooth(clamp01((t - a.t) / (b.t - a.t)));
    const z = Math.exp(mix(Math.log(a.z), Math.log(b.z), u));
    const w = Math.abs(b.z - a.z) < 1e-6 ? u : (1 / z - 1 / a.z) / (1 / b.z - 1 / a.z);
    return { t, x: mix(a.x, b.x, w), y: mix(a.y, b.y, w), z };
  }
  return keys[keys.length - 1];
}

const pc = (x: number, y: number) => ({ x: PANEL_ORIGIN.x + x, y: PANEL_ORIGIN.y + y });
/** A point in Blender's window on Codex, in world points. */
const blenderOn = (layout: FilmLayout) => (x: number, y: number) => {
  const b = windowBoxAt('blender', 'codex', layout);
  return { x: b.x + x, y: b.y + y };
};

/** A camera that puts world point (x, y) at frame point (fx, fy). */
function frameOn(layout: FilmLayout, t: number, x: number, y: number, z: number, fx: number, fy: number): CamKey {
  const f = FILM_SIZE[layout];
  return { t, x: x - (fx - f.w / 2) / z, y: y - (fy - f.h / 2) / z, z };
}

/** A camera that puts world x `at.x` at frame x `at.fx` and the menu bar's middle at frame y `barY`. */
function menuCamera(frame: { w: number; h: number }, z: number, at: { x: number; fx: number }, barY: number) {
  return { x: at.x - (at.fx - frame.w / 2) / z, y: STATUS_ICON.y - (barY - frame.h / 2) / z, z };
}

/** Camera keys per layout. Holds are pairs of keys with the same framing. */
function cameraKeys(layout: FilmLayout): CamKey[] {
  const S = SCREENS_BY_LAYOUT[layout];
  const blender1 = windowBoxAt('blender', 'one', layout);
  const blenderC = windowBoxAt('blender', 'codex', layout);
  const codex = S.codex;
  const panelC = pc(500, 191);
  const at = blenderOn(layout);
  const key = (t: number, x: number, y: number, z: number): CamKey => ({ t, x, y, z });
  // The menu bar close-ups keep the bar, the whole menu and GrokBot's submenu (which opens to the
  // left) in frame, below the supers: in the wide frame the bar sits 230 px down with the submenu's
  // left edge at 860 px; in the tall frame the bar sits 360 px down.
  const subLeft = grokSubmenuAt().x;
  const menuWide = menuCamera({ w: 1920, h: 1080 }, 2.0, { x: subLeft, fx: 860 }, 230);
  const menuTall = menuCamera({ w: 1080, h: 1350 }, 1.9, { x: subLeft, fx: 75 }, 360);
  if (layout === 'wide') {
    // Wide: supers live in a band at the bottom (shots 1, 2, 4) or the top (3, 5, over the callout).
    const world = key(0, 3760, 1180, 0.243);
    const both = key(0, 2650, 980, 0.335);
    // The properties editor with the whole Generate menu above the caption band.
    const props = at(1150, 600);
    const view = at(600, 400);
    // Blender on your display, high in the frame: the band below falls on your light desktop.
    const close1 = frameOn(layout, 0, blender1.x, blender1.y, 0.86, 150, 24);
    return [
      key(0, 1280, 770, 0.6),
      key(0.9, 1285, 770, 0.605),
      { ...close1, t: 2.4 },
      { ...frameOn(layout, 4.6, blender1.x, blender1.y, 0.88, 140, 18) },
      key(6.5, both.x, both.y, both.z),
      key(7.7, both.x + 30, both.y, both.z * 1.008),
      key(8.9, menuWide.x, menuWide.y, menuWide.z),
      key(10.15, menuWide.x - 6, menuWide.y, menuWide.z),
      frameOn(layout, 11.15, panelC.x, panelC.y, 1.5, 960, 420),
      frameOn(layout, 15.9, panelC.x + 6, panelC.y, 1.53, 960, 420),
      key(17.4, world.x, world.y, world.z),
      key(26.4, world.x + 30, world.y, world.z * 1.008),
      key(30.6, 4700, 1180, 0.27),
      key(32.0, codex.x + codex.w / 2, codex.y + codex.h / 2 + 30, 0.93),
      key(33.7, codex.x + codex.w / 2, codex.y + codex.h / 2 + 30, 0.95),
      key(34.6, props.x, props.y, 1.3),
      key(37.25, props.x + 6, props.y + 6, 1.33),
      key(38.15, view.x, view.y, 1.18),
      key(40.6, view.x + 30, view.y, 1.2),
      key(41.3, codex.x + codex.w / 2, codex.y + codex.h / 2 + 30, 0.93),
      key(43.3, codex.x + codex.w / 2, codex.y + codex.h / 2 + 30, 0.95),
      key(44.4, 3980, 1460, 0.23),
      key(50.0, 3990, 1460, 0.232),
      key(50.75, menuWide.x, menuWide.y, menuWide.z),
      key(52.15, menuWide.x - 6, menuWide.y, menuWide.z),
      key(53.0, 4400, 1250, 0.27),
      key(54.0, 4420, 1250, 0.272),
      key(56.2, codex.x + codex.w / 2, codex.y + codex.h / 2 + 80, 0.32),
      key(60, codex.x + codex.w / 2, codex.y + codex.h / 2 + 80, 0.32),
    ];
  }
  // Tall: the top 330 px hold the label and the supers; the action is framed below them, around
  // y = 840 (or y = 665 above the panel callout). Each virtual screen sits under one of your displays.
  const below = (t: number, x: number, y: number, z: number) => frameOn(layout, t, x, y, z, 540, 840);
  const aboveCallout = (t: number, x: number, y: number, z: number) => frameOn(layout, t, x, y, z, 540, 660);
  const left = { x: 1280, y: (-60 + codex.y + codex.h + 130) / 2 };
  const right = { x: S.grok.x + 960, y: left.y };
  const pair = 600 / (codex.y + codex.h + 190);
  const d1 = { x: 1280, y: 720 };
  const both = { x: 2650, y: 720 };
  const props = at(1250, 430);
  const view = at(560, 380);
  return [
    below(0, d1.x, d1.y, 0.372),
    below(0.9, d1.x + 4, d1.y, 0.375),
    below(2.4, blender1.x + 750, blender1.y + 450, 0.67),
    below(4.6, blender1.x + 760, blender1.y + 450, 0.69),
    below(6.5, both.x, both.y + 40, 0.19),
    below(7.7, both.x + 20, both.y + 40, 0.191),
    key(8.9, menuTall.x, menuTall.y, menuTall.z),
    key(10.15, menuTall.x - 4, menuTall.y, menuTall.z),
    below(11.15, panelC.x + 50, panelC.y, 0.9),
    below(15.9, panelC.x + 54, panelC.y, 0.92),
    aboveCallout(17.4, left.x, left.y, pair),
    aboveCallout(30.0, left.x + 10, left.y, pair * 1.01),
    below(32.0, blenderC.x + 750, blenderC.y + 450, 0.67),
    below(33.7, blenderC.x + 750, blenderC.y + 450, 0.68),
    below(34.6, props.x, props.y, 1.3),
    below(37.25, props.x, props.y + 10, 1.34),
    below(38.15, view.x, view.y, 0.94),
    below(40.6, view.x + 20, view.y, 0.96),
    below(41.3, blenderC.x + 750, blenderC.y + 450, 0.67),
    below(43.3, blenderC.x + 750, blenderC.y + 450, 0.68),
    aboveCallout(44.4, right.x, right.y, pair),
    aboveCallout(47.4, right.x - 10, right.y, pair * 1.01),
    aboveCallout(48.2, left.x, left.y, pair),
    aboveCallout(50.0, left.x + 10, left.y, pair * 1.01),
    key(50.75, menuTall.x, menuTall.y, menuTall.z),
    key(52.15, menuTall.x - 4, menuTall.y, menuTall.z),
    below(53.0, right.x, right.y, pair * 1.12),
    below(54.0, right.x - 10, right.y, pair * 1.13),
    key(56.2, codex.x + codex.w / 2, codex.y + codex.h / 2 + 140, 0.36),
    key(60, codex.x + codex.w / 2, codex.y + codex.h / 2 + 140, 0.36),
  ];
}

/* ------------------------------------------------------------------ windows */

export function windowBoxAt(id: FilmWindowId, screen: ScreenId, layout: FilmLayout = 'wide'): Box {
  const w = WINDOWS[id];
  const s = SCREENS_BY_LAYOUT[layout][screen];
  const [x, y] = w.at[screen]!;
  return { x: s.x + x, y: s.y + y, w: w.w, h: w.h };
}

interface Move {
  id: FilmWindowId;
  from: ScreenId;
  to: ScreenId;
  at: Span;
}

const MOVES: Move[] = [
  { id: 'blender', from: 'one', to: 'codex', at: B.flyBlender },
  { id: 'md', from: 'one', to: 'codex', at: B.flyMd },
  { id: 'chrome', from: 'two', to: 'grok', at: B.flyChrome },
  { id: 'md', from: 'codex', to: 'one', at: B.flyMdBack },
  { id: 'chrome', from: 'grok', to: 'two', at: B.flyChromeBack },
];

export interface WindowPose {
  box: Box;
  screen: ScreenId;
  /** 0 → 1 → 0 while it travels. */
  lift: number;
  /** Stacking order: higher is in front. */
  z: number;
  opacity: number;
}

const BASE_Z: Record<FilmWindowId, number> = { mail: 1, notes: 2, md: 3, blender: 4, photos: 1, chrome: 2 };

function windowPose(id: FilmWindowId, t: number, layout: FilmLayout): WindowPose {
  let screen = WINDOWS[id].home;
  let box = windowBoxAt(id, screen, layout);
  let lift = 0;
  let z = BASE_Z[id];
  for (const m of MOVES) {
    if (m.id !== id || t < m.at[0]) continue;
    const a = windowBoxAt(id, m.from, layout);
    const b = windowBoxAt(id, m.to, layout);
    const u = prog(t, m.at, ease.inOut);
    box = mixBox(a, b, u);
    // A gentle arc, as if lifted over the screens in between (sideways when the move is vertical).
    const across = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const arc = Math.sin(Math.PI * u) * Math.min(420, (across ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y)) * 0.12);
    if (across) box.y -= arc;
    else box.x += b.x >= a.x ? arc : -arc;
    lift = Math.sin(Math.PI * clamp01((t - m.at[0]) / (m.at[1] - m.at[0])));
    screen = t >= m.at[1] ? m.to : m.from;
    z = t < m.at[1] ? 20 : 10 + BASE_Z[id];
  }
  return { box, screen, lift, z, opacity: 1 };
}

/* ------------------------------------------------------------------ screens */

export interface ScreenPose {
  /** 0 → 1 as a virtual screen switches on; 1 → 0 as it is closed. */
  on: number;
  /** Ivory light filling the screen at night. */
  lit: number;
  /** The screen's name as the label shows it. */
  name: string;
  /** Chips: the apps on it, as their icons pop in and out. */
  apps: { id: PanelApp; pop: number }[];
}

/* ------------------------------------------------------------------ the pointer */

interface PKey {
  t: number;
  x: number;
  y: number;
}

/** A pointer path through world points; between keys it eases, with a slight arc for long moves. */
function along(keys: PKey[], t: number): { x: number; y: number } {
  if (t <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t > b.t) continue;
    const u = ease.inOut(clamp01((t - a.t) / (b.t - a.t || 1)));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const bend = Math.sin(Math.PI * u) * Math.min(len * 0.08, 60);
    return { x: mix(a.x, b.x, u) + (len ? (-dy / len) * bend : 0), y: mix(a.y, b.y, u) + (len ? (dx / len) * bend : 0) };
  }
  return keys[keys.length - 1];
}

const slotCentre = (card: ScreenId, i: number) => {
  const c = CARDS[card];
  const s = slot(c.w, i);
  return pc(c.x + s.x + 20, c.y + s.y + 20);
};
const statusMenuItem = (phase: 'first' | 'second', i: number) => ({ x: STATUS_MENU.x + 110, y: STATUS_MENU.y + rowTop(statusRows(phase), i) + MENU.item / 2 });
const statusSubItem = (i: number) => {
  const at = grokSubmenuAt();
  return { x: at.x + 120, y: at.y + rowTop(GROK_ROWS, i) + MENU.item / 2 };
};

/** Every place the pointer goes, in time order (world points). */
function pointerKeysFor(layout: FilmLayout): PKey[] {
  const k = (t: number, p: { x: number; y: number }, dx = 0, dy = 0): PKey => ({ t, x: p.x + dx, y: p.y + dy });
  const blenderPoint = blenderOn(layout);
  const generateItem = (i: number) => {
    const m = BLENDER.modifierMenu;
    const g = BLENDER.generateMenu;
    // The submenu opens to the left of the menu, its first item level with "Generate".
    return blenderPoint(m.x - g.w - 2 + 70, m.y + m.item + i * g.item + g.item / 2);
  };
  const b1 = windowBoxAt('blender', 'one', layout);
  const codexCard = CARDS.codex;
  const grokCard = CARDS.grok;
  const onYours = (x: number, y: number) => ({ x: b1.x + x, y: b1.y + y });
  return [
    // 1 · Codex clicks the dress in Blender on your display.
    k(0, onYours(860, 600)),
    k(3.4, onYours(860, 600)),
    k(4.1, onYours(560, 440)),
    k(6.0, onYours(560, 440)),
    // 2 · You open the panel from the menu bar and add a screen.
    k(8.2, STATUS_ICON, -260, 220),
    k(9.25, STATUS_ICON),
    k(9.7, STATUS_ICON),
    k(10.1, statusMenuItem('first', 0)),
    k(11.3, pc(700, 230)),
    k(11.8, pc(PANEL_UI.add.x, PANEL_UI.add.y)),
    k(12.1, pc(PANEL_UI.add.x, PANEL_UI.add.y)),
    k(12.4, pc(PANEL_UI.addMenu.x + 60, PANEL_UI.addMenu.y + 20)),
    k(13.3, pc(PANEL_UI.manage(codexCard).x - 40, PANEL_UI.manage(codexCard).y - 30)),
    k(13.7, pc(PANEL_UI.manage(codexCard).x, PANEL_UI.manage(codexCard).y)),
    k(13.95, pc(PANEL_UI.manage(codexCard).x, PANEL_UI.manage(codexCard).y)),
    k(14.25, pc(PANEL_UI.manageMenu(codexCard).x + 40, PANEL_UI.manageMenu(codexCard).y + 18)),
    k(14.6, pc(560, 330)),
    k(15.6, pc(560, 330)),
    k(15.9, pc(alertSave().x, alertSave().y)),
    k(16.4, pc(alertSave().x, alertSave().y)),
    k(17.6, pc(560, 330)),
    // 3 · Drag Blender, then Marvelous Designer, onto Codex.
    k(20.2, pc(220, 330)),
    k(20.85, slotCentre('one', 0)),
    k(B.dragBlender.down + 0.1, slotCentre('one', 0)),
    k(21.5, pc(CARDS.two.x + 120, 175)),
    k(22.15, pc(codexCard.x + 70, 160)),
    k(B.dragBlender.up, pc(codexCard.x + 64, 150)),
    k(22.75, pc(codexCard.x + 30, 230)),
    k(23.15, slotCentre('one', 0)),
    k(B.dragMd.down + 0.1, slotCentre('one', 0)),
    k(23.85, pc(CARDS.two.x + 160, 150)),
    k(24.35, pc(codexCard.x + 120, 150)),
    k(B.dragMd.up, pc(codexCard.x + 118, 146)),
    k(25.2, pc(codexCard.x + 150, 260)),
    k(30.0, pc(codexCard.x + 150, 260)),
    // 4 · On Codex, Codex works in Blender.
    k(31.6, blenderPoint(900, 520)),
    k(33.7, blenderPoint(900, 520)),
    k(34.6, blenderPoint(BLENDER.addModifier.x + 120, BLENDER.addModifier.y + 13)),
    k(34.9, blenderPoint(BLENDER.addModifier.x + 120, BLENDER.addModifier.y + 13)),
    k(35.2, blenderPoint(BLENDER.modifierMenu.x + 70, BLENDER.modifierMenu.y + BLENDER.modifierMenu.item * 1 + 12)),
    k(35.4, blenderPoint(BLENDER.modifierMenu.x + 20, BLENDER.modifierMenu.y + BLENDER.modifierMenu.item * 1 + 12)),
    k(35.7, generateItem(14)),
    k(35.9, generateItem(14)),
    k(36.3, blenderPoint(BLENDER.levels.x + 60, BLENDER.levels.y + 11)),
    k(37.4, blenderPoint(BLENDER.levels.x + 60, BLENDER.levels.y + 11)),
    k(38.25, blenderPoint(BLENDER.gizmo.x, BLENDER.gizmo.y)),
    k(B.orbit[0] + 0.05, blenderPoint(BLENDER.gizmo.x, BLENDER.gizmo.y)),
    k(B.orbit[1], blenderPoint(BLENDER.gizmo.x - 120, BLENDER.gizmo.y + 34)),
    k(40.2, blenderPoint(BLENDER.shading(3).x, BLENDER.shading(3).y)),
    k(40.45, blenderPoint(BLENDER.shading(3).x, BLENDER.shading(3).y)),
    k(41.0, blenderPoint(820, 520)),
    k(43.4, blenderPoint(820, 520)),
    // 5 · You add GrokBot, give it Chrome and take Marvelous Designer back.
    k(44.2, pc(840, 250)),
    k(44.7, pc(PANEL_W.three - 24 - 18, 34)),
    k(44.95, pc(PANEL_W.three - 24 - 18, 34)),
    k(45.2, pc(PANEL_W.three - 24 - 36 + 60, 14 + 34 + 20)),
    k(45.75, slotCentre('two', 0), -10, 40),
    k(46.1, slotCentre('two', 0)),
    k(B.dragChrome.down + 0.08, slotCentre('two', 0)),
    k(46.7, pc(grokCard.x + 30, 170)),
    k(B.dragChrome.up, pc(grokCard.x + 64, 150)),
    k(47.4, pc(codexCard.x + 120, 120)),
    k(47.6, slotCentre('codex', 1)),
    k(B.dragMdBack.down + 0.08, slotCentre('codex', 1)),
    k(48.3, pc(CARDS.two.x + 150, 130)),
    k(B.dragMdBack.up, pc(CARDS.one.x + 120, 150)),
    k(49.4, pc(CARDS.one.x + 200, 230)),
    k(50.0, STATUS_ICON, -240, 200),
    k(50.7, STATUS_ICON),
    k(50.95, STATUS_ICON),
    k(51.2, statusMenuItem('second', GROK_ROW), 40, 0),
    k(51.45, statusMenuItem('second', GROK_ROW), -70, 0),
    k(51.75, statusSubItem(3)),
    k(52.0, statusSubItem(3)),
    k(53.0, statusSubItem(3), -80, 160),
    k(60, statusSubItem(3), -80, 160),
  ];
}

const KEYS: Partial<Record<FilmLayout, PKey[]>> = {};
/** The pointer's path for a layout (computed once). */
function pointerKeys(layout: FilmLayout = 'wide'): PKey[] {
  return (KEYS[layout] ??= pointerKeysFor(layout));
}

/** The rename dialog's 保存 button, in panel content coordinates. */
export function alertSave() {
  const a = alertBox();
  return { x: a.x + a.w - 16 - 52, y: a.y + a.h - 16 - 13 };
}
export function alertBox(): Box {
  return { x: 500 - 136, y: 66, w: 272, h: 252 };
}

/** Mouse buttons held down: [down, up] spans. */
const PRESSES: Span[] = [
  [4.15, 4.27],
  [9.25, 9.35],
  [10.1, 10.2],
  [11.8, 11.9],
  [12.4, 12.5],
  [13.7, 13.8],
  [14.25, 14.35],
  [15.9, 16.0],
  [B.dragBlender.down, B.dragBlender.up],
  [B.dragMd.down, B.dragMd.up],
  [34.75, 34.85],
  [35.7, 35.8],
  [36.3, 36.38],
  [36.42, 36.5],
  [B.orbit[0], B.orbit[1]],
  [40.25, 40.35],
  [44.7, 44.8],
  [45.2, 45.3],
  [B.dragChrome.down, B.dragChrome.up],
  [B.dragMdBack.down, B.dragMdBack.up],
  [50.7, 50.8],
  [52.0, 52.1],
];

export interface PointerPose {
  x: number;
  y: number;
  down: boolean;
  /** Ripple 0 → 1 after each click, for visibility. */
  ripple: number;
  opacity: number;
  /** "Codex" is driving the shared pointer (shots 1 and 4). */
  agent: number;
}

function pointerPose(t: number, layout: FilmLayout): PointerPose {
  const p = along(pointerKeys(layout), t);
  const down = PRESSES.some(([a, b]) => t >= a && t < b);
  let ripple = 0;
  for (const [a] of PRESSES) if (t >= a && t < a + 0.5) ripple = (t - a) / 0.5;
  const agent = window_(t, [1.6, 2.0], [6.4, 7.0]) + window_(t, [31.4, 31.9], [43.0, 43.5]);
  // Hidden in the wide shots where it would be a dot, and at the end.
  const opacity = 1 - window_(t, [17.0, 17.3], [19.6, 20.0]) - prog(t, [53.2, 53.6]);
  return { x: p.x, y: p.y, down, ripple, opacity: clamp01(opacity), agent: clamp01(agent) };
}

/* ------------------------------------------------------------------ the panel */

export interface IconPose {
  app: PanelApp;
  /** Panel content coordinates of the icon's top-left. */
  x: number;
  y: number;
  /** Picked up: 0 → 1. */
  lift: number;
  /** Rotation in radians: the drag's sway, or the wiggle of a card being hovered. */
  angle: number;
  opacity: number;
}

export interface CardPose {
  id: ScreenId;
  visible: number;
  /** Highlighted while an app is dragged over it. */
  hi: number;
  /** The empty card's accent "+" while it is hovered. */
  drop: number;
  name: string;
}

interface Drag {
  app: PanelApp;
  from: ScreenId;
  to: ScreenId;
  down: number;
  up: number;
}

const DRAGS: Drag[] = [
  { app: 'blender', from: 'one', to: 'codex', ...B.dragBlender },
  { app: 'md', from: 'one', to: 'codex', ...B.dragMd },
  { app: 'chrome', from: 'two', to: 'grok', ...B.dragChrome },
  { app: 'md', from: 'codex', to: 'one', ...B.dragMdBack },
];

/** Which apps each card lists at time t, in order (before any reflow easing). */
function cardApps(t: number): Record<ScreenId, PanelApp[]> {
  const cards: Record<ScreenId, PanelApp[]> = { one: ['blender', 'md', 'wechat'], two: ['chrome'], codex: [], grok: [] };
  const events: { t: number; app: PanelApp; to: ScreenId }[] = [
    ...DRAGS.map((d) => ({ t: d.up, app: d.app, to: d.to })),
    { t: B.closePick, app: 'chrome' as PanelApp, to: 'two' as ScreenId },
  ].sort((a, b) => a.t - b.t);
  for (const e of events) {
    if (t < e.t) break;
    for (const id of Object.keys(cards) as ScreenId[]) cards[id] = cards[id].filter((a) => a !== e.app);
    cards[e.to].push(e.app);
  }
  return cards;
}

/** Where an app would rest in its card at time t. */
function restingSlot(app: PanelApp, t: number): { card: ScreenId; x: number; y: number } {
  const cards = cardApps(t);
  for (const id of Object.keys(cards) as ScreenId[]) {
    const i = cards[id].indexOf(app);
    if (i >= 0) {
      const c = CARDS[id];
      const s = slot(c.w, i);
      return { card: id, x: c.x + s.x, y: c.y + s.y };
    }
  }
  return { card: 'one', x: 0, y: 0 };
}

const toPanel = (p: { x: number; y: number }) => ({ x: p.x - PANEL_ORIGIN.x, y: p.y - PANEL_ORIGIN.y });

function iconPose(app: PanelApp, t: number): IconPose {
  const drag = DRAGS.find((d) => t >= d.down && t < d.up + 0.32 && d.app === app);
  if (drag) {
    const pointer = toPanel(along(pointerKeys(), Math.min(t, drag.up)));
    const grab = { x: pointer.x - 20, y: pointer.y - 20 };
    const lift = prog(t, [drag.down, drag.down + 0.16], ease.out) * (1 - prog(t, [drag.up, drag.up + 0.26], ease.out));
    if (t < drag.up) {
      // Sway with the drag's horizontal speed.
      const ahead = toPanel(along(pointerKeys(), Math.min(t + 0.06, drag.up)));
      const angle = Math.max(-0.12, Math.min(0.12, (ahead.x - pointer.x) * 0.004));
      return { app, x: grab.x, y: grab.y - 6 * lift, lift, angle, opacity: 1 };
    }
    // Dropped: settle softly into the slot.
    const rest = restingSlot(app, t);
    const u = prog(t, [drag.up, drag.up + 0.3], ease.outQuart);
    return { app, x: mix(grab.x, rest.x, u), y: mix(grab.y, rest.y, u), lift, angle: 0, opacity: 1 };
  }
  // Resting, or sliding into a freed slot after another app left its card.
  const now = restingSlot(app, t);
  const before = restingSlot(app, t - 0.3);
  const u = before.card === now.card ? ease.out(1) : 1;
  let x = now.x;
  let y = now.y;
  if (before.card === now.card && (before.x !== now.x || before.y !== now.y)) {
    // Find when the change happened and ease from the old slot.
    const lastEvent = [...DRAGS.map((d) => d.up), B.closePick].filter((e) => e <= t && e > t - 0.3).at(-1) ?? t;
    const v = prog(t, [lastEvent, lastEvent + 0.3], ease.outQuart);
    x = mix(before.x, now.x, v * u);
    y = mix(before.y, now.y, v * u);
  }
  // The icons of a hovered card wiggle, as in the app.
  const card = cardPoseHi(now.card, t);
  const phase = (app.length % 3) * 0.02 + (app === 'blender' ? 0.025 : 0);
  const angle = card * 0.035 * Math.sin(((t + phase) / 0.27) * Math.PI * 2);
  return { app, x, y, lift: 0, angle, opacity: 1 };
}

/** How strongly a card is highlighted at t: the dragged pointer has been over it recently. */
function cardPoseHi(card: ScreenId, t: number): number {
  let sum = 0;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const s = t - i * 0.025;
    const drag = DRAGS.find((d) => s >= d.down && s < d.up);
    if (!drag) continue;
    const p = toPanel(along(pointerKeys(), s));
    const c = CARDS[card];
    if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h && card !== drag.from) sum++;
  }
  return sum / N;
}

export interface PanelPose {
  /** Studio Display 1's panel window: 0 → 1 as it opens. */
  open: number;
  /** Content width in points: 1000, growing to fit GrokBot's card. */
  width: number;
  cards: CardPose[];
  icons: IconPose[];
  /** The header "+" menu (新增虚拟屏) and its highlighted item. */
  addMenu: { open: number; hover: number };
  /** Codex's "…" menu (重命名… etc.). */
  manageMenu: { open: number; hover: number };
  /** The rename dialog: opacity and the name typed so far (with the selection before typing). */
  alert: { open: number; text: string; selected: boolean; caret: number; savePressed: boolean };
  /** The pressed state of the header "+" and the "…" button. */
  addPressed: boolean;
  managePressed: boolean;
}

function panelPose(t: number): PanelPose {
  const open = prog(t, B.panelOpen, ease.outQuart);
  const grokIn = prog(t, B.grokCardIn, ease.outQuart);
  const grokGone = prog(t, [B.closePick + 0.2, B.closePick + 0.6], ease.inOut);
  const width = mix(PANEL_W.three, PANEL_W.four, grokIn * (1 - grokGone));
  const typed = 'Codex'.slice(0, Math.max(0, Math.min(5, Math.floor((t - B.typeFrom) / B.typeStep) + 1)));
  const renamed = t >= B.save + 0.05;
  const cards: CardPose[] = [
    { id: 'one', visible: 1, hi: cardPoseHi('one', t), drop: 0, name: 'Studio Display 1' },
    { id: 'two', visible: 1, hi: cardPoseHi('two', t), drop: 0, name: 'Studio Display 2' },
    {
      id: 'codex',
      visible: prog(t, B.cardIn, ease.outQuart),
      hi: cardPoseHi('codex', t),
      drop: t < B.dragBlender.up ? cardPoseHi('codex', t) : 0,
      name: renamed ? '虚拟屏 1 · Codex' : '虚拟屏 1 · Agent 1',
    },
    { id: 'grok', visible: grokIn * (1 - grokGone), hi: cardPoseHi('grok', t), drop: t < B.dragChrome.up ? cardPoseHi('grok', t) : 0, name: '虚拟屏 2 · GrokBot' },
  ];
  const icons = (['blender', 'md', 'wechat', 'chrome'] as PanelApp[]).map((app) => iconPose(app, t));
  // Chrome's icon leaves the panel with GrokBot's card and reappears on Studio Display 2.
  const chrome = icons.find((i) => i.app === 'chrome')!;
  if (t >= B.closePick && t < B.closePick + 0.6) chrome.opacity = prog(t, [B.closePick + 0.3, B.closePick + 0.6], ease.out);
  return {
    open,
    width,
    cards,
    icons,
    addMenu: {
      open: window_(t, [11.9, 12.02], [12.5, 12.62]) + window_(t, [44.8, 44.92], [45.3, 45.42]),
      hover: (t > 12.25 && t < 12.6) || (t > 45.05 && t < 45.4) ? 1 : 0,
    },
    manageMenu: { open: window_(t, [13.8, 13.92], [14.35, 14.47]), hover: t > 14.15 && t < 14.45 ? 1 : 0 },
    alert: {
      open: window_(t, B.alert, [16.0, 16.2], ease.outQuart),
      text: t < B.typeFrom ? 'Agent 1' : typed,
      selected: t < B.typeFrom,
      caret: t >= B.typeFrom && t < B.save ? 1 : 0,
      savePressed: t >= 15.9 && t < 16.0,
    },
    addPressed: (t >= 11.8 && t < 11.9) || (t >= 44.7 && t < 44.8),
    managePressed: t >= 13.7 && t < 13.8,
  };
}

/* ------------------------------------------------------------------ the status menu */

export interface StatusMenuPose {
  open: number;
  /** Index of the highlighted top-level item, or -1. */
  hover: number;
  /** The GrokBot submenu. */
  sub: number;
  subHover: number;
  /** Which screens it lists, with their apps. */
  phase: 'first' | 'second';
}

function statusMenuPose(t: number): StatusMenuPose {
  const first = window_(t, [9.3, 9.42], [10.2, 10.32]);
  const second = window_(t, [50.8, 50.92], [52.1, 52.22]);
  let hover = -1;
  if (t > 9.95 && t < 10.3) hover = 0;
  if (t > 51.1 && t < 52.2) hover = GROK_ROW;
  return {
    open: Math.max(first, second),
    hover,
    sub: window_(t, [51.35, 51.47], [52.1, 52.22]),
    subHover: t > 51.7 && t < 52.2 ? 3 : -1,
    phase: t < 30 ? 'first' : 'second',
  };
}

/* ------------------------------------------------------------------ Blender */

export interface BlenderPose {
  /** The garment is selected (orange outline). */
  selected: number;
  modifierMenu: number;
  modifierHover: number;
  generate: number;
  generateHover: number;
  /** The Subdivision Surface modifier panel. */
  modifier: number;
  /** Text in the Levels Viewport field, and whether it is being edited. */
  levels: string;
  editing: boolean;
  /** Subdivision level shown in the viewport: 0 (base mesh) → 1 → 3, eased between. */
  level: number;
  /** Rendered shading: 0 solid → 1 rendered. */
  rendered: number;
  /** View rotation in degrees. */
  azimuth: number;
  elevation: number;
  /** The rendered shading button pressed. */
  shadingPressed: boolean;
}

function blenderPose(t: number): BlenderPose {
  const modifier = prog(t, [B.subdivision, B.subdivision + 0.12], ease.out);
  const levelTyped = t >= B.keyEnter;
  const editing = t >= 36.42 && t < B.keyEnter;
  let levels = '1';
  if (editing) levels = t >= B.key3 ? '3' : '1';
  if (levelTyped) levels = '3';
  const level = t < B.subdivision ? 0 : mix(mix(0, 1, prog(t, [B.subdivision, B.subdivision + 0.14], ease.out)), 3, prog(t, [B.keyEnter, B.keyEnter + 0.18], ease.out));
  const orbit = prog(t, B.orbit, ease.inOut);
  return {
    selected: prog(t, [4.2, 4.3], ease.out),
    modifierMenu: window_(t, [34.85, 34.95], [35.8, 35.9]),
    modifierHover: t > 35.1 && t < 35.85 ? 1 : -1,
    generate: window_(t, [35.3, 35.4], [35.8, 35.9]),
    generateHover: t > 35.6 && t < 35.85 ? 14 : -1,
    modifier,
    levels,
    editing,
    level,
    rendered: prog(t, [B.rendered, B.rendered + 0.35], ease.out),
    azimuth: mix(34, -26, orbit),
    elevation: mix(12, 19, orbit),
    shadingPressed: t >= 40.25 && t < 40.35,
  };
}

/* ------------------------------------------------------------------ screenshots and keys */

export interface CapturePose {
  /** World box being captured. */
  box: Box;
  /** Brackets closing in: 0 → 1 → 0. */
  brackets: number;
  /** The light that sweeps the captured area. */
  sweep: number;
  /** The floating thumbnail in the screen's corner. */
  thumb: number;
  /** Which shot: before or after the agent's work. */
  which: 0 | 1;
}

function capturePose(t: number, layout: FilmLayout): CapturePose | null {
  const codex = SCREENS_BY_LAYOUT[layout].codex;
  const shots: [Span, Box, 0 | 1][] = [
    [B.s1Shot, windowBoxAt('blender', 'one', layout), 0],
    [B.shot1, codex, 0],
    [B.shot2, codex, 1],
  ];
  for (const [[a, b], box, which] of shots) {
    if (t < a - 0.01 || t > b + 1.4) continue;
    return {
      box,
      brackets: window_(t, [a, a + 0.35], [a + 0.75, a + 1.0], ease.outQuart),
      sweep: prog(t, [a + 0.15, a + 0.85], ease.inOut),
      thumb: window_(t, [a + 0.8, a + 1.15], [b + 1.0, b + 1.35], ease.outQuart),
      which,
    };
  }
  return null;
}

export interface KeyPose {
  label: string;
  /** 0 → 1 → 0. */
  show: number;
  pressed: boolean;
}

function keysPose(t: number): KeyPose[] {
  return [
    { label: '3', show: window_(t, [B.key3 - 0.05, B.key3 + 0.1], [B.key3 + 1.1, B.key3 + 1.4]), pressed: t >= B.key3 && t < B.key3 + 0.12 },
    { label: '⏎', show: window_(t, [B.keyEnter - 0.05, B.keyEnter + 0.1], [B.keyEnter + 0.9, B.keyEnter + 1.2]), pressed: t >= B.keyEnter && t < B.keyEnter + 0.12 },
  ];
}

/* ------------------------------------------------------------------ supers and the end */

export interface SuperPose {
  /** Index into the locale's five supers. */
  index: number;
  show: number;
  /** Light text on a dark band (shot 4, over Blender), dark on a light band elsewhere. */
  dark: boolean;
  /**
   * Where its caption band is. Wide: at the bottom, except over the panel callout (shots 3 and 5),
   * where it moves to the top. Tall: always the top 330 px, which the camera keeps clear.
   */
  anchor: 'top' | 'bottom';
}

const SUPERS: { index: number; in: Span; out: Span }[] = [
  { index: 0, in: [1.6, 2.3], out: [6.6, 7.2] },
  { index: 1, in: [11.4, 12.1], out: [15.9, 16.4] },
  { index: 2, in: [20.2, 20.9], out: [29.9, 30.5] },
  { index: 3, in: [32.3, 33.0], out: [42.6, 43.2] },
  { index: 4, in: [45.0, 45.7], out: [53.3, 53.9] },
];

function superPose(t: number, layout: FilmLayout): SuperPose | null {
  for (const s of SUPERS) {
    if (t < s.in[0] || t > s.out[1]) continue;
    const top = layout === 'tall' || s.index === 2 || s.index === 4;
    return { index: s.index, show: window_(t, s.in, s.out, ease.outQuart), dark: s.index === 3, anchor: top ? 'top' : 'bottom' };
  }
  return null;
}

/** The night-window mark: the tile and window geometry of the app icon (100-unit icon). */
export const MARK_ICON = { x: 28.63, y: 16.39, w: 42.74, h: 66.81, tl: 12.64, br: 4.73, r: 10.6, tile: 21 };

export interface EndPose {
  night: number;
  /** Codex filling with light. */
  lit: number;
  /** Codex's screen drawing into the mark's window: 0 → 1. */
  gather: number;
  mark: number;
  bite: number;
  tile: number;
  word: number;
  cta: number;
  /** Everything but Codex fades into the night. */
  world: number;
}

function endPose(t: number): EndPose {
  return {
    night: prog(t, B.night),
    lit: prog(t, B.lit),
    gather: prog(t, B.gather, ease.inOut),
    mark: prog(t, B.mark, ease.out),
    bite: prog(t, B.bite, ease.inOut),
    tile: prog(t, B.tile, ease.out),
    word: prog(t, B.word, ease.out),
    cta: prog(t, B.cta, ease.out),
    world: 1 - prog(t, [54.6, 56.4], ease.inOut),
  };
}

/* ------------------------------------------------------------------ overlay (the panel, close up) */

export interface OverlayPose {
  /** 0 hidden → 1 shown. */
  show: number;
  /** Frame rectangle the panel's content box occupies, in frame pixels. */
  box: Box;
}

/** The panel callout's resting place in the frame, per layout (content box incl. 28 pt title bar). */
function overlayRest(layout: FilmLayout, width: number): Box {
  // As large as reads well, but never wider than the frame allows (GrokBot's card widens it).
  const frame = FILM_SIZE[layout];
  const margin = layout === 'wide' ? 100 : 24;
  const s = Math.min(layout === 'wide' ? 1.12 : 1.02, (frame.w - 2 * margin) / width);
  const w = width * s;
  const bottom = layout === 'wide' ? 40 : 36;
  return { x: (frame.w - w) / 2, y: frame.h - bottom - 438 * s * 0.74, w, h: 438 * s };
}

/* ------------------------------------------------------------------ the whole pose */

export interface FilmPose {
  t: number;
  layout: FilmLayout;
  cam: { x: number; y: number; z: number };
  windows: Record<FilmWindowId, WindowPose>;
  screens: Record<'codex' | 'grok', ScreenPose>;
  /** Active app name in Studio Display 1's menu bar. */
  activeApp: string;
  pointer: PointerPose;
  panel: PanelPose;
  overlay: OverlayPose;
  status: StatusMenuPose;
  blender: BlenderPose;
  capture: CapturePose | null;
  keys: KeyPose[];
  super: SuperPose | null;
  /** A light wash behind the panel window while the camera is close on it (shot 2). */
  focus: number;
  end: EndPose;
  /** The "simulated" label: always on, but quieter over the end card. */
  label: number;
}

export function filmPose(t: number, layout: FilmLayout): FilmPose {
  const cam = camera(cameraKeys(layout), t);
  const panel = panelPose(t);
  const windows = Object.fromEntries((Object.keys(WINDOWS) as FilmWindowId[]).map((id) => [id, windowPose(id, t, layout)])) as Record<FilmWindowId, WindowPose>;
  const apps = cardApps(t);
  const chip = (screen: 'codex' | 'grok') =>
    (['blender', 'md', 'chrome'] as PanelApp[]).map((id) => ({
      id,
      pop: apps[screen].includes(id) ? 1 : 0,
    }));
  const screens = {
    codex: { on: prog(t, B.codexOn, ease.out), lit: prog(t, B.lit), name: 'Codex', apps: chip('codex') },
    grok: { on: prog(t, B.grokOn, ease.out) * (1 - prog(t, B.grokOff, ease.inOut)), lit: 0, name: 'GrokBot', apps: chip('grok') },
  };

  // The panel callout: detached from Studio Display 1's window as the camera pulls back after the
  // rename, put away for the work on Codex, back for GrokBot, away again for the menu bar.
  const showOverlay = window_(t, [16.0, 17.4], [30.4, 31.0], ease.inOut) + window_(t, [43.6, 44.4], [49.6, 50.2], ease.inOut);
  const rest = overlayRest(layout, panel.width);
  let box = rest;
  if (t < 17.4) {
    // Start exactly where the window is in the frame, then settle into the callout.
    const size = FILM_SIZE[layout];
    const win = { x: PANEL_WIN.x, y: PANEL_WIN.y, w: panel.width, h: 438 };
    const atFrame = {
      x: size.w / 2 + (win.x - cam.x) * cam.z,
      y: size.h / 2 + (win.y - cam.y) * cam.z,
      w: win.w * cam.z,
      h: win.h * cam.z,
    };
    box = mixBox(atFrame, rest, prog(t, [16.0, 17.4], ease.inOut));
  } else if (t > 30.0 && t < 31.2) {
    box = { ...rest, y: rest.y + 60 * prog(t, [30.4, 31.0], ease.in) };
  } else if (t > 43.4 && t < 44.6) {
    box = { ...rest, y: rest.y + 60 * (1 - prog(t, [43.6, 44.4], ease.out)) };
  } else if (t > 49.5 && t < 50.4) {
    box = { ...rest, y: rest.y + 60 * prog(t, [49.6, 50.2], ease.in) };
  }

  return {
    t,
    layout,
    cam,
    windows,
    screens,
    activeApp: t < 8.8 ? 'Blender' : t < 54 ? 'yomado' : '',
    pointer: pointerPose(t, layout),
    panel,
    overlay: { show: clamp01(showOverlay), box },
    status: statusMenuPose(t),
    blender: blenderPose(t),
    capture: capturePose(t, layout),
    keys: keysPose(t),
    super: superPose(t, layout),
    focus: window_(t, [10.4, 11.0], [15.9, 16.6]),
    end: endPose(t),
    label: 1 - 0.35 * prog(t, [57.5, 58.5]),
  };
}
