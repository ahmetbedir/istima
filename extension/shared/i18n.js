// chrome.i18n for extension pages: t() for code, localize() for data-i18n* attributes in markup.
export const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

export function localize(root = document) {
  document.documentElement.lang = chrome.i18n.getUILanguage().toLowerCase().startsWith("tr") ? "tr" : "en";
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
}

export const formatSpeed = (s) => `${String(s).replace(".", chrome.i18n.getUILanguage().startsWith("tr") ? "," : ".")}×`;
