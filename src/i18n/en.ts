import type { ReleaseFacts } from '../lib/site';
import type { Copy } from './types';

export default (r: ReleaseFacts): Copy => ({
  meta: {
    title: 'yomado — a screen for your agents',
    description:
      'yomado gives Codex and other visual agents a virtual screen on your Mac, so they can work in apps like Blender and Marvelous Designer through screenshots, clicks and keystrokes — no app-specific MCP required. Free, open source, experimental.',
    ogAlt: 'yomado — A screen for your agents.',
  },
  skip: 'Skip to content',
  nav: {
    label: 'Primary',
    details: 'Details',
    download: 'Download',
    language: 'Language',
    home: 'yomado home',
  },
  hero: {
    title: 'A screen for your agents.',
    // A no-break space keeps Marvelous Designer on one line.
    sub: 'A virtual screen for Blender, Marvelous\u00a0Designer and more. Codex and other agents work through screenshots, clicks and keystrokes — no app-specific MCP required.',
    cta: 'Download for Mac',
    meta: `Experimental build · v${r.version} · Apple silicon`,
    film: {
      label:
        'Product film, one minute, with English narration; a simulated demo. Codex works in Blender on your display by screenshot and click. yomado’s menu bar icon opens the control panel, which adds a virtual screen to the right of your two displays; it is renamed Codex. Blender and Marvelous Designer are dragged onto it, and their windows move while yours stay. On Codex, Codex takes a screenshot, adds a Subdivision Surface modifier, types 3, turns the view and switches to rendered shading. A second screen, GrokBot, gets Google Chrome; Marvelous Designer is dragged back; closing GrokBot from the menu bar returns Chrome to its display first. Night falls and Codex becomes the yomado mark.',
      caption: 'Simulated demo, not a recording of an agent at work. Running with physical displays switched off is not yet verified on real hardware.',
      play: 'Play film',
      pause: 'Pause film',
      replay: 'Replay film',
      fallback: 'Your browser can’t play this video.',
      watch: 'Watch the full film',
      soundOn: 'Turn sound on',
      soundOnText: 'Sound on',
      mute: 'Mute',
    },
  },
  filmScript: {
    label: 'Simulated demo',
    supers: [
      'Visual agents need a screen they can see and work on.',
      'Open a screen. Name it.',
      'Their apps move. Yours stay.',
      'Codex looks, then clicks and types.',
      'Close a screen, and its windows go back first.',
    ],
    tagline: 'A screen for your agents.',
    cta: 'Download for Mac',
  },
  watch: {
    meta: {
      title: 'yomado in one minute — the product film',
      description:
        'A one-minute simulated demo of yomado: a named virtual screen for Codex, apps dragged onto it from the control panel, and Codex working in Blender through screenshots, clicks and keystrokes.',
    },
    title: 'yomado in one minute.',
    lede: 'Open a screen, move an agent’s apps onto it, let it work, then bring the windows back.',
    note: 'With English narration. A simulated demo, not a recording of real agent work. The app windows are simplified recreations; the icons are the apps’ own. Running with physical displays switched off is not yet verified.',
    mp4: 'MP4 · 1920 × 1080 · 1:00 · {size}',
    mp4Tall: 'Portrait MP4 · 1080 × 1350 · 1:00 · {size}',
    back: 'Back to yomado',
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
      'The yomado control panel: Studio Display 1 with WeChat, Studio Display 2 with Google Chrome, and a virtual screen named Codex at 1920 × 1080 with Blender and Marvelous Designer. Each card shows the icons of the apps on that screen.',
    caption: 'The control panel, rebuilt from the app’s layout with example displays and the apps’ own icons. Its interface is in Simplified Chinese.',
  },
  agent: {
    textHtml: '<strong>You don’t have to set up your agent’s screen by hand.</strong> The yomado skill guides the agent to prepare its own work screen in yomado’s panel.',
    requestLabel: 'Try asking',
    request: 'Use yomado to set up a virtual screen named Codex for this Blender task, move only this task’s windows onto it, and restore them when you’re done.',
    copyName: 'Copy the request',
    skill: 'yomado skill on GitHub',
    setup: 'Install the skill',
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
    film: 'Film',
    releases: 'Releases',
    source: 'App source',
    site: 'Website source',
    license: 'MIT license',
    fine: 'Experimental software that uses private macOS APIs. Blender, Marvelous Designer, Google Chrome, WeChat, Codex, GrokBot and macOS belong to their respective owners; their names and icons only identify the apps and don’t imply endorsement.',
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
      { term: 'Signature', value: 'Developer ID signed by CHEKUSU and notarized by Apple.' },
      { term: 'Interface', value: 'Simplified Chinese' },
    ],
    installTitle: 'Install',
    installHtml: [
      'Unzip it and open <strong>Yomado.app</strong>. It lives in the menu bar; closing the panel doesn’t quit it.',
      'The app includes its Apple notarization ticket. macOS may still ask you to confirm the first time you open a downloaded app.',
      'Moving windows needs Accessibility permission. The lock icon in the panel opens the right page in System Settings; you switch it on yourself.',
    ],
    agent: {
      title: 'Let your agent set it up',
      lede: 'The yomado skill guides an agent through yomado’s own panel: create and name a work screen, move in only the task’s windows, check that it can see and operate them, and return them when it’s done. It adds no API and no input of its own.',
      stepsHtml: [
        'Install yomado and switch on Accessibility, as above.',
        'Give your agent computer-use tools that can capture the virtual screen and work the pointer and keyboard. You grant their macOS permissions the first time.',
        'For Codex, put the {skill} folder from the yomado repository in <code>$CODEX_HOME/skills</code> (by default <code>~/.codex/skills</code>). It’s available from the next turn; nothing needs restarting. Other agents can read the same <code>SKILL.md</code> with their own skill mechanism.',
        'Then ask, for example:',
      ],
      note: 'While it works, your Mac stays logged in and unlocked, and you and the agent share one pointer, keyboard and focus. Which apps it can work in depends on its tools.',
    },
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
