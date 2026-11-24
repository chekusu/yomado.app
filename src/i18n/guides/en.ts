import type { GuideCopy } from '../../lib/guides';
import type { ReleaseFacts } from '../../lib/site';

const SKILL = '<a href="https://github.com/chekusu/yomado/tree/main/skills/yomado">skills/yomado</a>';

export default (r: ReleaseFacts): GuideCopy => ({
  label: 'Guides',
  cta: 'Download for Mac',
  ctaMeta: `Free and open source · v${r.version} · Apple silicon · macOS 14 or later`,
  updated: 'Checked {date}',
  guides: {
    compare: {
      linkText: 'Agent screens compared',
      navText: 'Compare',
      meta: {
        title: 'A virtual display for AI agents on a Mac: yomado, SpaceO, BetterDisplay, dummy plugs and VMs',
        description:
          'Ways to give Codex or another computer-use agent a screen of its own on a Mac so it stops taking over yours: agent display apps (yomado, SpaceO), display utilities, HDMI dummy plugs, macOS virtual machines and background input. What each gives the agent and when to pick it.',
      },
      eyebrow: 'Compare',
      title: 'A screen of its own for your agent.',
      lede: 'A computer-use agent works by screenshot, pointer and keyboard, so its apps have to be visible somewhere. If that somewhere is your screen, it covers your work. Here are the ways to give it a screen of its own on a Mac, and what each one asks of you.',
      sections: [
        {
          id: 'short-answer',
          title: 'The short answer',
          html: [
            'If the agent should work in the apps you already have, in your own login session, give it a virtual display: <strong>yomado</strong> or <strong>SpaceO</strong>. If it must not touch your files, apps or accounts at all, run it in a <strong>macOS virtual machine</strong>. A display utility or an HDMI dummy plug adds a screen too, but naming it, putting the right windows on it and bringing them back stays with you.',
          ],
        },
        {
          id: 'at-a-glance',
          title: 'At a glance',
          table: {
            caption: 'Ways to give a computer-use agent its own screen on a Mac',
            head: ['', 'What the agent gets', 'Apps and files', 'Screenshots and input', 'Cost'],
            rows: [
              ['yomado', 'Named virtual screens, one per agent; a task’s windows move onto it and back', 'Your session and the apps you have', 'The agent’s own computer-use tools; one shared pointer and keyboard', 'Free, MIT'],
              ['SpaceO', 'A virtual display per agent session, with a viewer to watch and take over', 'Your session; native apps and Chromium', 'Its own MCP server and CLI', 'Free, MIT'],
              ['Display utilities (BetterDisplay, BetterDummy)', 'Extra virtual monitors, made for people', 'Your session', 'Whatever the agent uses', 'Basic virtual screens free; more in paid tiers'],
              ['HDMI or USB-C dummy plug', 'One fixed fake monitor per plug', 'Your session', 'Whatever the agent uses', 'A few dollars and a port'],
              ['macOS virtual machine (terminal-mac, Tart, Lume)', 'A separate Mac with its own desktop', 'Separate: apps installed and signed in again in the guest', 'Tools inside or around the VM', 'Free tools; more memory and CPU'],
            ],
          },
          after: ['SpaceO’s details are from its Product Hunt listing. Check each project for its current state.'],
        },
        {
          id: 'yomado-or-spaceo',
          title: 'yomado or SpaceO',
          html: [
            'Both add virtual displays for agents to your own session, both are free and MIT-licensed, and both need an Apple silicon Mac with macOS 14 or later. The difference is where the agent’s eyes and hands come from.',
            'SpaceO brings its own: an MCP server and a CLI that read the screen, click, type and take screenshots, and a viewer to watch a session and take over. yomado brings only the screen. The agent keeps the computer-use tools it already has, such as Codex computer use, and the yomado skill teaches it to create a screen with its name, move only its task’s windows there and put them back.',
            'Pick SpaceO if you want one package that also drives the apps. Pick yomado if your agent already has computer-use tools you trust and you want named screens you can see and rearrange in one panel.',
          ],
        },
        {
          id: 'display-utilities',
          title: 'Display utilities and dummy plugs',
          html: [
            'BetterDisplay (once BetterDummy) and an HDMI or USB-C dummy plug make macOS see another monitor. That is enough for a headless Mac mini or a closed lid. For agent work, the rest is yours to arrange: which apps go there, how they come back and which screen belongs to which agent.',
            'yomado does that part. Each screen carries the agent’s name, the control panel shows every screen with the apps on it, and closing a screen first sends its windows back to your displays.',
          ],
        },
        {
          id: 'virtual-machines',
          title: 'Virtual machines',
          html: [
            'terminal-mac, Tart and Lume run a separate macOS guest. That is real isolation: the agent can’t see your files, windows or accounts. It is also a second Mac to look after: apps installed and signed in again inside it, more memory and CPU, and macOS runs at most two virtual Macs at once on one machine.',
            'Use a virtual machine when the agent must stay out of your session. Use a virtual display when the point is to let it work in the apps you already have.',
          ],
        },
        {
          id: 'background-input',
          title: 'Background input',
          html: [
            'Some agent tools, like Codex computer use, can act on an app in the background without moving your pointer. That stops them taking your mouse, but the app’s windows still sit on your screens. A virtual display moves them out of your way. The two go together: background input where the app accepts it, and the agent’s own screen for its windows.',
          ],
        },
        {
          id: 'limits',
          title: 'What yomado doesn’t do',
          items: [
            'It isn’t a sandbox. The agent works in your login session, as you.',
            'You and the agent share one pointer, keyboard and focus.',
            'It is experimental and uses private macOS APIs, so a system update can break it.',
            'Agent work with your monitors switched off has not been verified yet.',
            'Its interface is in Simplified Chinese.',
          ],
        },
      ],
      faq: {
        title: 'Questions',
        items: [
          {
            q: 'What’s the best way to give an AI agent its own virtual display on a Mac?',
            a: 'Use an app that adds virtual displays for agents, such as yomado or SpaceO. The agent’s apps render on that screen while yours stay on your monitors. If the agent must be kept away from your files and apps altogether, use a macOS virtual machine instead.',
          },
          {
            q: 'Is yomado an alternative to SpaceO?',
            a: 'Yes, for the screen itself. Both give an agent a virtual display of its own in your session, free and open source. yomado leaves screenshots and input to the agent’s existing computer-use tools; SpaceO includes its own MCP server and CLI for them.',
          },
          {
            q: 'Do I need an HDMI dummy plug to give an agent a screen?',
            a: 'No. yomado creates the screens in software. A dummy plug is still a simple way to make a headless Mac think a monitor is attached, but it gives you one fixed screen per plug and nothing to manage which windows go on it.',
          },
          {
            q: 'Does a virtual display stop the agent from taking over my screen?',
            a: 'It keeps the agent’s windows off your screens. Input is still shared: a login session has one pointer and keyboard, so prefer agent tools that act in the background where the app allows it.',
          },
        ],
      },
    },
    codexBlender: {
      linkText: 'Codex in Blender',
      navText: 'Codex + Blender',
      meta: {
        title: 'Codex computer use in Blender on its own virtual screen (Mac)',
        description:
          'Give Codex a virtual screen for Blender on an Apple silicon Mac with yomado: what you need, how to install the skill, what to ask Codex, and what to watch for with the 3D viewport and a shared pointer.',
      },
      eyebrow: 'Guide',
      title: 'Codex in Blender, on a screen of its own.',
      lede: 'When a Blender task needs the viewport, a menu or a dialog, or there is no MCP tool for it, Codex works the app the way you do: screenshots, pointer and keys. Give it a virtual screen for that, and your own windows stay where they are.',
      sections: [
        {
          id: 'what-you-need',
          title: 'What you need',
          items: [
            'An Apple silicon Mac with macOS 14 or later.',
            'yomado, with Accessibility switched on so it can move windows.',
            'Codex with computer use set up: the Computer Use plugin, with Screen Recording and Accessibility permission.',
            'Blender, and the file you want Codex to work on.',
          ],
        },
        {
          id: 'set-up',
          title: 'Set it up',
          steps: [
            'Download yomado, unzip it and open <strong>Yomado.app</strong>. Click the lock icon in its panel and switch on Accessibility for it in System Settings.',
            `Put the ${SKILL} folder from the yomado repository in <code>$CODEX_HOME/skills</code> (by default <code>~/.codex/skills</code>). Codex can use it from the next turn.`,
            'Open Blender and your file.',
            'Ask Codex, for example:',
          ],
          request:
            'Use $yomado to prepare a virtual screen named “Codex · Blender” for this task. Move only this task’s windows, verify that you can see and operate them, and restore them when finished.',
        },
        {
          id: 'what-codex-does',
          title: 'What Codex does',
          html: [
            'With the skill, Codex works through yomado’s own panel. It creates a screen with its name, moves only Blender’s windows there, takes a fresh screenshot and tries one reversible action to be sure it can see and operate them, and then starts the task. When it’s done it moves the windows back, or closes the screen, which returns them first.',
            'You can also do it by hand: in yomado’s panel, click <strong>＋ 新建屏幕</strong> (New Display; the app’s interface is in Chinese), name it Codex, choose 1920 × 1080 or 2560 × 1440, and move Blender onto it.',
          ],
        },
        {
          id: 'blender-tips',
          title: 'Tips for Blender',
          items: [
            'Orbiting, panning and modal tools in the viewport need real pointer and keyboard events, and your login session has one pointer. Leave the mouse alone while Codex works in the viewport.',
            'Start with 1920 × 1080. HiDPI doubles each dimension, so the screen has four times the pixels to capture.',
            'After a screen is added or closed, or a window moves, have Codex take a new screenshot before it clicks: earlier coordinates no longer match.',
            'Keep the Mac logged in and unlocked, and keep yomado running: quitting it closes its screens.',
          ],
        },
        {
          id: 'other-apps',
          title: 'Other apps',
          html: [
            'The same steps work for Marvelous Designer and other desktop apps Codex drives by screenshot and click. Give each agent its own named screen, with only its task’s apps on it.',
          ],
        },
        {
          id: 'verified',
          title: 'What has been verified',
          items: [
            'yomado’s film shows Codex in Blender, but it is a simulated demo, not a recording of an agent at work.',
            'In a live test, Calculator moved onto a virtual screen, a fresh screenshot showed it there, typing 2 + 3 and Return gave 5, and it went back to its original place and size.',
            'Agent work with your monitors switched off, and long unattended runs, have not been verified yet.',
          ],
        },
      ],
      faq: {
        title: 'Questions',
        items: [
          {
            q: 'Does Codex need a Blender MCP server for this?',
            a: 'No. With computer use, Codex works through screenshots, pointer and keyboard. yomado only adds the screen, so no app-specific MCP integration is needed.',
          },
          {
            q: 'Will Codex take over my mouse?',
            a: 'Its windows stay on its own screen. Input is shared: when Codex sends real pointer events, as Blender’s viewport needs, it moves the same pointer you use, so leave it alone while Codex works there.',
          },
          {
            q: 'Can I keep working while Codex uses Blender?',
            a: 'Yes, in your own windows on your displays. Avoid the pointer and keyboard while Codex is in the viewport, and keep the Mac awake, logged in and unlocked.',
          },
        ],
      },
    },
  },
});
