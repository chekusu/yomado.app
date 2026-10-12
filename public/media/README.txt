film-<locale>-<layout>-v2.{mp4,webm} and the posters film-<locale>-<layout>-poster.webp are rendered by
scripts/render-film.mjs from the timeline in src/lib/film.ts (npm run film) and narrated by
scripts/narrate-film.mjs from narration/ (English and Simplified Chinese; the Japanese film has the
English narration); story-<layout>.webp from the home page story scene (src/lib/scene.ts, end of
act 3). film-<locale>-<layout>-band-c1.* are the same films above a caption band, captioned/ holds
the films with subtitles in 16 languages and captions/ the subtitle files (scripts/caption-film.mjs,
npm run film:captions, from captions/). The film is a simulated demo. App icons are the apps’ own
(public/apps/sources.json) and belong to their owners. Do not edit by hand.
