import type { BibleReference, BookInfo } from "../types";

export const PSALMS_BOOK_INDEX = 18;

export const BOOK_USFM_CODES: readonly string[] = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT",
  "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH",
  "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER",
  "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON",
  "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL",
  "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT",
  "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN",
  "JUD", "REV",
] as const;

export const USFM_CODE_TO_BOOK_INDEX: Readonly<Record<string, number>> =
  Object.fromEntries(BOOK_USFM_CODES.map((code, idx) => [code, idx]));

export function getBookUsfmCode(bookIndex: number): string {
  return BOOK_USFM_CODES[bookIndex] ?? "GEN";
}

export function getChapterUsfmId(bookIndex: number, chapter: number): string {
  return `${getBookUsfmCode(bookIndex)}.${chapter}`;
}

export function parseUsfmVerseId(raw: string | undefined | null): BibleReference | null {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.trim().toUpperCase().split(".");
  if (parts.length < 3) return null;
  const book = USFM_CODE_TO_BOOK_INDEX[parts[0]];
  const chapter = Number.parseInt(parts[1], 10);
  const verse = Number.parseInt(parts[2], 10);
  if (
    book === undefined ||
    !Number.isFinite(chapter) ||
    chapter < 1 ||
    !Number.isFinite(verse) ||
    verse < 1
  ) {
    return null;
  }
  return { book, chapter, verse };
}

export function getAdjacentChapterRef(
  book: number,
  chapter: number,
  delta: -1 | 1
): BibleReference | null {
  const currentBook = BOOKS[book];
  if (!currentBook) return null;
  const nextChapter = chapter + delta;
  if (nextChapter >= 1 && nextChapter <= currentBook.chapters) {
    return { book, chapter: nextChapter, verse: 1 };
  }
  const nextBook = book + delta;
  if (nextBook < 0 || nextBook >= BOOKS.length) {
    return null;
  }
  return {
    book: nextBook,
    chapter: delta > 0 ? 1 : BOOKS[nextBook].chapters,
    verse: 1,
  };
}

export const BOOKS: readonly BookInfo[] = [
  { index: 0, book: "Genesis", chapters: 50, verses: 1533 },
  { index: 1, book: "Exodus", chapters: 40, verses: 1213 },
  { index: 2, book: "Leviticus", chapters: 27, verses: 859 },
  { index: 3, book: "Numbers", chapters: 36, verses: 1288 },
  { index: 4, book: "Deuteronomy", chapters: 34, verses: 959 },
  { index: 5, book: "Joshua", chapters: 24, verses: 658 },
  { index: 6, book: "Judges", chapters: 21, verses: 618 },
  { index: 7, book: "Ruth", chapters: 4, verses: 85 },
  { index: 8, book: "1 Samuel", chapters: 31, verses: 810 },
  { index: 9, book: "2 Samuel", chapters: 24, verses: 695 },
  { index: 10, book: "1 Kings", chapters: 22, verses: 816 },
  { index: 11, book: "2 Kings", chapters: 25, verses: 719 },
  { index: 12, book: "1 Chronicles", chapters: 29, verses: 942 },
  { index: 13, book: "2 Chronicles", chapters: 36, verses: 822 },
  { index: 14, book: "Ezra", chapters: 10, verses: 280 },
  { index: 15, book: "Nehemiah", chapters: 13, verses: 406 },
  { index: 16, book: "Esther", chapters: 10, verses: 167 },
  { index: 17, book: "Job", chapters: 42, verses: 1070 },
  { index: 18, book: "Psalms", chapters: 150, verses: 2461 },
  { index: 19, book: "Proverbs", chapters: 31, verses: 915 },
  { index: 20, book: "Ecclesiastes", chapters: 12, verses: 222 },
  { index: 21, book: "Song of Solomon", chapters: 8, verses: 117 },
  { index: 22, book: "Isaiah", chapters: 66, verses: 1292 },
  { index: 23, book: "Jeremiah", chapters: 52, verses: 1364 },
  { index: 24, book: "Lamentations", chapters: 5, verses: 154 },
  { index: 25, book: "Ezekiel", chapters: 48, verses: 1273 },
  { index: 26, book: "Daniel", chapters: 12, verses: 357 },
  { index: 27, book: "Hosea", chapters: 14, verses: 197 },
  { index: 28, book: "Joel", chapters: 3, verses: 73 },
  { index: 29, book: "Amos", chapters: 9, verses: 146 },
  { index: 30, book: "Obadiah", chapters: 1, verses: 21 },
  { index: 31, book: "Jonah", chapters: 4, verses: 48 },
  { index: 32, book: "Micah", chapters: 7, verses: 105 },
  { index: 33, book: "Nahum", chapters: 3, verses: 47 },
  { index: 34, book: "Habakkuk", chapters: 3, verses: 56 },
  { index: 35, book: "Zephaniah", chapters: 3, verses: 53 },
  { index: 36, book: "Haggai", chapters: 2, verses: 38 },
  { index: 37, book: "Zechariah", chapters: 14, verses: 211 },
  { index: 38, book: "Malachi", chapters: 4, verses: 55 },
  { index: 39, book: "Matthew", chapters: 28, verses: 1068 },
  { index: 40, book: "Mark", chapters: 16, verses: 673 },
  { index: 41, book: "Luke", chapters: 24, verses: 1149 },
  { index: 42, book: "John", chapters: 21, verses: 878 },
  { index: 43, book: "Acts", chapters: 28, verses: 1003 },
  { index: 44, book: "Romans", chapters: 16, verses: 432 },
  { index: 45, book: "1 Corinthians", chapters: 16, verses: 437 },
  { index: 46, book: "2 Corinthians", chapters: 13, verses: 257 },
  { index: 47, book: "Galatians", chapters: 6, verses: 149 },
  { index: 48, book: "Ephesians", chapters: 6, verses: 155 },
  { index: 49, book: "Philippians", chapters: 4, verses: 104 },
  { index: 50, book: "Colossians", chapters: 4, verses: 95 },
  { index: 51, book: "1 Thessalonians", chapters: 5, verses: 89 },
  { index: 52, book: "2 Thessalonians", chapters: 3, verses: 47 },
  { index: 53, book: "1 Timothy", chapters: 6, verses: 113 },
  { index: 54, book: "2 Timothy", chapters: 4, verses: 83 },
  { index: 55, book: "Titus", chapters: 3, verses: 46 },
  { index: 56, book: "Philemon", chapters: 1, verses: 25 },
  { index: 57, book: "Hebrews", chapters: 13, verses: 303 },
  { index: 58, book: "James", chapters: 5, verses: 108 },
  { index: 59, book: "1 Peter", chapters: 5, verses: 105 },
  { index: 60, book: "2 Peter", chapters: 3, verses: 61 },
  { index: 61, book: "1 John", chapters: 5, verses: 105 },
  { index: 62, book: "2 John", chapters: 1, verses: 13 },
  { index: 63, book: "3 John", chapters: 1, verses: 14 },
  { index: 64, book: "Jude", chapters: 1, verses: 25 },
  { index: 65, book: "Revelation", chapters: 22, verses: 404 },
] as const;

const BOOK_ALIASES: Readonly<Record<string, number>> = {
  gen: 0,
  gn: 0,
  ex: 1,
  exo: 1,
  exod: 1,
  lev: 2,
  lv: 2,
  num: 3,
  nm: 3,
  deut: 4,
  dt: 4,
  josh: 5,
  judg: 6,
  jdg: 6,
  ru: 7,
  "1sam": 8,
  "1sm": 8,
  "2sam": 9,
  "2sm": 9,
  "1kgs": 10,
  "1ki": 10,
  "2kgs": 11,
  "2ki": 11,
  "1chr": 12,
  "1ch": 12,
  "2chr": 13,
  "2ch": 13,
  ezr: 14,
  neh: 15,
  est: 16,
  esth: 16,
  jb: 17,
  ps: 18,
  psa: 18,
  psalm: 18,
  psalms: 18,
  psm: 18,
  prov: 19,
  prv: 19,
  pr: 19,
  eccl: 20,
  ecc: 20,
  song: 21,
  sos: 21,
  songofsongs: 21,
  songofsolomon: 21,
  isa: 22,
  is: 22,
  jer: 23,
  lam: 24,
  ezek: 25,
  ezk: 25,
  dan: 26,
  dn: 26,
  hos: 27,
  jl: 28,
  am: 29,
  obad: 30,
  ob: 30,
  jon: 31,
  jnh: 31,
  mic: 32,
  nah: 33,
  hab: 34,
  zeph: 35,
  zep: 35,
  hag: 36,
  zech: 37,
  zec: 37,
  mal: 38,
  matt: 39,
  mt: 39,
  mat: 39,
  mk: 40,
  mrk: 40,
  lk: 41,
  luk: 41,
  jn: 42,
  jhn: 42,
  act: 43,
  ac: 43,
  rom: 44,
  rm: 44,
  "1cor": 45,
  "1co": 45,
  "2cor": 46,
  "2co": 46,
  gal: 47,
  eph: 48,
  phil: 49,
  php: 49,
  col: 50,
  "1thess": 51,
  "1th": 51,
  "2thess": 52,
  "2th": 52,
  "1tim": 53,
  "1ti": 53,
  "2tim": 54,
  "2ti": 54,
  tit: 55,
  phlm: 56,
  phm: 56,
  heb: 57,
  jas: 58,
  jam: 58,
  jm: 58,
  "1pet": 59,
  "1pe": 59,
  "1pt": 59,
  "2pet": 60,
  "2pe": 60,
  "2pt": 60,
  "1jn": 61,
  "1jhn": 61,
  "2jn": 62,
  "2jhn": 62,
  "3jn": 63,
  "3jhn": 63,
  jud: 64,
  rev: 65,
  rv: 65,
  revelations: 65,
};

/**
 * Singular book name when referring to a specific chapter/Psalm ("Psalm" instead of "Psalms").
 */
export function getChapterBookName(bookIndex: number): string {
  if (bookIndex === PSALMS_BOOK_INDEX) {
    return "Psalm";
  }
  return BOOKS[bookIndex]?.book ?? "Genesis";
}

/**
 * Formats a chapter-level label for tab titles, placeholders, and headings:
 * - Psalms -> "Psalm 23"
 * - Single-chapter books -> "Jude", "Philemon", etc.
 * - All others -> "Romans 8"
 */
export function formatChapterLabel(bookIndex: number, chapter: number): string {
  const info = BOOKS[bookIndex];
  if (!info) {
    return "Genesis 1";
  }
  if (info.chapters === 1) {
    return info.book;
  }
  return `${getChapterBookName(bookIndex)} ${chapter}`;
}

/**
 * Formats a verse-level citation for search results, copy, and share:
 * - Psalms -> "Psalm 23:1"
 * - Single-chapter books -> "Jude 1:3"
 * - All others -> "John 3:16"
 */
export function formatVerseCitation(
  bookIndex: number,
  chapter: number,
  verse: number
): string {
  return `${getChapterBookName(bookIndex)} ${chapter}:${verse}`;
}

export function makeVerseKey(
  book: number,
  chapter: number,
  verse: number
): string {
  return `${book},${chapter},${verse}`;
}

export function compareBibleRefs(a: BibleReference, b: BibleReference): number {
  return a.book - b.book || a.chapter - b.chapter || a.verse - b.verse;
}

export function formatVerseRangeCitation(
  bookIndex: number,
  chapter: number,
  startVerse: number,
  endVerse: number
): string {
  if (endVerse <= startVerse) {
    return formatVerseCitation(bookIndex, chapter, startVerse);
  }
  return `${getChapterBookName(bookIndex)} ${chapter}:${startVerse}–${endVerse}`;
}

/**
 * Formats an arbitrary set of selected verses cleanly:
 * - Single verse: "John 3:16"
 * - Contiguous range in one chapter: "John 3:16–18"
 * - Non-contiguous in one chapter: "John 3:16, 18–19"
 * - Cross-chapter in one book: "John 3:36–4:2" (if contiguous) or "John 3:36; 4:2"
 * - Cross-book: "John 3:16; Romans 8:28"
 */
export function formatMultiVerseCitation(verses: BibleReference[]): string {
  if (verses.length === 0) {
    return "";
  }
  const sorted = [...verses].sort(compareBibleRefs);
  if (sorted.length === 1) {
    return formatVerseCitation(sorted[0].book, sorted[0].chapter, sorted[0].verse);
  }

  // Group by book -> chapter -> sorted unique verse numbers
  const byChapter = new Map<string, { book: number; chapter: number; nums: number[] }>();
  for (const ref of sorted) {
    const key = `${ref.book},${ref.chapter}`;
    let group = byChapter.get(key);
    if (!group) {
      group = { book: ref.book, chapter: ref.chapter, nums: [] };
      byChapter.set(key, group);
    }
    if (group.nums[group.nums.length - 1] !== ref.verse) {
      group.nums.push(ref.verse);
    }
  }

  const formatNumRuns = (nums: number[]): string => {
    const runs: string[] = [];
    let start = nums[0];
    let prev = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === prev + 1) {
        prev = nums[i];
      } else {
        runs.push(start === prev ? `${start}` : `${start}–${prev}`);
        start = nums[i];
        prev = nums[i];
      }
    }
    runs.push(start === prev ? `${start}` : `${start}–${prev}`);
    return runs.join(", ");
  };

  const groups = [...byChapter.values()];
  if (groups.length === 1) {
    const g = groups[0];
    return `${getChapterBookName(g.book)} ${g.chapter}:${formatNumRuns(g.nums)}`;
  }

  const parts: string[] = [];
  let prevBook = -1;
  for (const g of groups) {
    const versePart = formatNumRuns(g.nums);
    if (g.book === prevBook) {
      parts.push(`${g.chapter}:${versePart}`);
    } else {
      parts.push(`${getChapterBookName(g.book)} ${g.chapter}:${versePart}`);
      prevBook = g.book;
    }
  }
  return parts.join("; ");
}

export function getGotQuestionsBookUrl(bookIndex: number): string {
  const bookName = BOOKS[bookIndex]?.book ?? "Genesis";
  const slug = bookName.split(" ").join("-");
  return `https://www.gotquestions.org/book-of-${slug}.html`;
}

export function parseReference(raw: string | undefined | null): BibleReference {
  if (!raw || typeof raw !== "string") {
    return { book: 0, chapter: 1, verse: 1 };
  }
  const parts = raw.split(",");
  const rawBook = Number.parseInt(parts[0] ?? "0", 10);
  const book = Number.isFinite(rawBook)
    ? Math.max(0, Math.min(BOOKS.length - 1, rawBook))
    : 0;

  const maxChapters = BOOKS[book].chapters;
  const rawChapter = Number.parseInt(parts[1] ?? "1", 10);
  const chapter = Number.isFinite(rawChapter)
    ? Math.max(1, Math.min(maxChapters, rawChapter))
    : 1;

  const rawVerse = Number.parseInt(parts[2] ?? "1", 10);
  const verse = Number.isFinite(rawVerse) && rawVerse >= 1 ? rawVerse : 1;

  return { book, chapter, verse };
}

export function formatReference(ref: BibleReference): string {
  return `${ref.book},${ref.chapter},${ref.verse}`;
}

export interface ParsedHumanReference {
  ref: BibleReference;
  hasExplicitNumber: boolean;
  hasExplicitVerse: boolean;
  label: string;
}

function resolveBookToken(rawBook: string): number | null {
  const normalized = rawBook
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/^iii\s+/, "3")
    .replace(/^ii\s+/, "2")
    .replace(/^i\s+/, "1")
    .replace(/^first\s+/, "1")
    .replace(/^second\s+/, "2")
    .replace(/^third\s+/, "3")
    .replace(/\s+/g, "");

  if (!normalized) {
    return null;
  }

  const aliasHit = BOOK_ALIASES[normalized];
  if (aliasHit !== undefined) {
    return aliasHit;
  }

  // Exact match on normalized full book name
  for (const b of BOOKS) {
    const cleanName = b.book.toLowerCase().replace(/\s+/g, "");
    if (cleanName === normalized) {
      return b.index;
    }
  }

  // Prefix match when user typed at least 3 chars (e.g. "rom", "phil", "1cor")
  if (normalized.length >= 3) {
    for (const b of BOOKS) {
      const cleanName = b.book.toLowerCase().replace(/\s+/g, "");
      if (cleanName.startsWith(normalized)) {
        return b.index;
      }
    }
  }

  return null;
}

/**
 * Parses natural human references like "John 3:16", "ps 23", "1 cor 13:4", "jude 3".
 */
export function parseHumanReference(input: string): ParsedHumanReference | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^((?:[123]|i{1,3}|first|second|third)?\s*[a-zA-Z][a-zA-Z.\s]*?)(?:\s+(\d+)(?:\s*[:.,\s]\s*(\d+))?)?$/i
  );
  if (!match) {
    return null;
  }

  const bookPart = match[1] ?? "";
  const firstNumRaw = match[2];
  const secondNumRaw = match[3];

  // If no chapter/verse number is given, require at least 3 characters or an exact full name (avoid matching "is", "am", etc. as bare word searches)
  const bookIndex = resolveBookToken(bookPart);
  if (bookIndex === null) {
    return null;
  }

  const bookInfo = BOOKS[bookIndex];
  if (!firstNumRaw) {
    const cleanBook = bookInfo.book.toLowerCase().replace(/\s+/g, "");
    const cleanTyped = bookPart.toLowerCase().replace(/[\s.]+/g, "");
    const isPsalmSingular =
      bookIndex === PSALMS_BOOK_INDEX && cleanTyped === "psalm";
    if (cleanTyped.length < 3 || (!cleanBook.startsWith(cleanTyped) && !isPsalmSingular)) {
      return null;
    }

    const ref: BibleReference = { book: bookIndex, chapter: 1, verse: 1 };
    return {
      ref,
      hasExplicitNumber: false,
      hasExplicitVerse: false,
      label: formatChapterLabel(bookIndex, 1),
    };
  }

  const firstNum = Number.parseInt(firstNumRaw, 10);
  if (!Number.isFinite(firstNum) || firstNum < 1) {
    return null;
  }

  // Single-chapter book convenience: "Jude 3" -> Jude 1:3
  if (bookInfo.chapters === 1 && !secondNumRaw && firstNum > 1) {
    if (firstNum > bookInfo.verses) {
      return null;
    }
    const ref: BibleReference = { book: bookIndex, chapter: 1, verse: firstNum };
    return {
      ref,
      hasExplicitNumber: true,
      hasExplicitVerse: true,
      label: formatVerseCitation(bookIndex, 1, firstNum),
    };
  }

  if (firstNum > bookInfo.chapters) {
    return null;
  }

  if (secondNumRaw) {
    const verseNum = Number.parseInt(secondNumRaw, 10);
    if (!Number.isFinite(verseNum) || verseNum < 1) {
      return null;
    }
    const ref: BibleReference = {
      book: bookIndex,
      chapter: firstNum,
      verse: verseNum,
    };
    return {
      ref,
      hasExplicitNumber: true,
      hasExplicitVerse: true,
      label: formatVerseCitation(bookIndex, firstNum, verseNum),
    };
  }

  const ref: BibleReference = { book: bookIndex, chapter: firstNum, verse: 1 };
  return {
    ref,
    hasExplicitNumber: true,
    hasExplicitVerse: false,
    label: formatChapterLabel(bookIndex, firstNum),
  };
}
