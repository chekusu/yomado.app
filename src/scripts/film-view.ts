// Poses the film drawn by FilmStage.astro at any moment of the timeline in src/lib/film.ts.
// Everything here is a pure function of time: render(t) can be called in any order.
import {
  BLENDER,
  CARDS,
  FILM_SIZE,
  MARK_ICON,
  PANEL_UI,
  PANEL_WIN,
  SCREENS_BY_LAYOUT,
  WINDOWS,
  filmPose,
  type Box,
  type FilmLayout,
  type FilmPose,
  type FilmWindowId,
  type PanelPose,
  type ScreenId,
} from '../lib/film';
import { Garment } from './film-garment';

const n = (v: number, d = 2) => +v.toFixed(d);
const px = (v: number) => `${n(v)}px`;

/** Where the end card puts the night-window mark, in frame pixels. */
function markFrame(layout: FilmLayout) {
  return layout === 'wide' ? { cx: 960, cy: 392, size: 300 } : { cx: 540, cy: 470, size: 380 };
}

class PanelView {
  private readonly cp: HTMLElement;
  private readonly cards: Record<string, HTMLElement>;
  private readonly names: Record<string, HTMLElement>;
  private readonly drops: Record<string, HTMLElement>;
  private readonly apps: Record<string, HTMLElement>;
  private readonly add: HTMLElement;
  private readonly addMenu: HTMLElement;
  private readonly manageMenu: HTMLElement;
  private readonly manageButton: HTMLElement | null;
  private readonly alert: HTMLElement;
  private readonly alertText: HTMLElement;
  private readonly alertCaret: HTMLElement;
  private readonly alertSave: HTMLElement;
  readonly pointer: SVGElement;

  constructor(root: HTMLElement) {
    this.cp = root.querySelector<HTMLElement>('[data-panel]')!;
    this.cards = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-card]')].map((el) => [el.dataset.card, el]));
    this.names = Object.fromEntries(Object.entries(this.cards).map(([id, el]) => [id, el.querySelector<HTMLElement>('[data-card-name]')!]));
    this.drops = Object.fromEntries(Object.entries(this.cards).map(([id, el]) => [id, el.querySelector<HTMLElement>('[data-card-drop]')!]));
    this.apps = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-panel-app]')].map((el) => [el.dataset.panelApp, el]));
    this.add = root.querySelector<HTMLElement>('[data-panel-add]')!;
    this.addMenu = root.querySelector<HTMLElement>('[data-pm="add"]')!;
    this.manageMenu = root.querySelector<HTMLElement>('[data-pm="manage"]')!;
    this.manageButton = this.cards.codex?.querySelector<HTMLElement>('[data-card-manage]') ?? null;
    this.alert = root.querySelector<HTMLElement>('[data-alert]')!;
    this.alertText = root.querySelector<HTMLElement>('[data-alert-text]')!;
    this.alertCaret = root.querySelector<HTMLElement>('[data-alert-caret]')!;
    this.alertSave = root.querySelector<HTMLElement>('[data-alert-save]')!;
    this.pointer = root.querySelector<SVGElement>('[data-panel-pointer]')!;
  }

  render(p: PanelPose, t: number): void {
    this.cp.style.width = px(p.width);
    this.add.style.left = px(p.width - 24 - 36);
    this.add.style.background = p.addPressed ? 'rgb(0 0 0 / 0.16)' : '';

    for (const card of p.cards) {
      const el = this.cards[card.id];
      if (!el) continue;
      el.style.opacity = `${n(card.visible)}`;
      el.style.visibility = card.visible > 0.001 ? '' : 'hidden';
      el.style.transform = card.visible < 1 ? `translateX(${n(18 * (1 - card.visible))}px) scale(${n(0.96 + 0.04 * card.visible, 4)})` : '';
      el.style.setProperty('--hi', `${n(card.hi, 3)}`);
      if (this.names[card.id].textContent !== card.name) this.names[card.id].textContent = card.name;
      const drop = this.drops[card.id];
      drop.style.opacity = `${n(card.drop)}`;
      drop.style.transform = `rotate(${n(card.drop * 0.035 * Math.sin((t / 0.27) * Math.PI * 2), 4)}rad)`;
    }

    for (const icon of p.icons) {
      const el = this.apps[icon.app];
      if (!el) continue;
      el.style.transform = `translate(${px(icon.x)}, ${px(icon.y)}) rotate(${n(icon.angle, 4)}rad) scale(${n(1 + 0.12 * icon.lift, 4)})`;
      el.style.setProperty('--lift', `${n(icon.lift, 3)}`);
      el.style.opacity = `${n(icon.opacity)}`;
      el.style.zIndex = icon.lift > 0.01 ? '5' : '';
    }

    // The header "+" menu hangs under its button; Codex's "…" menu under that card's button.
    const menu = (el: HTMLElement, open: number, hover: number, at: { x: number; y: number }) => {
      el.style.opacity = `${n(open)}`;
      el.style.visibility = open > 0.001 ? 'visible' : 'hidden';
      el.style.left = px(at.x);
      el.style.top = px(at.y);
      el.style.transform = `translateY(${n(-4 * (1 - open))}px)`;
      el.querySelectorAll('.pm-i').forEach((item, i) => item.classList.toggle('on', i === 0 && hover === 1));
    };
    menu(this.addMenu, p.addMenu.open, p.addMenu.hover, { x: p.width - 24 - 36, y: 14 + 24 + 4 });
    menu(this.manageMenu, p.manageMenu.open, p.manageMenu.hover, PANEL_UI.manageMenu(CARDS.codex));
    if (this.manageButton) this.manageButton.style.background = p.managePressed ? 'rgb(0 0 0 / 0.14)' : '';

    const a = p.alert;
    this.alert.style.opacity = `${n(a.open)}`;
    this.alert.style.visibility = a.open > 0.001 ? 'visible' : 'hidden';
    this.alert.style.transform = `scale(${n(0.94 + 0.06 * a.open, 4)})`;
    if (this.alertText.textContent !== a.text) this.alertText.textContent = a.text;
    this.alertText.classList.toggle('selected', a.selected);
    this.alertCaret.style.opacity = `${a.caret}`;
    this.alertSave.classList.toggle('pressed', a.savePressed);
  }
}

export class FilmView {
  readonly root: HTMLElement;
  readonly layout: FilmLayout;
  private readonly world: HTMLElement;
  private readonly part: Record<string, HTMLElement>;
  private readonly windows: Record<string, HTMLElement>;
  private readonly vscreens: Record<string, HTMLElement>;
  private readonly vlabels: Record<string, HTMLElement>;
  private readonly chips: Record<string, HTMLElement>;
  private readonly fades: HTMLElement[];
  private readonly panelWin: HTMLElement;
  private readonly panel: PanelView;
  private readonly callout: HTMLElement;
  private readonly calloutPanel: PanelView;
  private readonly status: Record<string, HTMLElement>;
  private readonly statusIcon: HTMLElement | null;
  private readonly supers: HTMLElement[];
  private readonly keys: HTMLElement[];
  private readonly garment: Garment;
  private readonly thumbCtx: CanvasRenderingContext2D;

  constructor(root: HTMLElement) {
    this.root = root;
    this.layout = (root.dataset.layout as FilmLayout) ?? 'wide';
    this.world = root.querySelector<HTMLElement>('[data-world]')!;
    const one = (sel: string) => root.querySelector<HTMLElement>(sel)!;
    this.part = {
      skyNight: one('[data-sky-night]'),
      skyDusk: one('[data-sky-dusk]'),
      activeApp: one('[data-active-app]'),
      codexLit: one('[data-codex-lit]'),
      pointer: one('[data-pointer]'),
      capture: one('[data-capture]'),
      thumb: one('[data-thumb]'),
      mark: one('[data-mark]'),
      markTile: one('[data-mark-tile]'),
      markBite: one('[data-mark-bite]'),
      word: one('[data-word]'),
      tagline: one('[data-tagline]'),
      cta: one('[data-cta]'),
      sim: one('[data-sim]'),
      blMenu: one('[data-bl-menu]'),
      blGenerate: one('[data-bl-generate]'),
      blModifier: one('[data-bl-modifier]'),
      blLevels: one('[data-bl-levels]'),
      blAdd: one('.bl-add'),
      gizmo: one('[data-gizmo]'),
      axes: one('[data-axes]'),
      dress: one('[data-outliner-dress]'),
      focus: one('[data-focus]'),
      bandTop: one('[data-band="top"]'),
      bandBottom: one('[data-band="bottom"]'),
    };
    this.windows = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-win]')].map((el) => [el.dataset.win, el]));
    this.vscreens = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-vscreen]')].map((el) => [el.dataset.vscreen, el]));
    this.vlabels = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-vlabel]')].map((el) => [el.dataset.vlabel, el]));
    this.chips = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-vchip]')].map((el) => [el.dataset.vchip, el]));
    this.fades = [...root.querySelectorAll<HTMLElement>('.world > .fade, .world > .vlabel, .world > .vscreen')];
    this.panelWin = one('[data-panel-win]');
    this.panel = new PanelView(this.panelWin);
    this.callout = one('[data-callout]');
    this.calloutPanel = new PanelView(this.callout);
    this.status = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-status-menu]')].map((el) => [el.dataset.statusMenu, el]));
    this.status.sub = one('[data-status-sub]');
    this.statusIcon = root.querySelector<HTMLElement>('[data-status-icon]');
    this.supers = [...root.querySelectorAll<HTMLElement>('[data-super]')];
    this.keys = [...root.querySelectorAll<HTMLElement>('[data-key]')];
    this.garment = new Garment(
      root.querySelector<HTMLCanvasElement>('[data-garment="blender"]')!,
      root.querySelector<HTMLCanvasElement>('[data-garment="md"]')!,
    );
    this.thumbCtx = root.querySelector<HTMLCanvasElement>('[data-thumb-canvas]')!.getContext('2d')!;
    this.buildGizmo();
  }

  /** Everything the frame shows at time t. */
  render(t: number): FilmPose {
    const p = filmPose(t, this.layout);
    const { w: W, h: H } = FILM_SIZE[this.layout];
    const { x: cx, y: cy, z } = p.cam;
    this.world.style.transform = `translate(${px(W / 2 - cx * z)}, ${px(H / 2 - cy * z)}) scale(${n(z, 5)})`;
    const toFrame = (b: Box): Box => ({ x: W / 2 + (b.x - cx) * z, y: H / 2 + (b.y - cy) * z, w: b.w * z, h: b.h * z });

    // Day to night.
    const night = p.end.night;
    this.part.skyNight.style.opacity = `${n(night, 3)}`;
    this.part.skyDusk.style.opacity = `${n(Math.sin(Math.PI * night) * 0.85, 3)}`;
    for (const el of this.fades) el.style.opacity = p.end.world < 1 ? `${n(p.end.world, 3)}` : '';

    // Windows.
    for (const id of Object.keys(WINDOWS) as FilmWindowId[]) {
      const w = p.windows[id];
      const el = this.windows[id];
      el.style.transform = `translate(${px(w.box.x)}, ${px(w.box.y)}) scale(${n(1 + 0.012 * w.lift, 4)})`;
      el.style.zIndex = `${w.z}`;
      el.style.setProperty('--lift', `${n(w.lift, 3)}`);
    }

    // Virtual screens and their labels.
    for (const id of ['codex', 'grok'] as const) {
      const s = p.screens[id];
      const vs = this.vscreens[id];
      vs.style.setProperty('--on', `${n(s.on, 3)}`);
      vs.style.visibility = s.on > 0.001 ? '' : 'hidden';
      // The name above a screen is for the wide views; close up, the screen fills the frame.
      const label = this.vlabels[id];
      const far = Math.min(1, Math.max(0, (0.62 - z) / 0.12));
      const shown = s.on * Math.min(1, p.end.world) * far;
      label.style.setProperty('--on', `${n(s.on, 3)}`);
      label.style.opacity = `${n(shown, 3)}`;
      label.style.visibility = shown > 0.001 ? '' : 'hidden';
      for (const app of s.apps) {
        const chip = this.chips[`${id}-${app.id}`];
        chip.classList.toggle('in', app.pop > 0);
        chip.style.setProperty('--pop', `${app.pop}`);
      }
    }
    this.part.activeApp.textContent = p.activeApp || 'yomado';

    // Codex fills with light and draws into the mark's window.
    const lit = this.part.codexLit;
    const m = markFrame(this.layout);
    const s = m.size / 100;
    const target = {
      x: cx + (m.cx - m.size / 2 + MARK_ICON.x * s - W / 2) / z,
      y: cy + (m.cy - m.size / 2 + MARK_ICON.y * s - H / 2) / z,
      w: (MARK_ICON.w * s) / z,
      h: (MARK_ICON.h * s) / z,
    };
    const g = p.end.gather;
    const codex = SCREENS_BY_LAYOUT[this.layout].codex;
    const box = {
      x: codex.x + (target.x - codex.x) * g,
      y: codex.y + (target.y - codex.y) * g,
      w: codex.w + (target.w - codex.w) * g,
      h: codex.h + (target.h - codex.h) * g,
    };
    lit.style.transform = `translate(${px(box.x - codex.x)}, ${px(box.y - codex.y)})`;
    lit.style.width = px(box.w);
    lit.style.height = px(box.h);
    const tl = 18 + ((MARK_ICON.tl * s) / z - 18) * g;
    const br = 18 + ((MARK_ICON.br * s) / z - 18) * g;
    lit.style.borderRadius = `${px(tl)} ${px(br)} ${px(br)} ${px(br)}`;
    lit.style.opacity = `${n(p.end.lit * (1 - p.end.mark), 3)}`;
    lit.style.boxShadow = p.end.lit > 0 ? `0 0 ${px(140 / z)} ${px(18 / z)} rgb(252 248 225 / ${n(0.35 * p.end.lit, 3)})` : '';

    // The panel window on Studio Display 1 opens out of the menu bar.
    // It fades into the night with the rest of your display.
    const open = p.panel.open * p.end.world;
    this.panelWin.style.opacity = `${n(open, 3)}`;
    this.panelWin.style.visibility = open > 0.001 ? '' : 'hidden';
    this.panelWin.style.transform = open < 1 ? `scale(${n(0.92 + 0.08 * open, 4)})` : '';
    this.panel.render(p.panel, t);
    this.calloutPanel.render(p.panel, t);

    // The callout: a closer view of the same panel, with the pointer when it is over the panel.
    const o = p.overlay;
    this.callout.style.opacity = `${n(o.show, 3)}`;
    this.callout.style.visibility = o.show > 0.001 ? 'visible' : 'hidden';
    this.callout.style.transform = `translate(${px(o.box.x)}, ${px(o.box.y)}) scale(${n(o.box.w / p.panel.width, 5)})`;
    // There is one pointer: once the callout is up it is drawn there, and nowhere else.
    const local = { x: p.pointer.x - PANEL_WIN.x, y: p.pointer.y - PANEL_WIN.y - 28 };
    const inside = local.x > -40 && local.x < p.panel.width + 160 && local.y > -60 && local.y < 440;
    const inCallout = o.show > 0.5 && inside;
    this.calloutPanel.pointer.style.opacity = `${inCallout ? n(p.pointer.opacity, 3) : 0}`;
    this.calloutPanel.pointer.style.transform = `translate(${px(local.x - 2)}, ${px(local.y - 2)})`;

    // yomado's menu bar menu.
    const st = p.status;
    for (const phase of ['first', 'second'] as const) {
      const el = this.status[phase];
      const shown = st.phase === phase ? st.open : 0;
      el.style.opacity = `${n(shown, 3)}`;
      el.style.visibility = shown > 0.001 ? 'visible' : 'hidden';
      el.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => row.classList.toggle('on', Number(row.dataset.row) === st.hover));
    }
    this.status.sub.style.opacity = `${n(st.sub, 3)}`;
    this.status.sub.style.visibility = st.sub > 0.001 ? 'visible' : 'hidden';
    this.status.sub.querySelectorAll<HTMLElement>('[data-row]').forEach((row) => row.classList.toggle('on', Number(row.dataset.row) === st.subHover));
    this.statusIcon?.classList.toggle('open', st.open > 0.5);

    // The pointer: only where it is big enough to see, and never in the callout's wide shots.
    const pt = p.pointer;
    const pointer = this.part.pointer;
    const visible = inCallout ? 0 : pt.opacity * Math.min(1, Math.max(0, (z - 0.5) / 0.3));
    pointer.style.opacity = `${n(visible, 3)}`;
    pointer.style.visibility = visible > 0.001 ? '' : 'hidden';
    pointer.style.transform = `translate(${px(pt.x)}, ${px(pt.y)}) scale(${pt.down ? 0.92 : 1})`;
    const ripple = pointer.querySelector<HTMLElement>('.ripple')!;
    ripple.style.opacity = `${n(pt.ripple > 0 ? 1 - pt.ripple : 0, 3)}`;
    ripple.style.transform = `scale(${n(0.4 + 0.8 * pt.ripple, 3)})`;
    pointer.querySelector<HTMLElement>('.agent-tag')!.style.opacity = `${n(pt.agent, 3)}`;

    this.renderBlender(p);
    this.garment.render(p.blender, t, Math.max(0.5, Math.min(1.5, Math.round(z * 2) / 2)));

    // Screenshots: brackets close on the captured area, a light sweeps it, the thumbnail lands.
    const cap = p.capture;
    const capEl = this.part.capture;
    const thumb = this.part.thumb;
    if (cap && (cap.brackets > 0.001 || cap.thumb > 0.001)) {
      const f = toFrame(cap.box);
      const grow = 28 * (1 - cap.brackets);
      capEl.style.visibility = 'visible';
      capEl.style.opacity = `${n(cap.brackets, 3)}`;
      capEl.style.left = px(f.x - grow);
      capEl.style.top = px(f.y - grow);
      capEl.style.width = px(f.w + 2 * grow);
      capEl.style.height = px(f.h + 2 * grow);
      const sweep = capEl.querySelector<HTMLElement>('.c-sweep')!;
      sweep.style.top = px(-120 + (f.h + 120) * cap.sweep);
      sweep.style.opacity = `${n(Math.sin(Math.PI * cap.sweep), 3)}`;
      const tw = Math.min(260, f.w * 0.24);
      thumb.style.width = px(tw);
      thumb.style.height = px((tw * 9) / 16);
      thumb.style.visibility = cap.thumb > 0.001 ? 'visible' : 'hidden';
      thumb.style.opacity = `${n(cap.thumb, 3)}`;
      const tx = Math.min(f.x + f.w, W) - tw - 26 + 50 * (1 - cap.thumb);
      const ty = Math.min(f.y + f.h, H) - (tw * 9) / 16 - 26;
      thumb.style.transform = `translate(${px(tx)}, ${px(ty)})`;
      if (cap.thumb > 0.001) this.drawThumb(cap.which, cap.box.w === 1920);
    } else {
      capEl.style.visibility = 'hidden';
      thumb.style.visibility = 'hidden';
    }

    // Keys typed by Codex.
    p.keys.forEach((k, i) => {
      const el = this.keys[i];
      el.style.opacity = `${n(k.show, 3)}`;
      el.style.transform = `translateY(${n(12 * (1 - k.show))}px)`;
      el.classList.toggle('pressed', k.pressed);
    });

    // Supers sit on their caption band: dark text on light, light text on dark over Blender.
    const sp = p.super;
    this.supers.forEach((el, i) => {
      const on = sp && sp.index === i ? sp.show : 0;
      el.style.opacity = `${n(on, 3)}`;
      el.style.visibility = on > 0.001 ? 'visible' : 'hidden';
      el.style.transform = `translateY(${n(16 * (1 - on))}px)`;
      el.classList.toggle('dark', !!sp?.dark && sp.index === i);
      el.classList.toggle('top', sp?.index === i && sp.anchor === 'top');
    });
    for (const [band, anchor] of [
      [this.part.bandTop, 'top'],
      [this.part.bandBottom, 'bottom'],
    ] as const) {
      const on = sp && sp.anchor === anchor ? sp.show : 0;
      band.style.opacity = `${n(on, 3)}`;
      band.classList.toggle('dark', !!sp?.dark);
    }
    this.part.focus.style.opacity = `${n(0.82 * p.focus, 3)}`;
    this.part.sim.classList.toggle('dark', night > 0.5 || (!!sp?.dark && sp.anchor === 'top' && sp.show > 0.5));
    this.part.sim.style.opacity = `${n(p.label, 3)}`;

    // The end card.
    const e = p.end;
    const mark = this.part.mark;
    mark.style.opacity = `${n(e.mark, 3)}`;
    mark.style.visibility = e.mark > 0.001 ? '' : 'hidden';
    mark.style.width = px(m.size);
    mark.style.height = px(m.size);
    mark.style.left = px(m.cx - m.size / 2);
    mark.style.top = px(m.cy - m.size / 2);
    this.part.markTile.style.opacity = `${n(e.tile, 3)}`;
    const bx = MARK_ICON.x + MARK_ICON.w - 0.646 * MARK_ICON.r;
    const by = MARK_ICON.y + 0.67 * MARK_ICON.r;
    const away = (1 - e.bite) * 22;
    this.part.markBite.setAttribute('cx', `${n(bx + away)}`);
    this.part.markBite.setAttribute('cy', `${n(by - away)}`);
    const below = m.cy + m.size / 2;
    const tallGap = this.layout === 'tall' ? 1.25 : 1;
    this.place(this.part.word, below + 70 * tallGap, e.word);
    this.place(this.part.tagline, below + 168 * tallGap, e.word);
    this.place(this.part.cta, below + 250 * tallGap, e.cta);
    return p;
  }

  private place(el: HTMLElement, top: number, show: number) {
    el.style.top = px(top + 14 * (1 - show));
    el.style.opacity = `${n(show, 3)}`;
    el.style.visibility = show > 0.001 ? '' : 'hidden';
  }

  private renderBlender(p: FilmPose) {
    const b = p.blender;
    const menu = this.part.blMenu;
    menu.style.opacity = `${n(b.modifierMenu, 3)}`;
    menu.style.visibility = b.modifierMenu > 0.001 ? 'visible' : 'hidden';
    menu.querySelectorAll<HTMLElement>('[data-bl-mi]').forEach((el) => el.classList.toggle('on', Number(el.dataset.blMi) === b.modifierHover));
    const gen = this.part.blGenerate;
    gen.style.opacity = `${n(b.generate, 3)}`;
    gen.style.visibility = b.generate > 0.001 ? 'visible' : 'hidden';
    gen.querySelectorAll<HTMLElement>('[data-bl-gi]').forEach((el) => el.classList.toggle('on', Number(el.dataset.blGi) === b.generateHover));
    this.part.blModifier.style.opacity = `${n(b.modifier, 3)}`;
    const levels = this.part.blLevels;
    if (levels.textContent !== b.levels) levels.textContent = b.levels;
    levels.classList.toggle('edit', b.editing);
    this.part.blAdd.classList.toggle('press', b.modifierMenu > 0.5);
    this.root.querySelectorAll<HTMLElement>('[data-shading]').forEach((el) => {
      const i = Number(el.dataset.shading);
      el.classList.toggle('on', i === (b.rendered > 0.5 ? 3 : 1));
      el.classList.toggle('pressed', i === 3 && b.shadingPressed);
    });
    this.part.dress.classList.toggle('sel', b.selected > 0.5);
    this.renderGizmo(b.azimuth, b.elevation);
  }

  private axes: { line: SVGLineElement; circle: SVGCircleElement; text: SVGTextElement; group: SVGGElement; v: [number, number, number] }[] = [];

  private buildGizmo() {
    const ns = 'http://www.w3.org/2000/svg';
    const g = this.part.axes;
    const defs: [string, string, [number, number, number]][] = [
      ['X', '#ff3352', [1, 0, 0]],
      ['Y', '#8bdc00', [0, 1, 0]],
      ['Z', '#2890ff', [0, 0, 1]],
    ];
    for (const [label, color, v] of defs) {
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('class', 'ax');
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('stroke', color);
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('r', '9');
      circle.setAttribute('fill', color);
      const text = document.createElementNS(ns, 'text');
      text.textContent = label;
      group.append(line, circle, text);
      g.append(group);
      this.axes.push({ line, circle, text, group, v });
    }
  }

  /** Blender's navigation gizmo for a view turned by azimuth and tilted by elevation (degrees). */
  private renderGizmo(azimuth: number, elevation: number) {
    const a = (azimuth * Math.PI) / 180;
    const e = (elevation * Math.PI) / 180;
    const project = ([x, y, zz]: [number, number, number]) => {
      // Blender: Z up, Y into the screen at azimuth 0.
      const rx = x * Math.cos(a) - y * Math.sin(a);
      const ry = x * Math.sin(a) + y * Math.cos(a);
      return { x: rx * 34, y: -(zz * Math.cos(e) - ry * Math.sin(e)) * 34, depth: ry * Math.cos(e) + zz * Math.sin(e) };
    };
    const order = this.axes.map((axis) => ({ axis, p: project(axis.v) })).sort((u, v) => v.p.depth - u.p.depth);
    for (const { axis, p } of order) {
      axis.line.setAttribute('x1', '0');
      axis.line.setAttribute('y1', '0');
      axis.line.setAttribute('x2', `${n(p.x)}`);
      axis.line.setAttribute('y2', `${n(p.y)}`);
      axis.circle.setAttribute('cx', `${n(p.x)}`);
      axis.circle.setAttribute('cy', `${n(p.y)}`);
      axis.text.setAttribute('x', `${n(p.x)}`);
      axis.text.setAttribute('y', `${n(p.y)}`);
      axis.group.parentNode!.appendChild(axis.group);
    }
  }

  /** The screenshot thumbnail: a small picture of what was captured. */
  private drawThumb(which: 0 | 1, screen: boolean) {
    const c = this.thumbCtx;
    const W = c.canvas.width;
    const H = c.canvas.height;
    c.save();
    if (screen) {
      const grad = c.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a2d68');
      grad.addColorStop(1, '#0c1840');
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(10,16,40,0.6)';
      c.fillRect(0, 0, W, 4);
      // Marvelous Designer behind, Blender in front, as on the screen.
      const sx = W / 1920;
      const md = WINDOWS.md;
      c.fillStyle = '#2b2b2b';
      c.fillRect(620 * sx, 250 * sx, md.w * sx, md.h * sx);
      this.drawBlenderThumb(c, 40 * sx, 60 * sx, WINDOWS.blender.w * sx, WINDOWS.blender.h * sx);
    } else {
      this.drawBlenderThumb(c, 0, 0, W, H);
    }
    c.restore();
    void which;
  }

  private drawBlenderThumb(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const k = w / WINDOWS.blender.w;
    c.fillStyle = '#303030';
    c.fillRect(x, y, w, h);
    c.fillStyle = '#232323';
    c.fillRect(x, y, w, BLENDER.view.y * k);
    c.fillStyle = '#282828';
    c.fillRect(x + BLENDER.side.x * k, y + BLENDER.view.y * k, BLENDER.side.w * k, h - BLENDER.view.y * k);
    c.fillRect(x, y + BLENDER.timeline.y * k, BLENDER.view.w * k, BLENDER.timeline.h * k);
    const view = this.garment.blenderCanvas;
    c.drawImage(view, x, y + (BLENDER.view.y + 26) * k, BLENDER.view.w * k, (BLENDER.view.h - 26) * k);
  }
}

/** For callers that want the screen ids in order. */
export const FILM_SCREENS: ScreenId[] = ['one', 'two', 'codex', 'grok'];
