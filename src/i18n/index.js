import { getLocales } from 'expo-localization';
import en from './en';
import zhHans from './zh-Hans';
const locales = {
    en,
    'zh-Hans': zhHans,
    zh: zhHans,
};
let currentLocale = en;
export function initI18n(lang) {
    const deviceLang = lang ?? getLocales()[0]?.languageCode ?? 'en';
    const key = Object.keys(locales).find(k => deviceLang.startsWith(k)) ?? 'en';
    currentLocale = locales[key] ?? en;
}
export function t(key) {
    const parts = key.split('.');
    let current = currentLocale;
    for (const part of parts) {
        if (current == null)
            return key;
        current = current[part];
    }
    return current ?? key;
}
export function tObj(section) {
    return currentLocale[section];
}
export { en, zhHans };
