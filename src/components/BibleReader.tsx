import { FlashList, type ViewToken } from "@shopify/flash-list";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { BOOKS, parseReference } from "../constants/books";
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

  const [{ verses, initialIndex }, setWindowState] =
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
      };
    });

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

  const numericSize = Number(textSize);
  const textColor = colors.bible.text[theme];
  const accentColor = colors.bible.color[theme][color][1];
  const isAtBibleEnd =
    verses[verses.length - 1]?.id === TOTAL_BIBLE_VERSES;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bible.background[theme] },
      ]}
    >
      <FlashList
        data={verses}
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => `${item.id}`}
        getItemType={(item) => (item.verse === 1 ? "chapterStart" : "verse")}
        extraData={{ theme, color, textSize }}
        showsVerticalScrollIndicator={false}
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
            <View style={{ height: Math.max(48, bottomInset + 32) }} />
          ) : null
        }
        renderItem={({ item }) => {
          if (item.verse === 1) {
            const bookName = BOOKS[item.book].book;
            return (
              <View style={item.id > 1 ? styles.chapterSpacing : undefined}>
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
  chapterSpacing: {
    paddingTop: 28,
  },
});
