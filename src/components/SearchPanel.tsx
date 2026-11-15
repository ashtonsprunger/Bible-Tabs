import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  formatVerseCitation,
  parseHumanReference,
} from "../constants/books";
import { colors } from "../constants/colors";
import { searchVersesAsync } from "../db/queries";
import type {
  AccentColorName,
  BibleReference,
  ThemeName,
  VerseRow,
} from "../types";
import MyButton from "./MyButton";

interface SearchPanelProps {
  theme: ThemeName;
  color: AccentColorName;
  onSelectReference: (
    ref: BibleReference,
    options?: { highlight?: boolean; closeSearch?: boolean }
  ) => void;
  onClose: () => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSmartQuotePattern(str: string): string {
  return escapeRegExp(str)
    .replace(/['\u2018\u2019\u02BC]/g, "['\\u2018\\u2019\\u02BC]")
    .replace(/["\u201C\u201D]/g, '["\\u201C\\u201D]');
}

function renderTextWithBoldMatches(
  text: string,
  keyword: string
): React.ReactNode {
  if (!keyword) {
    return text;
  }

  const pattern = buildSmartQuotePattern(keyword);
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <Text key={idx} style={styles.boldMatch}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

export default function SearchPanel({
  theme,
  color,
  onSelectReference,
  onClose,
}: SearchPanelProps) {
  const db = useSQLiteContext();
  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlashListRef<VerseRow>>(null);
  const requestSeqRef = useRef(0);

  const [searchText, setSearchText] = useState("");
  const [matchedQuery, setMatchedQuery] = useState("");
  const [searchData, setSearchData] = useState<VerseRow[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const quickJump = useMemo(
    () => parseHumanReference(searchText),
    [searchText]
  );

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length < 2) {
      requestSeqRef.current += 1;
      setSearchData([]);
      setMatchedQuery("");
      return;
    }

    const seq = ++requestSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchVersesAsync(db, trimmed);
        if (requestSeqRef.current === seq) {
          setMatchedQuery(trimmed);
          setSearchData(results);
          if (results.length > 0) {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }
      } catch {
        // Ignore transient query errors
      }
    }, 70);

    return () => clearTimeout(timer);
  }, [db, searchText]);

  const handleSubmit = () => {
    if (quickJump?.hasExplicitNumber) {
      Keyboard.dismiss();
      onSelectReference(quickJump.ref, {
        highlight: quickJump.hasExplicitVerse,
        closeSearch: true,
      });
      return;
    }
    Keyboard.dismiss();
  };

  const textColor = colors.bible.text[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentText = colors.bible.color[theme][color][1];
  const inactiveBg = colors.tab.tab.inactive[theme];
  const trimmedInput = searchText.trim();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bible.background[theme],
          borderBottomColor: accentBorder,
        },
      ]}
    >
      {/* Live Search Input + Clear Button */}
      <View style={[styles.inputBox, { backgroundColor: inactiveBg }]}>
        <TextInput
          ref={searchInputRef}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          placeholder="Search words or reference (e.g. Psalm 23)..."
          placeholderTextColor="rgb(145,145,145)"
          style={[styles.input, { color: textColor }]}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 ? (
          <Pressable
            onPress={() => {
              setSearchText("");
              searchInputRef.current?.focus();
            }}
            hitSlop={10}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={[styles.clearText, { color: textColor }]}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Direct Reference Quick Jump */}
      {quickJump ? (
        <Pressable
          style={[
            styles.quickJumpCard,
            {
              backgroundColor: inactiveBg,
              borderColor: accentBorder,
            },
          ]}
          onPress={() => {
            Keyboard.dismiss();
            onSelectReference(quickJump.ref, {
              highlight: quickJump.hasExplicitVerse,
              closeSearch: true,
            });
          }}
        >
          <Text style={[styles.quickJumpText, { color: textColor }]}>
            Jump to{" "}
            <Text style={[styles.quickJumpHighlight, { color: accentText }]}>
              {quickJump.label}
            </Text>
          </Text>
          <Text style={[styles.quickJumpArrow, { color: accentText }]}>→</Text>
        </Pressable>
      ) : null}

      {/* Keyword Results */}
      {searchData.length > 0 ? (
        <>
          <Text style={styles.resultCountText}>
            {searchData.length === 1
              ? "1 matching verse"
              : `${searchData.length.toLocaleString()} matching verses`}
          </Text>
          <View style={styles.resultsContainer}>
            <FlashList
              ref={listRef}
              data={searchData}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) =>
                `${item.book},${item.chapter},${item.verse}`
              }
              extraData={{ matchedQuery, theme, color }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultRow}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelectReference(
                      {
                        book: item.book,
                        chapter: item.chapter,
                        verse: item.verse,
                      },
                      { highlight: true, closeSearch: false }
                    );
                  }}
                >
                  <Text style={[styles.resultVerseText, { color: textColor }]}>
                    <Text style={[styles.resultCitation, { color: accentText }]}>
                      {`${formatVerseCitation(
                        item.book,
                        item.chapter,
                        item.verse
                      )} `}
                    </Text>
                    {item.superscription ? (
                      <Text style={styles.resultSuperscription}>
                        {renderTextWithBoldMatches(
                          `${item.superscription} `,
                          matchedQuery
                        )}
                      </Text>
                    ) : null}
                    <Text>
                      {renderTextWithBoldMatches(item.text, matchedQuery)}
                    </Text>
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </>
      ) : null}

      {searchData.length === 0 &&
      matchedQuery !== "" &&
      trimmedInput.length >= 2 &&
      !quickJump ? (
        <Text style={[styles.noResults, { color: textColor }]}>
          {`No verses matching "${matchedQuery}".`}
        </Text>
      ) : null}

      <View style={styles.closeWrapper}>
        <MyButton
          color={accentText}
          textColor={textColor}
          backgroundColor={inactiveBg}
          onPress={onClose}
          title="Close"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderBottomWidth: 3,
    height: "auto",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 19,
    paddingVertical: 8,
  },
  clearButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 24,
    lineHeight: 24,
    opacity: 0.65,
  },
  quickJumpCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  quickJumpText: {
    fontSize: 17,
    fontWeight: "500",
  },
  quickJumpHighlight: {
    fontWeight: "700",
  },
  quickJumpArrow: {
    fontSize: 20,
    fontWeight: "700",
  },
  resultCountText: {
    fontSize: 12,
    color: "rgb(145,145,145)",
    marginBottom: 4,
  },
  resultsContainer: {
    height: 270,
  },
  resultRow: {
    paddingVertical: 7,
  },
  resultCitation: {
    fontWeight: "600",
  },
  resultSuperscription: {
    fontStyle: "italic",
    opacity: 0.82,
  },
  resultVerseText: {
    fontSize: 16,
    lineHeight: 22,
  },
  boldMatch: {
    fontWeight: "900",
  },
  noResults: {
    paddingVertical: 10,
    fontSize: 16,
  },
  closeWrapper: {
    marginTop: 6,
  },
});
