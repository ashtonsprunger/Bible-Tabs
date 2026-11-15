import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  formatVerseCitation,
  getGotQuestionsBookUrl,
  parseReference,
} from "../constants/books";
import { colors } from "../constants/colors";
import {
  BLOCK_FLAG_STANZA_BREAK,
  TOTAL_BIBLE_BLOCKS,
  getBlocksByIdRangeSync,
  getTargetBlockIdSync,
  getVerseDetailsSync,
} from "../db/queries";
import type { RuntimeTab } from "../store/useAppStore";
import type {
  AccentColorName,
  ParsedBlockRow,
  TextSizeOption,
  ThemeName,
  VerseRow,
  VerseSegment,
} from "../types";

const WINDOW_BATCH_SIZE = 90;

interface BibleReaderProps {
  tab: RuntimeTab;
  tabIndex: number;
  isActive: boolean;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  bottomInset: number;
  onSyncScrolledReference: (tabIndex: number, refString: string) => void;
}

interface InitialWindowState {
  blocks: ParsedBlockRow[];
  initialArrivalKey: string | null;
}

function makeVerseKey(book: number, chapter: number, verse: number): string {
  return `${book},${chapter},${verse}`;
}

function hasMultipleDistinctVerses(segments: VerseSegment[] | undefined): boolean {
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
  bottomInset,
  onSyncScrolledReference,
}: BibleReaderProps) {
  const db = useSQLiteContext();
  const listRef = useRef<FlashListRef<ParsedBlockRow>>(null);
  const hasLoadedRef = useRef(false);
  const isPrependingRef = useRef(false);
  const isAppendingRef = useRef(false);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;
  const syncRefCallback = useRef(onSyncScrolledReference);
  syncRefCallback.current = onSyncScrolledReference;

  // Mount starting at target block (index 0) to avoid FlashList v2's initialScrollIndex > 0 layout gap bug;
  // onStartReached immediately prepends older blocks once first layout commits via native ScrollAnchor.
  const [{ blocks, initialArrivalKey }, setWindowState] =
    useState<InitialWindowState>(() => {
      const target = parseReference(tab.reference);
      const { blockId, resolvedVerse } = getTargetBlockIdSync(
        db,
        target.book,
        target.chapter,
        target.verse,
        Boolean(tab.highlightRef)
      );
      const endId = Math.min(TOTAL_BIBLE_BLOCKS, blockId + WINDOW_BATCH_SIZE);
      const initialBlocks = getBlocksByIdRangeSync(db, blockId, endId);
      return {
        blocks: initialBlocks,
        initialArrivalKey: tab.highlightRef
          ? makeVerseKey(target.book, target.chapter, resolvedVerse)
          : null,
      };
    });

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const [arrivalVerseKey, setArrivalVerseKey] = useState<string | null>(
    initialArrivalKey
  );
  const [selectedVerse, setSelectedVerse] = useState<VerseRow | null>(null);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  const selectedVerseKey = selectedVerse
    ? makeVerseKey(selectedVerse.book, selectedVerse.chapter, selectedVerse.verse)
    : null;

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
      const firstId = prev.blocks[0]?.id;
      if (!firstId || firstId <= 1) {
        return prev;
      }
      isPrependingRef.current = true;
      const newStartId = Math.max(1, firstId - WINDOW_BATCH_SIZE);
      const olderBlocks = getBlocksByIdRangeSync(db, newStartId, firstId - 1);
      isPrependingRef.current = false;
      if (olderBlocks.length === 0) {
        return prev;
      }
      return {
        ...prev,
        blocks: [...olderBlocks, ...prev.blocks],
      };
    });
  }, [db]);

  const handleEndReached = useCallback(() => {
    if (isAppendingRef.current) {
      return;
    }
    setWindowState((prev) => {
      const lastId = prev.blocks[prev.blocks.length - 1]?.id;
      if (!lastId || lastId >= TOTAL_BIBLE_BLOCKS) {
        return prev;
      }
      isAppendingRef.current = true;
      const newEndId = Math.min(TOTAL_BIBLE_BLOCKS, lastId + WINDOW_BATCH_SIZE);
      const newerBlocks = getBlocksByIdRangeSync(db, lastId + 1, newEndId);
      isAppendingRef.current = false;
      if (newerBlocks.length === 0) {
        return prev;
      }
      return {
        ...prev,
        blocks: [...prev.blocks, ...newerBlocks],
      };
    });
  }, [db]);

  const syncVisibleTopItem = useCallback((item: ParsedBlockRow | undefined) => {
    if (!hasLoadedRef.current || !isActiveRef.current || !item) {
      return;
    }
    syncRefCallback.current(
      tabIndexRef.current,
      `${item.book},${item.chapter},${item.verse}`
    );
  }, []);

  const handleScroll = useCallback(() => {
    if (!hasLoadedRef.current || !isActiveRef.current) {
      return;
    }
    const firstIdx = listRef.current?.getFirstVisibleIndex() ?? -1;
    if (firstIdx >= 0) {
      syncVisibleTopItem(blocksRef.current[firstIdx]);
    }
  }, [syncVisibleTopItem]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ParsedBlockRow>[] }) => {
      if (viewableItems.length > 0) {
        syncVisibleTopItem(viewableItems[0]?.item);
      }
    },
    [syncVisibleTopItem]
  );

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
    setSelectedVerse(null);
  }, []);

  const handleSelectVerse = useCallback(
    (book: number, chapter: number, verse: number) => {
      triggerLightHaptic();
      setSelectedVerse((prev) => {
        if (
          prev &&
          prev.book === book &&
          prev.chapter === chapter &&
          prev.verse === verse
        ) {
          return null;
        }
        return getVerseDetailsSync(db, book, chapter, verse);
      });
    },
    [db]
  );

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
  const proseLineHeight = Math.round(numericSize * 1.48);
  const poetryLineHeight = Math.round(numericSize * 1.42);
  const textColor = colors.bible.text[theme];
  const bgColor = colors.bible.background[theme];
  const inactiveBg = colors.tab.tab.inactive[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const hasCustomTabName = Boolean(tab.name);
  const isAtBibleEnd = blocks[blocks.length - 1]?.id === TOTAL_BIBLE_BLOCKS;

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
      item.id === 1
        ? styles.bibleTopSpacing
        : h.isBookStart
          ? styles.bookBreakSpacing
          : h.isChapterStart
            ? styles.chapterSpacing
            : styles.midChapterHeaderSpacing;

    const superscriptionKey =
      h.superscriptionVerse !== undefined
        ? makeVerseKey(item.book, item.chapter, h.superscriptionVerse)
        : null;
    const isSuperscriptionHighlighted =
      superscriptionKey !== null &&
      (superscriptionKey === arrivalVerseKey ||
        superscriptionKey === selectedVerseKey);

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
                  fontSize: 28 + numericSize,
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
            onPress={selectedVerse ? dismissSelection : undefined}
            onLongPress={
              h.superscriptionVerse !== undefined
                ? () =>
                    handleSelectVerse(
                      item.book,
                      item.chapter,
                      h.superscriptionVerse!
                    )
                : undefined
            }
            style={
              isSuperscriptionHighlighted
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

  const renderSegmentContent = (seg: VerseSegment) => (
    <>
      {seg.c !== undefined ? (
        <>
          <Text
            style={{
              fontSize: 30 + numericSize,
              color: textColor,
            }}
          >
            {`${seg.c}`}
          </Text>
          {" "}
        </>
      ) : seg.n ? (
        <Text
          style={{
            color: accentColor,
            fontSize: Math.round(0.68 * numericSize),
            fontWeight: "600",
          }}
        >
          {`${seg.v}\u00A0`}
        </Text>
      ) : null}
      {seg.t}
    </>
  );

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

    // Block-level spacing and indentation by USJ paragraph/poetry marker
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

    // Omit lineHeight on paragraphs with a large chapter drop-cap so Android's CustomLineHeightSpan
    // never clips the top of tall chapter digits (e.g. "42").
    const baseTextStyle = {
      fontSize:
        item.kind === "mr" ? Math.round(numericSize * 0.9) : numericSize,
      lineHeight: hasDropCap
        ? undefined
        : isPoetry
          ? poetryLineHeight
          : proseLineHeight,
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
      const isHighlighted =
        singleKey === arrivalVerseKey || singleKey === selectedVerseKey;

      const needsExtraHighlightPad =
        item.kind === "p" ||
        item.kind === "mr" ||
        item.kind === "qr" ||
        (item.kind === "q1" && hasDropCap);

      return (
        <Pressable
          delayLongPress={260}
          onPress={selectedVerse ? dismissSelection : undefined}
          onLongPress={() =>
            handleSelectVerse(item.book, item.chapter, singleVerse)
          }
          style={[
            blockStyle,
            stanzaTopStyle,
            hasDropCap && styles.dropCapPadding,
            isHighlighted && [
              styles.highlightedBlock,
              needsExtraHighlightPad && styles.highlightedBlockExtraPad,
              {
                backgroundColor: blockHighlightBg,
                borderLeftColor: accentBorder,
              },
            ],
          ]}
        >
          <Text style={baseTextStyle}>
            {segments.map((seg, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 ? " " : null}
                {renderSegmentContent(seg)}
              </React.Fragment>
            ))}
          </Text>
        </Pressable>
      );
    }

    // Multi-verse flowing paragraph: each verse span is individually long-pressable and inline-highlightable
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
            const isInlineHighlighted =
              segKey === arrivalVerseKey || segKey === selectedVerseKey;

            return (
              <React.Fragment key={idx}>
                {idx > 0 ? " " : null}
                <Text
                  suppressHighlighting
                  onPress={selectedVerse ? dismissSelection : undefined}
                  onLongPress={() =>
                    handleSelectVerse(item.book, item.chapter, seg.v)
                  }
                  style={
                    isInlineHighlighted
                      ? { backgroundColor: inlineHighlightBg }
                      : undefined
                  }
                >
                  {renderSegmentContent(seg)}
                </Text>
              </React.Fragment>
            );
          })}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor },
        !isActive && styles.hiddenTab,
      ]}
    >
      <FlashList
        ref={listRef}
        data={blocks}
        keyExtractor={(item) => `${item.id}`}
        getItemType={(item) => {
          if (item.kind === "header") return "header";
          if (hasMultipleDistinctVerses(item.segments)) return "multiVerse";
          return "singleVerse";
        }}
        extraData={{
          theme,
          color,
          textSize,
          hasCustomTabName,
          arrivalVerseKey,
          selectedVerseKey,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={handleScroll}
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
        renderItem={({ item }) =>
          item.kind === "header"
            ? renderHeaderBlock(item)
            : renderContentBlock(item)
        }
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

      {/* Minimalist Long-Press Verse Action Bar + Translator Footnotes */}
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
            <View style={styles.actionTitleRow}>
              <Text style={[styles.actionCitation, { color: accentColor }]}>
                {formatVerseCitation(
                  selectedVerse.book,
                  selectedVerse.chapter,
                  selectedVerse.verse
                )}
              </Text>
              <Text style={[styles.translationBadge, { color: textColor }]}>
                BSB
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

          {selectedVerse.footnotes ? (
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
                {selectedVerse.footnotes}
              </Text>
            </ScrollView>
          ) : null}

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
    paddingHorizontal: 15,
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
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionCitation: {
    fontSize: 17,
    fontWeight: "700",
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
  footnoteBox: {
    maxHeight: 105,
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
