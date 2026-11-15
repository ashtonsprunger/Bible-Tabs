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

export interface BibleReference {
  book: number; // 0..65
  chapter: number; // 1..N
  verse: number; // 1..M
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

export interface VerseRow {
  id: number;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}
