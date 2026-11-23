import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatVerseRangeCitation } from "../constants/books";
import {
  HIGHLIGHT_COLORS,
  colors,
  highlightColors,
  uiTokens,
} from "../constants/colors";
import { useResponsiveLayout } from "../constants/layout";
import { TRANSLATIONS, isApiTranslation } from "../constants/translations";
import { getCachedApiChapterSync } from "../api/apiBibleClient";
import { useBibleDb } from "../db/BibleDbContext";
import { getVersesRangeAsync, getVersesRangeSync } from "../db/queries";
import { useAppStore } from "../store/useAppStore";
import { useStudyStore } from "../store/useStudyStore";
import type {
  BibleReference,
  HighlightColor,
  HighlightRecord,
  NoteEditorParams,
  NoteRecord,
  RootStackParamList,
} from "../types";

type NotebookScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Notebook"
>;

export interface NotebookContentProps {
  embedded?: boolean;
  onClose: () => void;
  onEditNote: (params: NoteEditorParams) => void;
}

type FilterTab = "all" | "notes" | "highlights";
type SortMode = "recent" | "bible";

interface HighlightGroupItem {
  kind: "highlight";
  id: string;
  book: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  color: HighlightColor;
  refs: BibleReference[];
  updatedAt: number;
  citation: string;
  versePreview: string;
  previewTransShort: string;
}

interface NoteListItem {
  kind: "note";
  id: string;
  note: NoteRecord;
  book: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  updatedAt: number;
  citation: string;
  versePreview: string;
  previewTransShort: string;
}

type NotebookItem = HighlightGroupItem | NoteListItem;

function triggerLightHaptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function formatShortDate(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function groupConsecutiveHighlights(
  records: HighlightRecord[]
): Array<{
  book: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  color: HighlightColor;
  refs: BibleReference[];
  updatedAt: number;
}> {
  if (records.length === 0) return [];
  const sorted = [...records].sort(
    (a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse
  );

  const groups: Array<{
    book: number;
    chapter: number;
    startVerse: number;
    endVerse: number;
    color: HighlightColor;
    refs: BibleReference[];
    updatedAt: number;
  }> = [];

  for (const rec of sorted) {
    const prev = groups[groups.length - 1];
    if (
      prev &&
      prev.book === rec.book &&
      prev.chapter === rec.chapter &&
      prev.color === rec.color &&
      rec.verse === prev.endVerse + 1
    ) {
      prev.endVerse = rec.verse;
      prev.refs.push({
        book: rec.book,
        chapter: rec.chapter,
        verse: rec.verse,
      });
      prev.updatedAt = Math.max(prev.updatedAt, rec.updatedAt);
    } else {
      groups.push({
        book: rec.book,
        chapter: rec.chapter,
        startVerse: rec.verse,
        endVerse: rec.verse,
        color: rec.color,
        refs: [{ book: rec.book, chapter: rec.chapter, verse: rec.verse }],
        updatedAt: rec.updatedAt,
      });
    }
  }

  return groups;
}

export function NotebookContent({
  embedded = false,
  onClose,
  onEditNote,
}: NotebookContentProps) {
  const { isDesktop } = useResponsiveLayout();
  const { db, loadedTranslation, loadedLocalTranslation } = useBibleDb();

  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const translation = loadedTranslation;
  const tabs = useAppStore((s) => s.tabs);
  const jumpCurrentTabToReference = useAppStore(
    (s) => s.jumpCurrentTabToReference
  );
  const addTabAtReference = useAppStore((s) => s.addTabAtReference);

  const highlightsByKey = useStudyStore((s) => s.highlightsByKey);
  const notesById = useStudyStore((s) => s.notesById);
  const setVersesHighlight = useStudyStore((s) => s.setVersesHighlight);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [colorFilter, setColorFilter] = useState<HighlightColor | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [webPreviews, setWebPreviews] = useState<Record<string, string>>({});
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (!isWeb) return;
    let cancelled = false;
    (async () => {
      const ranges = new Map<
        string,
        { book: number; chapter: number; startVerse: number; endVerse: number }
      >();
      for (const note of Object.values(notesById)) {
        const key = `${note.book},${note.chapter},${note.startVerse}-${note.endVerse}`;
        ranges.set(key, {
          book: note.book,
          chapter: note.chapter,
          startVerse: note.startVerse,
          endVerse: note.endVerse,
        });
      }
      for (const g of groupConsecutiveHighlights(
        Object.values(highlightsByKey)
      )) {
        const key = `${g.book},${g.chapter},${g.startVerse}-${g.endVerse}`;
        ranges.set(key, {
          book: g.book,
          chapter: g.chapter,
          startVerse: g.startVerse,
          endVerse: g.endVerse,
        });
      }
      const next: Record<string, string> = {};
      for (const [key, r] of ranges.entries()) {
        try {
          if (isApiTranslation(translation)) {
            const cached = getCachedApiChapterSync(translation, r.book, r.chapter);
            if (cached) {
              const lo = Math.min(r.startVerse, r.endVerse);
              const hi = Math.max(r.startVerse, r.endVerse);
              const apiRows = [];
              for (let v = lo; v <= hi; v++) {
                const row = cached.versesByNumber[v];
                if (row) apiRows.push(row);
              }
              if (apiRows.length > 0) {
                next[key] =
                  apiRows.length <= 1
                    ? apiRows[0]?.text ?? ""
                    : apiRows.map((v) => `${v.verse} ${v.text}`).join(" ");
                continue;
              }
            }
          }
          const rows = await getVersesRangeAsync(
            db,
            r.book,
            r.chapter,
            r.startVerse,
            r.endVerse
          );
          next[key] =
            rows.length <= 1
              ? rows[0]?.text ?? ""
              : rows.map((v) => `${v.verse} ${v.text}`).join(" ");
        } catch {
          next[key] = "";
        }
      }
      if (!cancelled) {
        setWebPreviews(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isWeb, db, highlightsByKey, notesById, translation]);

  const { allNotes, allHighlightGroups } = useMemo(() => {
    const activeShort = TRANSLATIONS[translation].shortName;
    const fallbackShort = TRANSLATIONS[loadedLocalTranslation].shortName;

    const fetchPreview = (
      book: number,
      chapter: number,
      startVerse: number,
      endVerse: number
    ): { text: string; shortName: string } => {
      if (isApiTranslation(translation)) {
        const cached = getCachedApiChapterSync(translation, book, chapter);
        if (cached) {
          const lo = Math.min(startVerse, endVerse);
          const hi = Math.max(startVerse, endVerse);
          const apiRows = [];
          for (let v = lo; v <= hi; v++) {
            const row = cached.versesByNumber[v];
            if (row) apiRows.push(row);
          }
          if (apiRows.length === 1) {
            return { text: apiRows[0].text, shortName: activeShort };
          }
          if (apiRows.length > 1) {
            return {
              text: apiRows.map((r) => `${r.verse} ${r.text}`).join(" "),
              shortName: activeShort,
            };
          }
        }
      }
      if (isWeb) {
        return {
          text: webPreviews[`${book},${chapter},${startVerse}-${endVerse}`] ?? "",
          shortName: isApiTranslation(translation) ? fallbackShort : activeShort,
        };
      }
      try {
        const rows = getVersesRangeSync(db, book, chapter, startVerse, endVerse);
        if (rows.length === 0) return { text: "", shortName: fallbackShort };
        const text =
          rows.length === 1
            ? rows[0].text
            : rows.map((r) => `${r.verse} ${r.text}`).join(" ");
        return {
          text,
          shortName: isApiTranslation(translation) ? fallbackShort : activeShort,
        };
      } catch {
        return { text: "", shortName: fallbackShort };
      }
    };

    const noteItems: NoteListItem[] = Object.values(notesById).map((note) => {
      const preview = fetchPreview(
        note.book,
        note.chapter,
        note.startVerse,
        note.endVerse
      );
      return {
        kind: "note",
        id: `note:${note.id}`,
        note,
        book: note.book,
        chapter: note.chapter,
        startVerse: note.startVerse,
        endVerse: note.endVerse,
        updatedAt: note.updatedAt,
        citation: formatVerseRangeCitation(
          note.book,
          note.chapter,
          note.startVerse,
          note.endVerse
        ),
        versePreview: preview.text,
        previewTransShort: preview.shortName,
      };
    });

    const highlightItems: HighlightGroupItem[] = groupConsecutiveHighlights(
      Object.values(highlightsByKey)
    ).map((g) => {
      const preview = fetchPreview(g.book, g.chapter, g.startVerse, g.endVerse);
      return {
        kind: "highlight",
        id: `hl:${g.book},${g.chapter},${g.startVerse}-${g.endVerse}:${g.color}`,
        book: g.book,
        chapter: g.chapter,
        startVerse: g.startVerse,
        endVerse: g.endVerse,
        color: g.color,
        refs: g.refs,
        updatedAt: g.updatedAt,
        citation: formatVerseRangeCitation(
          g.book,
          g.chapter,
          g.startVerse,
          g.endVerse
        ),
        versePreview: preview.text,
        previewTransShort: preview.shortName,
      };
    });

    return { allNotes: noteItems, allHighlightGroups: highlightItems };
  }, [db, isWeb, webPreviews, highlightsByKey, notesById, translation, loadedLocalTranslation]);

  const filteredItems = useMemo(() => {
    let items: NotebookItem[] = [];
    if (filterTab === "all") {
      items = [...allNotes, ...allHighlightGroups];
    } else if (filterTab === "notes") {
      items = [...allNotes];
    } else {
      items = [...allHighlightGroups];
    }

    if (colorFilter && filterTab !== "notes") {
      items = items.filter(
        (item) => item.kind === "highlight" && item.color === colorFilter
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        if (item.citation.toLowerCase().includes(q)) return true;
        if (item.versePreview.toLowerCase().includes(q)) return true;
        if (item.kind === "note" && item.note.body.toLowerCase().includes(q)) {
          return true;
        }
        return false;
      });
    }

    if (sortMode === "bible") {
      items.sort(
        (a, b) =>
          a.book - b.book ||
          a.chapter - b.chapter ||
          a.startVerse - b.startVerse ||
          b.updatedAt - a.updatedAt
      );
    } else {
      items.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return items;
  }, [
    allNotes,
    allHighlightGroups,
    filterTab,
    colorFilter,
    searchQuery,
    sortMode,
  ]);

  const handleJumpInCurrentTab = (item: NotebookItem) => {
    triggerLightHaptic();
    const ref: BibleReference = {
      book: item.book,
      chapter: item.chapter,
      verse: item.startVerse,
    };
    if (tabs.length === 0) {
      addTabAtReference(ref, true);
    } else {
      jumpCurrentTabToReference(ref, true);
    }
    if (!embedded) {
      onClose();
    }
  };

  const handleOpenInNewTab = (item: NotebookItem) => {
    triggerLightHaptic();
    addTabAtReference(
      { book: item.book, chapter: item.chapter, verse: item.startVerse },
      true
    );
    if (!embedded) {
      onClose();
    }
  };

  const handleEditNote = (item: NoteListItem) => {
    triggerLightHaptic();
    onEditNote({
      noteId: item.note.id,
      book: item.book,
      chapter: item.chapter,
      startVerse: item.startVerse,
      endVerse: item.endVerse,
      versePreview: item.versePreview,
    });
  };

  const handleRemoveHighlightGroup = (item: HighlightGroupItem) => {
    triggerLightHaptic();
    setVersesHighlight(item.refs, null);
  };

  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const totalCount = allNotes.length + allHighlightGroups.length;

  return (
    <View
      style={[
        styles.innerColumn,
        !embedded && isDesktop && styles.desktopColumn,
      ]}
    >
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          embedded && styles.topBarEmbedded,
          { borderBottomColor: ui.border },
        ]}
      >
        <Text
          style={[
            styles.heading,
            embedded && styles.headingEmbedded,
            { color: ui.text },
          ]}
        >
          Notebook
        </Text>

        <View style={styles.topBarActions}>
          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setSortMode((m) => (m === "recent" ? "bible" : "recent"));
            }}
            style={({ pressed }) => [
              styles.sortPill,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text style={[styles.sortPillText, { color: accentColor }]}>
              {sortMode === "recent" ? "Recent" : "Bible Order"}
            </Text>
          </Pressable>

          {embedded ? (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close notebook"
              style={({ pressed }) => [
                styles.closeIconBtn,
                { backgroundColor: ui.surface, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.donePillText, { color: ui.text }]}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={[styles.body, embedded && styles.bodyEmbedded]}
      >
        {/* Search Box */}
        <View
          style={[
            styles.searchBox,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <TextInput
            style={[styles.searchInput, { color: ui.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter notes, highlights, or passages…"
            placeholderTextColor={ui.muted}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Text style={[styles.clearSearchX, { color: ui.muted }]}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          {(
            [
              { key: "all", label: `All (${totalCount})` },
              { key: "notes", label: `Notes (${allNotes.length})` },
              {
                key: "highlights",
                label: `Highlights (${allHighlightGroups.length})`,
              },
            ] as const
          ).map((tab) => {
            const active = filterTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setFilterTab(tab.key);
                  if (tab.key === "notes") {
                    setColorFilter(null);
                  }
                }}
                style={[
                  styles.filterTabPill,
                  {
                    backgroundColor: active ? ui.surfaceRaised : ui.surface,
                    borderColor: active ? accentBorder : ui.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.filterTabText,
                    {
                      color: active ? accentColor : ui.muted,
                      fontWeight: active ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Highlight Color Filter Dots */}
        {filterTab !== "notes" && allHighlightGroups.length > 0 ? (
          <View style={styles.colorFilterRow}>
            <Text style={[styles.colorFilterLabel, { color: ui.muted }]}>
              Color:
            </Text>
            {HIGHLIGHT_COLORS.map((c) => {
              const entry = highlightColors[theme][c];
              const active = colorFilter === c;
              return (
                <Pressable
                  key={c}
                  onPress={() =>
                    setColorFilter((prev) => (prev === c ? null : c))
                  }
                  hitSlop={4}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: entry.swatch,
                      borderColor: active ? ui.text : "rgba(0,0,0,0.18)",
                      borderWidth: active ? 2.5 : 1,
                    },
                  ]}
                >
                  {active ? <Text style={styles.colorDotCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
            {colorFilter ? (
              <Pressable onPress={() => setColorFilter(null)} hitSlop={6}>
                <Text style={[styles.resetColorText, { color: accentColor }]}>
                  All
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Items List */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={
            filteredItems.length === 0
              ? styles.emptyListContainer
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyTitle, { color: ui.text }]}>
                {totalCount === 0
                  ? "Your Notebook is empty"
                  : "No matching items"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: ui.muted }]}>
                {totalCount === 0
                  ? Platform.OS === "web"
                    ? "Click any verse while reading to highlight passages or add personal study notes."
                    : "Long-press any verse while reading to highlight passages or add personal study notes."
                  : "Try clearing your search or color filter."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const leftStripColor =
              item.kind === "highlight"
                ? highlightColors[theme][item.color].accent
                : accentBorder;

            return (
              <Pressable
                onPress={() => handleJumpInCurrentTab(item)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: ui.surface,
                    borderColor: ui.border,
                    borderLeftColor: leftStripColor,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {item.kind === "highlight" ? (
                      <View
                        style={[
                          styles.inlineSwatchDot,
                          {
                            backgroundColor:
                              highlightColors[theme][item.color].swatch,
                          },
                        ]}
                      />
                    ) : (
                      <Text style={[styles.noteTag, { color: accentColor }]}>
                        NOTE
                      </Text>
                    )}
                    <Text
                      numberOfLines={1}
                      style={[styles.cardCitation, { color: ui.text }]}
                    >
                      {item.citation}
                    </Text>
                    <Text style={[styles.cardTransBadge, { color: ui.muted }]}>
                      {item.previewTransShort}
                    </Text>
                  </View>
                  <Text style={[styles.cardDate, { color: ui.muted }]}>
                    {formatShortDate(item.updatedAt)}
                  </Text>
                </View>

                {item.kind === "note" ? (
                  <Text
                    style={[styles.cardNoteBody, { color: ui.text }]}
                    numberOfLines={4}
                  >
                    {item.note.body}
                  </Text>
                ) : null}

                {item.versePreview ? (
                  <Text
                    style={[
                      styles.cardVersePreview,
                      { color: item.kind === "note" ? ui.muted : ui.text },
                      item.kind === "note" && styles.cardVersePreviewUnderNote,
                    ]}
                    numberOfLines={2}
                  >
                    {item.versePreview}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Pressable
                    onPress={() => handleOpenInNewTab(item)}
                    hitSlop={6}
                    style={[
                      styles.cardActionChip,
                      {
                        backgroundColor: ui.surfaceRaised,
                        borderColor: ui.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.cardActionText, { color: accentColor }]}
                    >
                      New Tab ↗
                    </Text>
                  </Pressable>

                  {item.kind === "note" ? (
                    <Pressable
                      onPress={() => handleEditNote(item)}
                      hitSlop={6}
                      style={[
                        styles.cardActionChip,
                        {
                          backgroundColor: ui.surfaceRaised,
                          borderColor: ui.border,
                        },
                      ]}
                    >
                      <Text style={[styles.cardActionText, { color: ui.text }]}>
                        Edit Note
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => handleRemoveHighlightGroup(item)}
                      hitSlop={6}
                      style={[
                        styles.cardActionChip,
                        {
                          backgroundColor: ui.surfaceRaised,
                          borderColor: ui.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.cardActionText, { color: ui.muted }]}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Mobile Thumb-Reachable Bottom Done Bar */}
      {!embedded ? (
        <View
          style={[
            styles.bottomDoneBar,
            { backgroundColor: ui.bg, borderTopColor: ui.border },
          ]}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [
              styles.bottomDoneBtn,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.bottomDoneText, { color: accentColor }]}>
              Done
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function NotebookModal({ navigation }: NotebookScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppStore((s) => s.theme);
  const ui = uiTokens[theme];

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigation.goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation]);

  return (
    <View
      style={[
        styles.outerRoot,
        {
          backgroundColor: ui.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <NotebookContent
        embedded={false}
        onClose={() => navigation.goBack()}
        onEditNote={(params) => navigation.navigate("NoteEditor", params)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerRoot: {
    flex: 1,
  },
  innerColumn: {
    flex: 1,
    width: "100%",
  },
  desktopColumn: {
    maxWidth: 720,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topBarEmbedded: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headingEmbedded: {
    fontSize: 18,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  donePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  donePillText: {
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bodyEmbedded: {
    paddingHorizontal: 14,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: Platform.OS === "web" ? 7 : 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    paddingVertical: 2,
  },
  clearSearchX: {
    fontSize: 20,
    paddingHorizontal: 4,
  },
  filterTabsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  filterTabPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
  },
  filterTabText: {
    fontSize: 12.5,
  },
  colorFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  colorFilterLabel: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotCheck: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111",
  },
  resetColorText: {
    fontSize: 12.5,
    fontWeight: "700",
    marginLeft: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    gap: 9,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 3.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  inlineSwatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  noteTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    flexShrink: 0,
  },
  cardCitation: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  cardTransBadge: {
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 0,
  },
  cardDate: {
    fontSize: 11.5,
    flexShrink: 0,
  },
  cardNoteBody: {
    fontSize: 14.5,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardVersePreview: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  cardVersePreviewUnderNote: {
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  cardActionChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bottomDoneBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bottomDoneBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
