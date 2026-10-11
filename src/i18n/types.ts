// Every visible string on the page, per locale. Fields ending in `Html` may
// contain inline markup (links, <em>, <kbd>, <strong>) and are rendered as HTML.

export interface Copy {
  meta: { title: string; description: string; ogAlt: string };
  skip: string;
  nav: {
    label: string;
    how: string;
    faq: string;
    github: string;
    download: string;
    switchText: string;
    switchLabel: string;
    home: string;
  };
  hero: {
    eyebrow: string;
    titleHtml: string;
    lede: string;
    aside: string;
    cta: string;
    ctaMeta: string;
    secondary: string;
    fineHtml: string;
    figTitle: string;
    figDesc: string;
    labelVirtual: string;
    labelPhysical: string;
    caption: string;
    replay: string;
  };
  why: {
    kicker: string;
    title: string;
    paragraphs: string[];
    roles: { name: string; text: string }[];
    sharedTitle: string;
    sharedText: string;
    notHtml: string;
    plateAlt: string;
    plateCaption: string;
  };
  how: {
    kicker: string;
    title: string;
    steps: { title: string; textHtml: string }[];
    noteTitle: string;
    noteText: string;
  };
  app: {
    kicker: string;
    title: string;
    textHtml: string;
    imageAlt: string;
    caption: string;
    swipe: string;
    testedTitle: string;
    tested: string[];
    pendingTitle: string;
    pending: string[];
    sourceHtml: string;
  };
  download: {
    kicker: string;
    title: string;
    lede: string;
    cta: string;
    ctaMeta: string;
    specs: { term: string; value: string }[];
    hashLabel: string;
    copy: string;
    copied: string;
    copyFallback: string;
    notes: string;
    checksums: string;
    source: string;
    firstRunTitle: string;
    firstRunHtml: string[];
    verifyTitle: string;
  };
  faq: { kicker: string; title: string; items: { q: string; aHtml: string }[] };
  footer: { navLabel: string; tagline: string; releases: string; license: string; fine: string };
  notFound: { title: string; text: string; home: string; meta: string };
}
