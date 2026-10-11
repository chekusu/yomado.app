import { releaseFacts, type Locale } from '../lib/site';
import en from './en';
import zhCn from './zh-cn';
import type { Copy } from './types';

const builders = { en, 'zh-cn': zhCn } satisfies Record<Locale, unknown>;

export function copyFor(locale: Locale): Copy {
  return builders[locale](releaseFacts(locale));
}

export type { Copy };
