import * as RNLocalize from "react-native-localize";
import { addLocaleData } from 'react-intl';

export const locales = ['en', 'fr'];
export let defaultLocale = locales[0];

export const getLocale = () => {
    defaultLocale = RNLocalize.findBestAvailableLanguage(locales);
}

getLocale();

import en from './translations/en';
import fr from './translations/fr';

export const translationMessages = {
    en,
    fr,
};

export default {
    locales,
    defaultLocale,
    translationMessages
}
