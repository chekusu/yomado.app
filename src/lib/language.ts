// The remembered language choice. It is written only when someone picks a language from the menu
// or the footer (src/scripts/page.ts) and read only by the bare home page (AutoLanguage.astro).
// Detecting the browser's language never writes it.
export const LANGUAGE_KEY = 'yomado.lang';
