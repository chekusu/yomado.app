import { SITE } from './site';

/**
 * The yomado skill, kept in the app's repository: how an agent that already has screenshot and
 * input tools prepares its own screen in yomado's panel. It works through the app's existing
 * interface; it adds no API and no input of its own.
 */
export const SKILL_URL = `${SITE.appRepository}/tree/main/skills/yomado`;
