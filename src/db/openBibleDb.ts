import {
  importDatabaseFromAssetAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";
import type { LocalTranslationMeta } from "../constants/translations";

export async function openBibleDbAsync(
  meta: LocalTranslationMeta
): Promise<SQLiteDatabase> {
  await importDatabaseFromAssetAsync(meta.dbName, {
    assetId: meta.assetId,
  });
  return openDatabaseAsync(meta.dbName);
}
