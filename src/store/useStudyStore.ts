import { create } from "zustand";
import { BOOKS, makeVerseKey } from "../constants/books";
import { HIGHLIGHT_COLORS } from "../constants/colors";
import {
  loadAllStudyDataSync,
  persistDeleteNoteSync,
  persistHighlightBatchSync,
  persistReplaceAllStudyDataSync,
  persistUpsertNoteSync,
} from "../db/userData";
import type {
  BackupPayload,
  BibleReference,
  HighlightColor,
  HighlightRecord,
  NoteRecord,
} from "../types";

let noteCounter = 1;
function makeNoteId(): string {
  return `note_${Date.now()}_${noteCounter++}`;
}

function isValidHighlightColor(val: unknown): val is HighlightColor {
  return (
    typeof val === "string" &&
    (HIGHLIGHT_COLORS as readonly string[]).includes(val)
  );
}

function buildIndices(
  highlights: HighlightRecord[],
  notes: NoteRecord[]
): {
  highlightsByKey: Record<string, HighlightRecord>;
  notesById: Record<string, NoteRecord>;
  noteIdsByVerseKey: Record<string, string[]>;
} {
  const highlightsByKey: Record<string, HighlightRecord> = {};
  for (const h of highlights) {
    highlightsByKey[makeVerseKey(h.book, h.chapter, h.verse)] = h;
  }

  const notesById: Record<string, NoteRecord> = {};
  const noteIdsByVerseKey: Record<string, string[]> = {};
  for (const n of notes) {
    notesById[n.id] = n;
    const lo = Math.min(n.startVerse, n.endVerse);
    const hi = Math.max(n.startVerse, n.endVerse);
    for (let v = lo; v <= hi; v++) {
      const k = makeVerseKey(n.book, n.chapter, v);
      if (!noteIdsByVerseKey[k]) {
        noteIdsByVerseKey[k] = [];
      }
      noteIdsByVerseKey[k].push(n.id);
    }
  }

  return { highlightsByKey, notesById, noteIdsByVerseKey };
}

function loadInitialStudyState() {
  try {
    const { highlights, notes } = loadAllStudyDataSync();
    return {
      ...buildIndices(highlights, notes),
      revision: 1,
    };
  } catch (err) {
    console.warn("Failed to hydrate study data:", err);
    return {
      highlightsByKey: {} as Record<string, HighlightRecord>,
      notesById: {} as Record<string, NoteRecord>,
      noteIdsByVerseKey: {} as Record<string, string[]>,
      revision: 1,
    };
  }
}

export interface StudyImportSummary {
  highlightsImported: number;
  notesImported: number;
}

export interface StudyState {
  highlightsByKey: Record<string, HighlightRecord>;
  notesById: Record<string, NoteRecord>;
  noteIdsByVerseKey: Record<string, string[]>;
  revision: number;
  setVersesHighlight: (
    refs: BibleReference[],
    color: HighlightColor | null
  ) => void;
  upsertNote: (input: {
    id?: string;
    book: number;
    chapter: number;
    startVerse: number;
    endVerse: number;
    body: string;
  }) => NoteRecord | null;
  restoreNote: (note: NoteRecord) => void;
  deleteNote: (noteId: string) => NoteRecord | null;
  getNotesForVerses: (refs: BibleReference[]) => NoteRecord[];
  exportBackupJson: (
    tabs?: Array<{ id?: string; name: string; reference: string }>
  ) => string;
  importBackupJson: (raw: string) => {
    summary: StudyImportSummary;
    tabs?: Array<{ id?: string; name: string; reference: string }>;
  };
}

const initial = loadInitialStudyState();

export const useStudyStore = create<StudyState>((set, get) => ({
  ...initial,

  setVersesHighlight: (refs, color) => {
    if (refs.length === 0) return;
    const now = Date.now();
    const nextHighlights = { ...get().highlightsByKey };
    const upserts: HighlightRecord[] = [];
    const deletes: Array<{ book: number; chapter: number; verse: number }> = [];

    for (const ref of refs) {
      const key = makeVerseKey(ref.book, ref.chapter, ref.verse);
      if (color === null) {
        if (nextHighlights[key]) {
          delete nextHighlights[key];
          deletes.push({
            book: ref.book,
            chapter: ref.chapter,
            verse: ref.verse,
          });
        }
      } else {
        const existing = nextHighlights[key];
        const rec: HighlightRecord = {
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
          color,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        nextHighlights[key] = rec;
        upserts.push(rec);
      }
    }

    if (upserts.length === 0 && deletes.length === 0) {
      return;
    }

    persistHighlightBatchSync(upserts, deletes, Object.values(nextHighlights));
    set((s) => ({
      highlightsByKey: nextHighlights,
      revision: s.revision + 1,
    }));
  },

  upsertNote: (input) => {
    const trimmed = input.body.trim();
    const existing = input.id ? get().notesById[input.id] : undefined;

    if (!trimmed) {
      if (existing) {
        get().deleteNote(existing.id);
      }
      return null;
    }

    const now = Date.now();
    const lo = Math.min(input.startVerse, input.endVerse);
    const hi = Math.max(input.startVerse, input.endVerse);
    const record: NoteRecord = {
      id: existing?.id ?? input.id ?? makeNoteId(),
      book: input.book,
      chapter: input.chapter,
      startVerse: lo,
      endVerse: hi,
      body: trimmed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextNotesList = [
      ...Object.values(get().notesById).filter((n) => n.id !== record.id),
      record,
    ];
    persistUpsertNoteSync(record, nextNotesList);

    const { notesById, noteIdsByVerseKey } = buildIndices([], nextNotesList);
    set((s) => ({
      notesById,
      noteIdsByVerseKey,
      revision: s.revision + 1,
    }));
    return record;
  },

  restoreNote: (note) => {
    const nextNotesList = [
      ...Object.values(get().notesById).filter((n) => n.id !== note.id),
      note,
    ];
    persistUpsertNoteSync(note, nextNotesList);
    const { notesById, noteIdsByVerseKey } = buildIndices([], nextNotesList);
    set((s) => ({
      notesById,
      noteIdsByVerseKey,
      revision: s.revision + 1,
    }));
  },

  deleteNote: (noteId) => {
    const existing = get().notesById[noteId];
    if (!existing) {
      return null;
    }
    const nextNotesList = Object.values(get().notesById).filter(
      (n) => n.id !== noteId
    );
    persistDeleteNoteSync(noteId, nextNotesList);
    const { notesById, noteIdsByVerseKey } = buildIndices([], nextNotesList);
    set((s) => ({
      notesById,
      noteIdsByVerseKey,
      revision: s.revision + 1,
    }));
    return existing;
  },

  getNotesForVerses: (refs) => {
    const { noteIdsByVerseKey, notesById } = get();
    const seen = new Set<string>();
    const out: NoteRecord[] = [];
    for (const ref of refs) {
      const ids = noteIdsByVerseKey[makeVerseKey(ref.book, ref.chapter, ref.verse)];
      if (!ids) continue;
      for (const id of ids) {
        if (!seen.has(id) && notesById[id]) {
          seen.add(id);
          out.push(notesById[id]);
        }
      }
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out;
  },

  exportBackupJson: (tabs) => {
    const payload: BackupPayload = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      highlights: Object.values(get().highlightsByKey),
      notes: Object.values(get().notesById),
      ...(tabs ? { tabs } : {}),
    };
    return JSON.stringify(payload, null, 2);
  },

  importBackupJson: (raw) => {
    const parsed = JSON.parse(raw) as Partial<BackupPayload>;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Backup file is not valid JSON.");
    }
    if (
      !Array.isArray(parsed.highlights) &&
      !Array.isArray(parsed.notes)
    ) {
      throw new Error("Backup JSON does not contain highlights or notes.");
    }

    const now = Date.now();
    const mergedHighlights = { ...get().highlightsByKey };
    const mergedNotes = { ...get().notesById };
    let highlightsImported = 0;
    let notesImported = 0;

    if (Array.isArray(parsed.highlights)) {
      for (const h of parsed.highlights) {
        if (
          !h ||
          !Number.isInteger(h.book) ||
          h.book < 0 ||
          h.book >= BOOKS.length ||
          !Number.isInteger(h.chapter) ||
          h.chapter < 1 ||
          !Number.isInteger(h.verse) ||
          h.verse < 1 ||
          !isValidHighlightColor(h.color)
        ) {
          continue;
        }
        const key = makeVerseKey(h.book, h.chapter, h.verse);
        const existing = mergedHighlights[key];
        const incomingUpdated =
          typeof h.updatedAt === "number" && Number.isFinite(h.updatedAt)
            ? h.updatedAt
            : now;
        if (!existing || incomingUpdated >= existing.updatedAt) {
          mergedHighlights[key] = {
            book: h.book,
            chapter: h.chapter,
            verse: h.verse,
            color: h.color,
            createdAt:
              typeof h.createdAt === "number" && Number.isFinite(h.createdAt)
                ? h.createdAt
                : incomingUpdated,
            updatedAt: incomingUpdated,
          };
          highlightsImported++;
        }
      }
    }

    if (Array.isArray(parsed.notes)) {
      for (const n of parsed.notes) {
        if (
          !n ||
          typeof n.id !== "string" ||
          !n.id.trim() ||
          !Number.isInteger(n.book) ||
          n.book < 0 ||
          n.book >= BOOKS.length ||
          !Number.isInteger(n.chapter) ||
          n.chapter < 1 ||
          !Number.isInteger(n.startVerse) ||
          n.startVerse < 1 ||
          !Number.isInteger(n.endVerse) ||
          n.endVerse < 1 ||
          typeof n.body !== "string" ||
          !n.body.trim()
        ) {
          continue;
        }
        const existing = mergedNotes[n.id];
        const incomingUpdated =
          typeof n.updatedAt === "number" && Number.isFinite(n.updatedAt)
            ? n.updatedAt
            : now;
        if (!existing || incomingUpdated >= existing.updatedAt) {
          mergedNotes[n.id] = {
            id: n.id,
            book: n.book,
            chapter: n.chapter,
            startVerse: Math.min(n.startVerse, n.endVerse),
            endVerse: Math.max(n.startVerse, n.endVerse),
            body: n.body.trim(),
            createdAt:
              typeof n.createdAt === "number" && Number.isFinite(n.createdAt)
                ? n.createdAt
                : incomingUpdated,
            updatedAt: incomingUpdated,
          };
          notesImported++;
        }
      }
    }

    const nextHighlightsList = Object.values(mergedHighlights);
    const nextNotesList = Object.values(mergedNotes);
    persistReplaceAllStudyDataSync(nextHighlightsList, nextNotesList);

    const rebuilt = buildIndices(nextHighlightsList, nextNotesList);
    set((s) => ({
      ...rebuilt,
      revision: s.revision + 1,
    }));

    const validTabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.filter(
          (t) =>
            t &&
            typeof t.reference === "string" &&
            typeof t.name === "string"
        )
      : undefined;

    return {
      summary: { highlightsImported, notesImported },
      tabs: validTabs,
    };
  },
}));
