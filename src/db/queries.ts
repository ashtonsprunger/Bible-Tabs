import type { SQLiteDatabase } from "expo-sqlite";
import type {
  BlockKind,
  HeaderPayload,
  ParsedBlockRow,
  VerseRow,
  VerseSegment,
} from "../types";

export const TOTAL_BIBLE_BLOCKS = 41501;

export const BLOCK_FLAG_STANZA_BREAK = 1;
export const BLOCK_FLAG_CHAPTER_FIRST_CONTENT = 2;
export const BLOCK_FLAG_BOOK_START = 4;

interface RawBlockDbRow {
  id: number;
  book: number;
  chapter: number;
  verse: number;
  kind: BlockKind;
  flags: number;
  payload: string;
}

export function getTargetBlockIdSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  verse: number,
  preferExactVerseBlock = false
): { blockId: number; resolvedVerse: number } {
  const exact = db.getFirstSync<{
    verse: number;
    chapter_block_id: number;
    verse_block_id: number;
  }>(
    "SELECT verse, chapter_block_id, verse_block_id FROM verses WHERE book = ? AND chapter = ? AND verse >= ? ORDER BY verse ASC LIMIT 1",
    [book, chapter, verse]
  );

  if (exact) {
    const useChapterTop = exact.verse === 1 && !preferExactVerseBlock;
    return {
      blockId: useChapterTop ? exact.chapter_block_id : exact.verse_block_id,
      resolvedVerse: exact.verse,
    };
  }

  const chapterFallback = db.getFirstSync<{
    verse: number;
    chapter_block_id: number;
    verse_block_id: number;
  }>(
    "SELECT verse, chapter_block_id, verse_block_id FROM verses WHERE book = ? AND chapter = ? ORDER BY verse DESC LIMIT 1",
    [book, chapter]
  );

  if (chapterFallback) {
    return {
      blockId:
        verse <= 1
          ? chapterFallback.chapter_block_id
          : chapterFallback.verse_block_id,
      resolvedVerse: chapterFallback.verse,
    };
  }

  return { blockId: 1, resolvedVerse: 1 };
}

function parseBlockRow(raw: RawBlockDbRow): ParsedBlockRow {
  if (raw.kind === "header") {
    return {
      id: raw.id,
      book: raw.book,
      chapter: raw.chapter,
      verse: raw.verse,
      kind: raw.kind,
      flags: raw.flags,
      header: JSON.parse(raw.payload) as HeaderPayload,
    };
  }
  return {
    id: raw.id,
    book: raw.book,
    chapter: raw.chapter,
    verse: raw.verse,
    kind: raw.kind,
    flags: raw.flags,
    segments: JSON.parse(raw.payload) as VerseSegment[],
  };
}

export function getBlocksByIdRangeSync(
  db: SQLiteDatabase,
  startId: number,
  endId: number
): ParsedBlockRow[] {
  const clampedStart = Math.max(1, startId);
  const clampedEnd = Math.min(TOTAL_BIBLE_BLOCKS, endId);
  if (clampedStart > clampedEnd) {
    return [];
  }
  const rows = db.getAllSync<RawBlockDbRow>(
    "SELECT id, book, chapter, verse, kind, flags, payload FROM blocks WHERE id BETWEEN ? AND ? ORDER BY id ASC",
    [clampedStart, clampedEnd]
  );
  return rows.map(parseBlockRow);
}

export function getVerseDetailsSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  verse: number
): VerseRow | null {
  return (
    db.getFirstSync<VerseRow>(
      "SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes FROM verses WHERE book = ? AND chapter = ? AND verse = ?",
      [book, chapter, verse]
    ) ?? null
  );
}

function escapeLikePattern(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\\%_]/g, "\\$&");
}

export async function searchVersesAsync(
  db: SQLiteDatabase,
  query: string
): Promise<VerseRow[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const pattern = `%${escapeLikePattern(trimmed)}%`;
  const hasQuotes = /['"\u2018\u2019\u201C\u201D]/.test(trimmed);

  if (hasQuotes) {
    return db.getAllAsync<VerseRow>(
      `SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes
       FROM verses
       WHERE REPLACE(REPLACE(REPLACE(text, '’', ''''), '“', '"'), '”', '"') LIKE ? ESCAPE '\\'
          OR (superscription IS NOT NULL AND REPLACE(REPLACE(REPLACE(superscription, '’', ''''), '“', '"'), '”', '"') LIKE ? ESCAPE '\\')
       ORDER BY id ASC`,
      [pattern, pattern]
    );
  }

  return db.getAllAsync<VerseRow>(
    `SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes
     FROM verses
     WHERE text LIKE ? ESCAPE '\\'
        OR (superscription IS NOT NULL AND superscription LIKE ? ESCAPE '\\')
     ORDER BY id ASC`,
    [pattern, pattern]
  );
}
