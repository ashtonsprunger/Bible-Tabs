import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatVerseRangeCitation } from "../constants/books";
import { colors, uiTokens } from "../constants/colors";
import { useResponsiveLayout } from "../constants/layout";
import { TRANSLATIONS, isApiTranslation } from "../constants/translations";
import {
  getApiBibleVersesRangeAsync,
  getCachedApiChapterSync,
} from "../api/apiBibleClient";
import { useBibleDb } from "../db/BibleDbContext";
import { getVersesRangeAsync, getVersesRangeSync } from "../db/queries";
import { useAppStore } from "../store/useAppStore";
import { useStudyStore } from "../store/useStudyStore";
import type {
  NoteEditorParams,
  NoteRecord,
  RootStackParamList,
} from "../types";

type NoteEditorScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "NoteEditor"
>;

export interface NoteEditorContentProps {
  embedded?: boolean;
  params: NoteEditorParams;
  backLabel?: string;
  onClose: () => void;
}

function triggerLightHaptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function NoteEditorContent({
  embedded = false,
  params,
  backLabel,
  onClose,
}: NoteEditorContentProps) {
  const { isDesktop } = useResponsiveLayout();
  const { db, loadedTranslation } = useBibleDb();

  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const translation = loadedTranslation;

  const notesById = useStudyStore((s) => s.notesById);
  const upsertNote = useStudyStore((s) => s.upsertNote);
  const deleteNote = useStudyStore((s) => s.deleteNote);
  const restoreNote = useStudyStore((s) => s.restoreNote);

  const { noteId, book, chapter, startVerse, endVerse, versePreview } = params;

  const existingNote = noteId ? notesById[noteId] : undefined;
  const [body, setBody] = useState(existingNote?.body ?? "");
  const [showVerseQuote, setShowVerseQuote] = useState(true);
  const [deletedSnapshot, setDeletedSnapshot] = useState<NoteRecord | null>(
    null
  );

  const bodyRef = useRef(body);
  bodyRef.current = body;
  const savedOrDeletedRef = useRef(false);

  const [asyncVerseQuote, setAsyncVerseQuote] = useState("");
  const isWeb = Platform.OS === "web";
  const isApi = isApiTranslation(translation);

  useEffect(() => {
    if (versePreview && versePreview.trim().length > 0) return;
    if (!isWeb && !isApi) return;
    let cancelled = false;
    (async () => {
      try {
        if (isApi) {
          const apiRows = await getApiBibleVersesRangeAsync(
            translation,
            book,
            chapter,
            startVerse,
            endVerse
          );
          if (!cancelled && apiRows.length > 0) {
            setAsyncVerseQuote(
              apiRows.length <= 1
                ? apiRows[0]?.text ?? ""
                : apiRows.map((r) => `${r.verse} ${r.text}`).join(" ")
            );
            return;
          }
        }
      } catch {
        // Fallback to local SQLite DB if offline
      }
      try {
        const rows = await getVersesRangeAsync(db, book, chapter, startVerse, endVerse);
        if (cancelled) return;
        setAsyncVerseQuote(
          rows.length <= 1
            ? rows[0]?.text ?? ""
            : rows.map((r) => `${r.verse} ${r.text}`).join(" ")
        );
      } catch {
        // Ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isWeb, isApi, translation, db, book, chapter, startVerse, endVerse, versePreview]);

  const resolvedVerseQuote = useMemo(() => {
    if (versePreview && versePreview.trim().length > 0) {
      return versePreview.trim();
    }
    if (isApi) {
      if (asyncVerseQuote) return asyncVerseQuote;
      const cached = getCachedApiChapterSync(translation, book, chapter);
      if (cached) {
        const lo = Math.min(startVerse, endVerse);
        const hi = Math.max(startVerse, endVerse);
        const rows = [];
        for (let v = lo; v <= hi; v++) {
          const r = cached.versesByNumber[v];
          if (r) rows.push(r);
        }
        if (rows.length === 1) return rows[0].text;
        if (rows.length > 1) return rows.map((r) => `${r.verse} ${r.text}`).join(" ");
      }
    }
    if (isWeb) {
      return asyncVerseQuote;
    }
    try {
      const rows = getVersesRangeSync(db, book, chapter, startVerse, endVerse);
      if (rows.length === 0) return "";
      if (rows.length === 1) return rows[0].text;
      return rows.map((r) => `${r.verse} ${r.text}`).join(" ");
    } catch {
      return "";
    }
  }, [
    isWeb,
    isApi,
    translation,
    asyncVerseQuote,
    db,
    book,
    chapter,
    startVerse,
    endVerse,
    versePreview,
  ]);

  const citation = formatVerseRangeCitation(book, chapter, startVerse, endVerse);
  const translationMeta = TRANSLATIONS[translation];

  const commitSave = useCallback(() => {
    if (savedOrDeletedRef.current) return;
    savedOrDeletedRef.current = true;
    const trimmed = bodyRef.current.trim();
    if (!trimmed && !existingNote) {
      return;
    }
    upsertNote({
      id: existingNote?.id,
      book,
      chapter,
      startVerse,
      endVerse,
      body: trimmed,
    });
  }, [book, chapter, endVerse, existingNote, startVerse, upsertNote]);

  const commitSaveRef = useRef(commitSave);
  commitSaveRef.current = commitSave;

  // Auto-save cleanly on unmount so notes are never lost when closing or switching panels
  useEffect(() => {
    return () => {
      commitSaveRef.current();
    };
  }, []);

  // Android hardware Back on full-screen modal saves & closes
  useEffect(() => {
    if (embedded) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      commitSaveRef.current();
      onClose();
      return true;
    });
    return () => {
      sub.remove();
    };
  }, [embedded, onClose]);

  const handleDone = () => {
    triggerLightHaptic();
    commitSave();
    onClose();
  };

  const handleDelete = () => {
    if (!existingNote) {
      savedOrDeletedRef.current = true;
      onClose();
      return;
    }
    triggerLightHaptic();
    savedOrDeletedRef.current = true;
    const removed = deleteNote(existingNote.id);
    if (removed) {
      setDeletedSnapshot(removed);
      setBody("");
    }
  };

  const handleUndoDelete = () => {
    if (!deletedSnapshot) return;
    triggerLightHaptic();
    restoreNote(deletedSnapshot);
    setBody(deletedSnapshot.body);
    setDeletedSnapshot(null);
    savedOrDeletedRef.current = false;
  };

  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];

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
        {embedded && backLabel ? (
          <Pressable
            onPress={handleDone}
            hitSlop={6}
            style={({ pressed }) => [
              styles.backBtn,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Text style={[styles.backBtnText, { color: accentColor }]}>
              ← {backLabel}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={[
              styles.heading,
              embedded && styles.headingEmbedded,
              { color: ui.text },
            ]}
          >
            {existingNote ? "Edit Note" : "Add Note"}
          </Text>
        )}

        <View style={styles.topBarActions}>
          {existingNote && !deletedSnapshot ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={6}
              style={({ pressed }) => [
                styles.deletePill,
                {
                  backgroundColor: ui.surface,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete note"
            >
              <Text style={[styles.deletePillText, { color: ui.danger }]}>
                Delete
              </Text>
            </Pressable>
          ) : null}

          {embedded ? (
            <Pressable
              onPress={handleDone}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Save and close note"
              style={({ pressed }) => [
                styles.donePill,
                { backgroundColor: ui.surface, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.donePillText, { color: accentColor }]}>
                Done
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.body, embedded && styles.bodyEmbedded]}>
        {/* Citation Strip */}
        <View style={styles.citationRow}>
          <Text style={[styles.citationText, { color: accentColor }]}>
            {citation}
          </Text>
          <Text style={[styles.translationBadge, { color: ui.muted }]}>
            {translationMeta.shortName}
          </Text>
        </View>

        {/* Collapsible Scripture Quote Reference */}
        {resolvedVerseQuote ? (
          <View
            style={[
              styles.quoteBox,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                borderLeftColor: accentBorder,
              },
            ]}
          >
            <Pressable
              onPress={() => setShowVerseQuote((v) => !v)}
              style={styles.quoteToggleRow}
            >
              <Text style={[styles.quoteLabel, { color: ui.muted }]}>
                Passage Reference
              </Text>
              <Text style={[styles.quoteChevron, { color: accentColor }]}>
                {showVerseQuote ? "Hide" : "Show"}
              </Text>
            </Pressable>
            {showVerseQuote ? (
              <ScrollView
                style={styles.quoteScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.quoteText, { color: ui.text }]}>
                  {resolvedVerseQuote}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* Deleted Undo Banner OR Note Input */}
        {deletedSnapshot ? (
          <View
            style={[
              styles.deletedCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.deletedTitle, { color: ui.text }]}>
              Note deleted
            </Text>
            <Text style={[styles.deletedSubtitle, { color: ui.muted }]}>
              Tap Undo to restore your note for {citation}.
            </Text>
            <View style={styles.deletedActions}>
              <Pressable
                onPress={handleUndoDelete}
                style={[styles.undoButton, { borderColor: accentColor }]}
              >
                <Text style={[styles.undoButtonText, { color: accentColor }]}>
                  Undo Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.editorCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <TextInput
              style={[styles.editorInput, { color: ui.text }]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your thoughts, cross-references, or sermon notes…"
              placeholderTextColor={ui.muted}
              multiline
              textAlignVertical="top"
              autoFocus={!existingNote}
              scrollEnabled
            />
          </View>
        )}

        {/* Quiet Auto-save Footer */}
        {!deletedSnapshot ? (
          <Text style={[styles.autosaveHint, { color: ui.muted }]}>
            Saved locally on device · Auto-saves when closed
          </Text>
        ) : null}
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
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel="Save and close note"
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

export default function NoteEditorModal({
  navigation,
  route,
}: NoteEditorScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppStore((s) => s.theme);
  const ui = uiTokens[theme];

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigation.goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={[
        styles.outerRoot,
        {
          backgroundColor: ui.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <NoteEditorContent
        embedded={false}
        params={route.params}
        onClose={() => navigation.goBack()}
      />
    </KeyboardAvoidingView>
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
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deletePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deletePillText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  donePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  donePillText: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  bodyEmbedded: {
    paddingHorizontal: 14,
  },
  citationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  citationText: {
    fontSize: 16.5,
    fontWeight: "700",
  },
  translationBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
  },
  quoteBox: {
    borderWidth: 1,
    borderLeftWidth: 3.5,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 12,
  },
  quoteToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  quoteChevron: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  quoteScroll: {
    maxHeight: 96,
    marginTop: 6,
  },
  quoteText: {
    fontSize: 14.5,
    lineHeight: 20,
    opacity: 0.88,
  },
  editorCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  editorInput: {
    flex: 1,
    fontSize: 16.5,
    lineHeight: 24,
    padding: 0,
  },
  deletedCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  deletedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  deletedSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  deletedActions: {
    flexDirection: "row",
    gap: 10,
  },
  undoButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  undoButtonText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  autosaveHint: {
    fontSize: 11.5,
    textAlign: "center",
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
