import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
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
import { colors, uiTokens } from "../constants/colors";
import { TRANSLATIONS, isApiTranslation } from "../constants/translations";
import { searchApiBibleAsync } from "../api/apiBibleClient";
import { useBibleDb } from "../db/BibleDbContext";
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
  embeddedSidebar?: boolean;
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
  embeddedSidebar = false,
  onSelectReference,
  onClose,
}: SearchPanelProps) {
  const { db, loadedTranslation } = useBibleDb();
  const isApi = isApiTranslation(loadedTranslation);
  const translationShortName = TRANSLATIONS[loadedTranslation].shortName;
  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlashListRef<VerseRow>>(null);
  const requestSeqRef = useRef(0);

  const [searchText, setSearchText] = useState("");
  const [matchedQuery, setMatchedQuery] = useState("");
  const [searchData, setSearchData] = useState<VerseRow[]>([]);
  const [apiTotalMatches, setApiTotalMatches] = useState<number | null>(null);
  const [apiSearching, setApiSearching] = useState(false);
  const [apiSearchError, setApiSearchError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Reset search results cleanly when user switches translation
  useEffect(() => {
    requestSeqRef.current += 1;
    setSearchData([]);
    setMatchedQuery("");
    setApiTotalMatches(null);
    setApiSearching(false);
    setApiSearchError(null);
  }, [loadedTranslation]);

  const quickJump = useMemo(
    () => parseHumanReference(searchText),
    [searchText]
  );

  // Instant live search for offline SQLite translations ONLY (API translations search on explicit submit to conserve quota)
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length < 2) {
      requestSeqRef.current += 1;
      setSearchData([]);
      setMatchedQuery("");
      setApiTotalMatches(null);
      setApiSearchError(null);
      return;
    }

    if (isApi) {
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
  }, [db, isApi, searchText]);

  const runApiKeywordSearch = async (rawQuery: string) => {
    if (!isApi) return;
    const trimmed = rawQuery.trim();
    if (trimmed.length < 2) return;
    const seq = ++requestSeqRef.current;
    setApiSearching(true);
    setApiSearchError(null);
    try {
      const res = await searchApiBibleAsync(loadedTranslation, trimmed, 40);
      if (requestSeqRef.current !== seq) return;
      setMatchedQuery(trimmed);
      setSearchData(res.verses);
      setApiTotalMatches(res.total);
      setApiSearching(false);
      if (res.verses.length > 0) {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    } catch (err) {
      if (requestSeqRef.current !== seq) return;
      setApiSearching(false);
      setApiSearchError(
        err instanceof Error
          ? err.message
          : `Could not search ${translationShortName}. Check your internet connection.`
      );
    }
  };

  const handleSubmit = () => {
    if (quickJump?.hasExplicitNumber) {
      Keyboard.dismiss();
      onSelectReference(quickJump.ref, {
        highlight: quickJump.hasExplicitVerse,
        closeSearch: !embeddedSidebar,
      });
      return;
    }
    Keyboard.dismiss();
    if (isApi && searchText.trim().length >= 2) {
      runApiKeywordSearch(searchText);
    }
  };

  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentText = colors.bible.color[theme][color][1];
  const trimmedInput = searchText.trim();

  return (
    <View
      style={[
        embeddedSidebar ? styles.sidebarRoot : styles.drawerContainer,
        { backgroundColor: ui.bg },
      ]}
    >
      {/* Sidebar Header (desktop docked mode) */}
      {embeddedSidebar ? (
        <View style={[styles.sidebarHeader, { borderBottomColor: ui.border }]}>
          <Text style={[styles.sidebarHeading, { color: ui.text }]}>
            Search
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close search"
            style={({ pressed }) => [
              styles.closeIconBtn,
              { backgroundColor: ui.surface, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text style={[styles.closeIconText, { color: ui.text }]}>×</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={embeddedSidebar ? styles.sidebarBody : styles.drawerBody}
      >
        {/* Live Search Input + Clear Button */}
        <View
          style={[
            styles.inputBox,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <TextInput
            ref={searchInputRef}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            placeholder="Words or reference (e.g. Psalm 23)…"
            placeholderTextColor={ui.muted}
            style={[
              styles.input,
              embeddedSidebar && styles.inputSidebar,
              { color: ui.text },
            ]}
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
              <Text style={[styles.clearText, { color: ui.muted }]}>×</Text>
            </Pressable>
          ) : null}
          {isApi && trimmedInput.length >= 2 && !quickJump?.hasExplicitNumber ? (
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                runApiKeywordSearch(trimmedInput);
              }}
              disabled={apiSearching}
              style={({ pressed }) => [
                styles.apiSearchBtn,
                {
                  borderColor: accentBorder,
                  backgroundColor: ui.surfaceRaised,
                  opacity: apiSearching ? 0.55 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.apiSearchBtnText, { color: accentText }]}>
                {apiSearching ? "…" : `Search ${translationShortName}`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isApi && apiSearchError ? (
          <Text style={[styles.noResults, { color: ui.danger }]}>
            {apiSearchError}
          </Text>
        ) : null}

        {isApi && apiSearching ? (
          <Text style={[styles.noResults, { color: ui.muted }]}>
            Searching {translationShortName}…
          </Text>
        ) : null}

        {isApi &&
        !apiSearching &&
        !apiSearchError &&
        trimmedInput.length >= 2 &&
        matchedQuery !== trimmedInput &&
        !quickJump?.hasExplicitNumber ? (
          <Text style={[styles.apiSearchHint, { color: ui.muted }]}>
            Press Enter or tap Search {translationShortName} to search online.
          </Text>
        ) : null}

        {/* Direct Reference Quick Jump */}
        {quickJump ? (
          <Pressable
            style={({ pressed }) => [
              styles.quickJumpCard,
              {
                backgroundColor: ui.surface,
                borderColor: accentBorder,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={() => {
              Keyboard.dismiss();
              onSelectReference(quickJump.ref, {
                highlight: quickJump.hasExplicitVerse,
                closeSearch: !embeddedSidebar,
              });
            }}
          >
            <Text style={[styles.quickJumpText, { color: ui.text }]}>
              Jump to{" "}
              <Text style={[styles.quickJumpHighlight, { color: accentText }]}>
                {quickJump.label}
              </Text>
            </Text>
            <Text style={[styles.quickJumpArrow, { color: accentText }]}>
              →
            </Text>
          </Pressable>
        ) : null}

        {/* Keyword Results */}
        {searchData.length > 0 ? (
          <>
            <Text style={[styles.resultCountText, { color: ui.muted }]}>
              {isApi && apiTotalMatches && apiTotalMatches > searchData.length
                ? `Showing ${searchData.length} of ${apiTotalMatches.toLocaleString()} matches in ${translationShortName}`
                : searchData.length === 1
                  ? `1 matching verse (${translationShortName})`
                  : `${searchData.length.toLocaleString()} matching verses (${translationShortName})`}
            </Text>
            <View
              style={
                embeddedSidebar
                  ? styles.resultsContainerSidebar
                  : styles.resultsContainerDrawer
              }
            >
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
                    style={({ pressed }) => [
                      styles.resultRow,
                      {
                        borderBottomColor: ui.border,
                        backgroundColor: pressed ? ui.surface : "transparent",
                      },
                    ]}
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
                    <Text style={[styles.resultVerseText, { color: ui.text }]}>
                      <Text
                        style={[styles.resultCitation, { color: accentText }]}
                      >
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
          <Text style={[styles.noResults, { color: ui.muted }]}>
            {`No verses matching "${matchedQuery}".`}
          </Text>
        ) : null}

        {embeddedSidebar && trimmedInput.length < 2 && !quickJump ? (
          <View style={styles.sidebarEmptyHint}>
            <Text style={[styles.sidebarEmptyTitle, { color: ui.text }]}>
              Search Scripture
            </Text>
            <Text style={[styles.sidebarEmptyCopy, { color: ui.muted }]}>
              Type a keyword, phrase, or reference such as{" "}
              <Text style={{ color: accentText, fontWeight: "600" }}>
                John 3:16
              </Text>{" "}
              or{" "}
              <Text style={{ color: accentText, fontWeight: "600" }}>
                shepherd
              </Text>
              . Clicking any match jumps the active tab without closing search.
            </Text>
          </View>
        ) : null}

        {!embeddedSidebar ? (
          <View style={styles.closeWrapper}>
            <MyButton
              color={accentText}
              textColor={ui.text}
              backgroundColor={ui.surface}
              onPress={onClose}
              title="Close"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    padding: 12,
    height: "auto",
  },
  drawerBody: {
    width: "100%",
  },
  sidebarRoot: {
    flex: 1,
    flexDirection: "column",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  sidebarHeading: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "600",
  },
  sidebarBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    marginBottom: 9,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    paddingVertical: Platform.OS === "web" ? 8 : 7,
  },
  inputSidebar: {
    fontSize: 15.5,
  },
  clearButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 22,
    lineHeight: 22,
  },
  quickJumpCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1.5,
    marginBottom: 9,
  },
  quickJumpText: {
    fontSize: 15.5,
    fontWeight: "500",
  },
  quickJumpHighlight: {
    fontWeight: "700",
  },
  quickJumpArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  resultsContainerDrawer: {
    height: 270,
  },
  resultsContainerSidebar: {
    flex: 1,
    minHeight: 0,
  },
  resultRow: {
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCitation: {
    fontWeight: "700",
  },
  resultSuperscription: {
    fontStyle: "italic",
    opacity: 0.82,
  },
  resultVerseText: {
    fontSize: 15,
    lineHeight: 22,
  },
  boldMatch: {
    fontWeight: "800",
  },
  noResults: {
    paddingVertical: 12,
    fontSize: 15,
  },
  sidebarEmptyHint: {
    paddingTop: 22,
    paddingHorizontal: 6,
    gap: 6,
  },
  sidebarEmptyTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sidebarEmptyCopy: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  closeWrapper: {
    marginTop: 6,
  },
  apiSearchBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1.25,
  },
  apiSearchBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  apiSearchHint: {
    fontSize: 13,
    marginBottom: 8,
  },
});
