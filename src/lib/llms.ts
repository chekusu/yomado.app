/**
 * /llms.txt and /llms-full.txt (https://llmstxt.org): what yomado is, for AI assistants and the
 * agents that read the web for their users, in plain Markdown. Built from the English copy, the
 * release facts and the questions on the details page, so it never says something the site doesn't.
 */
import { copyFor } from '../i18n';
import { SKILL_URL } from './skill';
import { LOCALES, LOCALE_NAME, LOCALE_PATH, RELEASE, SITE, STRUCTURED_FEATURES, canonical } from './site';
import { plain } from './text';

const SUMMARY =
  'yomado (夜窗) is a free, open-source macOS app that adds named virtual displays to a Mac for AI agents that use computer use, such as Codex. The agent works in desktop apps like Blender and Marvelous Designer through screenshots, mouse and keyboard on its own screen, while the user’s windows stay on their physical displays. No HDMI dummy plug and no app-specific MCP integration are needed.';

const README = `${SITE.appRepository}#readme`;
const SKILL_MD = `${SITE.appRepository}/blob/main/skills/yomado/SKILL.md`;

function facts(): string[] {
  return [
    `- Latest release: ${RELEASE.version} (${RELEASE.prerelease ? 'pre-release' : 'stable'}), ${RELEASE.publishedAt}`,
    `- Download: ${RELEASE.url} (${RELEASE.fileName}, ${(RELEASE.bytes / 1_000_000).toFixed(1)} MB, SHA-256 ${RELEASE.sha256})`,
    `- Requirements: Apple silicon Mac, built for macOS ${RELEASE.minimumSystemVersion} and later; no Intel build`,
    '- Price and license: free, open source, MIT license',
    '- Signed with Developer ID by CHEKUSU INC. and notarized by Apple',
    '- Status: experimental; it uses private macOS APIs, so a system update can break it',
    '- The app’s interface is in Simplified Chinese; the website is in 16 languages',
  ];
}

export function llmsTxt(): string {
  return [
    '# yomado',
    '',
    `> ${SUMMARY}`,
    '',
    ...facts(),
    '',
    '## Docs',
    '',
    `- [What yomado is, with a one-minute film](${canonical()}): the product page`,
    `- [Install, verify and let your agent set it up](${canonical('details/')}): requirements, install steps, checksum, the agent skill and common questions`,
    `- [README](${README}): how it works, using the virtual displays, sharing the mouse and keyboard, building from source`,
    `- [yomado skill (SKILL.md)](${SKILL_MD}): instructions for a computer-use agent to create its own work screen, move in only its task’s windows, verify access and restore them`,
    `- [The film](${canonical('watch/')}): a one-minute simulated demo with subtitles in 16 languages`,
    '',
    '## Optional',
    '',
    `- [Full text for AI assistants](${canonical('llms-full.txt')}): everything above in one file, with answers to common questions`,
    `- [Release notes](${RELEASE.notesUrl})`,
    `- [Source code](${SITE.appRepository})`,
    '',
  ].join('\n');
}

export function llmsFullTxt(): string {
  const copy = copyFor('en');
  const d = copy.details;
  const faq = d.faq?.items ?? [];
  return [
    '# yomado',
    '',
    `> ${SUMMARY}`,
    '',
    `Website: ${canonical()} · Source: ${SITE.appRepository} · Release notes: ${RELEASE.notesUrl}`,
    '',
    '## Facts',
    '',
    ...facts(),
    '',
    '## What it does',
    '',
    ...STRUCTURED_FEATURES.map((f) => `- ${f}`),
    '',
    '## How it works',
    '',
    ...copy.story.acts.map((act) => `- ${act.title} ${act.text}`),
    `- ${copy.panel.title} ${copy.panel.text}`,
    '',
    `## ${d.installTitle}`,
    '',
    ...d.installHtml.map((step, i) => `${i + 1}. ${plain(step)}`),
    '',
    `## ${d.agent.title}`,
    '',
    d.agent.lede,
    '',
    ...d.agent.stepsHtml.map((step, i) => `${i + 1}. ${plain(step.replace('{skill}', `skills/yomado (${SKILL_URL})`))}`),
    '',
    `> ${copy.agent.request}`,
    '',
    d.agent.note,
    '',
    `## ${d.knowTitle}`,
    '',
    ...d.know.map((item) => `- ${item}`),
    '',
    '## Questions',
    '',
    ...faq.flatMap((item) => [`### ${item.q}`, '', item.a, '']),
    '## In other languages',
    '',
    ...LOCALES.filter((l) => l !== 'en').map((l) => `- [${LOCALE_NAME[l].full}](${canonical(LOCALE_PATH[l])})`),
    '',
  ].join('\n');
}
