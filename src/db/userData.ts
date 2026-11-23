import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { HIGHLIGHT_COLORS } from "../constants/colors";
import type {
  HighlightColor,
  HighlightRecord,
  NoteRecord,
} from "../types";

export const USER_DATA_DB_NAME = "user_data_v1.db";
const WEB_HIGHLIGHTS_KEY = "bible_tabs_user_highlights_v1";
const WEB_NOTES_KEY = "bible_tabs_user_notes_v1";

let userDb: SQLite.SQLiteDatabase | null = null;

function isValidHighlightColor(value: unknown): value is HighlightColor {
  return (
    typeof value === "string" &&
    (HIGHLIGHT_COLORS as readonly string[]).includes(value)
  );
}

function getUserDb(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === "web") {
    return null;
  }
  if (userDb) {
    return userDb;
  }
  const db = SQLite.openDatabaseSync(USER_DATA_DB_NAME);
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS highlights (
      book INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (book, chapter, verse)
    );
    CREATE INDEX IF NOT EXISTS idx_highlights_book_chapter
      ON highlights (book, chapter);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      book INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      start_verse INTEGER NOT NULL,
      end_verse INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_book_chapter
      ON notes (book, chapter);
  `);
  userDb = db;
  return db;
}

function readWebArray<T>(key: string): T[] {
  try {
    if (typeof localStorage === "undefined") {
      return [];
    }
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeWebArray<T>(key: string, items: T[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(items));
    }
  } catch (err) {
    console.warn("Web study storage write failed:", err);
  }
}

export function loadAllStudyDataSync(): {
  highlights: HighlightRecord[];
  notes: NoteRecord[];
} {
  const db = getUserDb();
  if (!db) {
    const highlights = readWebArray<HighlightRecord>(WEB_HIGHLIGHTS_KEY).filter(
      (h) =>
        Number.isInteger(h?.book) &&
        Number.isInteger(h?.chapter) &&
        Number.isInteger(h?.verse) &&
        isValidHighlightColor(h?.color)
    );
    const notes = readWebArray<NoteRecord>(WEB_NOTES_KEY).filter(
      (n) =>
        typeof n?.id === "string" &&
        Number.isInteger(n?.book) &&
        Number.isInteger(n?.chapter) &&
        Number.isInteger(n?.startVerse) &&
        Number.isInteger(n?.endVerse) &&
        typeof n?.body === "string"
    );
    return { highlights, notes };
  }

  const rawHighlights = db.getAllSync<{
    book: number;
    chapter: number;
    verse: number;
    color: string;
    created_at: number;
    updated_at: number;
  }>(
    "SELECT book, chapter, verse, color, created_at, updated_at FROM highlights"
  );

  const highlights: HighlightRecord[] = [];
  for (const row of rawHighlights) {
    if (!isValidHighlightColor(row.color)) continue;
    highlights.push({
      book: row.book,
      chapter: row.chapter,
      verse: row.verse,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  const rawNotes = db.getAllSync<{
    id: string;
    book: number;
    chapter: number;
    start_verse: number;
    end_verse: number;
    body: string;
    created_at: number;
    updated_at: number;
  }>(
    "SELECT id, book, chapter, start_verse, end_verse, body, created_at, updated_at FROM notes"
  );

  const notes: NoteRecord[] = rawNotes.map((row) => ({
    id: row.id,
    book: row.book,
    chapter: row.chapter,
    startVerse: row.start_verse,
    endVerse: row.end_verse,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { highlights, notes };
}

export function persistHighlightBatchSync(
  upserts: HighlightRecord[],
  deletes: Array<{ book: number; chapter: number; verse: number }>,
  allHighlightsForWeb?: HighlightRecord[]
): void {
  const db = getUserDb();
  if (!db) {
    if (allHighlightsForWeb) {
      writeWebArray(WEB_HIGHLIGHTS_KEY, allHighlightsForWeb);
    }
    return;
  }

  db.withTransactionSync(() => {
    for (const h of upserts) {
      db.runSync(
        `INSERT INTO highlights (book, chapter, verse, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(book, chapter, verse) DO UPDATE SET
           color = excluded.color,
           updated_at = excluded.updated_at`,
        [h.book, h.chapter, h.verse, h.color, h.createdAt, h.updatedAt]
      );
    }
    for (const d of deletes) {
      db.runSync(
        "DELETE FROM highlights WHERE book = ? AND chapter = ? AND verse = ?",
        [d.book, d.chapter, d.verse]
      );
    }
  });
}

export function persistUpsertNoteSync(
  note: NoteRecord,
  allNotesForWeb?: NoteRecord[]
): void {
  const db = getUserDb();
  if (!db) {
    if (allNotesForWeb) {
      writeWebArray(WEB_NOTES_KEY, allNotesForWeb);
    }
    return;
  }

  db.runSync(
    `INSERT INTO notes (id, book, chapter, start_verse, end_verse, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       book = excluded.book,
       chapter = excluded.chapter,
       start_verse = excluded.start_verse,
       end_verse = excluded.end_verse,
       body = excluded.body,
       updated_at = excluded.updated_at`,
    [
      note.id,
      note.book,
      note.chapter,
      note.startVerse,
      note.endVerse,
      note.body,
      note.createdAt,
      note.updatedAt,
    ]
  );
}

export function persistDeleteNoteSync(
  noteId: string,
  allNotesForWeb?: NoteRecord[]
): void {
  const db = getUserDb();
  if (!db) {
    if (allNotesForWeb) {
      writeWebArray(WEB_NOTES_KEY, allNotesForWeb);
    }
    return;
  }

  db.runSync("DELETE FROM notes WHERE id = ?", [noteId]);
}

export function persistReplaceAllStudyDataSync(
  highlights: HighlightRecord[],
  notes: NoteRecord[]
): void {
  const db = getUserDb();
  if (!db) {
    writeWebArray(WEB_HIGHLIGHTS_KEY, highlights);
    writeWebArray(WEB_NOTES_KEY, notes);
    return;
  }

  db.withTransactionSync(() => {
    for (const h of highlights) {
      db.runSync(
        `INSERT INTO highlights (book, chapter, verse, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(book, chapter, verse) DO UPDATE SET
           color = excluded.color,
           updated_at = excluded.updated_at`,
        [h.book, h.chapter, h.verse, h.color, h.createdAt, h.updatedAt]
      );
    }
    for (const n of notes) {
      db.runSync(
        `INSERT INTO notes (id, book, chapter, start_verse, end_verse, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           book = excluded.book,
           chapter = excluded.chapter,
           start_verse = excluded.start_verse,
           end_verse = excluded.end_verse,
           body = excluded.body,
           updated_at = excluded.updated_at`,
        [
          n.id,
          n.book,
          n.chapter,
          n.startVerse,
          n.endVerse,
          n.body,
          n.createdAt,
          n.updatedAt,
        ]
      );
    }
  });
}
