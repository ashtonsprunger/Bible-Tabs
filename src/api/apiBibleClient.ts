import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import {
  getChapterUsfmId,
  parseUsfmVerseId,
} from "../constants/books";
import type { ApiTranslationId, BibleReference, VerseRow } from "../types";
import {
  type ApiBibleAstNode,
  type ParsedApiChapter,
  parseApiBibleChapterContent,
} from "./apiBibleParser";
import {
  decryptString,
  encryptString,
  generateKeyBase64,
  generateRandomHex,
} from "./chapterCrypto";

const PRODUCTION_PROXY_URL = "https://bibletabs.sprungerstudios.app/api/bible";
const FUMS_ENDPOINT = "https://fums.api.bible/f3";
const CACHE_DB_NAME = "api_bible_cache_v1.db";
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (API.Bible Acceptable Use)

interface RawProxyChapterResponse {
  translation: ApiTranslationId;
  bibleId: string;
  chapterId: string;
  reference: string;
  copyright: string;
  content: ApiBibleAstNode[];
  fumsToken: string | null;
  error?: string;
}

interface RawProxySearchResponse {
  translation: ApiTranslationId;
  query: string;
  total: number;
  verses: Array<{
    id: string;
    bookId: string;
    chapterId: string;
    reference: string;
    text: string;
  }>;
  fumsToken: string | null;
  error?: string;
}

interface CachedChapterPayload {
  chapterId: string;
  copyright: string;
  content: ApiBibleAstNode[];
  fumsToken: string | null;
  fetchedAt: number;
}

export interface ApiSearchResult {
  total: number;
  verses: VerseRow[];
}

// In-memory session cache (shared on Web & Mobile; Web NEVER writes licensed text to disk/localStorage)
const memoryChapterCache = new Map<string, ParsedApiChapter>();
const inFlightChapterRequests = new Map<string, Promise<ParsedApiChapter>>();

const sessionId = generateRandomHex(16);
let cachedDeviceId: string | null = null;
let cacheDb: SQLite.SQLiteDatabase | null = null;
let cachedEncKey: string | null = null;

function getProxyBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (
      host === "bibletabs.sprungerstudios.app" ||
      host === "www.bibletabs.sprungerstudios.app" ||
      host.endsWith(".vercel.app")
    ) {
      return "/api/bible";
    }
  }
  return PRODUCTION_PROXY_URL;
}

function getMobileCacheDb(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === "web") {
    return null;
  }
  if (cacheDb) {
    return cacheDb;
  }
  try {
    const db = SQLite.openDatabaseSync(CACHE_DB_NAME);
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS encrypted_chapters (
        cache_key TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
      );
    `);
    // Purge any cached chapters older than 30 days on startup
    const cutoff = Date.now() - MAX_CACHE_AGE_MS;
    db.runSync("DELETE FROM encrypted_chapters WHERE fetched_at < ?", [cutoff]);
    cacheDb = db;
    return db;
  } catch (err) {
    console.warn("Could not open mobile API cache DB:", err);
    return null;
  }
}

function getOrCreateMetaValue(key: string, generator: () => string): string {
  const db = getMobileCacheDb();
  if (!db) {
    return generator();
  }
  try {
    const existing = db.getFirstSync<{ value: string }>(
      "SELECT value FROM cache_meta WHERE key = ?",
      [key]
    );
    if (existing?.value) {
      return existing.value;
    }
    const created = generator();
    db.runSync(
      "INSERT OR REPLACE INTO cache_meta (key, value) VALUES (?, ?)",
      [key, created]
    );
    return created;
  } catch {
    return generator();
  }
}

function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("bt_fums_did");
        if (stored) {
          cachedDeviceId = stored;
          return stored;
        }
        const created = generateRandomHex(16);
        localStorage.setItem("bt_fums_did", created);
        cachedDeviceId = created;
        return created;
      }
    } catch {
      // Fall through to ephemeral id
    }
    cachedDeviceId = generateRandomHex(16);
    return cachedDeviceId;
  }
  cachedDeviceId = getOrCreateMetaValue("fums_device_id", () =>
    generateRandomHex(16)
  );
  return cachedDeviceId;
}

function getEncryptionKey(): string | null {
  if (Platform.OS === "web") {
    return null;
  }
  if (cachedEncKey) {
    return cachedEncKey;
  }
  cachedEncKey = getOrCreateMetaValue("chapter_enc_key_v1", generateKeyBase64);
  return cachedEncKey;
}

function readEncryptedMobileCache(cacheKey: string): CachedChapterPayload | null {
  const db = getMobileCacheDb();
  const key = getEncryptionKey();
  if (!db || !key) {
    return null;
  }
  try {
    const row = db.getFirstSync<{ ciphertext: string; fetched_at: number }>(
      "SELECT ciphertext, fetched_at FROM encrypted_chapters WHERE cache_key = ?",
      [cacheKey]
    );
    if (!row) return null;
    if (Date.now() - row.fetched_at >= MAX_CACHE_AGE_MS) {
      db.runSync("DELETE FROM encrypted_chapters WHERE cache_key = ?", [
        cacheKey,
      ]);
      return null;
    }
    const plain = decryptString(row.ciphertext, key);
    if (!plain) return null;
    const parsed = JSON.parse(plain) as CachedChapterPayload;
    if (!Array.isArray(parsed.content)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeEncryptedMobileCache(
  cacheKey: string,
  payload: CachedChapterPayload
): void {
  const db = getMobileCacheDb();
  const key = getEncryptionKey();
  if (!db || !key) {
    return;
  }
  try {
    const ciphertext = encryptString(JSON.stringify(payload), key);
    db.runSync(
      `INSERT INTO encrypted_chapters (cache_key, ciphertext, fetched_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         ciphertext = excluded.ciphertext,
         fetched_at = excluded.fetched_at`,
      [cacheKey, ciphertext, payload.fetchedAt]
    );
  } catch (err) {
    console.warn("Could not write encrypted API chapter cache:", err);
  }
}

export function reportFumsToken(fumsToken: string | null | undefined): void {
  if (!fumsToken) return;
  try {
    const dId = getDeviceId();
    const url =
      `${FUMS_ENDPOINT}?t=${encodeURIComponent(fumsToken)}` +
      `&dId=${encodeURIComponent(dId)}` +
      `&sId=${encodeURIComponent(sessionId)}`;

    fetch(url, {
      method: "GET",
      ...(Platform.OS === "web" ? { mode: "no-cors" as const } : {}),
    }).catch(() => {
      // Non-blocking telemetry beacon (ignore offline errors)
    });
  } catch {
    // Ignore FUMS beacon errors
  }
}

function makeCacheKey(
  translation: ApiTranslationId,
  book: number,
  chapter: number
): string {
  return `${translation}:${book}:${chapter}`;
}

export function getCachedApiChapterSync(
  translation: ApiTranslationId,
  book: number,
  chapter: number
): ParsedApiChapter | null {
  const cacheKey = makeCacheKey(translation, book, chapter);
  const mem = memoryChapterCache.get(cacheKey);
  if (mem) {
    return mem;
  }
  if (Platform.OS !== "web") {
    const stored = readEncryptedMobileCache(cacheKey);
    if (stored) {
      const parsed = parseApiBibleChapterContent({
        book,
        chapter,
        content: stored.content,
        copyright: stored.copyright,
        fumsToken: stored.fumsToken,
      });
      memoryChapterCache.set(cacheKey, parsed);
      return parsed;
    }
  }
  return null;
}

export async function getApiBibleChapterAsync(
  translation: ApiTranslationId,
  book: number,
  chapter: number,
  options?: { forceRefresh?: boolean; skipFums?: boolean }
): Promise<ParsedApiChapter> {
  const cacheKey = makeCacheKey(translation, book, chapter);

  if (!options?.forceRefresh) {
    const existing = getCachedApiChapterSync(translation, book, chapter);
    if (existing) {
      if (!options?.skipFums) {
        reportFumsToken(existing.fumsToken);
      }
      return existing;
    }
  }

  const pending = inFlightChapterRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const requestPromise = (async () => {
    const chapterId = getChapterUsfmId(book, chapter);
    const url =
      `${getProxyBaseUrl()}?action=chapter` +
      `&translation=${encodeURIComponent(translation)}` +
      `&chapterId=${encodeURIComponent(chapterId)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Bible-Tabs-Client": Platform.OS === "web" ? "web" : "native",
      },
    });

    let data: RawProxyChapterResponse;
    try {
      data = (await res.json()) as RawProxyChapterResponse;
    } catch {
      throw new Error("Unexpected response from Scripture server.");
    }

    if (!res.ok) {
      throw new Error(data.error || `Could not load chapter (${res.status}).`);
    }

    const parsed = parseApiBibleChapterContent({
      book,
      chapter,
      content: Array.isArray(data.content) ? data.content : [],
      copyright: data.copyright ?? "",
      fumsToken: data.fumsToken ?? null,
    });

    memoryChapterCache.set(cacheKey, parsed);

    if (Platform.OS !== "web") {
      writeEncryptedMobileCache(cacheKey, {
        chapterId: data.chapterId ?? chapterId,
        copyright: data.copyright ?? "",
        content: Array.isArray(data.content) ? data.content : [],
        fumsToken: data.fumsToken ?? null,
        fetchedAt: Date.now(),
      });
    }

    if (!options?.skipFums) {
      reportFumsToken(parsed.fumsToken);
    }

    return parsed;
  })();

  inFlightChapterRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightChapterRequests.delete(cacheKey);
  }
}

export async function getApiBibleVersesRangeAsync(
  translation: ApiTranslationId,
  book: number,
  chapter: number,
  startVerse: number,
  endVerse: number
): Promise<VerseRow[]> {
  const ch = await getApiBibleChapterAsync(translation, book, chapter, {
    skipFums: true,
  });
  const lo = Math.min(startVerse, endVerse);
  const hi = Math.max(startVerse, endVerse);
  const out: VerseRow[] = [];
  for (let v = lo; v <= hi; v++) {
    const row = ch.versesByNumber[v];
    if (row) out.push(row);
  }
  return out;
}

export function getCachedApiVersesByRefsSync(
  translation: ApiTranslationId,
  refs: BibleReference[]
): VerseRow[] {
  const out: VerseRow[] = [];
  for (const ref of refs) {
    const ch = getCachedApiChapterSync(translation, ref.book, ref.chapter);
    const row = ch?.versesByNumber[ref.verse];
    if (row) {
      out.push(row);
    }
  }
  return out;
}

export async function searchApiBibleAsync(
  translation: ApiTranslationId,
  query: string,
  limit = 40
): Promise<ApiSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { total: 0, verses: [] };
  }

  const url =
    `${getProxyBaseUrl()}?action=search` +
    `&translation=${encodeURIComponent(translation)}` +
    `&query=${encodeURIComponent(trimmed)}` +
    `&limit=${encodeURIComponent(String(limit))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Bible-Tabs-Client": Platform.OS === "web" ? "web" : "native",
    },
  });

  let data: RawProxySearchResponse;
  try {
    data = (await res.json()) as RawProxySearchResponse;
  } catch {
    throw new Error("Unexpected response from Scripture search server.");
  }

  if (!res.ok) {
    throw new Error(data.error || `Search failed (${res.status}).`);
  }

  reportFumsToken(data.fumsToken);

  const verses: VerseRow[] = [];
  for (const item of data.verses ?? []) {
    const ref = parseUsfmVerseId(item.id);
    if (!ref) continue;
    verses.push({
      id: ref.book * 1000000 + ref.chapter * 1000 + ref.verse,
      book: ref.book,
      chapter: ref.chapter,
      verse: ref.verse,
      chapter_block_id: 1,
      verse_block_id: 1,
      text: item.text.replace(/\s+/g, " ").trim(),
      superscription: null,
      footnotes: null,
    });
  }

  return {
    total: data.total ?? verses.length,
    verses,
  };
}
