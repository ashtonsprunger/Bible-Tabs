import type { SQLiteDatabase } from "expo-sqlite";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../constants/colors";
import {
  TRANSLATIONS,
  isLocalTranslationMeta,
  type LocalTranslationMeta,
} from "../constants/translations";
import { useAppStore } from "../store/useAppStore";
import type { LocalTranslationId, TranslationId } from "../types";
import { openBibleDbAsync } from "./openBibleDb";
import { FALLBACK_TOTAL_BIBLE_BLOCKS, getTotalBlocksAsync } from "./queries";

export interface BibleDbContextValue {
  db: SQLiteDatabase;
  loadedTranslation: TranslationId;
  loadedLocalTranslation: LocalTranslationId;
  totalBlocks: number;
  isSwitching: boolean;
}

const BibleDbContext = createContext<BibleDbContextValue | null>(null);

export function useBibleDb(): BibleDbContextValue {
  const ctx = useContext(BibleDbContext);
  if (!ctx) {
    throw new Error("useBibleDb must be used inside <BibleDbProvider>");
  }
  return ctx;
}

export function BibleDbProvider({ children }: { children: React.ReactNode }) {
  const requestedTranslation = useAppStore((s) => s.translation);
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);

  const [retryTick, setRetryTick] = useState(0);
  const [state, setState] = useState<{
    db: SQLiteDatabase | null;
    loadedTranslation: TranslationId;
    loadedLocalTranslation: LocalTranslationId;
    totalBlocks: number;
    isSwitching: boolean;
    errorMessage: string | null;
  }>({
    db: null,
    loadedTranslation: requestedTranslation,
    loadedLocalTranslation: "bsb",
    totalBlocks: FALLBACK_TOTAL_BIBLE_BLOCKS,
    isSwitching: false,
    errorMessage: null,
  });

  const activeDbRef = useRef<SQLiteDatabase | null>(null);
  const activeLocalIdRef = useRef<LocalTranslationId | null>(null);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    const seq = ++loadSeqRef.current;
    const requestedMeta = TRANSLATIONS[requestedTranslation];

    // If switching to an online API translation and a local fallback DB is already open,
    // swap immediately with zero SQLite reopen latency.
    if (!isLocalTranslationMeta(requestedMeta) && activeDbRef.current) {
      setState((prev) => ({
        ...prev,
        loadedTranslation: requestedTranslation,
        isSwitching: false,
        errorMessage: null,
      }));
      return;
    }

    const targetLocalMeta: LocalTranslationMeta = isLocalTranslationMeta(
      requestedMeta
    )
      ? requestedMeta
      : (TRANSLATIONS.bsb as LocalTranslationMeta);

    // If switching back to the exact local DB already open in memory, reuse it immediately
    if (
      activeDbRef.current &&
      activeLocalIdRef.current === targetLocalMeta.id
    ) {
      setState((prev) => ({
        ...prev,
        loadedTranslation: requestedTranslation,
        loadedLocalTranslation: targetLocalMeta.id,
        isSwitching: false,
        errorMessage: null,
      }));
      return;
    }

    setState((prev) =>
      prev.db
        ? { ...prev, isSwitching: true, errorMessage: null }
        : { ...prev, errorMessage: null }
    );

    async function loadDb() {
      try {
        const nextDb = await openBibleDbAsync(targetLocalMeta);
        const totalBlocks = await getTotalBlocksAsync(nextDb);

        if (seq !== loadSeqRef.current) {
          nextDb.closeAsync().catch(() => {});
          return;
        }

        const prevDb = activeDbRef.current;
        activeDbRef.current = nextDb;
        activeLocalIdRef.current = targetLocalMeta.id;

        setState({
          db: nextDb,
          loadedTranslation: requestedTranslation,
          loadedLocalTranslation: targetLocalMeta.id,
          totalBlocks,
          isSwitching: false,
          errorMessage: null,
        });

        // Close old DB after React has swapped consumers onto nextDb
        if (prevDb && prevDb !== nextDb) {
          setTimeout(() => {
            prevDb.closeAsync().catch(() => {});
          }, 250);
        }
      } catch (err) {
        console.error(
          "Failed to open Bible translation DB:",
          targetLocalMeta.dbName,
          err
        );
        if (seq === loadSeqRef.current) {
          setState((prev) => ({
            ...prev,
            isSwitching: false,
            errorMessage:
              err instanceof Error
                ? err.message
                : "Could not load Scripture database.",
          }));
        }
      }
    }

    loadDb();
  }, [requestedTranslation, retryTick]);

  useEffect(() => {
    return () => {
      const dbToClose = activeDbRef.current;
      activeDbRef.current = null;
      activeLocalIdRef.current = null;
      if (dbToClose) {
        dbToClose.closeAsync().catch(() => {});
      }
    };
  }, []);

  if (!state.db) {
    const bgColor = colors.bible.background[theme];
    const textColor = colors.bible.text[theme];
    const accentColor = colors.bible.color[theme][color][1];
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {state.errorMessage ? (
          <>
            <Text
              style={{
                color: textColor,
                fontSize: 17,
                fontWeight: "600",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Could not open Scripture database
            </Text>
            <Text
              style={{
                color: textColor,
                opacity: 0.65,
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center",
                maxWidth: 420,
              }}
            >
              {state.errorMessage}
            </Text>
            <Pressable
              onPress={() => setRetryTick((t) => t + 1)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: accentColor,
              }}
            >
              <Text style={{ color: accentColor, fontSize: 15, fontWeight: "700" }}>
                Try Again
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: textColor, opacity: 0.55, fontSize: 16 }}>
            Loading {TRANSLATIONS[requestedTranslation].shortName}…
          </Text>
        )}
      </View>
    );
  }

  return (
    <BibleDbContext.Provider
      value={{
        db: state.db,
        loadedTranslation: state.loadedTranslation,
        loadedLocalTranslation: state.loadedLocalTranslation,
        totalBlocks: state.totalBlocks,
        isSwitching: state.isSwitching,
      }}
    >
      {children}
    </BibleDbContext.Provider>
  );
}
