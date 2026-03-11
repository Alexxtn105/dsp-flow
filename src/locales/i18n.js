import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ruCommon from './ru/common.json';
import enCommon from './en/common.json';
import esCommon from './es/common.json';
import frCommon from './fr/common.json';
import deCommon from './de/common.json';
import zhCommon from './zh/common.json';
import ptCommon from './pt/common.json';
import jaCommon from './ja/common.json';
import koCommon from './ko/common.json';

/** Supported languages with flag emoji, native name, and dev status */
export const LANGUAGES = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'es', flag: '🇪🇸', name: 'Español', dev: true },
    { code: 'fr', flag: '🇫🇷', name: 'Français', dev: true },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', dev: true },
    { code: 'zh', flag: '🇨🇳', name: '中文', dev: true },
    { code: 'pt', flag: '🇧🇷', name: 'Português', dev: true },
    { code: 'ja', flag: '🇯🇵', name: '日本語', dev: true },
    { code: 'ko', flag: '🇰🇷', name: '한국어', dev: true }
];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { common: enCommon },
            ru: { common: ruCommon },
            es: { common: esCommon },
            fr: { common: frCommon },
            de: { common: deCommon },
            zh: { common: zhCommon },
            pt: { common: ptCommon },
            ja: { common: jaCommon },
            ko: { common: koCommon }
        },
        defaultNS: 'common',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage'],
            lookupLocalStorage: 'dsp-flow-language',
            caches: ['localStorage']
        }
    });

export default i18n;
