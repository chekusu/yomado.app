import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado — virtual displays for visual agents on macOS',
    description:
      'yomado gives Codex and other visual agents a virtual display on your Mac, so they can operate desktop apps through screenshots, mouse and keyboard — no app-specific MCP required. Experimental, free and open source.',
    ogAlt: 'yomado — Give your agent a window that stays lit.',
  },
  skip: 'Skip to content',
  nav: {
    label: 'Primary',
    how: 'How it works',
    faq: 'FAQ',
    github: 'GitHub',
    download: 'Download',
    switchText: '中文',
    switchLabel: '简体中文',
    home: 'yomado home',
  },
  hero: {
    eyebrow: 'Virtual displays for visual agents · macOS',
    titleHtml: 'Give your agent a window that <em>stays lit.</em>',
    lede: 'yomado creates virtual displays for Codex and other visual agents, so they can operate desktop apps through screenshots, mouse and keyboard — no app-specific MCP required.',
    aside: 'Move only the agent’s windows there. Yours stay on your screen.',
    cta: 'Download for macOS',
    ctaMeta: `v${r.version} · Apple Silicon · ${r.size}`,
    secondary: 'View on GitHub',
    fineHtml: 'Experimental build: ad hoc signed, not notarized, Apple Silicon only. <a href="#download">Details</a>',
    figTitle: 'How yomado works',
    figDesc:
      'An agent’s app window moves from your monitor onto a lit virtual display named Codex. Your monitor dims to rest while the agent takes a screenshot and clicks inside its window.',
    labelVirtual: 'Virtual display · Codex',
    labelPhysical: 'Your display',
    caption: 'Illustration. Running with monitors off is the design goal and is still being validated.',
    replay: 'Replay',
  },
  why: {
    kicker: 'Why it exists',
    title: 'Visual agents still need a screen.',
    paragraphs: [
      'Agents like Codex can work the way you do: read a screenshot, find the control, then click and type. That lets them use Blender, Marvelous Designer and other desktop apps through their own interface — useful when there’s no suitable app-specific MCP, or when the work happens in a viewport, a menu or a dialog.',
      'But an app only draws its interface onto a display, and a screenshot needs something to capture. Keeping a physical monitor lit just so a background agent can see is a poor trade. yomado gives the agent’s windows a display of their own, in software — no dummy plug, no paid display utility.',
    ],
    roles: [
      { name: 'Your agent', text: 'Looks at screenshots, decides, moves the pointer and types — with the tools you already use.' },
      { name: 'yomado', text: 'Provides the display: named virtual screens for the windows the agent needs.' },
      { name: 'You', text: 'Keep your own windows on your physical screen.' },
    ],
    sharedTitle: 'One desktop, shared input.',
    sharedText:
      'Virtual displays belong to your current login session. You and the agent share one keyboard, pointer and focus — it isn’t a separate machine, user account or input sandbox.',
    notHtml: 'yomado is not an agent, not a remote desktop and not a replacement for MCP. <em>It only supplies the display.</em>',
    plateAlt:
      'Concept illustration: two dark monitors and an awake Mac on a desk at night, beside a floating virtual display showing Blender and a garment-design window under an agent’s cursor.',
    plateCaption: 'Concept illustration, AI-generated. Monitor-off operation is the design goal and has not been validated yet.',
  },
  how: {
    kicker: 'How it works',
    title: 'Name a screen. Move a window. Let the agent work.',
    steps: [
      {
        title: 'Create a named screen',
        textHtml:
          'Click <kbd>+</kbd> to create a virtual display or start a saved one, and name it for the agent that will use it — “Codex”, “GrokBot”. Pick 1920 × 1080 or 2560 × 1440, with optional HiDPI. New screens join your layout on the right.',
      },
      {
        title: 'Move in only what it needs',
        textHtml:
          'Choose an app from the screen’s <kbd>+</kbd> menu or drag its icon in. Its windows move over; everything else stays put. Drag the icon back or use its return action — on their original display, windows get their old position and size.',
      },
      {
        title: 'Let your agent take over',
        textHtml:
          'Point Codex or another visual agent at the virtual screen. It sees and acts through its own screenshot and input tools; yomado keeps the display there. Before handing over a task, check one fresh screenshot and one reversible input.',
      },
    ],
    noteTitle: 'Good to know',
    noteText:
      'Virtual screens aren’t recreated after login or a restart. Closing one first returns its windows to a physical display, and keeps the screen if that can’t be confirmed. Quitting yomado closes them all.',
  },
  app: {
    kicker: 'The app',
    title: 'One small panel shows every screen and what’s on it.',
    textHtml:
      'yomado is a native AppKit menu-bar app. Its panel lays out your physical and virtual screens in desktop order, to scale, with each app’s icon inside the screen it’s on. Hover for names and window counts; <kbd>+</kbd> adds or restarts a screen, <kbd>…</kbd> renames or closes one. While a virtual screen exists, yomado asks macOS to keep the system and desktop awake.',
    imageAlt:
      'The yomado control panel: two physical Studio Display cards and a virtual screen card named Codex at 1920 × 1080, each showing app icons.',
    caption: 'The panel, rendered by the app with example display data. Its interface is in Simplified Chinese.',
    testedTitle: 'Tested on Apple Silicon',
    tested: [
      'Native Apple Silicon build.',
      'Calculator moved from a physical screen into a virtual screen named Codex, then into one named GrokBot, through the panel’s app menu.',
      'A fresh screenshot on GrokBot showed Calculator; typing 2 + 3 and Return gave 5.',
      'Sending Calculator back restored its original position and size.',
      'Closing a single virtual screen returned Calculator first, then removed the screen.',
    ],
    pendingTitle: 'Not yet validated',
    pending: [
      'Agent work after monitors are physically switched off',
      'Power savings',
      'Long unattended runs',
      'Moving apps by dragging icons, and closing one screen while another stays open',
    ],
    sourceHtml: `Details and test notes are in the <a href="${r.appRepository}#readme">project README</a>.`,
  },
  download: {
    kicker: 'Download',
    title: `yomado ${r.version}`,
    lede: 'An experimental build for Apple Silicon Macs. Free and open source under the MIT license.',
    cta: 'Download for macOS',
    ctaMeta: `${r.fileName} · ${r.size}`,
    specs: [
      { term: 'Version', value: `${r.version} (build ${r.build}) · pre-release · ${r.date}` },
      { term: 'Mac', value: 'Apple Silicon (arm64). There’s no Intel build.' },
      { term: 'macOS', value: 'Built for macOS 14 and later; not every release has been tested.' },
      { term: 'Signature', value: 'Ad hoc signed. Not Developer ID signed or notarized.' },
      { term: 'Interface', value: 'Simplified Chinese' },
    ],
    hashLabel: 'SHA-256',
    copy: 'Copy',
    copied: 'Copied',
    copyFallback: 'Selected — press ⌘C',
    notes: 'Release notes',
    checksums: 'Checksums',
    source: 'Source code',
    firstRunTitle: 'First run',
    firstRunHtml: [
      'Unzip it and open <strong>Yomado.app</strong>. It lives in the menu bar; closing the panel doesn’t quit it.',
      'The build isn’t notarized, so macOS may ask you to confirm. Follow your Mac’s usual security policy, or build it from source.',
      'Moving windows needs Accessibility permission. The lock icon in the panel opens the right page in System Settings; you switch it on yourself.',
    ],
    verifyTitle: 'Check the file',
  },
  faq: {
    kicker: 'FAQ',
    title: 'Questions, answered plainly.',
    items: [
      {
        q: 'Is yomado an agent?',
        aHtml:
          'No. It doesn’t look at your screen, make decisions or press keys. Codex or another visual agent does that with its own screenshot and input tools; yomado provides the display those apps run on.',
      },
      {
        q: 'Is it a remote desktop, or an MCP server?',
        aHtml:
          'Neither. It doesn’t stream your desktop or expose an API. If an app has a good MCP integration, use it — yomado is for the times an agent works through the app’s own interface.',
      },
      {
        q: 'Does the agent get its own keyboard and mouse?',
        aHtml:
          'No. Virtual screens are part of your current login session, so you and the agent share one keyboard, pointer and focus. Agree on who is using the desktop.',
      },
      {
        q: 'Can I switch my monitors off while the agent works?',
        aHtml:
          'That’s what yomado is designed for, but it hasn’t been validated: agent work after monitors are physically switched off, power savings and long unattended runs are all still open. yomado can’t switch a monitor off or measure its power draw.',
      },
      {
        q: 'Which Macs does it run on?',
        aHtml:
          'The Apple Silicon build is verified. macOS 14 is the deployment target, which doesn’t mean every macOS 14 or later release has been tested. There’s no Intel build.',
      },
      {
        q: 'Why does macOS warn me when I open it?',
        aHtml:
          'The app is ad hoc signed and hasn’t been notarized by Apple. Decide according to your Mac’s usual security policy, or build it yourself from the source.',
      },
      {
        q: 'What does it change on my Mac?',
        aHtml:
          'It creates and removes virtual displays and moves the windows you choose. It doesn’t touch passwords, the lock screen, screen savers or login settings, and its keep-awake request doesn’t unlock your Mac. It relies on private macOS APIs, so a system update can break it.',
      },
      {
        q: 'Is it open source?',
        aHtml: `Yes, under the MIT license. The app and its releases are at <a href="${r.appRepository}">github.com/chekusu/yomado</a>; this website is at <a href="${r.siteRepository}">github.com/chekusu/yomado.dev</a>.`,
      },
    ],
  },
  footer: {
    navLabel: 'Footer',
    tagline: 'A work screen for visual agents.',
    releases: 'Releases',
    license: 'MIT license',
    fine: 'Experimental software that uses private macOS APIs. Codex, GrokBot, Blender, Marvelous Designer and macOS belong to their respective owners; naming them doesn’t imply endorsement.',
  },
  notFound: {
    meta: 'Page not found — yomado',
    title: 'This window is dark.',
    text: 'There’s nothing at this address. The download and everything else are on the home page.',
    home: 'Back to yomado',
  },
});
