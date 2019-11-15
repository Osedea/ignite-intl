import * as RNLocalize from 'react-native-localize';
import { createIntl, createIntlCache } from 'react-intl'
import { I18nManager } from 'react-native';
import flatten from 'flat';
import AsyncStorage from '@react-native-community/async-storage';

export const locales = ['en', 'fr'];
export let defaultLocale = locales[0];

// Storing the selected language into AsyncStorage to allow
// remembering the language through kills of the app
const persistenceKey = 'language';
const persistLocale = async (locale) => {
    try {
        await AsyncStorage.setItem(persistenceKey, locale)
    } catch(err) {
      // handle the error according to your needs
      console.error(err);
    }
}
export const loadLocale = async () => {
    const jsonString = await AsyncStorage.getItem(persistenceKey)
    return jsonString
}

export let currentLocale = defaultLocale;

import en from './translations/en';
import fr from './translations/fr';

export const translationMessages = {
    en: flatten(en),
    fr: flatten(fr),
};

// Create react-intl related elements ("Dictionary")
const cache = createIntlCache()
export let intl = createIntl({
  locale: currentLocale,
  messages: translationMessages[currentLocale]
}, cache)

// Language change listeners management
const listeners: Array<Function> = [];
export const registerLanguageListener = (func: Function) => {
    listeners.push(func);
}
export const unregisterLanguageListener = (func: Function) => {
    if (listeners.includes(func)) {
        listeners.splice(listeners.indexOf(func), 1);
    }
}

// Easy method to change the locale from anywhere in the app
export const changeLanguage = async (locale: string, firstLoad : boolean = false) => {
    if (locales.includes(locale)) {
        currentLocale = locale;

        intl = createIntl({
            locale: currentLocale,
            messages: translationMessages[currentLocale]
        }, cache)

        translate = intl.formatMessage;

        if (!firstLoad) {
            await persistLocale(currentLocale);
        }

        listeners.forEach((func) => {
            func(currentLocale);
        });
    } else {
        console.error(`Not a valid locale: ${locale} is not in`, locales);
    }

    return currentLocale;
}

// Useful when user changes the locale of the phone
export const getLocale = async (firstLoad: boolean = false) => {
    const bestLanguage = RNLocalize.findBestAvailableLanguage(locales);

    if (bestLanguage) {
        I18nManager.forceRTL(bestLanguage.isRTL);
    }

    // Maybe we should prompt here?
    const localeToChangeTo = bestLanguage && bestLanguage.languageTag || defaultLocale;

    if (localeToChangeTo && localeToChangeTo !== currentLocale) {
        return await changeLanguage(localeToChangeTo, firstLoad);
    }
};

// Initializing
getLocale(true);

// Export translate function
export let translate = intl.formatMessage;
