import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { BOOKS, parseReference } from "../constants/books";
import { colors } from "../constants/colors";
import type { RuntimeTab } from "../store/useAppStore";
import type {
  AccentColorName,
  BibleReference,
  TextSizeOption,
  ThemeName,
} from "../types";
import ChapterBrowser from "./ChapterBrowser";
import MyButton from "./MyButton";
import SettingsModal from "./SettingsModal";

interface TabModalProps {
  visible: boolean;
  tab: RuntimeTab | undefined;
  tabIndex: number;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  allowRotation: boolean;
  insets: EdgeInsets;
  onClose: () => void;
  onOpenSearch: () => void;
  onRenameTab: (index: number, name: string) => void;
  onSelectReference: (index: number, ref: BibleReference) => void;
  onRemoveTab: (index: number) => void;
  onSetTheme: (theme: ThemeName) => void;
  onSetColor: (color: AccentColorName) => void;
  onSetTextSize: (size: TextSizeOption) => void;
  onToggleRotation: () => void;
}

function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.searchIconBox}>
      <View style={[styles.searchLens, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabModal({
  visible,
  tab,
  tabIndex,
  theme,
  color,
  textSize,
  allowRotation,
  insets,
  onClose,
  onOpenSearch,
  onRenameTab,
  onSelectReference,
  onRemoveTab,
  onSetTheme,
  onSetColor,
  onSetTextSize,
  onToggleRotation,
}: TabModalProps) {
  const [draftName, setDraftName] = useState(tab?.name ?? "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (visible && tab) {
      setDraftName(tab.name);
    }
  }, [visible, tab?.id]);

  if (!tab) {
    return null;
  }

  const parsedRef = parseReference(tab.reference);
  const placeholder = `${BOOKS[parsedRef.book].book} ${parsedRef.chapter}`;
  const textColor = colors.bible.text[theme];

  const saveTrimmedName = () => {
    const trimmed = draftName.trim();
    setDraftName(trimmed);
    onRenameTab(tabIndex, trimmed);
  };

  const handleClose = () => {
    saveTrimmedName();
    onClose();
  };

  const handleOpenSearch = () => {
    saveTrimmedName();
    onClose();
    onOpenSearch();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.bible.background[theme],
              paddingTop: Math.max(12, insets.top + 8),
              paddingBottom: Math.max(12, insets.bottom + 12),
            },
          ]}
        >
          {/* Header Row: Editable Tab Title + Search Icon + Gear Icon */}
          <View style={styles.headerRow}>
            <TextInput
              style={[styles.titleInput, { color: textColor }]}
              value={draftName}
              onChangeText={(text) => {
                setDraftName(text);
                onRenameTab(tabIndex, text);
              }}
              placeholder={placeholder}
              placeholderTextColor="rgb(150,150,150)"
              selectTextOnFocus
            />
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleOpenSearch}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Search Bible"
              >
                <SearchIcon color={textColor} />
              </Pressable>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Text style={[styles.gearIcon, { color: textColor }]}>⚙</Text>
              </Pressable>
            </View>
          </View>

          {/* Expandable Book & Chapter Picker */}
          <ChapterBrowser
            currentReference={parsedRef}
            theme={theme}
            color={color}
            onSelectChapter={(book, chapter) => {
              saveTrimmedName();
              onSelectReference(tabIndex, { book, chapter, verse: 1 });
              onClose();
            }}
          />

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <MyButton
              color={colors.bible.color[theme].red[0]}
              textColor={textColor}
              backgroundColor={colors.tab.tab.inactive[theme]}
              onPress={() => {
                onRemoveTab(tabIndex);
                onClose();
              }}
              title="Remove Tab"
            />
            <MyButton
              onPress={handleClose}
              title="Done"
              color={colors.bible.color[theme][color][1]}
              textColor={textColor}
              backgroundColor={colors.tab.tab.inactive[theme]}
            />
          </View>
        </View>
      </Modal>

      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        color={color}
        textSize={textSize}
        allowRotation={allowRotation}
        onSetTheme={onSetTheme}
        onSetColor={onSetColor}
        onSetTextSize={onSetTextSize}
        onToggleRotation={onToggleRotation}
        insets={insets}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: "column",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  titleInput: {
    flex: 1,
    fontSize: 35,
    marginRight: 12,
    paddingVertical: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  searchIconBox: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  searchLens: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 2.5,
    marginTop: -4,
    marginLeft: -4,
  },
  searchHandle: {
    position: "absolute",
    width: 9,
    height: 2.5,
    borderRadius: 1.25,
    left: 17.5,
    top: 20.75,
    transform: [{ rotate: "45deg" }],
  },
  gearIcon: {
    fontSize: 30,
    fontWeight: "500",
  },
  footer: {
    paddingTop: 12,
    gap: 15,
  },
});
