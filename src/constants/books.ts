import type { BibleReference, BookInfo } from "../types";

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
  { index: 39, book: "Matthew", chapters: 28, verses: 1071 },
  { index: 40, book: "Mark", chapters: 16, verses: 678 },
  { index: 41, book: "Luke", chapters: 24, verses: 1151 },
  { index: 42, book: "John", chapters: 21, verses: 879 },
  { index: 43, book: "Acts", chapters: 28, verses: 1007 },
  { index: 44, book: "Romans", chapters: 16, verses: 433 },
  { index: 45, book: "1 Corinthians", chapters: 16, verses: 437 },
  { index: 46, book: "2 Corinthians", chapters: 13, verses: 257 },
  { index: 47, book: "Galatians", chapters: 6, verses: 149 },
  { index: 48, book: "Ephesians", chapters: 6, verses: 155 },
  { index: 49, book: "Philippians", chapters: 4, verses: 104 },
  { index: 50, book: "Colossians", chapters: 4, verses: 95 },
  { index: 51, book: "1 Thessalonians", chapters: 5, verses: 89 },
  { index: 52, book: "2 Thessalonians", chapters: 3, verses: 47 },
  { index: 53, book: "1 Timothy", chapters: 6, verses: 133 },
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

export function getPreviousChapter(
  book: number,
  chapter: number
): { book: number; chapter: number } | null {
  if (book === 0 && chapter === 1) {
    return null;
  }
  if (chapter > 1) {
    return { book, chapter: chapter - 1 };
  }
  const prevBook = book - 1;
  return { book: prevBook, chapter: BOOKS[prevBook].chapters };
}

export function getNextChapter(
  book: number,
  chapter: number
): { book: number; chapter: number } | null {
  if (book === BOOKS.length - 1 && chapter >= BOOKS[book].chapters) {
    return null;
  }
  if (chapter < BOOKS[book].chapters) {
    return { book, chapter: chapter + 1 };
  }
  return { book: book + 1, chapter: 1 };
}
