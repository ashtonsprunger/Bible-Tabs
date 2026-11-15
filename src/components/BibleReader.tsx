import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from "@shopify/flash-list";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import {
  BOOKS,
  getNextChapter,
  getPreviousChapter,
  parseReference,
} from "../constants/books";
import { colors } from "../constants/colors";
import { getChapterVersesSync } from "../db/queries";
import type { RuntimeTab } from "../store/useAppStore";
import type {
  AccentColorName,
  TextSizeOption,
  ThemeName,
  VerseRow,
} from "../types";
import MyButton from "./MyButton";

interface BibleReaderProps {
  tab: RuntimeTab;
  tabIndex: number;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  bottomInset: number;
  onSyncScrolledReference: (tabIndex: number, refString: string) => void;
  onToggleSearch: () => void;
}

export default function BibleReader({
  tab,
  tabIndex,
  theme,
  color,
  textSize,
  bottomInset,
  onSyncScrolledReference,
  onToggleSearch,
}: BibleReaderProps) {
  const db = useSQLiteContext();
  const listRef = useRef<FlashListRef<VerseRow>>(null);
  const isJumpingRef = useRef(true);

  // Keep latest callbacks/indices in refs for stable viewability listener
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;
  const syncRefCallback = useRef(onSyncScrolledReference);
  syncRefCallback.current = onSyncScrolledReference;

  const initialRef = parseReference(tab.reference);
  const [chapterData, setChapterData] = useState<VerseRow[]>(() =>
    getChapterVersesSync(db, initialRef.book, initialRef.chapter)
  );
  const initialIndex =
    initialRef.verse > 1 && chapterData.length > 0
      ? Math.min(chapterData.length - 1, initialRef.verse - 1)
      : undefined;
  const [pendingScrollVerse, setPendingScrollVerse] = useState<number | null>(
    initialRef.verse
  );

  // Reload chapter and jump to verse whenever the active tab switches or an explicit navigation happens
  const lastNavKeyRef = useRef(`${tab.id}:${tab.navVersion}`);
  useEffect(() => {
    const navKey = `${tab.id}:${tab.navVersion}`;
    if (lastNavKeyRef.current === navKey) {
      return;
    }
    lastNavKeyRef.current = navKey;

    const target = parseReference(tab.reference);
    const verses = getChapterVersesSync(db, target.book, target.chapter);
    isJumpingRef.current = true;
    setChapterData(verses);
    setPendingScrollVerse(target.verse);
  }, [db, tab.id, tab.navVersion, tab.reference]);

  // Perform the scroll once chapterData has rendered
  useEffect(() => {
    if (pendingScrollVerse === null || chapterData.length === 0) {
      return;
    }

    const targetIndex = Math.max(
      0,
      Math.min(chapterData.length - 1, pendingScrollVerse - 1)
    );

    const timer = setTimeout(() => {
      if (targetIndex === 0) {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      } else {
        listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      }
      setPendingScrollVerse(null);
      setTimeout(() => {
        isJumpingRef.current = false;
      }, 80);
    }, 20);

    return () => clearTimeout(timer);
  }, [pendingScrollVerse, chapterData]);

  const handlePreviousChapter = useCallback(() => {
    const firstVerse = chapterData[0];
    if (!firstVerse) return;
    const prev = getPreviousChapter(firstVerse.book, firstVerse.chapter);
    if (!prev) return;

    isJumpingRef.current = true;
    const verses = getChapterVersesSync(db, prev.book, prev.chapter);
    setChapterData(verses);
    syncRefCallback.current(tabIndexRef.current, `${prev.book},${prev.chapter},1`);

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      setTimeout(() => {
        isJumpingRef.current = false;
      }, 150);
    });
  }, [chapterData, db]);

  const handleNextChapter = useCallback(() => {
    const lastVerse = chapterData[chapterData.length - 1];
    if (!lastVerse) return;
    const next = getNextChapter(lastVerse.book, lastVerse.chapter);
    if (!next) return;

    const nextVerses = getChapterVersesSync(db, next.book, next.chapter);
    setChapterData((prev) => [...prev, ...nextVerses]);
  }, [chapterData, db]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<VerseRow>[] }) => {
      if (isJumpingRef.current || viewableItems.length === 0) {
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

  const numericSize = Number(textSize);
  const textColor = colors.bible.text[theme];
  const accentColor = colors.bible.color[theme][color][1];
  const inactiveTabBg = colors.tab.tab.inactive[theme];

  const firstVerse = chapterData[0];
  const prevChapterInfo = firstVerse
    ? getPreviousChapter(firstVerse.book, firstVerse.chapter)
    : null;

  const lastVerse = chapterData[chapterData.length - 1];
  const nextChapterInfo = lastVerse
    ? getNextChapter(lastVerse.book, lastVerse.chapter)
    : null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bible.background[theme] },
      ]}
    >
      <FlashList
        ref={listRef}
        data={chapterData}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => `${item.book},${item.chapter},${item.verse}`}
        getItemType={(item) => (item.verse === 1 ? "chapterStart" : "verse")}
        extraData={{ theme, color, textSize }}
        showsVerticalScrollIndicator={false}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        refreshing={false}
        onRefresh={onToggleSearch}
        ListHeaderComponent={
          prevChapterInfo ? (
            <View style={styles.prevHeaderWrapper}>
              <MyButton
                color={accentColor}
                textColor={textColor}
                backgroundColor={inactiveTabBg}
                onPress={handlePreviousChapter}
                title={`${BOOKS[prevChapterInfo.book].book} ${prevChapterInfo.chapter}`}
              />
            </View>
          ) : null
        }
        ListFooterComponent={
          <View
            style={{
              paddingTop: 28,
              paddingBottom: Math.max(48, bottomInset + 32),
            }}
          >
            {nextChapterInfo ? (
              <MyButton
                color={accentColor}
                textColor={textColor}
                backgroundColor={inactiveTabBg}
                onPress={handleNextChapter}
                title={`${BOOKS[nextChapterInfo.book].book} ${nextChapterInfo.chapter}`}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          if (item.verse === 1) {
            const bookName = BOOKS[item.book].book;
            return (
              <View>
                <Pressable
                  delayLongPress={300}
                  onLongPress={() => {
                    Vibration.vibrate(10);
                    const slug = bookName.split(" ").join("-");
                    Linking.openURL(
                      `https://www.gotquestions.org/book-of-${slug}.html`
                    );
                  }}
                >
                  <Text
                    style={{
                      fontSize: 30 + numericSize,
                      color: textColor,
                    }}
                  >
                    {bookName}
                  </Text>
                </Pressable>
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
                      color: textColor,
                    }}
                  >
                    {item.text}
                  </Text>
                </Text>
              </View>
            );
          }

          return (
            <Text>
              <Text
                style={{
                  color: accentColor,
                  fontSize: 0.7 * numericSize,
                }}
              >
                {`${item.verse} `}
              </Text>
              <Text
                style={{
                  fontSize: numericSize,
                  color: textColor,
                }}
              >
                {item.text}
              </Text>
            </Text>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 12,
  },
  prevHeaderWrapper: {
    paddingTop: 8,
    paddingBottom: 16,
  },
});
