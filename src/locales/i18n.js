import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ruCommon from './ru/common.json';
import enCommon from './en/common.json';
import esCommon from './es/common.json';
import frCommon from './fr/common.json';
import deCommon from './de/common.json';

/** Supported languages with flag emoji and native name */
export const LANGUAGES = [
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' }
];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: { common: ruCommon },
            en: { common: enCommon },
            es: { common: esCommon },
            fr: { common: frCommon },
            de: { common: deCommon }
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
