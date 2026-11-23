import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatChapterLabel, parseReference } from "../constants/books";
import { colors, uiTokens } from "../constants/colors";
import type { RuntimeTab } from "../store/useAppStore";
import type { AccentColorName, ThemeName } from "../types";
import ChapterBrowser from "./ChapterBrowser";

interface TabPassagePanelProps {
  tab: RuntimeTab;
  tabIndex: number;
  totalTabs: number;
  theme: ThemeName;
  color: AccentColorName;
  isDesktop: boolean;
  bottomInset: number;
  onRenameTab: (index: number, name: string) => void;
  onFlushTabs: () => void;
  onMoveTab: (fromIndex: number, toIndex: number) => void;
  onRemoveTab: (index: number) => void;
  onSelectChapter: (book: number, chapter: number) => void;
  onClose: () => void;
}

export default function TabPassagePanel({
  tab,
  tabIndex,
  totalTabs,
  theme,
  color,
  isDesktop,
  bottomInset,
  onRenameTab,
  onFlushTabs,
  onMoveTab,
  onRemoveTab,
  onSelectChapter,
  onClose,
}: TabPassagePanelProps) {
  const [draftName, setDraftName] = useState(tab.name);

  useEffect(() => {
    setDraftName(tab.name);
  }, [tab.id, tab.name]);

  useEffect(() => {
    return () => {
      onFlushTabs();
    };
  }, [onFlushTabs]);

  const ui = uiTokens[theme];
  const accentColor = colors.bible.color[theme][color][1];
  const parsedRef = parseReference(tab.reference);
  const currentPassageLabel = formatChapterLabel(
    parsedRef.book,
    parsedRef.chapter
  );

  const canMoveLeft = tabIndex > 0;
  const canMoveRight = tabIndex < totalTabs - 1;

  const commitName = () => {
    const trimmed = draftName.trim();
    setDraftName(trimmed);
    onRenameTab(tabIndex, trimmed);
    onFlushTabs();
  };

  const handleCloseTab = () => {
    onRemoveTab(tabIndex);
    if (totalTabs <= 1) {
      onClose();
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: ui.bg,
          borderRightColor: ui.border,
        },
        isDesktop ? styles.desktopSidebar : styles.mobileFullPanel,
      ]}
    >
      {/* Tab Rename + Dedicated Tab Actions Row */}
      <View style={[styles.header, { borderBottomColor: ui.border }]}>
        <View style={styles.titleRow}>
          <TextInput
            style={[
              styles.titleInput,
              {
                color: ui.text,
                backgroundColor: ui.surface,
                borderColor: ui.border,
              },
            ]}
            value={draftName}
            onChangeText={(text) => {
              setDraftName(text);
              onRenameTab(tabIndex, text);
            }}
            onBlur={commitName}
            placeholder="Name tab…"
            placeholderTextColor={ui.muted}
            selectTextOnFocus
          />

          {isDesktop ? (
            <Pressable
              onPress={() => {
                commitName();
                onClose();
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Close passage panel"
              style={({ pressed }) => [
                styles.closeIconBtn,
                { backgroundColor: ui.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.closeIconText, { color: ui.text }]}>×</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Dedicated Move / Close Tab Row */}
        <View style={styles.tabControlsRow}>
          <View style={styles.moveGroup}>
            {totalTabs > 1 ? (
              <>
                <Pressable
                  disabled={!canMoveLeft}
                  onPress={() => onMoveTab(tabIndex, tabIndex - 1)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Move tab left"
                  style={({ pressed }) => [
                    styles.miniChip,
                    {
                      backgroundColor: ui.surface,
                      opacity: !canMoveLeft ? 0.35 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.miniChipText, { color: ui.text }]}>
                    ← Move
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!canMoveRight}
                  onPress={() => onMoveTab(tabIndex, tabIndex + 1)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Move tab right"
                  style={({ pressed }) => [
                    styles.miniChip,
                    {
                      backgroundColor: ui.surface,
                      opacity: !canMoveRight ? 0.35 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.miniChipText, { color: ui.text }]}>
                    Move →
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <Pressable
            onPress={handleCloseTab}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Close this tab"
            style={({ pressed }) => [
              styles.miniChip,
              { backgroundColor: ui.surface, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.miniChipText, { color: ui.danger }]}>
              Close Tab
            </Text>
          </Pressable>
        </View>

        {/* Only show current chapter subtitle when tab has a custom name */}
        {draftName.trim().length > 0 ? (
          <Text
            style={[styles.passageMeta, { color: ui.muted }]}
            numberOfLines={1}
          >
            Currently in {currentPassageLabel}
          </Text>
        ) : null}
      </View>

      {/* Book & Chapter Picker */}
      <ChapterBrowser
        currentReference={parsedRef}
        theme={theme}
        color={color}
        isDesktop={isDesktop}
        onSelectChapter={(book, chapter) => {
          commitName();
          onSelectChapter(book, chapter);
          if (!isDesktop) {
            onClose();
          }
        }}
      />

      {/* Footer: Mobile thumb-reachable Done bar */}
      {!isDesktop ? (
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: ui.bg,
              borderTopColor: ui.border,
              paddingBottom: Math.max(10, bottomInset),
            },
          ]}
        >
          <Pressable
            onPress={() => {
              commitName();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [
              styles.mobileDoneBtn,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.mobileDoneText, { color: accentColor }]}>
              Done
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "column",
  },
  mobileFullPanel: {
    flex: 1,
  },
  desktopSidebar: {
    width: 340,
    borderRightWidth: 1,
    flexShrink: 0,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "web" ? 6 : 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  closeIconText: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: "600",
  },
  passageMeta: {
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 2,
  },
  tabControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  moveGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniChip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  miniChipText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  footerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  mobileDoneBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileDoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
  desktopCloseTabBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopCloseTabText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
});
