import type { SQLiteDatabase } from "expo-sqlite";
import type { VerseRow } from "../types";

export const TOTAL_BIBLE_VERSES = 31101;

export function getVerseIdSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  verse: number
): number {
  const exact = db.getFirstSync<{ id: number }>(
    "SELECT id FROM verses WHERE book = ? AND chapter = ? AND verse = ?",
    [book, chapter, verse]
  );
  if (exact) {
    return exact.id;
  }

  const chapterStart = db.getFirstSync<{ id: number }>(
    "SELECT id FROM verses WHERE book = ? AND chapter = ? ORDER BY verse ASC LIMIT 1",
    [book, chapter]
  );
  return chapterStart?.id ?? 1;
}

export function getVersesByIdRangeSync(
  db: SQLiteDatabase,
  startId: number,
  endId: number
): VerseRow[] {
  const clampedStart = Math.max(1, startId);
  const clampedEnd = Math.min(TOTAL_BIBLE_VERSES, endId);
  if (clampedStart > clampedEnd) {
    return [];
  }
  return db.getAllSync<VerseRow>(
    "SELECT id, book, chapter, verse, text FROM verses WHERE id BETWEEN ? AND ? ORDER BY id ASC",
    [clampedStart, clampedEnd]
  );
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, "\\$&");
}

export async function searchVersesAsync(
  db: SQLiteDatabase,
  query: string
): Promise<VerseRow[]> {
  if (!query) {
    return [];
  }
  const pattern = `%${escapeLikePattern(query)}%`;
  return db.getAllAsync<VerseRow>(
    "SELECT id, book, chapter, verse, text FROM verses WHERE text LIKE ? ESCAPE '\\' ORDER BY id ASC",
    [pattern]
  );
}
