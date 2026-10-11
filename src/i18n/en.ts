import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado — a screen for your agents',
    description:
      'yomado adds named virtual displays to your Mac, so visual agents like Codex can work in apps on a screen of their own while your windows stay put. Free, open source, experimental.',
    ogAlt: 'yomado — A screen for your agents.',
  },
  skip: 'Skip to content',
  nav: {
    label: 'Primary',
    details: 'Details',
    download: 'Download',
    switchText: '中文',
    switchLabel: '简体中文',
    home: 'yomado home',
  },
  hero: {
    title: 'A screen for your agents.',
    sub: 'Named virtual displays on your Mac, for agents that work by sight.',
    cta: 'Download for Mac',
    meta: `Experimental build · v${r.version} · Apple silicon`,
    film: {
      label:
        'Concept film, 16 seconds, no sound. A virtual screen named Codex opens beside a Mac display. A 3D app moves into it while the other windows stay. A second screen, GrokBot, opens with its own apps. Night falls and the screens become the yomado mark.',
      caption: 'Concept demo. Running with physical displays switched off is not yet verified on real hardware.',
      play: 'Play film',
      pause: 'Pause film',
      replay: 'Replay film',
      fallback: 'Your browser can’t play this video.',
    },
  },
  story: {
    label: 'How it works',
    acts: [
      { title: 'Open a screen. Name it.', text: 'Add a virtual display and name it after the agent that will use it.' },
      { title: 'Their apps move. Yours stay.', text: 'Send an app to the agent’s screen. Everything else stays where you left it.' },
      { title: 'One screen per agent.', text: 'Codex gets one, GrokBot another — each with its own apps.' },
    ],
  },
  panel: {
    title: 'Every screen. One panel.',
    text: 'Your displays to scale, each app shown on the screen it lives on.',
    imageAlt:
      'The yomado control panel: two physical Studio Display cards and a virtual screen card named Codex at 1920 × 1080, each showing the icons of the apps on it.',
    caption: 'The control panel with example display data. Its interface is in Simplified Chinese.',
  },
  finale: {
    title: 'A window, lit for your agents.',
    cta: 'Download for Mac',
    meta: `Experimental build ${r.version} · Apple silicon · macOS 14 or later · Free and open source`,
    details: 'Install and verify',
    source: 'Source on GitHub',
  },
  footer: {
    navLabel: 'Footer',
    tagline: 'A work screen for visual agents.',
    details: 'Details',
    releases: 'Releases',
    source: 'App source',
    site: 'Website source',
    license: 'MIT license',
    fine: 'Experimental software that uses private macOS APIs. Codex, GrokBot and macOS belong to their respective owners; naming them doesn’t imply endorsement.',
  },
  details: {
    meta: {
      title: `yomado ${r.version} — install, checksum and requirements`,
      description: `Download yomado ${r.version} for Apple silicon Macs: what you need, how to install it, how to verify the archive and what has not been verified yet.`,
    },
    eyebrow: 'Details',
    title: `yomado ${r.version}`,
    lede: 'An experimental build for Apple silicon Macs. Free and open source under the MIT license.',
    cta: 'Download for Mac',
    ctaMeta: `${r.fileName} · ${r.size}`,
    specsTitle: 'Requirements',
    specs: [
      { term: 'Version', value: `${r.version} (build ${r.build}) · pre-release · ${r.date}` },
      { term: 'Mac', value: 'Apple silicon (arm64). There’s no Intel build.' },
      { term: 'macOS', value: 'Built for macOS 14 and later; not every release has been tested.' },
      { term: 'Signature', value: 'Ad hoc signed. Not Developer ID signed or notarized.' },
      { term: 'Interface', value: 'Simplified Chinese' },
    ],
    installTitle: 'Install',
    installHtml: [
      'Unzip it and open <strong>Yomado.app</strong>. It lives in the menu bar; closing the panel doesn’t quit it.',
      'The build isn’t notarized, so macOS may ask you to confirm. Follow your Mac’s usual security policy, or build it from source.',
      'Moving windows needs Accessibility permission. The lock icon in the panel opens the right page in System Settings; you switch it on yourself.',
    ],
    verifyTitle: 'Verify the download',
    verifyText: 'Compare the archive’s SHA-256 with this value:',
    hashLabel: 'SHA-256',
    copy: 'Copy',
    copied: 'Copied',
    copyFallback: 'Selected — press ⌘C',
    knowTitle: 'Good to know',
    know: [
      'yomado provides the displays. Your agent sees and acts with its own screenshot and input tools.',
      'Virtual screens are part of your login session, so you and the agent share one keyboard, pointer and focus.',
      'Quitting yomado closes its screens, and they aren’t recreated after a restart.',
      'Not yet verified: agent work with physical displays switched off, power savings and long unattended runs.',
    ],
    links: { notes: 'Release notes', checksums: 'Checksums file', source: 'App source', site: 'Website source' },
    back: 'Back to yomado',
  },
  notFound: {
    meta: 'Page not found — yomado',
    title: 'This window is dark.',
    text: 'There’s nothing at this address. The download is on the home page.',
    home: 'Back to yomado',
  },
});
