import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';

i18n
    .use(LanguageDetector) // 自动检测浏览器语言
    .use(initReactI18next) // 绑定 react-i18next
    .init({
        resources: {
            en: { translation: en },
            zh: { translation: zh },
        },
        fallbackLng: 'zh', // 默认语言
        debug: false,
        interpolation: {
            escapeValue: false, // React 已经处理了 XSS
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'], // 缓存用户选择
        },
    });

export default i18n;
