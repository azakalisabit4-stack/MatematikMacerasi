/**
 * Kullanıcı adı moderasyonu
 * -----------------------------------------------------------------------------
 * Amaç: yasaklı kelime filtresinin büyük/küçük harf, Türkçe karakter, leetspeak
 * (0→o, 1→i, 3→e ...), Unicode benzer karakterler (Kiril/Yunan) ve harf tekrarı
 * gibi yöntemlerle aşılmasını engellemek.
 *
 * Öğrenciye ASLA hangi kelimenin yasaklı olduğu söylenmez; yalnızca
 * "Bu kullanıcı adı uygun değil." mesajı döner.
 */

/** Görsel olarak benzeyen karakterlerin latin karşılıkları */
const HOMOGLYPHS: Record<string, string> = {
  // rakam / sembol -> harf
  "0": "o", "1": "i", "2": "z", "3": "e", "4": "a", "5": "s",
  "6": "g", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "|": "i", "£": "l", "€": "e", "¥": "y",
  "(": "c", "{": "c", "[": "c", "+": "t", "*": "", "_": "", "-": "", ".": "", ",": "",
  // Kiril
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "j",
  "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
  "п": "p", "р": "r", "с": "c", "т": "t", "у": "y", "ф": "f", "х": "x", "ц": "c",
  "ч": "c", "ш": "s", "щ": "s", "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "u", "я": "a",
  "і": "i", "ї": "i", "ѕ": "s", "ј": "j", "ԁ": "d", "ѡ": "w",
  // Yunan
  "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "n", "θ": "o",
  "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "v", "ξ": "e", "ο": "o", "π": "p",
  "ρ": "p", "σ": "s", "ς": "s", "τ": "t", "υ": "y", "φ": "f", "χ": "x", "ψ": "p", "ω": "w",
  // Türkçe
  "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u",
  // genişletilmiş latin
  "à": "a", "á": "a", "â": "a", "ä": "a", "å": "a", "ã": "a",
  "è": "e", "é": "e", "ê": "e", "ë": "e",
  "ì": "i", "í": "i", "î": "i", "ï": "i",
  "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o",
  "ù": "u", "ú": "u", "û": "u",
  "ñ": "n", "ý": "y", "ÿ": "y", "æ": "ae", "œ": "oe", "ß": "ss",
};

/** Türkçe'ye duyarlı küçük harfe çevirme */
export function trLower(input: string): string {
  return input.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr-TR");
}

/**
 * Filtre karşılaştırması için kanonik biçim:
 * küçük harf → homoglif eşleme → aksan temizliği → yalnızca a-z0-9 → tekrar sadeleştirme
 */
export function normalizeForFilter(input: string): string {
  const lowered = trLower(input.normalize("NFKC"));

  let mapped = "";
  for (const ch of lowered) {
    mapped += HOMOGLYPHS[ch] ?? ch;
  }

  const deAccented = mapped.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const alnum = deAccented.replace(/[^a-z0-9]/g, "");
  // Ardışık tekrar eden harfleri teke indir: "kküüfüür" -> "kufur"
  return alnum.replace(/(.)\1+/g, "$1");
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 18;
const USERNAME_PATTERN = /^[A-Za-zÇĞİIÖŞÜçğıiöşü0-9_]+$/;

export type UsernameCheck =
  | { ok: true; username: string; usernameLower: string; normalized: string }
  | { ok: false; reason: string };

/** Biçimsel doğrulama (yasaklı kelime kontrolü ayrı adımda, veritabanı ile yapılır) */
export function validateUsernameShape(raw: string): UsernameCheck {
  const username = raw.trim().replace(/\s+/g, "");
  if (username.length < USERNAME_MIN)
    return { ok: false, reason: `Kullanıcı adı en az ${USERNAME_MIN} karakter olmalı.` };
  if (username.length > USERNAME_MAX)
    return { ok: false, reason: `Kullanıcı adı en fazla ${USERNAME_MAX} karakter olabilir.` };
  if (!USERNAME_PATTERN.test(username))
    return {
      ok: false,
      reason: "Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.",
    };
  const normalized = normalizeForFilter(username);
  if (normalized.length === 0)
    return { ok: false, reason: "Bu kullanıcı adı uygun değil." };
  return {
    ok: true,
    username,
    usernameLower: trLower(username),
    normalized,
  };
}

/**
 * Normalize edilmiş kullanıcı adı, yasaklı kelimelerden birini içeriyor mu?
 *
 * Kısa kelimeler (<= 3 karakter) yalnızca TAM eşleşmede yakalanır; aksi hâlde
 * "adam", "kamil", "salih" gibi masum adlar yanlışlıkla engellenirdi.
 * 4+ karakterli kelimeler alt dize olarak da aranır.
 */
export function containsBannedWord(
  normalizedUsername: string,
  bannedNormalized: string[],
): boolean {
  return bannedNormalized.some((w) => {
    if (!w) return false;
    if (w.length <= 3) return normalizedUsername === w;
    return normalizedUsername.includes(w);
  });
}

/** Sistem tarafından her zaman rezerve olan adlar */
export const SYSTEM_RESERVED = [
  "admin",
  "administrator",
  "yonetici",
  "hocaefendi",
  "hoca",
  "moderator",
  "sistem",
  "system",
  "root",
  "matematikmacerasi",
  "destek",
  "support",
  "null",
  "undefined",
];

/** Varsayılan yasaklı kelime listesi (Hocaefendi panelinden düzenlenebilir) */
export const DEFAULT_BANNED_WORDS = [
  "amk",
  "aq",
  "orospu",
  "piç",
  "yavşak",
  "sikerim",
  "sik",
  "göt",
  "am",
  "yarrak",
  "oç",
  "pezevenk",
  "gavat",
  "ibne",
  "puşt",
  "salak",
  "aptal",
  "gerizekalı",
  "mal",
  "şerefsiz",
  "hıyar",
  "fuck",
  "shit",
  "bitch",
  "dick",
  "porn",
  "sex",
  "nazi",
  "hitler",
];
