// Every visible string, per locale. Fields ending in `Html` may contain inline markup
// (links, <strong>, <kbd>) and are rendered as HTML. Titles may mark phrase breaks with `|`.

export interface Copy {
  meta: { title: string; description: string; ogAlt: string };
  skip: string;
  nav: {
    label: string;
    details: string;
    download: string;
    switchText: string;
    switchLabel: string;
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
    };
  };
  story: { label: string; acts: { title: string; text: string }[] };
  panel: { title: string; text: string; imageAlt: string; caption: string };
  finale: { title: string; cta: string; meta: string; details: string; source: string };
  footer: {
    navLabel: string;
    tagline: string;
    details: string;
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
