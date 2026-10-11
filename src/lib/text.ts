const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/**
 * Display titles may mark phrase boundaries with `|`. Chinese titles do not break inside a
 * phrase (word-break: keep-all), so a word such as 亮着 is never split across lines. Keep
 * phrases to seven characters or fewer so each one fits the narrowest column.
 */
export function phrased(text: string, { html = false } = {}): string {
  const safe = html ? text : text.replace(/[&<>"]/g, (c) => ESCAPES[c]);
  return safe.replaceAll('|', '<wbr>');
}
