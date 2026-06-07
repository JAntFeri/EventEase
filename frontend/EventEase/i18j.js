import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import your JSON files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

i18n
  .use(LanguageDetector) // Detects user language automatically
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations }
    },
    fallbackLng: 'en', // Use English if the user's language isn't supported
    interpolation: {
      escapeValue: false // React already protects against XSS
    }
  });

export default i18n;