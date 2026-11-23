export type ThemeName = "light" | "sepia" | "dark";

export type AccentColorName =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

export type TextSizeOption = "15" | "18" | "24" | "32" | "40";

export type FontFamilyOption = "serif" | "sans";

export type LocalTranslationId = "bsb" | "kjv" | "web" | "asv";

export type ApiTranslationId = "niv" | "nlt" | "nasb";

export type TranslationId = LocalTranslationId | ApiTranslationId;

export type HighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange";

export interface BibleReference {
  book: number; // 0..65
  chapter: number; // 1..N
  verse: number; // 1..M
}

export interface HighlightRecord {
  book: number;
  chapter: number;
  verse: number;
  color: HighlightColor;
  createdAt: number;
  updatedAt: number;
}

export interface NoteRecord {
  id: string;
  book: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupPayload {
  schemaVersion: 1;
  exportedAt: number;
  highlights: HighlightRecord[];
  notes: NoteRecord[];
  tabs?: Array<{ id?: string; name: string; reference: string }>;
}

/**
  * Stored tab item.
  * Backwards-compatible with legacy AsyncStorage format:
  * `{ reference: "0,1,1", name: "" }`
  */
export interface TabItem {
  id: string;
  name: string;
  reference: string;
}

export interface BookInfo {
  index: number;
  book: string;
  chapters: number;
  verses: number;
}

export type BlockKind =
  | "header"
  | "p"
  | "pmo"
  | "pc"
  | "li1"
  | "li2"
  | "q1"
  | "q2"
  | "qr"
  | "mr";

export interface HeaderPayload {
  bookTitle?: string;
  majorSection?: string;
  psalmTitle?: string;
  isBookStart?: boolean;
  isChapterStart?: boolean;
  s1?: string;
  refs?: string;
  s2?: string;
  acrostic?: string;
  superscription?: string;
  superscriptionVerse?: number;
}

export interface VerseSegment {
  v: number;
  n?: 1;
  c?: number;
  t: string;
}

export interface ParsedBlockRow {
  id: number;
  book: number;
  chapter: number;
  verse: number;
  kind: BlockKind;
  flags: number;
  header?: HeaderPayload;
  segments?: VerseSegment[];
}

export interface VerseRow {
  id: number;
  book: number;
  chapter: number;
  verse: number;
  chapter_block_id: number;
  verse_block_id: number;
  text: string;
  superscription: string | null;
  footnotes: string | null;
}

export interface NoteEditorParams {
  noteId?: string;
  book: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  versePreview?: string;
}

export type RootStackParamList = {
  Home: undefined;
  TabModal: undefined;
  Settings: undefined;
  Version: undefined;
  Notebook: undefined;
  NoteEditor: NoteEditorParams;
};
