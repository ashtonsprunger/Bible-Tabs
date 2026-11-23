import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  Vibration,
  View,
  type ViewStyle,
} from "react-native";
import {
  BOOKS,
  PSALMS_BOOK_INDEX,
  compareBibleRefs,
  formatChapterLabel,
  formatMultiVerseCitation,
  formatVerseRangeCitation,
  getAdjacentChapterRef,
  getGotQuestionsBookUrl,
  makeVerseKey,
  parseReference,
} from "../constants/books";
import {
  HIGHLIGHT_COLORS,
  colors,
  highlightColors,
  uiTokens,
} from "../constants/colors";
import {
  API_BIBLE_ATTRIBUTION_URL,
  TRANSLATIONS,
  isApiTranslation,
} from "../constants/translations";
import {
  getScriptureFontFamily,
  getUiFontFamily,
} from "../constants/typography";
import {
  getApiBibleChapterAsync,
  getCachedApiChapterSync,
  getCachedApiVersesByRefsSync,
} from "../api/apiBibleClient";
import type { ParsedApiChapter } from "../api/apiBibleParser";
import { useBibleDb } from "../db/BibleDbContext";
import {
  BLOCK_FLAG_STANZA_BREAK,
  getChapterBlocksAsync,
  getChapterBlocksSync,
  getChapterFootnotesAsync,
  getChapterFootnotesSync,
  getVersesByRefsAsync,
  getVersesByRefsSync,
} from "../db/queries";
import { useAppStore, type RuntimeTab } from "../store/useAppStore";
import { useStudyStore } from "../store/useStudyStore";
import type {
  AccentColorName,
  BibleReference,
  FontFamilyOption,
  HighlightColor,
  NoteEditorParams,
  NoteRecord,
  ParsedBlockRow,
  TextSizeOption,
  ThemeName,
  TranslationId,
  VerseRow,
  VerseSegment,
} from "../types";

const blockKeyExtractor = (item: ParsedBlockRow) => String(item.id);

const blockGetItemType = (item: ParsedBlockRow) => {
  if (item.kind === "header") return "header";
  if (
    item.kind === "q1" ||
    item.kind === "q2" ||
    item.kind === "qr" ||
    item.kind === "li1" ||
    item.kind === "li2"
  ) {
    return "poetry";
  }
  let chars = 0;
  if (item.segments) {
    for (let i = 0; i < item.segments.length; i++) {
      chars += item.segments[i].t.length;
    }
  }
  if (chars < 120) return "proseS";
  if (chars < 280) return "proseM";
  return "proseL";
};

interface BibleReaderProps {
  tab: RuntimeTab;
  tabIndex: number;
  isActive: boolean;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  fontFamily: FontFamilyOption;
  translation: TranslationId;
  isDesktop: boolean;
  bottomInset: number;
  onSyncScrolledReference: (tabIndex: number, refString: string) => void;
  onNavigateChapter: (tabIndex: number, ref: BibleReference) => void;
  onOpenNoteEditor: (params: NoteEditorParams) => void;
}

interface InitialWindowState {
  blocks: ParsedBlockRow[];
  initialArrivalKey: string | null;
}

function hasMultipleDistinctVerses(
  segments: VerseSegment[] | undefined
): boolean {
  if (!segments || segments.length <= 1) {
    return false;
  }
  const firstV = segments[0].v;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].v !== firstV) {
      return true;
    }
  }
  return false;
}

function triggerLightHaptic() {
  if (Platform.OS === "web") {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    Vibration.vibrate(10);
  });
}

export default function BibleReader({
  tab,
  tabIndex,
  isActive,
  theme,
  color,
  textSize,
  fontFamily,
  translation,
  isDesktop,
  bottomInset,
  onSyncScrolledReference,
  onNavigateChapter,
  onOpenNoteEditor,
}: BibleReaderProps) {
  const { db } = useBibleDb();
  const setTranslation = useAppStore((s) => s.setTranslation);
  const isWeb = Platform.OS === "web";
  const isApi = isApiTranslation(translation);
  const targetRef = useMemo(() => parseReference(tab.reference), [tab.reference]);

  const listRef = useRef<FlashListRef<ParsedBlockRow>>(null);
  const hasLoadedRef = useRef(false);
  const lastSyncedRefStringRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;
  const syncRefCallback = useRef(onSyncScrolledReference);
  syncRefCallback.current = onSyncScrolledReference;

  const highlightsByKey = useStudyStore((s) => s.highlightsByKey);
  const notesById = useStudyStore((s) => s.notesById);
  const noteIdsByVerseKey = useStudyStore((s) => s.noteIdsByVerseKey);
  const studyRevision = useStudyStore((s) => s.revision);
  const setVersesHighlight = useStudyStore((s) => s.setVersesHighlight);

  const initialApiChapter = useMemo(() => {
    if (!isApi) return null;
    return getCachedApiChapterSync(translation, targetRef.book, targetRef.chapter);
  }, [isApi, translation, targetRef.book, targetRef.chapter]);

  const [apiChapter, setApiChapter] = useState<ParsedApiChapter | null>(
    initialApiChapter
  );
  const [apiLoading, setApiLoading] = useState<boolean>(
    isApi && !initialApiChapter
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiRetryTick, setApiRetryTick] = useState(0);
  const didScrollTargetRef = useRef(false);

  const [localFootnotes, setLocalFootnotes] = useState<
    Array<{ verse: number; text: string }>
  >(() => {
    if (isApi || isWeb) return [];
    return getChapterFootnotesSync(db, targetRef.book, targetRef.chapter);
  });

  const [{ blocks, initialArrivalKey }, setWindowState] =
    useState<InitialWindowState>(() => {
      if (isApi) {
        return {
          blocks: initialApiChapter?.blocks ?? [],
          initialArrivalKey: tab.highlightRef
            ? makeVerseKey(targetRef.book, targetRef.chapter, targetRef.verse)
            : null,
        };
      }
      if (isWeb) {
        return { blocks: [], initialArrivalKey: null };
      }
      const chapterBlocks = getChapterBlocksSync(
        db,
        targetRef.book,
        targetRef.chapter
      );
      return {
        blocks: chapterBlocks,
        initialArrivalKey: tab.highlightRef
          ? makeVerseKey(targetRef.book, targetRef.chapter, targetRef.verse)
          : null,
      };
    });

  // API.Bible single-chapter loader (defers network call for inactive tabs; 180ms debounce on uncached chapters so rapid clicking skips intermediate API calls)
  useEffect(() => {
    if (!isApi) return;
    if (!isActive && !initialApiChapter) {
      return;
    }
    let cancelled = false;
    const forceRefresh = apiRetryTick > 0;
    const needsFetch = !initialApiChapter || forceRefresh;
    if (needsFetch) {
      setApiLoading(true);
    }
    setApiError(null);

    const runFetch = () => {
      getApiBibleChapterAsync(translation, targetRef.book, targetRef.chapter, {
        forceRefresh,
      })
        .then((loaded) => {
          if (cancelled) return;
          setApiChapter(loaded);
          setApiLoading(false);
          setApiError(null);
          const arrivalKey = tab.highlightRef
            ? makeVerseKey(targetRef.book, targetRef.chapter, targetRef.verse)
            : null;
          setWindowState({
            blocks: loaded.blocks,
            initialArrivalKey: arrivalKey,
          });
          if (arrivalKey) {
            setArrivalVerseKey(arrivalKey);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setApiLoading(false);
          setApiError(
            err instanceof Error
              ? err.message
              : "Could not load chapter. Check your internet connection."
          );
        });
    };

    if (!needsFetch) {
      runFetch();
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(runFetch, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isApi,
    isActive,
    translation,
    targetRef.book,
    targetRef.chapter,
    targetRef.verse,
    tab.highlightRef,
    initialApiChapter,
    apiRetryTick,
  ]);

  // Web async single-chapter load for local SQLite DBs
  useEffect(() => {
    if (!isWeb || isApi) return;
    let cancelled = false;
    Promise.all([
      getChapterBlocksAsync(db, targetRef.book, targetRef.chapter),
      getChapterFootnotesAsync(db, targetRef.book, targetRef.chapter),
    ]).then(([chapterBlocks, fns]) => {
      if (cancelled) return;
      const arrivalKey = tab.highlightRef
        ? makeVerseKey(targetRef.book, targetRef.chapter, targetRef.verse)
        : null;
      setLocalFootnotes(fns);
      setWindowState({
        blocks: chapterBlocks,
        initialArrivalKey: arrivalKey,
      });
      if (arrivalKey) {
        setArrivalVerseKey(arrivalKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    isWeb,
    isApi,
    db,
    targetRef.book,
    targetRef.chapter,
    targetRef.verse,
    tab.highlightRef,
  ]);

  // Scroll cleanly to target verse when jumping to verse > 1 (both offline & online chapters)
  useEffect(() => {
    if (didScrollTargetRef.current || blocks.length === 0) return;
    if (targetRef.verse <= 1) {
      didScrollTargetRef.current = true;
      return;
    }
    const idx = blocks.findIndex(
      (b) =>
        b.kind !== "header" &&
        b.segments?.some((seg) => seg.v >= targetRef.verse)
    );
    if (idx > 0) {
      didScrollTargetRef.current = true;
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [blocks, targetRef.verse]);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const [arrivalVerseKey, setArrivalVerseKey] = useState<string | null>(
    initialArrivalKey
  );
  const [selectedRefs, setSelectedRefs] = useState<BibleReference[]>([]);
  const [webSelectedVerseRows, setWebSelectedVerseRows] = useState<VerseRow[]>([]);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const isSelecting = selectedRefs.length > 0;

  const selectedKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const ref of selectedRefs) {
      set.add(makeVerseKey(ref.book, ref.chapter, ref.verse));
    }
    return set;
  }, [selectedRefs]);

  const selectedKeysSignature = useMemo(() => {
    if (selectedRefs.length === 0) return "";
    return selectedRefs
      .map((r) => makeVerseKey(r.book, r.chapter, r.verse))
      .join("|");
  }, [selectedRefs]);

  useEffect(() => {
    if (!isWeb || isApi) return;
    if (selectedRefs.length === 0) {
      setWebSelectedVerseRows([]);
      return;
    }
    let cancelled = false;
    getVersesByRefsAsync(db, selectedRefs).then((rows) => {
      if (!cancelled) {
        setWebSelectedVerseRows(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isWeb, isApi, db, selectedRefs]);

  const selectedVerseRows: VerseRow[] = useMemo(() => {
    if (selectedRefs.length === 0) return [];
    if (isApi) {
      const out: VerseRow[] = [];
      for (const ref of selectedRefs) {
        if (
          apiChapter &&
          apiChapter.book === ref.book &&
          apiChapter.chapter === ref.chapter
        ) {
          const hit = apiChapter.versesByNumber[ref.verse];
          if (hit) {
            out.push(hit);
            continue;
          }
        }
        const cached = getCachedApiVersesByRefsSync(translation, [ref]);
        if (cached[0]) out.push(cached[0]);
      }
      return out;
    }
    if (isWeb) return webSelectedVerseRows;
    return getVersesByRefsSync(db, selectedRefs);
  }, [isApi, apiChapter, translation, isWeb, db, selectedRefs, webSelectedVerseRows]);

  const overlappingNotes: NoteRecord[] = useMemo(() => {
    if (selectedRefs.length === 0) return [];
    const seen = new Set<string>();
    const out: NoteRecord[] = [];
    for (const ref of selectedRefs) {
      const ids =
        noteIdsByVerseKey[makeVerseKey(ref.book, ref.chapter, ref.verse)];
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
  }, [selectedRefs, noteIdsByVerseKey, notesById]);

  const combinedFootnotes = useMemo(() => {
    const lines: string[] = [];
    for (const row of selectedVerseRows) {
      if (row.footnotes) {
        const prefix =
          selectedVerseRows.length > 1 ? `v.${row.verse}: ` : "";
        lines.push(`${prefix}${row.footnotes}`);
      }
    }
    return lines.join("\n");
  }, [selectedVerseRows]);

  // Compute common highlight color across all selected verses (if uniform)
  const { activeHighlightColor, anySelectedHighlighted } = useMemo(() => {
    if (selectedRefs.length === 0) {
      return {
        activeHighlightColor: null as HighlightColor | null,
        anySelectedHighlighted: false,
      };
    }
    let firstColor: HighlightColor | null = null;
    let allSame = true;
    let anyHighlighted = false;

    for (let i = 0; i < selectedRefs.length; i++) {
      const r = selectedRefs[i];
      const h = highlightsByKey[makeVerseKey(r.book, r.chapter, r.verse)];
      const c = h?.color ?? null;
      if (c) anyHighlighted = true;
      if (i === 0) {
        firstColor = c;
      } else if (c !== firstColor) {
        allSame = false;
      }
    }

    return {
      activeHighlightColor: allSame ? firstColor : null,
      anySelectedHighlighted: anyHighlighted,
    };
  }, [selectedRefs, highlightsByKey]);

  useEffect(() => {
    if (arrivalVerseKey === null) {
      return;
    }
    const timer = setTimeout(() => {
      setArrivalVerseKey(null);
    }, 2400);
    return () => clearTimeout(timer);
  }, [arrivalVerseKey]);

  useEffect(() => {
    if (!isSelecting || !isActive) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedRefs([]);
      return true;
    });
    let keyCleanup: (() => void) | undefined;
    if (isWeb && typeof window !== "undefined") {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedRefs([]);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      keyCleanup = () => window.removeEventListener("keydown", onKeyDown);
    }
    return () => {
      sub.remove();
      keyCleanup?.();
    };
  }, [isSelecting, isActive, isWeb]);

  useEffect(() => {
    if (!toastBanner) {
      return;
    }
    const timer = setTimeout(() => {
      setToastBanner(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [toastBanner]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const scheduleVisibleSync = useCallback((item: ParsedBlockRow | undefined) => {
    if (!hasLoadedRef.current || !isActiveRef.current || !item) {
      return;
    }
    const refString = `${item.book},${item.chapter},${item.verse}`;
    if (refString === lastSyncedRefStringRef.current) {
      return;
    }
    lastSyncedRefStringRef.current = refString;
    if (syncTimerRef.current !== null) {
      clearTimeout(syncTimerRef.current);
    }
    // Defer store updates out of FlashList's synchronous scroll handler to avoid nested layout loops
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      if (isActiveRef.current) {
        syncRefCallback.current(tabIndexRef.current, refString);
      }
    }, 80);
  }, []);

  const handleScroll = useCallback(() => {
    if (!hasLoadedRef.current || !isActiveRef.current) {
      return;
    }
    const firstIdx = listRef.current?.getFirstVisibleIndex() ?? -1;
    if (firstIdx >= 0) {
      scheduleVisibleSync(blocksRef.current[firstIdx]);
    }
  }, [scheduleVisibleSync]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ParsedBlockRow>[] }) => {
      if (viewableItems.length > 0) {
        scheduleVisibleSync(viewableItems[0]?.item);
      }
    },
    [scheduleVisibleSync]
  );

  const handleListLoad = useCallback(() => {
    hasLoadedRef.current = true;
  }, []);

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 25,
        minimumViewTime: 0,
      },
      onViewableItemsChanged,
    },
  ]);

  const openBookOverview = useCallback((bookIndex: number) => {
    triggerLightHaptic();
    Linking.openURL(getGotQuestionsBookUrl(bookIndex)).catch(() => {});
  }, []);

  const dismissSelection = useCallback(() => {
    setSelectedRefs([]);
  }, []);

  const toggleVerseInSelection = useCallback(
    (book: number, chapter: number, verse: number) => {
      triggerLightHaptic();
      setSelectedRefs((prev) => {
        const key = makeVerseKey(book, chapter, verse);
        const exists = prev.some(
          (r) => makeVerseKey(r.book, r.chapter, r.verse) === key
        );
        if (exists) {
          return prev.filter(
            (r) => makeVerseKey(r.book, r.chapter, r.verse) !== key
          );
        }
        return [...prev, { book, chapter, verse }].sort(compareBibleRefs);
      });
    },
    []
  );

  const handleVersePress = useCallback(
    (book: number, chapter: number, verse: number) => {
      if (selectedRefs.length > 0) {
        toggleVerseInSelection(book, chapter, verse);
      }
    },
    [selectedRefs.length, toggleVerseInSelection]
  );

  const handleNoteIndicatorPress = useCallback(
    (book: number, chapter: number, verse: number) => {
      if (selectedRefs.length > 0) {
        toggleVerseInSelection(book, chapter, verse);
        return;
      }
      triggerLightHaptic();
      setSelectedRefs([{ book, chapter, verse }]);
    },
    [selectedRefs.length, toggleVerseInSelection]
  );

  const handleApplyHighlight = (swatchColor: HighlightColor) => {
    if (selectedRefs.length === 0) return;
    triggerLightHaptic();
    const nextColor = activeHighlightColor === swatchColor ? null : swatchColor;
    setVersesHighlight(selectedRefs, nextColor);
  };

  const handleClearHighlight = () => {
    if (selectedRefs.length === 0) return;
    triggerLightHaptic();
    setVersesHighlight(selectedRefs, null);
  };

  const buildSelectedPlainQuote = (): string => {
    if (selectedVerseRows.length === 0) return "";
    if (selectedVerseRows.length === 1) return selectedVerseRows[0].text;
    return selectedVerseRows.map((r) => `${r.verse} ${r.text}`).join(" ");
  };

  const handleOpenNoteForSelection = (existing?: NoteRecord) => {
    if (selectedRefs.length === 0) return;
    triggerLightHaptic();
    if (existing) {
      if (isDesktop) setSelectedRefs([]);
      onOpenNoteEditor({
        noteId: existing.id,
        book: existing.book,
        chapter: existing.chapter,
        startVerse: existing.startVerse,
        endVerse: existing.endVerse,
      });
      return;
    }

    // Anchor a new note to the contiguous span in the first selected chapter
    const first = selectedRefs[0];
    const sameChapter = selectedRefs.filter(
      (r) => r.book === first.book && r.chapter === first.chapter
    );
    const startVerse = sameChapter[0].verse;
    const endVerse = sameChapter[sameChapter.length - 1].verse;
    const quoteRows = selectedVerseRows.filter(
      (r) =>
        r.book === first.book &&
        r.chapter === first.chapter &&
        r.verse >= startVerse &&
        r.verse <= endVerse
    );
    const versePreview =
      quoteRows.length <= 1
        ? quoteRows[0]?.text ?? ""
        : quoteRows.map((r) => `${r.verse} ${r.text}`).join(" ");

    if (isDesktop) setSelectedRefs([]);
    onOpenNoteEditor({
      book: first.book,
      chapter: first.chapter,
      startVerse,
      endVerse,
      versePreview,
    });
  };

  const formatCopyPayload = (): { citation: string; formatted: string } => {
    const citation = formatMultiVerseCitation(selectedRefs);
    const shortName = TRANSLATIONS[translation].shortName;
    const body = buildSelectedPlainQuote();
    const formatted =
      selectedVerseRows.length <= 1
        ? `${citation} (${shortName}) — ${body}`
        : `${citation} (${shortName})\n${body}`;
    return { citation, formatted };
  };

  const handleCopySelected = async () => {
    if (selectedRefs.length === 0) {
      return;
    }
    const { citation, formatted } = formatCopyPayload();
    await Clipboard.setStringAsync(formatted);
    triggerLightHaptic();
    setSelectedRefs([]);
    setToastBanner(`Copied ${citation}`);
  };

  const handleShareSelected = async () => {
    if (selectedRefs.length === 0) {
      return;
    }
    const { formatted } = formatCopyPayload();
    setSelectedRefs([]);
    try {
      await Share.share({ message: formatted });
    } catch {
      // User dismissed share sheet
    }
  };

  const numericSize = Number(textSize);
  const proseLineHeight = Math.round(numericSize * 1.56);
  const poetryLineHeight = Math.round(numericSize * 1.46);
  const ui = uiTokens[theme];
  const scriptureFont = getScriptureFontFamily(fontFamily);
  const uiFont = getUiFontFamily();
  const textColor = ui.text;
  const bgColor = ui.bg;
  const inactiveBg = ui.surface;
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const hasCustomTabName = Boolean(tab.name);
  const translationShortName = TRANSLATIONS[translation].shortName;

  const blockHighlightBg =
    theme === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.055)";
  const inlineHighlightBg =
    theme === "dark"
      ? "rgba(255,255,255,0.16)"
      : theme === "sepia"
        ? "rgba(120,85,40,0.16)"
        : "rgba(0,0,0,0.09)";

  const renderHeaderBlock = (item: ParsedBlockRow) => {
    const h = item.header;
    if (!h) {
      return null;
    }

    const bookName = BOOKS[item.book]?.book ?? "Genesis";
    const isPsalms = item.book === PSALMS_BOOK_INDEX;

    const topSpacingStyle =
      h.isChapterStart || h.isBookStart
        ? styles.bibleTopSpacing
        : styles.midChapterHeaderSpacing;

    const superscriptionKey =
      h.superscriptionVerse !== undefined
        ? makeVerseKey(item.book, item.chapter, h.superscriptionVerse)
        : null;
    const isSuperscriptionSelected =
      superscriptionKey !== null && selectedKeySet.has(superscriptionKey);
    const isSuperscriptionArrived =
      superscriptionKey !== null && superscriptionKey === arrivalVerseKey;

    return (
      <View style={[styles.headerContainer, topSpacingStyle]}>
        {/* Book Title at Chapter 1, or subtle uppercase kicker in custom-named tabs */}
        {h.bookTitle ? (
          <Pressable
            delayLongPress={300}
            onLongPress={() => openBookOverview(item.book)}
          >
            <Text
              style={[
                styles.bookHeading,
                {
                  fontSize: 22 + numericSize,
                  fontFamily: scriptureFont,
                  color: textColor,
                },
              ]}
            >
              {h.bookTitle}
            </Text>
          </Pressable>
        ) : h.isChapterStart && hasCustomTabName && !isPsalms ? (
          <Pressable
            delayLongPress={300}
            onLongPress={() => openBookOverview(item.book)}
          >
            <Text style={[styles.namedTabBookKicker, { color: textColor }]}>
              {bookName.toUpperCase()}
            </Text>
          </Pressable>
        ) : null}

        {/* Psalms Books I–V Major Division */}
        {h.majorSection ? (
          <Text
            style={[
              styles.majorSectionHeading,
              {
                fontSize: Math.max(12, Math.round(numericSize * 0.72)),
                color: accentColor,
              },
            ]}
          >
            {h.majorSection.toUpperCase()}
          </Text>
        ) : null}

        {/* Individual Psalm Heading ("Psalm 1" .. "Psalm 150") */}
        {h.psalmTitle ? (
          <Pressable
            delayLongPress={300}
            onLongPress={() => openBookOverview(item.book)}
          >
            <Text
              style={[
                styles.psalmHeading,
                {
                  fontSize: Math.round(8 + numericSize * 1.15),
                  fontFamily: scriptureFont,
                  color: textColor,
                },
              ]}
            >
              {h.psalmTitle}
            </Text>
          </Pressable>
        ) : null}

        {/* Section Heading (s1) */}
        {h.s1 ? (
          <Text
            style={[
              styles.sectionHeading1,
              {
                fontSize: Math.round(numericSize * 1.05),
                lineHeight: Math.round(numericSize * 1.34),
                fontFamily: scriptureFont,
                color: textColor,
              },
            ]}
          >
            {h.s1}
          </Text>
        ) : null}

        {/* Parallel Passage Cross-References (r) */}
        {h.refs ? (
          <Text
            style={[
              styles.sectionRefs,
              {
                fontSize: Math.max(12, Math.round(numericSize * 0.76)),
                lineHeight: Math.round(numericSize * 1.15),
                color: textColor,
              },
            ]}
          >
            {h.refs}
          </Text>
        ) : null}

        {/* Subheading / Speaker Heading (s2) */}
        {h.s2 ? (
          <Text
            style={[
              styles.sectionHeading2,
              {
                fontSize: Math.round(numericSize * 0.92),
                lineHeight: Math.round(numericSize * 1.28),
                color: textColor,
              },
            ]}
          >
            {h.s2}
          </Text>
        ) : null}

        {/* Psalm 119 Hebrew Acrostic Heading (qa) */}
        {h.acrostic ? (
          <Text
            style={[
              styles.acrosticHeading,
              {
                fontSize: Math.round(numericSize * 0.92),
                color: accentColor,
              },
            ]}
          >
            {h.acrostic}
          </Text>
        ) : null}

        {/* Canonical Psalm Superscription (d) */}
        {h.superscription ? (
          <Pressable
            disabled={h.superscriptionVerse === undefined}
            delayLongPress={260}
            onPress={
              h.superscriptionVerse !== undefined && isSelecting
                ? () =>
                    handleVersePress(
                      item.book,
                      item.chapter,
                      h.superscriptionVerse!
                    )
                : undefined
            }
            onLongPress={
              h.superscriptionVerse !== undefined
                ? () =>
                    toggleVerseInSelection(
                      item.book,
                      item.chapter,
                      h.superscriptionVerse!
                    )
                : undefined
            }
            style={
              isSuperscriptionSelected || isSuperscriptionArrived
                ? [
                    styles.highlightedBlock,
                    {
                      backgroundColor: blockHighlightBg,
                      borderLeftColor: accentBorder,
                    },
                  ]
                : undefined
            }
          >
            <Text
              style={[
                styles.superscriptionText,
                {
                  fontSize: Math.round(numericSize * 0.9),
                  lineHeight: Math.round(numericSize * 1.34),
                  color: textColor,
                },
              ]}
            >
              {h.superscription}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const hasNoteStartingAt = (book: number, chapter: number, verse: number) => {
    const ids = noteIdsByVerseKey[makeVerseKey(book, chapter, verse)];
    if (!ids || ids.length === 0) return false;
    return ids.some((id) => notesById[id]?.startVerse === verse);
  };

  const notePillBg =
    theme === "dark"
      ? "rgba(255,255,255,0.11)"
      : theme === "sepia"
        ? "rgba(62,48,32,0.09)"
        : "rgba(0,0,0,0.06)";

  const renderSegmentContent = (
    seg: VerseSegment,
    book: number,
    chapter: number,
    hasNote: boolean,
    showNoteDot: boolean
  ) => {
    const noteMark =
      hasNote && showNoteDot ? (
        <>
          <Text
            suppressHighlighting
            onPress={() => handleNoteIndicatorPress(book, chapter, seg.v)}
            style={{
              color: accentColor,
              backgroundColor: notePillBg,
              fontFamily: uiFont,
              fontSize: Math.max(11, Math.round(0.58 * numericSize)),
              fontWeight: "600",
              letterSpacing: 0.2,
            }}
          >
            {"\u00A0Note\u00A0"}
          </Text>
          {"\u00A0"}
        </>
      ) : null;

    return (
      <>
        {seg.c !== undefined ? (
          <>
            <Text
              style={{
                fontSize: 26 + numericSize,
                lineHeight: Math.round((26 + numericSize) * 1.05),
                fontFamily: scriptureFont,
                color: textColor,
              }}
            >
              {`${seg.c}`}
            </Text>
            {" "}
            {noteMark}
          </>
        ) : seg.n ? (
          <>
            <Text
              style={{
                color: accentColor,
                fontFamily: uiFont,
                fontSize: Math.round(0.66 * numericSize),
                fontWeight: "600",
                opacity: 0.85,
              }}
            >
              {`${seg.v}\u00A0`}
            </Text>
            {noteMark}
          </>
        ) : (
          noteMark
        )}
        {seg.t}
      </>
    );
  };

  const renderContentBlock = (item: ParsedBlockRow) => {
    const segments = item.segments;
    if (!segments || segments.length === 0) {
      return null;
    }

    const hasDropCap = segments.some((s) => s.c !== undefined);
    const hasStanzaBreak = (item.flags & BLOCK_FLAG_STANZA_BREAK) !== 0;
    const isMultiVerse = hasMultipleDistinctVerses(segments);

    const isPoetry =
      item.kind === "q1" ||
      item.kind === "q2" ||
      item.kind === "qr" ||
      item.kind === "mr";

    let blockStyle: ViewStyle = styles.proseParagraph;
    if (item.kind === "pmo") {
      blockStyle = styles.indentedProseParagraph;
    } else if (item.kind === "pc") {
      blockStyle = styles.centeredParagraph;
    } else if (item.kind === "li1") {
      blockStyle = styles.listItem1;
    } else if (item.kind === "li2") {
      blockStyle = styles.listItem2;
    } else if (item.kind === "q1") {
      blockStyle = hasDropCap ? styles.poetryLine1DropCap : styles.poetryLine1;
    } else if (item.kind === "q2") {
      blockStyle = styles.poetryLine2;
    } else if (item.kind === "qr") {
      blockStyle = styles.poetryRightRefrain;
    } else if (item.kind === "mr") {
      blockStyle = styles.musicalColophon;
    }

    const stanzaTopStyle = hasStanzaBreak
      ? isPoetry
        ? styles.poetryStanzaBreak
        : styles.proseSectionBreak
      : undefined;

    const baseTextStyle = {
      fontFamily: scriptureFont,
      fontSize:
        item.kind === "mr" ? Math.round(numericSize * 0.9) : numericSize,
      lineHeight: isPoetry ? poetryLineHeight : proseLineHeight,
      color: textColor,
      textAlign:
        item.kind === "pc"
          ? ("center" as const)
          : item.kind === "qr"
            ? ("right" as const)
            : ("left" as const),
      fontStyle:
        item.kind === "qr" || item.kind === "mr"
          ? ("italic" as const)
          : ("normal" as const),
      opacity: item.kind === "qr" || item.kind === "mr" ? 0.85 : 1,
    };

    if (!isMultiVerse) {
      const singleVerse = segments[0].v;
      const singleKey = makeVerseKey(item.book, item.chapter, singleVerse);
      const savedHighlight = highlightsByKey[singleKey];
      const hasNote = hasNoteStartingAt(item.book, item.chapter, singleVerse);
      const isSelected = selectedKeySet.has(singleKey);
      const isArrived = singleKey === arrivalVerseKey;

      const needsExtraHighlightPad =
        item.kind === "p" ||
        item.kind === "mr" ||
        item.kind === "qr" ||
        (item.kind === "q1" && hasDropCap);

      const inlineFill = savedHighlight
        ? highlightColors[theme][savedHighlight.color].fill
        : undefined;

      const showBlockFrame = isSelected || isArrived;

      return (
        <Pressable
          delayLongPress={260}
          onPress={
            isWeb || isSelecting
              ? () => toggleVerseInSelection(item.book, item.chapter, singleVerse)
              : undefined
          }
          onLongPress={
            isWeb
              ? undefined
              : () => toggleVerseInSelection(item.book, item.chapter, singleVerse)
          }
          style={[
            blockStyle,
            stanzaTopStyle,
            hasDropCap && styles.dropCapPadding,
            showBlockFrame && [
              styles.highlightedBlock,
              needsExtraHighlightPad && styles.highlightedBlockExtraPad,
              {
                backgroundColor: savedHighlight
                  ? "transparent"
                  : blockHighlightBg,
                borderLeftColor: accentBorder,
              },
            ],
          ]}
        >
          <Text style={baseTextStyle}>
            {segments.map((seg, idx) => {
              const showNoteDot =
                seg.c !== undefined ||
                Boolean(seg.n) ||
                (idx === 0 && singleVerse === 1 && seg.c === undefined && !isPoetry);
              return (
                <React.Fragment key={idx}>
                  {idx > 0 ? " " : null}
                  <Text
                    style={[
                      inlineFill ? { backgroundColor: inlineFill } : undefined,
                      isSelected
                        ? { textDecorationLine: "underline" }
                        : undefined,
                    ]}
                  >
                    {renderSegmentContent(
                      seg,
                      item.book,
                      item.chapter,
                      hasNote,
                      showNoteDot
                    )}
                  </Text>
                </React.Fragment>
              );
            })}
          </Text>
        </Pressable>
      );
    }

    // Multi-verse flowing paragraph: each verse span is individually selectable, highlightable, and note-marked
    return (
      <View
        style={[
          blockStyle,
          stanzaTopStyle,
          hasDropCap && styles.dropCapPadding,
        ]}
      >
        <Text style={baseTextStyle}>
          {segments.map((seg, idx) => {
            const segKey = makeVerseKey(item.book, item.chapter, seg.v);
            const savedHighlight = highlightsByKey[segKey];
            const hasNote = hasNoteStartingAt(item.book, item.chapter, seg.v);
            const isSelected = selectedKeySet.has(segKey);
            const isArrived = segKey === arrivalVerseKey;
            const showNoteDot =
              seg.c !== undefined ||
              Boolean(seg.n) ||
              (idx === 0 && seg.v === 1 && seg.c === undefined);

            const bg = savedHighlight
              ? highlightColors[theme][savedHighlight.color].fill
              : isSelected || isArrived
                ? inlineHighlightBg
                : undefined;

            return (
              <React.Fragment key={idx}>
                {idx > 0 ? " " : null}
                <Text
                  suppressHighlighting
                  onPress={
                    isWeb || isSelecting
                      ? () => toggleVerseInSelection(item.book, item.chapter, seg.v)
                      : undefined
                  }
                  onLongPress={
                    isWeb
                      ? undefined
                      : () => toggleVerseInSelection(item.book, item.chapter, seg.v)
                  }
                  style={[
                    bg ? { backgroundColor: bg } : undefined,
                    isSelected
                      ? { textDecorationLine: "underline" }
                      : undefined,
                  ]}
                >
                  {renderSegmentContent(
                    seg,
                    item.book,
                    item.chapter,
                    hasNote,
                    showNoteDot
                  )}
                </Text>
              </React.Fragment>
            );
          })}
        </Text>
      </View>
    );
  };

  const selectedCitation = isSelecting
    ? formatMultiVerseCitation(selectedRefs)
    : "";

  const primaryNote = overlappingNotes[0];

  const listExtraData = useMemo(
    () => ({
      theme,
      color,
      textSize,
      fontFamily,
      isDesktop,
      hasCustomTabName,
      arrivalVerseKey,
      selectedKeysSignature,
      studyRevision,
    }),
    [
      theme,
      color,
      textSize,
      fontFamily,
      isDesktop,
      hasCustomTabName,
      arrivalVerseKey,
      selectedKeysSignature,
      studyRevision,
    ]
  );

  const prevChapterRef = useMemo(
    () => getAdjacentChapterRef(targetRef.book, targetRef.chapter, -1),
    [targetRef.book, targetRef.chapter]
  );
  const nextChapterRef = useMemo(
    () => getAdjacentChapterRef(targetRef.book, targetRef.chapter, 1),
    [targetRef.book, targetRef.chapter]
  );

  const translationMeta = TRANSLATIONS[translation];

  const renderChapterNavRow = (compactTop = false) => (
    <View style={[styles.chapterNavRow, compactTop && styles.chapterNavRowTop]}>
      {prevChapterRef ? (
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            onNavigateChapter(tabIndex, prevChapterRef);
          }}
          style={({ pressed }) => [
            styles.chapterNavBtn,
            compactTop && styles.chapterNavBtnCompact,
            {
              backgroundColor: ui.surface,
              borderColor: ui.border,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.chapterNavLabel,
              compactTop && styles.chapterNavLabelCompact,
              { color: accentColor },
            ]}
            numberOfLines={1}
          >
            ← {formatChapterLabel(prevChapterRef.book, prevChapterRef.chapter)}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.chapterNavSpacer} />
      )}

      {nextChapterRef ? (
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            onNavigateChapter(tabIndex, nextChapterRef);
          }}
          style={({ pressed }) => [
            styles.chapterNavBtn,
            styles.chapterNavBtnRight,
            compactTop && styles.chapterNavBtnCompact,
            {
              backgroundColor: ui.surface,
              borderColor: ui.border,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.chapterNavLabel,
              compactTop && styles.chapterNavLabelCompact,
              { color: accentColor },
            ]}
            numberOfLines={1}
          >
            {formatChapterLabel(nextChapterRef.book, nextChapterRef.chapter)} →
          </Text>
        </Pressable>
      ) : (
        <View style={styles.chapterNavSpacer} />
      )}
    </View>
  );

  const renderChapterFooter = () => {
    const chapterFootnotes = isApi
      ? (apiChapter?.footnotes ?? [])
      : localFootnotes;
    const copyrightText =
      (isApi ? apiChapter?.copyright : null) || translationMeta.copyrightNotice;
    const publisherUrl = translationMeta.publisherUrl;
    const publisherLabel = translationMeta.publisherLinkLabel || publisherUrl;

    return (
      <View
        style={[
          styles.apiFooterWrap,
          { paddingBottom: Math.max(88, bottomInset + 64) },
        ]}
      >
        {/* Previous / Next Chapter Navigation */}
        {renderChapterNavRow(false)}

        {/* Chapter Footnotes (for both offline BSB/KJV/WEB and online NIV/NLT/NASB) */}
        {chapterFootnotes.length > 0 ? (
          <View
            style={[
              styles.apiFootnotesCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.apiFootnotesHeading, { color: ui.muted }]}>
              FOOTNOTES
            </Text>
            {chapterFootnotes.map((fn, i) => (
              <Text
                key={`${fn.verse}-${i}`}
                style={[styles.apiFootnoteLine, { color: ui.text }]}
              >
                <Text style={{ fontWeight: "700", color: accentColor }}>
                  {`v.${fn.verse} `}
                </Text>
                {fn.text}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Publisher Copyright & Required Links (online copyrighted translations) */}
        {isApi ? (
          <View
            style={[
              styles.apiAttributionCard,
              { borderTopColor: ui.border },
            ]}
          >
            <Text style={[styles.apiCopyrightText, { color: ui.muted }]}>
              {copyrightText}
            </Text>
            <View style={styles.apiLinkRow}>
              {publisherUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(publisherUrl).catch(() => {})}
                  hitSlop={6}
                >
                  <Text
                    style={[styles.apiAttributionLink, { color: accentColor }]}
                  >
                    {publisherLabel} ↗
                  </Text>
                </Pressable>
              ) : null}
              <Text style={[styles.apiLinkDot, { color: ui.muted }]}>·</Text>
              <Pressable
                onPress={() =>
                  Linking.openURL(API_BIBLE_ATTRIBUTION_URL).catch(() => {})
                }
                hitSlop={6}
              >
                <Text
                  style={[styles.apiAttributionLink, { color: accentColor }]}
                >
                  Powered by API.Bible ↗
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor },
        isDesktop && styles.desktopContainer,
        !isActive && styles.hiddenTab,
      ]}
    >
      {isApi && apiError && blocks.length === 0 ? (
        <View style={styles.stateColumn}>
          {renderChapterNavRow(true)}
          <View style={styles.webLoadingWrap}>
            <Text style={[styles.apiErrorTitle, { color: textColor }]}>
              Could not load {translationShortName}
            </Text>
            <Text style={[styles.apiErrorBody, { color: ui.muted }]}>
              {apiError}
            </Text>
            <View style={styles.apiErrorActions}>
              <Pressable
                onPress={() => setApiRetryTick((t) => t + 1)}
                style={({ pressed }) => [
                  styles.apiErrorBtn,
                  {
                    borderColor: accentBorder,
                    backgroundColor: ui.surface,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text style={[styles.apiErrorBtnText, { color: accentColor }]}>
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTranslation("bsb")}
                style={({ pressed }) => [
                  styles.apiErrorBtn,
                  {
                    borderColor: ui.border,
                    backgroundColor: ui.surface,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text style={[styles.apiErrorBtnText, { color: textColor }]}>
                  Switch to Offline BSB
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (isWeb || isApi) && (apiLoading || blocks.length === 0) ? (
        <View style={styles.stateColumn}>
          {renderChapterNavRow(true)}
          <View style={styles.webLoadingWrap}>
            <Text style={[styles.webLoadingText, { color: textColor }]}>
              Loading {formatChapterLabel(targetRef.book, targetRef.chapter)} ({translationShortName})…
            </Text>
          </View>
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={blocks}
          keyExtractor={blockKeyExtractor}
          getItemType={blockGetItemType}
          extraData={listExtraData}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={64}
          onScroll={handleScroll}
          onLoad={handleListLoad}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          ListHeaderComponent={renderChapterNavRow(true)}
          ListFooterComponent={renderChapterFooter()}
          renderItem={({ item }) =>
            item.kind === "header"
              ? renderHeaderBlock(item)
              : renderContentBlock(item)
          }
        />
      )}

      {/* Toast Pill */}
      {toastBanner ? (
        <View
          pointerEvents="none"
          style={[
            styles.toastPill,
            {
              bottom: Math.max(20, bottomInset + 16),
              backgroundColor: inactiveBg,
              borderColor: accentBorder,
            },
          ]}
        >
          <Text style={[styles.toastText, { color: textColor }]}>
            {toastBanner}
          </Text>
        </View>
      ) : null}

      {/* Daily-Driver Verse Action Bar: Highlight Swatches + Note Preview + Footnotes + Actions */}
      {isSelecting ? (
        <View
          style={[
            styles.actionBar,
            isDesktop && styles.actionBarDesktop,
            {
              paddingBottom: Math.max(12, bottomInset + 10),
              backgroundColor: ui.surfaceRaised,
              borderColor: ui.border,
              borderTopColor: accentBorder,
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.actionHeaderRow}>
            <View style={styles.actionTitleRow}>
              <Text
                style={[styles.actionCitation, { color: accentColor }]}
                numberOfLines={1}
              >
                {selectedCitation}
              </Text>
              <Text style={[styles.translationBadge, { color: textColor }]}>
                {translationShortName}
              </Text>
            </View>
            <Pressable
              onPress={dismissSelection}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss verse actions"
            >
              <Text style={[styles.actionDismiss, { color: textColor }]}>
                ×
              </Text>
            </Pressable>
          </View>

          {selectedRefs.length === 1 ? (
            <Text style={[styles.multiSelectHint, { color: textColor }]}>
              Tap more verses to select a range
            </Text>
          ) : null}

          {/* Highlight Swatches Row */}
          <View style={styles.swatchRow}>
            {HIGHLIGHT_COLORS.map((swatchKey) => {
              const entry = highlightColors[theme][swatchKey];
              const isSelectedSwatch = activeHighlightColor === swatchKey;
              return (
                <Pressable
                  key={swatchKey}
                  onPress={() => handleApplyHighlight(swatchKey)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Highlight ${swatchKey}`}
                  style={[
                    styles.swatchCircle,
                    {
                      backgroundColor: entry.swatch,
                      borderColor: isSelectedSwatch
                        ? textColor
                        : "rgba(0,0,0,0.22)",
                      borderWidth: isSelectedSwatch ? 2.5 : 1.5,
                    },
                  ]}
                >
                  {isSelectedSwatch ? (
                    <Text style={styles.swatchCheck}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
            {anySelectedHighlighted ? (
              <Pressable
                onPress={handleClearHighlight}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Clear highlight"
                style={[
                  styles.clearSwatchButton,
                  {
                    backgroundColor: bgColor,
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.28)"
                        : "rgba(0,0,0,0.25)",
                  },
                ]}
              >
                <Text style={[styles.clearSwatchText, { color: textColor }]}>
                  Clear
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Existing Note Preview Box(es) */}
          {overlappingNotes.length > 0 ? (
            <ScrollView
              style={styles.notesPreviewList}
              showsVerticalScrollIndicator={false}
            >
              {overlappingNotes.map((note) => (
                <Pressable
                  key={note.id}
                  onPress={() => handleOpenNoteForSelection(note)}
                  style={[
                    styles.notePreviewCard,
                    {
                      backgroundColor: bgColor,
                      borderLeftColor: accentBorder,
                    },
                  ]}
                >
                  <View style={styles.notePreviewHeader}>
                    <Text
                      style={[styles.notePreviewLabel, { color: accentColor }]}
                    >
                      Note •{" "}
                      {formatVerseRangeCitation(
                        note.book,
                        note.chapter,
                        note.startVerse,
                        note.endVerse
                      )}
                    </Text>
                    <Text
                      style={[styles.notePreviewEdit, { color: accentColor }]}
                    >
                      Edit
                    </Text>
                  </View>
                  <Text
                    style={[styles.notePreviewBody, { color: textColor }]}
                    numberOfLines={3}
                  >
                    {note.body}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Translator Footnotes */}
          {combinedFootnotes ? (
            <ScrollView
              style={[
                styles.footnoteBox,
                {
                  backgroundColor: bgColor,
                  borderLeftColor: accentBorder,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.footnoteText, { color: textColor }]}>
                {combinedFootnotes}
              </Text>
            </ScrollView>
          ) : null}

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.actionPill, { backgroundColor: bgColor }]}
              onPress={() => handleOpenNoteForSelection(primaryNote)}
            >
              <Text style={[styles.actionPillText, { color: accentColor }]}>
                {primaryNote ? "Edit Note" : "+ Note"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionPill, { backgroundColor: bgColor }]}
              onPress={handleCopySelected}
            >
              <Text style={[styles.actionPillText, { color: textColor }]}>
                Copy
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionPill, { backgroundColor: bgColor }]}
              onPress={handleShareSelected}
            >
              <Text style={[styles.actionPillText, { color: textColor }]}>
                Share
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionPill, { backgroundColor: bgColor }]}
              onPress={() => {
                const b = selectedRefs[0].book;
                setSelectedRefs([]);
                openBookOverview(b);
              }}
            >
              <Text style={[styles.actionPillText, { color: textColor }]}>
                Info ↗
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  desktopContainer: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 32,
  },
  stateColumn: {
    flex: 1,
  },
  webLoadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  webLoadingText: {
    fontSize: 16,
    opacity: 0.55,
  },
  hiddenTab: {
    display: "none",
  },
  headerContainer: {
    paddingBottom: 5,
  },
  bibleTopSpacing: {
    paddingTop: 10,
  },
  chapterSpacing: {
    paddingTop: 28,
  },
  bookBreakSpacing: {
    paddingTop: 42,
  },
  midChapterHeaderSpacing: {
    paddingTop: 16,
  },
  bookHeading: {
    fontWeight: "700",
    marginBottom: 6,
  },
  namedTabBookKicker: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    opacity: 0.45,
    marginBottom: 4,
  },
  majorSectionHeading: {
    fontWeight: "700",
    letterSpacing: 1.3,
    marginTop: 4,
    marginBottom: 8,
  },
  psalmHeading: {
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 4,
  },
  sectionHeading1: {
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 2,
  },
  sectionRefs: {
    fontStyle: "italic",
    opacity: 0.6,
    marginBottom: 3,
  },
  sectionHeading2: {
    fontWeight: "600",
    fontStyle: "italic",
    opacity: 0.82,
    marginTop: 3,
    marginBottom: 2,
  },
  acrosticHeading: {
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 2,
  },
  superscriptionText: {
    fontStyle: "italic",
    opacity: 0.85,
    marginTop: 3,
    marginBottom: 2,
  },
  dropCapPadding: {
    paddingTop: 2,
  },
  proseParagraph: {
    marginBottom: 10,
    paddingVertical: 1,
  },
  indentedProseParagraph: {
    paddingLeft: 14,
    marginBottom: 10,
    paddingVertical: 1,
  },
  centeredParagraph: {
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  listItem1: {
    paddingLeft: 12,
    marginBottom: 4,
    paddingVertical: 1,
  },
  listItem2: {
    paddingLeft: 26,
    marginBottom: 3,
    paddingVertical: 1,
  },
  poetryLine1: {
    paddingLeft: 8,
    paddingRight: 4,
    marginBottom: 2,
  },
  poetryLine1DropCap: {
    paddingRight: 4,
    marginBottom: 2,
  },
  poetryLine2: {
    paddingLeft: 26,
    paddingRight: 4,
    marginBottom: 2,
  },
  poetryRightRefrain: {
    paddingRight: 4,
    marginTop: 2,
    marginBottom: 8,
  },
  musicalColophon: {
    marginTop: 8,
    marginBottom: 8,
  },
  poetryStanzaBreak: {
    marginTop: 13,
  },
  proseSectionBreak: {
    marginTop: 10,
  },
  highlightedBlock: {
    borderLeftWidth: 3,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: 4,
  },
  highlightedBlockExtraPad: {
    paddingLeft: 8,
  },
  toastPill: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 4,
  },
  toastText: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 2,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  actionBarDesktop: {
    left: 24,
    right: 24,
    bottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderTopWidth: 2.5,
  },
  actionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  actionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  actionCitation: {
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  translationBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  actionDismiss: {
    fontSize: 24,
    lineHeight: 24,
    opacity: 0.7,
  },
  multiSelectHint: {
    fontSize: 12,
    opacity: 0.52,
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  swatchCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchCheck: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },
  clearSwatchButton: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearSwatchText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },
  notesPreviewList: {
    maxHeight: 115,
    marginBottom: 8,
  },
  notePreviewCard: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  notePreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  notePreviewLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  notePreviewEdit: {
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  notePreviewBody: {
    fontSize: 14,
    lineHeight: 19,
  },
  footnoteBox: {
    maxHeight: 92,
    borderLeftWidth: 2.5,
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  footnoteText: {
    fontSize: 14,
    lineHeight: 19,
    opacity: 0.88,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  apiFooterWrap: {
    paddingTop: 22,
    gap: 16,
  },
  chapterNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  chapterNavRowTop: {
    paddingTop: 12,
    paddingBottom: 2,
  },
  chapterNavBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  chapterNavBtnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chapterNavBtnRight: {
    alignItems: "flex-end",
  },
  chapterNavSpacer: {
    flex: 1,
  },
  chapterNavLabel: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  chapterNavLabelCompact: {
    fontSize: 13.5,
  },
  apiFootnotesCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  apiFootnotesHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  apiFootnoteLine: {
    fontSize: 13.5,
    lineHeight: 19.5,
    opacity: 0.88,
  },
  apiAttributionCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 8,
  },
  apiCopyrightText: {
    fontSize: 12,
    lineHeight: 18,
  },
  apiLinkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  apiAttributionLink: {
    fontSize: 12.5,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  apiLinkDot: {
    fontSize: 12,
  },
  apiErrorTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  apiErrorBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 360,
    marginBottom: 16,
  },
  apiErrorActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  apiErrorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1.25,
  },
  apiErrorBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
