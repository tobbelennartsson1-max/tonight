import en from './locales/en.js';
import sv from './locales/sv.js';
import fr from './locales/fr.js';
import es from './locales/es.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';
import pirate from './locales/pirate.js';
import together from './locales/together.js';

for (const [code, d] of Object.entries({ en, sv, fr, es, zh, ja, pirate })) {
  d.ui = { ...d.ui, ...together[code] };
}

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB', htmlLang: 'en', dict: en },
  { code: 'sv', label: 'Svenska', short: 'SV', locale: 'sv-SE', htmlLang: 'sv', dict: sv },
  { code: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR', htmlLang: 'fr', dict: fr },
  { code: 'es', label: 'Español', short: 'ES', locale: 'es-ES', htmlLang: 'es', dict: es },
  { code: 'zh', label: '中文', short: '中文', locale: 'zh-CN', htmlLang: 'zh-CN', dict: zh },
  { code: 'ja', label: '日本語', short: '日本', locale: 'ja-JP', htmlLang: 'ja', dict: ja },
  { code: 'pirate', label: 'Pirate', short: 'ARR', locale: 'en-GB', htmlLang: 'en', dict: pirate },
];

export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'tonight.lang';

export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
