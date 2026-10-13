// The remembered website language. It is written only when someone picks a language from the menu
// or the footer (src/scripts/page.ts), which also forgets any subtitle choice, and read only by the
// bare home page (AutoLanguage.astro). Detecting the browser's language never writes it.
export const LANGUAGE_KEY = 'yomado.lang';

// The subtitle choice made in a subtitle menu, kept with the website language it was made on
// (src/scripts/captions.ts): {"site":"<website language>","cc":"<subtitle tag or off>"}.
export const CAPTION_KEY = 'yomado.captions';
