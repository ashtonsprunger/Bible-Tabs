import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BOOKS } from "../constants/books";
import { colors, uiTokens } from "../constants/colors";
import type {
  AccentColorName,
  BibleReference,
  BookInfo,
  ThemeName,
} from "../types";
import { ChevronIcon } from "./Icons";

interface ChapterBrowserProps {
  currentReference: BibleReference;
  theme: ThemeName;
  color: AccentColorName;
  isDesktop?: boolean;
  onSelectChapter: (book: number, chapter: number) => void;
}

type BrowserRow =
  | { type: "header"; id: string; title: string }
  | { type: "book"; id: string; book: BookInfo };

const ALL_BROWSER_ROWS: BrowserRow[] = [
  { type: "header", id: "header_ot", title: "Old Testament" },
  ...BOOKS.slice(0, 39).map((book): BrowserRow => ({
    type: "book",
    id: `book_${book.index}`,
    book,
  })),
  { type: "header", id: "header_nt", title: "New Testament" },
  ...BOOKS.slice(39, 66).map((book): BrowserRow => ({
    type: "book",
    id: `book_${book.index}`,
    book,
  })),
];

function chunkChapters(totalChapters: number, perRow: number): number[][] {
  const rows: number[][] = [];
  for (let start = 1; start <= totalChapters; start += perRow) {
    const row: number[] = [];
    for (let ch = start; ch < start + perRow && ch <= totalChapters; ch++) {
      row.push(ch);
    }
    rows.push(row);
  }
  return rows;
}

export default function ChapterBrowser({
  currentReference,
  theme,
  color,
  isDesktop = false,
  onSelectChapter,
}: ChapterBrowserProps) {
  const [openBookIndex, setOpenBookIndex] = useState<number | null>(
    BOOKS[currentReference.book]?.chapters === 1 ? null : currentReference.book
  );
  const listRef = useRef<FlashListRef<BrowserRow>>(null);

  useEffect(() => {
    setOpenBookIndex(
      BOOKS[currentReference.book]?.chapters === 1 ? null : currentReference.book
    );
    const targetIdx = ALL_BROWSER_ROWS.findIndex(
      (r) => r.type === "book" && r.book.index === currentReference.book
    );
    if (targetIdx >= 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: targetIdx, animated: false });
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [currentReference.book]);

  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const chaptersPerRow = isDesktop ? 5 : 6;

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={ALL_BROWSER_ROWS}
        keyExtractor={(item) => item.id}
        getItemType={(item) => item.type}
        extraData={{
          openBookIndex,
          currentBook: currentReference.book,
          currentChapter: currentReference.chapter,
          theme,
          color,
          chaptersPerRow,
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          if (item.type === "header") {
            return (
              <View style={[styles.sectionHeader, { borderBottomColor: ui.border }]}>
                <Text style={[styles.sectionHeaderText, { color: ui.muted }]}>
                  {item.title.toUpperCase()}
                </Text>
              </View>
            );
          }

          const { book } = item;
          const isCurrentBook = currentReference.book === book.index;
          const isExpanded = openBookIndex === book.index;

          return (
            <View style={[styles.bookBlock, { borderBottomColor: ui.border }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.bookRow,
                  pressed && { backgroundColor: ui.surface },
                ]}
                onPress={() => {
                  if (book.chapters === 1) {
                    onSelectChapter(book.index, 1);
                    return;
                  }
                  if (isExpanded) {
                    setOpenBookIndex(null);
                  } else {
                    setOpenBookIndex(book.index);
                    requestAnimationFrame(() => {
                      listRef.current?.scrollToIndex({
                        index,
                        animated: true,
                      });
                    });
                  }
                }}
              >
                <Text
                  style={[
                    styles.bookTitle,
                    {
                      color: isCurrentBook ? accentColor : ui.text,
                      fontWeight: isCurrentBook ? "700" : "500",
                    },
                  ]}
                >
                  {book.book}
                </Text>
                <View style={styles.bookRight}>
                  <Text style={[styles.chapterCount, { color: ui.muted }]}>
                    {book.chapters === 1 ? "1 ch" : `${book.chapters}`}
                  </Text>
                  {book.chapters > 1 ? (
                    <ChevronIcon
                      color={isExpanded ? accentColor : ui.muted}
                      direction={isExpanded ? "up" : "down"}
                      size={10}
                    />
                  ) : null}
                </View>
              </Pressable>

              {isExpanded ? (
                <View style={styles.chapterGrid}>
                  {chunkChapters(book.chapters, chaptersPerRow).map(
                    (chapterRow, rowIndex) => (
                      <View key={rowIndex} style={styles.chapterRow}>
                        {chapterRow.map((ch) => {
                          const isCurrentChapter =
                            isCurrentBook && currentReference.chapter === ch;
                          return (
                            <Pressable
                              key={ch}
                              style={({ pressed }) => [
                                styles.chapterPill,
                                {
                                  width: `${100 / chaptersPerRow}%`,
                                },
                                pressed && { opacity: 0.72 },
                              ]}
                              onPress={() => onSelectChapter(book.index, ch)}
                            >
                              <View
                                style={[
                                  styles.chapterPillInner,
                                  {
                                    backgroundColor: isCurrentChapter
                                      ? accentBorder
                                      : ui.surface,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chapterText,
                                    {
                                      color: isCurrentChapter
                                        ? "#FFFFFF"
                                        : ui.text,
                                      fontWeight: isCurrentChapter ? "700" : "500",
                                    },
                                  ]}
                                >
                                  {ch}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    )
                  )}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 18,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  bookBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 8,
  },
  bookTitle: {
    fontSize: 16,
  },
  bookRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chapterCount: {
    fontSize: 12.5,
  },
  chapterGrid: {
    paddingBottom: 10,
    paddingTop: 2,
  },
  chapterRow: {
    flexDirection: "row",
  },
  chapterPill: {
    padding: 3,
  },
  chapterPillInner: {
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterText: {
    fontSize: 14.5,
  },
});
