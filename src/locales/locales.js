import { I18n } from "i18n-js";
import translations from "./translations.json";

const i18n = new I18n(translations);
i18n.defaultLocale = "en";
i18n.enableFallback = true;

function getLang() {
  if (navigator.languages != undefined) {
    return navigator.languages[0];
  }
  return navigator.language;
}

i18n.locale = getLang();

export function t(scope, options) {
  return i18n.t(scope, options);
}
