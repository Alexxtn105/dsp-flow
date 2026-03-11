import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ruCommon from './ru/common.json';
import enCommon from './en/common.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ru: { common: ruCommon },
            en: { common: enCommon }
        },
        defaultNS: 'common',
        fallbackLng: 'ru',
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'dsp-flow-language',
            caches: ['localStorage']
        }
    });

export default i18n;
