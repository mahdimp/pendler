export interface LanguageOption {
  code: string;
  label: string;
}

// A curated set of common target languages (BCP 47 / ISO 639-1 codes the translate endpoint
// expects), not the full 100+ the API supports — kept short enough to scan as a plain list.
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
  { code: "pl", label: "Polski" },
  { code: "el", label: "Ελληνικά" },
  { code: "ro", label: "Română" },
  { code: "nl", label: "Nederlands" },
  { code: "zh-CN", label: "中文（简体）" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "hi", label: "हिन्दी" },
  { code: "fa", label: "فارسی" },
  { code: "ku", label: "Kurdî (Kurmancî)" },
  { code: "ckb", label: "کوردی (سۆرانی)" },
];
