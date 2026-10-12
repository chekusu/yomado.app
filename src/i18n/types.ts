// Every visible string, per locale. Fields ending in `Html` may contain inline markup
// (links, <strong>, <kbd>) and are rendered as HTML. Titles may mark phrase breaks with `|`.

export interface Copy {
  meta: { title: string; description: string; ogAlt: string };
  skip: string;
  nav: {
    label: string;
    details: string;
    download: string;
    /** Names the language menu; the languages themselves are listed by their own names. */
    language: string;
    home: string;
  };
  hero: {
    title: string;
    sub: string;
    cta: string;
    meta: string;
    film: {
      label: string;
      caption: string;
      play: string;
      pause: string;
      replay: string;
      fallback: string;
      /** Link to the watch page under the hero film. */
      watch: string;
    };
  };
  /**
   * Text rendered into the film itself (src/lib/film.ts): a label that stays on screen, one super
   * per shot for shots 1–5, and the end card. Supers and the tagline may mark phrase breaks with `|`.
   */
  filmScript: {
    label: string;
    supers: [string, string, string, string, string];
    tagline: string;
    cta: string;
  };
  /** The watch page: the whole film with the browser's own controls, and the MP4 itself. */
  watch: {
    meta: { title: string; description: string };
    title: string;
    lede: string;
    /** Under the player: what the film is and isn't. */
    note: string;
    /** "MP4 · 1920 × 1080 · 1:00 · {size}", and the same for the portrait composition. */
    mp4: string;
    mp4Tall: string;
    back: string;
  };
  story: { label: string; acts: { title: string; text: string }[] };
  panel: { title: string; text: string; imageAlt: string; caption: string };
  /**
   * Under the panel: the agent can prepare its own screen with the yomado skill. One short message,
   * an example request to copy (copied exactly as written) and links to the skill and its setup.
   */
  agent: {
    textHtml: string;
    requestLabel: string;
    request: string;
    /** The copy button's accessible name; its visible text is details.copy. */
    copyName: string;
    skill: string;
    setup: string;
  };
  finale: { title: string; cta: string; meta: string; details: string; source: string };
  footer: {
    navLabel: string;
    tagline: string;
    details: string;
    /** The watch page. */
    film: string;
    releases: string;
    source: string;
    site: string;
    license: string;
    fine: string;
  };
  details: {
    meta: { title: string; description: string };
    eyebrow: string;
    title: string;
    lede: string;
    cta: string;
    ctaMeta: string;
    specsTitle: string;
    specs: { term: string; value: string }[];
    installTitle: string;
    installHtml: string[];
    /**
     * Setting the agent up to prepare its own screen: what the skill does, then the steps in order.
     * In the steps `{skill}` becomes a link to the skill's folder; the last step is followed by the
     * example request (agent.request).
     */
    agent: { title: string; lede: string; stepsHtml: string[]; note: string };
    verifyTitle: string;
    verifyText: string;
    hashLabel: string;
    copy: string;
    copied: string;
    copyFallback: string;
    knowTitle: string;
    know: string[];
    links: { notes: string; checksums: string; source: string; site: string };
    back: string;
  };
  notFound: { title: string; text: string; home: string; meta: string };
}
