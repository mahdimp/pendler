import { Injectable } from "@angular/core";

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

// Free, keyless, CORS-open endpoint behind Google Translate's web UI — same "call a public
// endpoint directly from the browser" pattern as EfaService, not the official (paid, API-key)
// Cloud Translation API. It's undocumented: Google could change or rate-limit it without notice,
// but it works today and needs no backend, no account, and no key.
type RawTranslateResponse = [Array<[string, string, ...unknown[]]>, ...unknown[]];

@Injectable({ providedIn: "root" })
export class TranslateService {
  /** Picks a sensible target language from the browser's locale, avoiding a same-language no-op. */
  preferredTargetLanguage(sourceLang = "de"): string {
    const lang = navigator.language?.split("-")[0] ?? "en";
    return lang === sourceLang ? "en" : lang;
  }

  async translate(text: string, targetLang: string, sourceLang = "de"): Promise<string> {
    if (!text.trim()) return "";
    const params = new URLSearchParams({
      client: "gtx",
      sl: sourceLang,
      tl: targetLang,
      dt: "t",
      q: text,
    });
    const res = await fetch(`${TRANSLATE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
    const data = (await res.json()) as RawTranslateResponse;
    return data[0].map((segment) => segment[0]).join("");
  }
}
