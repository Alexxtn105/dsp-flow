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

import ruBlocks from './ru/blocks.json';
import enBlocks from './en/blocks.json';
import ruGroups from './ru/groups.json';
import enGroups from './en/groups.json';
import ruParams from './ru/params.json';
import enParams from './en/params.json';
import ruValidation from './ru/validation.json';
import enValidation from './en/validation.json';
import ruHelp from './ru/help.json';
import enHelp from './en/help.json';

/** Supported languages: flagCode maps to FlagIcon component */
export const LANGUAGES = [
    { code: 'en', flagCode: 'gb', name: 'English' },
    { code: 'ru', flagCode: 'ru', name: 'Русский' },
    { code: 'es', flagCode: 'es', name: 'Español', dev: true },
    { code: 'fr', flagCode: 'fr', name: 'Français', dev: true },
    { code: 'de', flagCode: 'de', name: 'Deutsch', dev: true },
    { code: 'zh', flagCode: 'cn', name: '中文', dev: true },
    { code: 'pt', flagCode: 'br', name: 'Português', dev: true },
    { code: 'ja', flagCode: 'jp', name: '日本語', dev: true },
    { code: 'ko', flagCode: 'kr', name: '한국어', dev: true }
];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { common: enCommon, blocks: enBlocks, groups: enGroups, params: enParams, validation: enValidation, help: enHelp },
            ru: { common: ruCommon, blocks: ruBlocks, groups: ruGroups, params: ruParams, validation: ruValidation, help: ruHelp },
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
