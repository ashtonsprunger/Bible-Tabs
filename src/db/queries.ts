import type { SQLiteDatabase } from "expo-sqlite";
import type {
  BibleReference,
  BlockKind,
  HeaderPayload,
  ParsedBlockRow,
  VerseRow,
  VerseSegment,
} from "../types";

export const FALLBACK_TOTAL_BIBLE_BLOCKS = 41501;

export const BLOCK_FLAG_STANZA_BREAK = 1;
export const BLOCK_FLAG_CHAPTER_FIRST_CONTENT = 2;
export const BLOCK_FLAG_BOOK_START = 4;

const totalBlocksCache = new WeakMap<SQLiteDatabase, number>();

export function getTotalBlocksSync(db: SQLiteDatabase): number {
  const cached = totalBlocksCache.get(db);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const metaRow = db.getFirstSync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'total_blocks'"
    );
    const parsed = metaRow ? Number.parseInt(metaRow.value, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      totalBlocksCache.set(db, parsed);
      return parsed;
    }
    const maxRow = db.getFirstSync<{ max_id: number }>(
      "SELECT MAX(id) as max_id FROM blocks"
    );
    const fallback =
      maxRow && Number.isFinite(maxRow.max_id) && maxRow.max_id > 0
        ? maxRow.max_id
        : FALLBACK_TOTAL_BIBLE_BLOCKS;
    totalBlocksCache.set(db, fallback);
    return fallback;
  } catch {
    return FALLBACK_TOTAL_BIBLE_BLOCKS;
  }
}

export async function getTotalBlocksAsync(db: SQLiteDatabase): Promise<number> {
  const cached = totalBlocksCache.get(db);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const metaRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'total_blocks'"
    );
    const parsed = metaRow ? Number.parseInt(metaRow.value, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      totalBlocksCache.set(db, parsed);
      return parsed;
    }
    const maxRow = await db.getFirstAsync<{ max_id: number }>(
      "SELECT MAX(id) as max_id FROM blocks"
    );
    const fallback =
      maxRow && Number.isFinite(maxRow.max_id) && maxRow.max_id > 0
        ? maxRow.max_id
        : FALLBACK_TOTAL_BIBLE_BLOCKS;
    totalBlocksCache.set(db, fallback);
    return fallback;
  } catch {
    return FALLBACK_TOTAL_BIBLE_BLOCKS;
  }
}

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
  const totalBlocks = getTotalBlocksSync(db);
  const clampedStart = Math.max(1, startId);
  const clampedEnd = Math.min(totalBlocks, endId);
  if (clampedStart > clampedEnd) {
    return [];
  }
  const rows = db.getAllSync<RawBlockDbRow>(
    "SELECT id, book, chapter, verse, kind, flags, payload FROM blocks WHERE id BETWEEN ? AND ? ORDER BY id ASC",
    [clampedStart, clampedEnd]
  );
  return rows.map(parseBlockRow);
}

export function getChapterBlocksSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number
): ParsedBlockRow[] {
  const rows = db.getAllSync<RawBlockDbRow>(
    "SELECT id, book, chapter, verse, kind, flags, payload FROM blocks WHERE book = ? AND chapter = ? ORDER BY id ASC",
    [book, chapter]
  );
  return rows.map(parseBlockRow);
}

export async function getChapterBlocksAsync(
  db: SQLiteDatabase,
  book: number,
  chapter: number
): Promise<ParsedBlockRow[]> {
  const rows = await db.getAllAsync<RawBlockDbRow>(
    "SELECT id, book, chapter, verse, kind, flags, payload FROM blocks WHERE book = ? AND chapter = ? ORDER BY id ASC",
    [book, chapter]
  );
  return rows.map(parseBlockRow);
}

export function getChapterFootnotesSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number
): Array<{ verse: number; text: string }> {
  const rows = db.getAllSync<{ verse: number; footnotes: string }>(
    "SELECT verse, footnotes FROM verses WHERE book = ? AND chapter = ? AND footnotes IS NOT NULL AND LENGTH(TRIM(footnotes)) > 0 ORDER BY verse ASC",
    [book, chapter]
  );
  return rows.map((r) => ({ verse: r.verse, text: r.footnotes.trim() }));
}

export async function getChapterFootnotesAsync(
  db: SQLiteDatabase,
  book: number,
  chapter: number
): Promise<Array<{ verse: number; text: string }>> {
  const rows = await db.getAllAsync<{ verse: number; footnotes: string }>(
    "SELECT verse, footnotes FROM verses WHERE book = ? AND chapter = ? AND footnotes IS NOT NULL AND LENGTH(TRIM(footnotes)) > 0 ORDER BY verse ASC",
    [book, chapter]
  );
  return rows.map((r) => ({ verse: r.verse, text: r.footnotes.trim() }));
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

export function getVersesRangeSync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  startVerse: number,
  endVerse: number
): VerseRow[] {
  const lo = Math.min(startVerse, endVerse);
  const hi = Math.max(startVerse, endVerse);
  return db.getAllSync<VerseRow>(
    "SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes FROM verses WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse ASC",
    [book, chapter, lo, hi]
  );
}

export function getVersesByRefsSync(
  db: SQLiteDatabase,
  refs: BibleReference[]
): VerseRow[] {
  const out: VerseRow[] = [];
  for (const ref of refs) {
    const row = getVerseDetailsSync(db, ref.book, ref.chapter, ref.verse);
    if (row) {
      out.push(row);
    }
  }
  return out;
}

export async function getTargetBlockIdAsync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  verse: number,
  preferExactVerseBlock = false
): Promise<{ blockId: number; resolvedVerse: number }> {
  const exact = await db.getFirstAsync<{
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

  const chapterFallback = await db.getFirstAsync<{
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

export async function getBlocksByIdRangeAsync(
  db: SQLiteDatabase,
  startId: number,
  endId: number
): Promise<ParsedBlockRow[]> {
  const totalBlocks = await getTotalBlocksAsync(db);
  const clampedStart = Math.max(1, startId);
  const clampedEnd = Math.min(totalBlocks, endId);
  if (clampedStart > clampedEnd) {
    return [];
  }
  const rows = await db.getAllAsync<RawBlockDbRow>(
    "SELECT id, book, chapter, verse, kind, flags, payload FROM blocks WHERE id BETWEEN ? AND ? ORDER BY id ASC",
    [clampedStart, clampedEnd]
  );
  return rows.map(parseBlockRow);
}

export async function getVersesRangeAsync(
  db: SQLiteDatabase,
  book: number,
  chapter: number,
  startVerse: number,
  endVerse: number
): Promise<VerseRow[]> {
  const lo = Math.min(startVerse, endVerse);
  const hi = Math.max(startVerse, endVerse);
  return db.getAllAsync<VerseRow>(
    "SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes FROM verses WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse ASC",
    [book, chapter, lo, hi]
  );
}

export async function getVersesByRefsAsync(
  db: SQLiteDatabase,
  refs: BibleReference[]
): Promise<VerseRow[]> {
  const out: VerseRow[] = [];
  for (const ref of refs) {
    const row = await db.getFirstAsync<VerseRow>(
      "SELECT id, book, chapter, verse, chapter_block_id, verse_block_id, text, superscription, footnotes FROM verses WHERE book = ? AND chapter = ? AND verse = ?",
      [ref.book, ref.chapter, ref.verse]
    );
    if (row) {
      out.push(row);
    }
  }
  return out;
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
