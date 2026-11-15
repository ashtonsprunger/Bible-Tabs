import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BOOKS } from "../constants/books";
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
  onSelectReference: (ref: BibleReference) => void;
  onClose: () => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTextWithBoldMatches(
  text: string,
  keyword: string
): React.ReactNode {
  if (!keyword) {
    return text;
  }

  const escaped = escapeRegExp(keyword);
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  const lowerKeyword = keyword.toLowerCase();
  return parts.map((part, idx) =>
    part.toLowerCase() === lowerKeyword ? (
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

  const [searchText, setSearchText] = useState("");
  const [currentSearchText, setCurrentSearchText] = useState("");
  const [searchData, setSearchData] = useState<VerseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const runSearch = async () => {
    if (searchData.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    setIsLoading(true);
    const query = searchText;
    setCurrentSearchText(query);
    try {
      const results = await searchVersesAsync(db, query);
      setSearchData(results);
    } finally {
      setIsLoading(false);
    }
  };

  const textColor = colors.bible.text[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentText = colors.bible.color[theme][color][1];
  const inactiveBg = colors.tab.tab.inactive[theme];

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bible.background[theme],
            borderBottomColor: accentBorder,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={searchInputRef}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              placeholder="Search..."
              placeholderTextColor={textColor}
              style={[
                styles.input,
                {
                  backgroundColor: inactiveBg,
                  color: textColor,
                },
              ]}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <View style={styles.searchButtonWrapper}>
            <MyButton
              color={accentText}
              textColor={textColor}
              backgroundColor={inactiveBg}
              onPress={runSearch}
              title="Search"
            />
          </View>
        </View>

        {searchData.length > 0 ? (
          <View style={styles.resultsContainer}>
            <FlashList
              ref={listRef}
              data={searchData}
              keyExtractor={(item) =>
                `${item.book},${item.chapter},${item.verse}`
              }
              extraData={{ currentSearchText, theme, color }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultRow}
                  onPress={() =>
                    onSelectReference({
                      book: item.book,
                      chapter: item.chapter,
                      verse: item.verse,
                    })
                  }
                >
                  <Text style={{ color: textColor }}>
                    <Text style={{ color: accentText }}>
                      {`${BOOKS[item.book].book} ${item.chapter}:${item.verse} `}
                    </Text>
                    <Text>
                      {renderTextWithBoldMatches(item.text, currentSearchText)}
                    </Text>
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {searchData.length === 0 && currentSearchText !== "" && !isLoading ? (
          <Text style={[styles.noResults, { color: textColor }]}>
            {`No results for "${currentSearchText}".`}
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

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <Text>loading...</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderBottomWidth: 3,
    height: "auto",
  },
  inputRow: {
    flexDirection: "row",
  },
  inputWrapper: {
    flex: 3,
    marginRight: 12,
  },
  input: {
    fontSize: 25,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 7,
    marginBottom: 6,
  },
  searchButtonWrapper: {
    flex: 1,
  },
  resultsContainer: {
    height: 300,
  },
  resultRow: {
    paddingVertical: 6,
  },
  boldMatch: {
    fontWeight: "900",
  },
  noResults: {
    paddingVertical: 12,
  },
  closeWrapper: {
    marginTop: 6,
  },
  loadingOverlay: {
    position: "absolute",
    height: "100%",
    width: "100%",
    backgroundColor: "rgba(150,150,150,0.5)",
  },
});
