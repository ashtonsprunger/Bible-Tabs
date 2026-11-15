import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BOOKS } from "../constants/books";
import { colors } from "../constants/colors";
import type {
  AccentColorName,
  BibleReference,
  BookInfo,
  ThemeName,
} from "../types";

interface ChapterBrowserProps {
  currentReference: BibleReference;
  theme: ThemeName;
  color: AccentColorName;
  onSelectChapter: (book: number, chapter: number) => void;
}

type BrowserRow =
  | { type: "header"; id: string; title: string }
  | { type: "book"; id: string; book: BookInfo };

function chunkChapters(totalChapters: number): number[][] {
  const rows: number[][] = [];
  for (let start = 1; start <= totalChapters; start += 5) {
    const row: number[] = [];
    for (let ch = start; ch < start + 5 && ch <= totalChapters; ch++) {
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
  onSelectChapter,
}: ChapterBrowserProps) {
  const [openBookIndex, setOpenBookIndex] = useState<number | null>(
    currentReference.book
  );
  const listRef = useRef<FlashListRef<BrowserRow>>(null);

  const rows = useMemo<BrowserRow[]>(() => {
    return [
      { type: "header", id: "header_ot", title: "Old Testament" },
      ...BOOKS.slice(0, 39).map((book) => ({
        type: "book" as const,
        id: `book_${book.index}`,
        book,
      })),
      { type: "header", id: "header_nt", title: "New Testament" },
      ...BOOKS.slice(39, 66).map((book) => ({
        type: "book" as const,
        id: `book_${book.index}`,
        book,
      })),
    ];
  }, []);

  const bookToRowIndex = (bookIndex: number): number => {
    // Row 0 is "Old Testament", rows 1..39 are OT books, row 40 is "New Testament", rows 41..67 are NT books
    return bookIndex < 39 ? bookIndex + 1 : bookIndex + 2;
  };

  useEffect(() => {
    setOpenBookIndex(currentReference.book);
    const targetRow = bookToRowIndex(currentReference.book);
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: targetRow, animated: false });
    }, 30);
    return () => clearTimeout(timer);
  }, [currentReference.book]);

  const textColor = colors.bible.text[theme];
  const accentColor = colors.bible.color[theme][color][1];

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => item.id}
        getItemType={(item) => item.type}
        extraData={{
          openBookIndex,
          currentBook: currentReference.book,
          currentChapter: currentReference.chapter,
          theme,
          color,
        }}
        initialScrollIndex={bookToRowIndex(currentReference.book)}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View>
                <View
                  style={[styles.divider, { borderBottomColor: textColor }]}
                />
                <Text style={[styles.headerText, { color: textColor }]}>
                  {item.title}
                </Text>
                <View
                  style={[styles.divider, { borderBottomColor: textColor }]}
                />
              </View>
            );
          }

          const { book } = item;
          const isCurrentBook = currentReference.book === book.index;
          const isExpanded = openBookIndex === book.index;

          return (
            <View>
              <Pressable
                onPress={() => {
                  if (isExpanded) {
                    setOpenBookIndex(null);
                  } else {
                    setOpenBookIndex(book.index);
                    const rowIdx = bookToRowIndex(book.index);
                    requestAnimationFrame(() => {
                      listRef.current?.scrollToIndex({
                        index: rowIdx,
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
                      color: isCurrentBook ? accentColor : textColor,
                      fontWeight: isCurrentBook ? "600" : "normal",
                    },
                  ]}
                >
                  {book.book}
                </Text>
              </Pressable>

              {isExpanded
                ? chunkChapters(book.chapters).map((chapterRow, rowIndex) => (
                    <View key={rowIndex} style={styles.chapterRow}>
                      {chapterRow.map((ch) => {
                        const isCurrentChapter =
                          isCurrentBook && currentReference.chapter === ch;
                        return (
                          <Pressable
                            key={ch}
                            style={styles.chapterCell}
                            onPress={() => onSelectChapter(book.index, ch)}
                          >
                            <Text
                              style={[
                                styles.chapterText,
                                {
                                  color: isCurrentChapter
                                    ? accentColor
                                    : "rgb(150,150,150)",
                                  fontWeight: isCurrentChapter
                                    ? "600"
                                    : "normal",
                                },
                              ]}
                            >
                              {ch}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))
                : null}
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
  divider: {
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 25,
    height: 35,
    textAlign: "center",
  },
  bookTitle: {
    fontSize: 20,
    height: 30,
  },
  chapterRow: {
    flexDirection: "row",
  },
  chapterCell: {
    width: "20%",
    paddingVertical: 4,
  },
  chapterText: {
    fontSize: 20,
    width: "100%",
    textAlign: "center",
  },
});
