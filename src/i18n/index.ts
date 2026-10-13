import { releaseFacts, type Locale } from '../lib/site';
import type { FilmLocale } from '../lib/media';
import ar from './ar';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import hi from './hi';
import id from './id';
import it from './it';
import ja from './ja';
import ko from './ko';
import nl from './nl';
import pl from './pl';
import ptBr from './pt-br';
import tr from './tr';
import zhCn from './zh-cn';
import zhTw from './zh-tw';
import type { Copy, FilmScript } from './types';

const builders = {
  en,
  'zh-cn': zhCn,
  'zh-tw': zhTw,
  ja,
  ko,
  es,
  fr,
  de,
  it,
  'pt-br': ptBr,
  nl,
  pl,
  tr,
  ar,
  hi,
  id,
} satisfies Record<Locale, unknown>;

export function copyFor(locale: Locale): Copy {
  return builders[locale](releaseFacts(locale));
}

/** The text in a film's own pictures: only the three films there are have it. */
export function filmScriptFor(film: FilmLocale): FilmScript {
  const script = copyFor(film).filmScript;
  if (!script) throw new Error(`no film script for ${film}`);
  return script;
}

export type { Copy, FilmScript };
