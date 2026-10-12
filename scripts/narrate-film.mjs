// Adds the narration to the rendered film: the approved River voice-over in English and Simplified
// Chinese (narration/<language>.m4a), timed to the film from its first frame. The Japanese film
// keeps its Japanese supers and takes the English narration; its pages say so.
//
//   npm run film:narrate     .film-build/silent/film-<locale>-<layout>.{mp4,webm}
//                            → public/media/film-<locale>-<layout>-<version>.{mp4,webm}
//
// scripts/render-film.mjs writes the silent files and then runs this. Video streams are copied
// untouched. The MP4 takes the narration's AAC exactly as it is; WebM cannot hold AAC, so the same
// narration goes in as Opus. Metadata from the inputs is dropped (-map_metadata -1, bitexact) and
// the audio track is tagged with its language. The version in src/lib/film-media.json names the
// files, so a changed film gets new URLs and no cache keeps serving an old one.
import { execFile as execFileCb } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'src/lib/film-media.json'), 'utf8'));
export const FILM_VERSION = config.version;
export const silentDir = join(root, '.film-build', 'silent');
const media = join(root, 'public/media');

const COMMON = ['-y', '-loglevel', 'error', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-map_metadata', '-1', '-fflags', '+bitexact'];
const AUDIO = {
  mp4: ['-c:a', 'copy', '-movflags', '+faststart'],
  webm: ['-c:a', 'libopus', '-b:a', '96k', '-ac', '2', '-ar', '48000', '-cues_to_front', '1'],
};

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');

/** The narrated files of one variant ({ locale, layout, name }), from its silent render. */
export async function narrate(v) {
  const narration = config.narration[v.locale];
  const audio = join(root, 'narration', `${narration}.m4a`);
  const files = {};
  for (const ext of ['mp4', 'webm']) {
    const out = join(media, `${v.name}-${FILM_VERSION}.${ext}`);
    await execFile('ffmpeg', ['-i', join(silentDir, `${v.name}.${ext}`), '-i', audio, ...COMMON, ...AUDIO[ext], '-metadata:s:a:0', `language=${config.language[narration]}`, out]);
    files[`${v.name}-${FILM_VERSION}.${ext}`] = { bytes: (await stat(out)).size, sha256: await sha256(out), narration };
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = {};
  for (const locale of ['en', 'zh-cn', 'ja']) {
    for (const layout of ['wide', 'tall']) {
      const name = `film-${locale}-${layout}`;
      Object.assign(results, await narrate({ locale, layout, name }));
      // The silent files of the same film never ship next to the narrated ones.
      for (const ext of ['mp4', 'webm']) await rm(join(media, `${name}.${ext}`), { force: true });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
