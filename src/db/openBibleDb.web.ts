import { Asset } from "expo-asset";
import type { SQLiteDatabase } from "expo-sqlite";
import type { LocalTranslationMeta } from "../constants/translations";

// Direct wa-sqlite MemoryVFS import for web:
// Avoids expo-sqlite's AccessHandlePoolVFS (OPFS exclusive file lock),
// so multiple browser tabs, incognito windows, and Safari/Firefox all work cleanly.
// @ts-ignore - internal expo-sqlite web wa-sqlite modules
import { MemoryVFS } from "../../node_modules/expo-sqlite/web/wa-sqlite/MemoryVFS.js";
// @ts-ignore
import * as SQLiteApi from "../../node_modules/expo-sqlite/web/wa-sqlite/sqlite-api.js";
// @ts-ignore
import * as SQLiteConstants from "../../node_modules/expo-sqlite/web/wa-sqlite/sqlite-constants.js";
// @ts-ignore
import WaSQLiteFactory from "../../node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.js";
// @ts-ignore
import wasmModule from "../../node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.wasm";

const { SQLITE_OPEN_CREATE, SQLITE_OPEN_READWRITE, SQLITE_ROW } = SQLiteConstants;

const MEMORY_VFS_NAME = "bible-tabs-memfs";

let sqliteInitPromise: Promise<any> | null = null;
const cachedDbBytes = new Map<string, Uint8Array>();

async function getMemorySqlite3(): Promise<any> {
  if (!sqliteInitPromise) {
    sqliteInitPromise = (async () => {
      const module = await WaSQLiteFactory({
        locateFile: () => wasmModule,
      });
      const sqlite3 = SQLiteApi.Factory(module);
      const vfsMemory = await MemoryVFS.create(MEMORY_VFS_NAME, module);
      sqlite3.vfs_register(vfsMemory, true);
      return sqlite3;
    })().catch((err) => {
      sqliteInitPromise = null;
      throw err;
    });
  }
  return sqliteInitPromise;
}

async function fetchDbBytes(meta: LocalTranslationMeta): Promise<Uint8Array> {
  const cached = cachedDbBytes.get(meta.dbName);
  if (cached) {
    return cached;
  }
  const asset = Asset.fromModule(meta.assetId);
  if (!asset.localUri && !asset.uri) {
    await asset.downloadAsync();
  }
  const url = asset.localUri ?? asset.uri;
  if (!url) {
    throw new Error(`Could not resolve URL for ${meta.dbName}`);
  }
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${meta.dbName}: ${res.status} ${res.statusText}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  cachedDbBytes.set(meta.dbName, bytes);
  return bytes;
}

function normalizeParams(rawArgs: unknown[]): unknown[] {
  if (rawArgs.length === 0) return [];
  if (rawArgs.length === 1 && Array.isArray(rawArgs[0])) {
    return rawArgs[0];
  }
  return rawArgs;
}

export async function openBibleDbAsync(
  meta: LocalTranslationMeta
): Promise<SQLiteDatabase> {
  const [sqlite3, bytes] = await Promise.all([
    getMemorySqlite3(),
    fetchDbBytes(meta),
  ]);

  const pointer: number = await sqlite3.open_v2(
    ":memory:",
    SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE,
    MEMORY_VFS_NAME
  );
  // Pass a fresh slice because sqlite3.deserialize may take ownership of the copy
  await sqlite3.deserialize(pointer, "main", bytes.slice());

  let closed = false;
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  const runQueryAll = async <T,>(
    sql: string,
    params: unknown[]
  ): Promise<T[]> => {
    if (closed) {
      return [];
    }
    const rows: T[] = [];
    for await (const stmt of sqlite3.statements(pointer, sql)) {
      for (let i = 0; i < params.length; i++) {
        sqlite3.bind(stmt, i + 1, params[i]);
      }
      const cols: string[] = sqlite3.column_names(stmt);
      while ((await sqlite3.step(stmt)) === SQLITE_ROW) {
        const vals: unknown[] = sqlite3.row(stmt);
        const obj: Record<string, unknown> = {};
        for (let c = 0; c < cols.length; c++) {
          obj[cols[c]] = vals[c];
        }
        rows.push(obj as T);
      }
    }
    return rows;
  };

  const webDb = {
    databasePath: `:memory:${meta.dbName}`,
    getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
      const params = normalizeParams(args);
      return enqueue(() => runQueryAll<T>(sql, params));
    },
    getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
      const params = normalizeParams(args);
      return enqueue(async () => {
        if (closed) {
          return null;
        }
        for await (const stmt of sqlite3.statements(pointer, sql)) {
          for (let i = 0; i < params.length; i++) {
            sqlite3.bind(stmt, i + 1, params[i]);
          }
          const cols: string[] = sqlite3.column_names(stmt);
          if ((await sqlite3.step(stmt)) === SQLITE_ROW) {
            const vals: unknown[] = sqlite3.row(stmt);
            const obj: Record<string, unknown> = {};
            for (let c = 0; c < cols.length; c++) {
              obj[cols[c]] = vals[c];
            }
            return obj as T;
          }
        }
        return null;
      });
    },
    closeAsync(): Promise<void> {
      return enqueue(async () => {
        if (closed) return;
        closed = true;
        await sqlite3.close(pointer);
      });
    },
  };

  return webDb as unknown as SQLiteDatabase;
}
