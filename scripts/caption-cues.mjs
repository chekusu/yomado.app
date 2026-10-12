// Caption timing for the film, from the approved narration's character timings: each narration
// (English and Simplified Chinese, the River voice-over) is split into short phrases, and each
// phrase is timed from its first to its last spoken character.
//
//   node scripts/caption-cues.mjs <narration-alignment.json>   → captions/timing.json
//
// The alignment (approved script text, a start and end per character, measured from the start of
// the final video, and each section's measured speech end) is kept outside the repository; the
// timing it yields is committed. Rules:
//   - a phrase is an exact run of a section's approved text (the plan below); nothing is
//     transcribed or reworded here, and the plan must cover each section's text exactly;
//   - a cue starts at its first character and ends at its last; inside a section it may stay up
//     to HOLD seconds longer, never past the next cue's start; a section's last cue ends at the
//     section's speech end at the latest;
//   - cues never overlap, run in order and stay inside the film.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const HOLD = 0.6;

// Phrases per section, in order. Joined with the separators of the approved text they must give
// back that text exactly. A display override (show) may write the spoken "yomado dot app" as the
// address it is.
const PLAN = {
  en: {
    need: ['Some work needs a screen.', 'Like Blender, or Marvelous Designer.'],
    create: ['Give your agent a dedicated work screen.', 'Create a virtual display with yomado,', 'and name it Codex.'],
    move: ['Drag in the apps it needs.', 'Blender. Marvelous Designer.', 'Your other windows stay where they are.'],
    operate: ['The agent reads screenshots,', 'clicks controls, and types.', 'It works through the interface,', 'even without an app-specific MCP integration.'],
    return: ['Add another screen for GrokBot.', 'Bring apps back when you need them,', 'then close the screen.'],
    close: ['yomado. For visual agents.', { say: 'Download at yomado dot app.', show: 'Download at yomado.app.' }],
  },
  'zh-CN': {
    need: ['有些工作，得看着界面来做。', '比如 Blender，或者 MD。'],
    create: ['用 yomado 新建一块虚拟屏，', '取名 Codex。', '给 Agent 一块专用的工作屏。'],
    move: ['把它需要的应用拖进去。', 'Blender，MD。', '你自己打开的其他窗口，', '留在原来的位置。'],
    operate: ['Agent 看截图、点控件、输入文字。', '应用没有专门的 MCP，', '也能通过视觉来操作。'],
    return: ['再给 GrokBot 一块屏。', '需要时，把应用拖回来，', '用完再关掉对应的虚拟屏。'],
    close: ['yomado，夜窗。', '去官网下载。'],
  },
};
const FAMILY = { en: 'en', 'zh-CN': 'zh' };

const round = (s) => Math.round(s * 1000) / 1000;

export function timing(alignment) {
  const families = {};
  for (const [language, plan] of Object.entries(PLAN)) {
    const narration = alignment.narrations[language];
    const cues = [];
    for (const section of narration.sections) {
      const phrases = plan[section.id];
      if (!phrases) throw new Error(`${language}: no plan for section ${section.id}`);
      const chars = section.characters;
      const text = chars.map((c) => c.text).join('');
      if (text !== section.text) throw new Error(`${language}/${section.id}: characters do not spell the section text`);
      let at = 0;
      const sectionCues = [];
      for (const phrase of phrases) {
        const say = typeof phrase === 'string' ? phrase : phrase.say;
        while (text[at] === ' ') at++;
        if (text.slice(at, at + say.length) !== say) throw new Error(`${language}/${section.id}: "${say}" is not the next run of the approved text`);
        const run = chars.slice(at, at + say.length).filter((c) => c.text.trim());
        sectionCues.push({ text: typeof phrase === 'string' ? phrase : phrase.show, said: say, start: run[0].start, spokenEnd: run.at(-1).end });
        at += say.length;
      }
      if (text.slice(at).trim()) throw new Error(`${language}/${section.id}: the plan leaves "${text.slice(at)}" out`);
      sectionCues.forEach((cue, i) => {
        const next = sectionCues[i + 1];
        const limit = next ? next.start : section.speechEnd;
        cue.end = Math.min(cue.spokenEnd + HOLD, limit, section.speechEnd);
        if (!next) cue.end = Math.min(Math.max(cue.spokenEnd, cue.end), section.speechEnd);
      });
      cues.push(...sectionCues.map((c) => ({ section: section.id, start: round(c.start), end: round(c.end), text: c.text, said: c.said })));
    }
    cues.forEach((cue, i) => {
      cue.key = `${FAMILY[language]}${String(i + 1).padStart(2, '0')}`;
      if (!(cue.end > cue.start)) throw new Error(`${cue.key}: empty`);
      if (cue.start < 0 || cue.end > alignment.durationSeconds) throw new Error(`${cue.key}: outside the film`);
      if (i && cue.start < cues[i - 1].end) throw new Error(`${cue.key}: overlaps ${cues[i - 1].key}`);
    });
    families[FAMILY[language]] = {
      narration: language,
      cues: cues.map(({ key, section, start, end, text, said }) => ({ key, section, start, end, text, ...(said !== text ? { said } : {}) })),
    };
  }
  return { duration: alignment.durationSeconds, voice: alignment.voice, hold: HOLD, families };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2];
  if (!source) throw new Error('usage: node scripts/caption-cues.mjs <narration-alignment.json>');
  const result = timing(JSON.parse(await readFile(source, 'utf8')));
  await writeFile(join(root, 'captions/timing.json'), `${JSON.stringify(result, null, 2)}\n`);
  for (const [family, { cues }] of Object.entries(result.families)) {
    console.log(`${family}: ${cues.length} cues`);
    for (const c of cues) console.log(`  ${c.key} ${c.start.toFixed(3)}–${c.end.toFixed(3)} (${(c.end - c.start).toFixed(2)} s, ${(c.text.length / (c.end - c.start)).toFixed(1)} chars/s) ${c.text}`);
  }
}
