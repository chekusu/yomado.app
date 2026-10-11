/**
 * Generic app glyphs for the scene's Dock and screen chips: 24-unit line drawings, stroked.
 * They stand for kinds of apps, not for any real product.
 */
export type GlyphId = 'folder' | 'notes' | 'mail' | 'cube' | 'gamepad' | 'globe' | 'brush';

export const GLYPHS: Record<GlyphId, { path: string; from: string; to: string; ink?: string }> = {
  folder: {
    path: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z',
    from: '#7cc0ff',
    to: '#2f7ee8',
  },
  notes: {
    path: 'M7 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4zM9 9h6M9 12.5h6M9 16h3.5',
    from: '#ffe387',
    to: '#f5bb2a',
    ink: '#5a4300',
  },
  mail: {
    path: 'M4.5 6.5h15v11h-15zM4.8 7l7.2 5.6L19.2 7',
    from: '#6ec1ff',
    to: '#2468ec',
  },
  cube: {
    path: 'M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7zM12 12l7.5-4.3M12 12v8.5M12 12L4.5 7.7',
    from: '#ffbf7a',
    to: '#ee6f28',
  },
  gamepad: {
    path: 'M7.5 8h9a4 4 0 0 1 3.9 4.9l-.8 3.3a2.1 2.1 0 0 1-3.6.9L14 15h-4l-2 2.1a2.1 2.1 0 0 1-3.6-.9l-.8-3.3A4 4 0 0 1 7.5 8zM8.5 10.8v2.8M7.1 12.2h2.8M15.6 11.4h.01M17.2 13h.01',
    from: '#c3a3ff',
    to: '#7347ee',
  },
  globe: {
    path: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z',
    from: '#6fe6d6',
    to: '#119e98',
  },
  brush: {
    path: 'M14.2 4.6l5.2 5.2-7.6 7.6-5.2-5.2zM6.6 12.2c-2.2.4-3.1 2-3.1 4.3 0 1 0 1.8-.5 2.9 3 .1 5.6-.7 6.4-2.6',
    from: '#ffa3c9',
    to: '#ec4f8c',
  },
};

/** The app each moving window stands for. */
export const WINDOW_GLYPH = { model: 'cube', game: 'gamepad', browser: 'globe', canvas: 'brush' } as const;
