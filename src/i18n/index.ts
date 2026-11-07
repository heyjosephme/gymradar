import { en, type Messages } from './en.ts';
import { ja } from './ja.ts';

export type { Messages } from './en.ts';
export type { Crowd, Exclusion, Fit, Timing } from './types.ts';

export type Locale = 'en' | 'ja';

/** English at `/`, Japanese at `/ja/`. Keep in sync with `i18n.locales` in astro.config.mjs. */
export const messages: Record<Locale, Messages> = { en, ja };

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', ja: '日本語' };

export { en, ja };
