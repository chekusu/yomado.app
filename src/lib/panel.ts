/**
 * Geometry of the yomado control panel, in points, as the app lays it out (app/Yomado.m and
 * app/AppWorkspaceView.m in chekusu/yomado 0.3.3). The page's panel and the film's panel both
 * place their parts from here, so they match the app and each other.
 *
 *   window   1000 × 410 content (plus a 28 pt title bar), 24 pt side insets, 14 pt top
 *   header   40 pt app icon, "yomado" 23 pt semibold, 夜窗 and the tagline, "+" at the right
 *   board    one card per display, 16 pt apart, each as wide as its display is (logical width)
 *            and as tall as its aspect ratio makes it
 *   card     name 10 pt and detail 8.5 pt at the top, then a grid of 40 pt app icons from y = 40
 *            on a 54 pt pitch, "+" and "…" at the bottom right of virtual screens
 */
import type { AppId } from './apps';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelCard {
  id: string;
  /** As the card shows it: "Studio Display 1", "虚拟屏 1 · Codex". */
  name: string;
  /** Resolution, and 主屏 for the main display. */
  detail: string;
  /** Logical size of the display. */
  logical: { w: number; h: number };
  virtual: boolean;
  apps: AppId[];
}

export const WINDOW = { w: 1000, h: 410, titlebar: 28 };
export const INSET = { x: 24, top: 14 };
export const HEADER = 40;
export const BOARD_TOP = INSET.top + HEADER + 16;
export const CARD_GAP = 16;
export const ICON = 40;
const PITCH = ICON + 14;
const ROW = ICON + 8;
const GRID = { x: 8, y: 40 };

/** Points per logical pixel: the default three displays exactly fill the board. */
export const CARD_SCALE = (WINDOW.w - 2 * INSET.x - 2 * CARD_GAP) / (2560 + 2560 + 1920);

/** Size of the card for a display. */
export function cardSize(card: Pick<PanelCard, 'logical'>): { w: number; h: number } {
  const w = card.logical.w * CARD_SCALE;
  return { w, h: (w * card.logical.h) / card.logical.w };
}

/** Each card's box in window coordinates, laid out left to right. */
export function cardBoxes(cards: Pick<PanelCard, 'logical'>[]): Box[] {
  let x = INSET.x;
  return cards.map((card) => {
    const { w, h } = cardSize(card);
    const box = { x, y: BOARD_TOP, w, h };
    x += w + CARD_GAP;
    return box;
  });
}

/** Where the i-th app icon sits inside a card of width `w`, relative to the card. */
export function iconSlot(w: number, i: number): Box {
  const inner = w - 2 * GRID.x;
  const columns = Math.max(1, Math.floor((inner + 6) / PITCH));
  const total = (ICON + 8) * columns + 6 * (columns - 1);
  const start = Math.max(0, (inner - total) / 2);
  return { x: GRID.x + start + (i % columns) * PITCH + 4, y: GRID.y + Math.floor(i / columns) * ROW + 4, w: ICON, h: ICON };
}

/** The "+" (add an app) and "…" (manage) buttons of a virtual screen's card, relative to the card. */
export function cardActions(card: { w: number; h: number }): { add: Box; manage: Box } {
  const y = card.h - 4 - 22;
  return { add: { x: card.w - 5 - 22 - 2 - 22, y, w: 22, h: 22 }, manage: { x: card.w - 5 - 22, y, w: 22, h: 22 } };
}

/** The header's "+" (add or start a virtual screen) button, in window coordinates. */
export const ADD_BUTTON: Box = { x: WINDOW.w - INSET.x - 36, y: INSET.top + 8, w: 36, h: 24 };

/** The example displays: two Studio Displays and the Codex screen, as on the page. */
export function exampleCards(apps: { one: AppId[]; two: AppId[]; codex: AppId[] }): PanelCard[] {
  return [
    { id: 'one', name: 'Studio Display 1', detail: '2560 × 1440 · 主屏', logical: { w: 2560, h: 1440 }, virtual: false, apps: apps.one },
    { id: 'two', name: 'Studio Display 2', detail: '2560 × 1440', logical: { w: 2560, h: 1440 }, virtual: false, apps: apps.two },
    { id: 'codex', name: '虚拟屏 1 · Codex', detail: '1920 × 1080', logical: { w: 1920, h: 1080 }, virtual: true, apps: apps.codex },
  ];
}
