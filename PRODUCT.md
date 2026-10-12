# Design Context

Confirmed design context for the yomado website. Read this before changing the page.

## Users

Mac users running Codex or other agents that operate desktop software visually through screenshots, mouse and keyboard. They want an understandable way to give agent applications a screen while keeping their own windows where they belong.

## Brand Personality

Restrained, clear, quietly inventive. Preserve lowercase yomado, 夜窗, and the approved night-window icon.

## Aesthetic Direction

Benchmark Apple product marketing pages, especially https://www.apple.com/macbook-pro/: large product imagery, short benefit headlines, deliberate spacing, a few strong transitions and a focused download action. Build original yomado visuals rather than copying Apple's assets. Replace the earlier text-led editorial treatment. Refined sans-serif typography is appropriate; prioritize the Apple reference over generic design-skill font prohibitions. Light/dark transitions may serve the story; do not keep the page uniformly navy merely because an earlier draft was.

## Design Principles

1. Show the product's job before explaining its implementation.
2. One visual moment and one short headline per section; no feature-card grid.
3. Motion must demonstrate a product action, not decorate a wall of text.
4. Keep the actual download easy to find; installation details are a secondary destination.
5. Remain precise through concise notes rather than repeated technical warnings.

## How the page applies it

- The story runs on one timeline (`src/lib/scene.ts`): a named screen opens, Blender moves into it while the user's other windows stay, Codex and GrokBot each get a screen with their own apps, and night quiets the scene into the night-window mark.
- The one-minute film in the hero and on `/watch/` has its own timeline (`src/lib/film.ts`, `npm run film`) with the same apps, screens and panel: six shots, one action each, one short super each, a camera that moves deliberately, and a label that says it is a simulated demo. It is narrated (the approved River voice-over in English and Simplified Chinese; the Japanese film has the English narration and says so). In the hero it plays by itself only muted, with one clear, named sound button beside play/pause; sound only ever comes on because someone asked, and a mute holds.
- Subtitles in 16 languages never cover the film's own pixels: a quiet line under the hero film, a night-blue band under the picture on the watch page and in the captioned downloads. One compact subtitle menu (the browser's select, grouped by narration) sits with the film's controls; the note under the film names the narration, which is only English or Chinese.
- Apps are always shown with their real icons, never drawn stand-ins; the panel is rebuilt from the app's own layout. Blender and Marvelous Designer lead, Chrome supports, WeChat is only one of the user's own apps.
- Day to night is the only colour story: white and light grey for the product, night blue and ivory window light for the brand moment and the download.
- Technical detail (install, checksum, compatibility, permissions, what has not been verified) lives on `/details/`, not on the home page.
- Under the panel, one short message says the agent can prepare its own screen with the yomado skill (`skills/yomado` in the app's repository), with a short request to copy. What it needs and how to install the skill are on `/details/#agent-setup`. The skill works through the app's existing panel and the agent's own tools; it is not an API or a separate input.
- Claim boundaries: yomado supplies displays; agents see and act with their own tools. Running with physical displays switched off and power saving are not verified, and the film's caption says so; neither, nor a locked Mac, appears in the film.
