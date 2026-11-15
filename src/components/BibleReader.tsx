import { FlashList, type ViewToken } from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import {
  BOOKS,
  PSALMS_BOOK_INDEX,
  formatVerseCitation,
  getGotQuestionsBookUrl,
  parseReference,
} from "../constants/books";
import { colors } from "../constants/colors";
import {
  TOTAL_BIBLE_VERSES,
  getVerseIdSync,
  getVersesByIdRangeSync,
} from "../db/queries";
import type { RuntimeTab } from "../store/useAppStore";
import type {
  AccentColorName,
  TextSizeOption,
  ThemeName,
  VerseRow,
} from "../types";

const WINDOW_BATCH_SIZE = 80;

interface BibleReaderProps {
  tab: RuntimeTab;
  tabIndex: number;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  bottomInset: number;
  onSyncScrolledReference: (tabIndex: number, refString: string) => void;
}

interface InitialWindowState {
  verses: VerseRow[];
  initialIndex: number;
  initialTargetId: number;
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
  theme,
  color,
  textSize,
  bottomInset,
  onSyncScrolledReference,
}: BibleReaderProps) {
  const db = useSQLiteContext();
  const hasLoadedRef = useRef(false);
  const isPrependingRef = useRef(false);
  const isAppendingRef = useRef(false);

  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;
  const syncRefCallback = useRef(onSyncScrolledReference);
  syncRefCallback.current = onSyncScrolledReference;

  const [{ verses, initialIndex, initialTargetId }, setWindowState] =
    useState<InitialWindowState>(() => {
      const target = parseReference(tab.reference);
      const targetId = getVerseIdSync(
        db,
        target.book,
        target.chapter,
        target.verse
      );
      const startId = Math.max(1, targetId - WINDOW_BATCH_SIZE);
      const endId = Math.min(TOTAL_BIBLE_VERSES, targetId + WINDOW_BATCH_SIZE);
      const initialVerses = getVersesByIdRangeSync(db, startId, endId);
      return {
        verses: initialVerses,
        initialIndex: Math.max(0, targetId - startId),
        initialTargetId: targetId,
      };
    });

  const [arrivalVerseId, setArrivalVerseId] = useState<number | null>(() =>
    tab.highlightRef ? initialTargetId : null
  );
  const [selectedVerse, setSelectedVerse] = useState<VerseRow | null>(null);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (arrivalVerseId === null) {
      return;
    }
    const timer = setTimeout(() => {
      setArrivalVerseId(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [arrivalVerseId]);

  useEffect(() => {
    if (!selectedVerse) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedVerse(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedVerse]);

  useEffect(() => {
    if (!copiedBanner) {
      return;
    }
    const timer = setTimeout(() => {
      setCopiedBanner(null);
    }, 1600);
    return () => clearTimeout(timer);
  }, [copiedBanner]);

  const handleStartReached = useCallback(() => {
    if (isPrependingRef.current) {
      return;
    }
    setWindowState((prev) => {
      const firstId = prev.verses[0]?.id;
      if (!firstId || firstId <= 1) {
        return prev;
      }
      isPrependingRef.current = true;
      const newStartId = Math.max(1, firstId - WINDOW_BATCH_SIZE);
      const olderVerses = getVersesByIdRangeSync(db, newStartId, firstId - 1);
      isPrependingRef.current = false;
      if (olderVerses.length === 0) {
        return prev;
      }
      return {
        ...prev,
        verses: [...olderVerses, ...prev.verses],
      };
    });
  }, [db]);

  const handleEndReached = useCallback(() => {
    if (isAppendingRef.current) {
      return;
    }
    setWindowState((prev) => {
      const lastId = prev.verses[prev.verses.length - 1]?.id;
      if (!lastId || lastId >= TOTAL_BIBLE_VERSES) {
        return prev;
      }
      isAppendingRef.current = true;
      const newEndId = Math.min(TOTAL_BIBLE_VERSES, lastId + WINDOW_BATCH_SIZE);
      const newerVerses = getVersesByIdRangeSync(db, lastId + 1, newEndId);
      isAppendingRef.current = false;
      if (newerVerses.length === 0) {
        return prev;
      }
      return {
        ...prev,
        verses: [...prev.verses, ...newerVerses],
      };
    });
  }, [db]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<VerseRow>[] }) => {
      if (!hasLoadedRef.current || viewableItems.length === 0) {
        return;
      }
      const topItem = viewableItems[0]?.item;
      if (topItem) {
        syncRefCallback.current(
          tabIndexRef.current,
          `${topItem.book},${topItem.chapter},${topItem.verse}`
        );
      }
    },
    []
  );

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged,
    },
  ]);

  const openBookOverview = useCallback((bookIndex: number) => {
    triggerLightHaptic();
    Linking.openURL(getGotQuestionsBookUrl(bookIndex)).catch(() => {});
  }, []);

  const handleLongPressVerse = useCallback((verse: VerseRow) => {
    triggerLightHaptic();
    setSelectedVerse((prev) => (prev?.id === verse.id ? null : verse));
  }, []);

  const handleCopySelected = async () => {
    if (!selectedVerse) {
      return;
    }
    const citation = formatVerseCitation(
      selectedVerse.book,
      selectedVerse.chapter,
      selectedVerse.verse
    );
    const formatted = `${citation} — ${selectedVerse.text}`;
    await Clipboard.setStringAsync(formatted);
    triggerLightHaptic();
    setSelectedVerse(null);
    setCopiedBanner(`Copied ${citation}`);
  };

  const handleShareSelected = async () => {
    if (!selectedVerse) {
      return;
    }
    const citation = formatVerseCitation(
      selectedVerse.book,
      selectedVerse.chapter,
      selectedVerse.verse
    );
    const formatted = `${citation} — ${selectedVerse.text}`;
    setSelectedVerse(null);
    try {
      await Share.share({ message: formatted });
    } catch {
      // User dismissed share sheet
    }
  };

  const numericSize = Number(textSize);
  const lineHeight = Math.round(numericSize * 1.45);
  const textColor = colors.bible.text[theme];
  const bgColor = colors.bible.background[theme];
  const inactiveBg = colors.tab.tab.inactive[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const hasCustomTabName = Boolean(tab.name);
  const isAtBibleEnd = verses[verses.length - 1]?.id === TOTAL_BIBLE_VERSES;

  const highlightBg =
    theme === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <FlashList
        data={verses}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => `${item.id}`}
        getItemType={(item) => {
          if (item.verse !== 1) return "verse";
          if (item.chapter === 1) return "bookStart";
          return "chapterStart";
        }}
        extraData={{
          theme,
          color,
          textSize,
          hasCustomTabName,
          arrivalVerseId,
          selectedVerseId: selectedVerse?.id ?? null,
        }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          if (selectedVerse) {
            setSelectedVerse(null);
          }
        }}
        onLoad={() => {
          hasLoadedRef.current = true;
        }}
        onStartReached={handleStartReached}
        onStartReachedThreshold={1.5}
        onEndReached={handleEndReached}
        onEndReachedThreshold={1.5}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        ListFooterComponent={
          isAtBibleEnd ? (
            <View style={{ height: Math.max(64, bottomInset + 40) }} />
          ) : null
        }
        renderItem={({ item }) => {
          const isHighlighted =
            item.id === arrivalVerseId || item.id === selectedVerse?.id;
          const highlightStyle = isHighlighted
            ? [
                styles.highlightedVerse,
                {
                  backgroundColor: highlightBg,
                  borderLeftColor: accentBorder,
                },
              ]
            : undefined;

          if (item.verse === 1) {
            const bookInfo = BOOKS[item.book];
            const bookName = bookInfo.book;
            const isPsalms = item.book === PSALMS_BOOK_INDEX;
            const isSingleChapterBook = bookInfo.chapters === 1;
            const isBookStart = item.chapter === 1;

            return (
              <View
                style={
                  item.id > 1
                    ? isBookStart
                      ? styles.bookBreakSpacing
                      : styles.chapterSpacing
                    : styles.bibleTopSpacing
                }
              >
                {/* Full Book Title only at Chapter 1 */}
                {isBookStart ? (
                  <Pressable
                    delayLongPress={300}
                    onLongPress={() => openBookOverview(item.book)}
                  >
                    <Text
                      style={[
                        styles.bookHeading,
                        {
                          fontSize: 30 + numericSize,
                          color: textColor,
                        },
                      ]}
                    >
                      {bookName}
                    </Text>
                  </Pressable>
                ) : hasCustomTabName && !isPsalms ? (
                  <Pressable
                    delayLongPress={300}
                    onLongPress={() => openBookOverview(item.book)}
                  >
                    <Text
                      style={[
                        styles.namedTabBookKicker,
                        { color: textColor },
                      ]}
                    >
                      {bookName.toUpperCase()}
                    </Text>
                  </Pressable>
                ) : null}

                {/* Individual Psalm Heading ("Psalm 1" .. "Psalm 150") */}
                {isPsalms ? (
                  <Pressable
                    delayLongPress={300}
                    onLongPress={() => openBookOverview(item.book)}
                  >
                    <Text
                      style={[
                        styles.psalmHeading,
                        {
                          fontSize: Math.round(8 + numericSize * 1.15),
                          color: textColor,
                        },
                      ]}
                    >
                      {`Psalm ${item.chapter}`}
                    </Text>
                  </Pressable>
                ) : null}

                {/* Verse 1 Body */}
                <Pressable
                  delayLongPress={260}
                  onPress={() => {
                    if (selectedVerse) {
                      setSelectedVerse(null);
                    }
                  }}
                  onLongPress={() => handleLongPressVerse(item)}
                  style={[styles.verseBlock, highlightStyle]}
                >
                  {isPsalms || isSingleChapterBook ? (
                    <Text
                      style={{
                        fontSize: numericSize,
                        lineHeight,
                        color: textColor,
                      }}
                    >
                      {isPsalms ? (
                        <Text
                          style={{
                            color: accentColor,
                            fontSize: 0.7 * numericSize,
                          }}
                        >
                          {"1 "}
                        </Text>
                      ) : null}
                      {item.text}
                    </Text>
                  ) : (
                    <Text>
                      <Text
                        style={{
                          fontSize: 30 + numericSize,
                          color: textColor,
                        }}
                      >
                        {`${item.chapter}`}
                      </Text>
                      <Text> </Text>
                      <Text
                        style={{
                          fontSize: numericSize,
                          lineHeight,
                          color: textColor,
                        }}
                      >
                        {item.text}
                      </Text>
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              delayLongPress={260}
              onPress={() => {
                if (selectedVerse) {
                  setSelectedVerse(null);
                }
              }}
              onLongPress={() => handleLongPressVerse(item)}
              style={[styles.verseBlock, highlightStyle]}
            >
              <Text
                style={{
                  fontSize: numericSize,
                  lineHeight,
                  color: textColor,
                }}
              >
                <Text
                  style={{
                    color: accentColor,
                    fontSize: 0.7 * numericSize,
                  }}
                >
                  {`${item.verse} `}
                </Text>
                {item.text}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Copied Toast Pill */}
      {copiedBanner ? (
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
            {copiedBanner}
          </Text>
        </View>
      ) : null}

      {/* Minimalist Long-Press Verse Action Bar */}
      {selectedVerse ? (
        <View
          style={[
            styles.actionBar,
            {
              paddingBottom: Math.max(12, bottomInset + 10),
              backgroundColor: inactiveBg,
              borderTopColor: accentBorder,
            },
          ]}
        >
          <View style={styles.actionHeaderRow}>
            <Text style={[styles.actionCitation, { color: accentColor }]}>
              {formatVerseCitation(
                selectedVerse.book,
                selectedVerse.chapter,
                selectedVerse.verse
              )}
            </Text>
            <Pressable
              onPress={() => setSelectedVerse(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss verse actions"
            >
              <Text style={[styles.actionDismiss, { color: textColor }]}>
                ×
              </Text>
            </Pressable>
          </View>
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.actionPill, { backgroundColor: bgColor }]}
              onPress={handleCopySelected}
            >
              <Text style={[styles.actionPillText, { color: textColor }]}>
                Copy Verse
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
                const b = selectedVerse.book;
                setSelectedVerse(null);
                openBookOverview(b);
              }}
            >
              <Text style={[styles.actionPillText, { color: textColor }]}>
                Book Info ↗
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
    paddingHorizontal: 14,
  },
  bibleTopSpacing: {
    paddingTop: 8,
  },
  chapterSpacing: {
    paddingTop: 26,
  },
  bookBreakSpacing: {
    paddingTop: 40,
  },
  bookHeading: {
    marginBottom: 4,
  },
  namedTabBookKicker: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    opacity: 0.45,
    marginBottom: 2,
  },
  psalmHeading: {
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 6,
  },
  verseBlock: {
    marginBottom: 5,
    paddingVertical: 1,
  },
  highlightedVerse: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 4,
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
    paddingTop: 10,
    paddingHorizontal: 14,
    borderTopWidth: 2.5,
    elevation: 8,
  },
  actionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionCitation: {
    fontSize: 17,
    fontWeight: "700",
  },
  actionDismiss: {
    fontSize: 24,
    lineHeight: 24,
    opacity: 0.7,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
