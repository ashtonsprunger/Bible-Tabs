import type { SQLiteDatabase } from "expo-sqlite";
import type { VerseRow } from "../types";

export function getChapterVersesSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number
): VerseRow[] {
  return db.getAllSync<VerseRow>(
    "SELECT book, chapter, verse, text FROM verses WHERE book = ? AND chapter = ? ORDER BY verse ASC",
    [book, chapter]
  );
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, "\\$&");
}

export async function searchVersesAsync(
  db: SQLiteDatabase,
  query: string
): Promise<VerseRow[]> {
  const trimmed = query;
  if (!trimmed) {
    return [];
  }
  const pattern = `%${escapeLikePattern(trimmed)}%`;
  return db.getAllAsync<VerseRow>(
    "SELECT book, chapter, verse, text FROM verses WHERE text LIKE ? ESCAPE '\\' ORDER BY id ASC",
    [pattern]
  );
}
