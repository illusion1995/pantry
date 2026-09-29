interface MyMemoryMatch {
  translation?: string;
  match?: number | string;
  'created-by'?: string;
  'last-updated-by'?: string;
}

interface MyMemoryResponse {
  responseStatus?: number | string;
  matches?: MyMemoryMatch[];
}

/**
 * Translates a product name to English with MyMemory, a free translation
 * service that needs no account. Returns null if it can't (no internet, daily
 * limit reached, unknown language), so callers keep the original name.
 */
export async function translateToEnglish(text: string, fromLanguage: string): Promise<string | null> {
  const original = text.trim();
  if (!original || !/^[a-z]{2,3}$/.test(fromLanguage) || fromLanguage === 'en') return null;

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(original)}&langpair=${fromLanguage}|en&mt=1`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) return null;
    const data: MyMemoryResponse = await response.json();
    if (Number(data.responseStatus) !== 200) return null;

    // MyMemory mixes machine translation with stored human translations of
    // *similar* phrases, which can add words that aren't on the package
    // ("Palets Bretons au beurre" → "...with real butter"). Only trust a human
    // translation when it's an exact match; otherwise use the machine one.
    const matches = data.matches ?? [];
    const exactHuman = matches.find((m) => !isMachine(m) && Number(m.match) >= 0.95);
    const machine = matches.find(isMachine);
    const translated = plainText(exactHuman?.translation ?? machine?.translation ?? '');

    if (!translated || /MYMEMORY WARNING/i.test(translated)) return null;
    if (translated.toLocaleLowerCase() === original.toLocaleLowerCase()) return null;
    return translated;
  } catch {
    return null;
  }
}

/** "fr" → "French". Falls back to the code if the phone doesn't know it. */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function isMachine(match: MyMemoryMatch): boolean {
  return match['created-by'] === 'MT!' || match['last-updated-by'] === 'MT!';
}

/** Translations can contain markup like <g id="2"> and HTML entities. */
function plainText(html: string): string {
  const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}
