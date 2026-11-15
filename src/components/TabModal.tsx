import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatChapterLabel, parseReference } from "../constants/books";
import { colors } from "../constants/colors";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../types";
import ChapterBrowser from "./ChapterBrowser";
import MyButton from "./MyButton";

type TabModalScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "TabModal"
>;

function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.searchIconBox}>
      <View style={[styles.searchLens, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabModal({ navigation }: TabModalScreenProps) {
  const insets = useSafeAreaInsets();

  const tabs = useAppStore((s) => s.tabs);
  const currentTab = useAppStore((s) => s.currentTab);
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const renameTab = useAppStore((s) => s.renameTab);
  const flushTabs = useAppStore((s) => s.flushTabs);
  const jumpTabToReference = useAppStore((s) => s.jumpTabToReference);
  const removeTab = useAppStore((s) => s.removeTab);
  const setShowSearch = useAppStore((s) => s.setShowSearch);

  const tab = tabs[currentTab];
  const [draftName, setDraftName] = useState(tab?.name ?? "");

  useEffect(() => {
    if (tab) {
      setDraftName(tab.name);
    }
  }, [tab?.id]);

  // Flush any pending debounced rename whether closed by button or Android Predictive Back
  useEffect(() => {
    return () => {
      flushTabs();
    };
  }, [flushTabs]);

  if (!tab) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bible.background[theme],
        }}
      />
    );
  }

  const parsedRef = parseReference(tab.reference);
  const currentPassageLabel = formatChapterLabel(
    parsedRef.book,
    parsedRef.chapter
  );
  const textColor = colors.bible.text[theme];

  const handleClose = () => {
    const trimmed = draftName.trim();
    setDraftName(trimmed);
    renameTab(currentTab, trimmed);
    flushTabs();
    navigation.goBack();
  };

  const handleOpenSearch = () => {
    const trimmed = draftName.trim();
    renameTab(currentTab, trimmed);
    flushTabs();
    setShowSearch(true);
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bible.background[theme],
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(12, insets.bottom + 8),
        },
      ]}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />

      {/* Header Row: Editable Tab Title + Search Icon + Gear Icon */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <TextInput
            style={[styles.titleInput, { color: textColor }]}
            value={draftName}
            onChangeText={(text) => {
              setDraftName(text);
              renameTab(currentTab, text);
            }}
            placeholder={currentPassageLabel}
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
              onPress={() => navigation.navigate("Settings")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={[styles.gearIcon, { color: textColor }]}>⚙</Text>
            </Pressable>
          </View>
        </View>

        {draftName.trim().length > 0 ? (
          <Text
            style={[
              styles.currentPassageHint,
              { color: colors.bible.color[theme][color][1] },
            ]}
          >
            {currentPassageLabel}
          </Text>
        ) : null}
      </View>

      {/* Expandable Book & Chapter Picker */}
      <ChapterBrowser
        currentReference={parsedRef}
        theme={theme}
        color={color}
        onSelectChapter={(book, chapter) => {
          const trimmed = draftName.trim();
          renameTab(currentTab, trimmed);
          jumpTabToReference(currentTab, { book, chapter, verse: 1 }, false);
          navigation.goBack();
        }}
      />

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <MyButton
          color={colors.bible.color[theme].red[0]}
          textColor={textColor}
          backgroundColor={colors.tab.tab.inactive[theme]}
          onPress={() => {
            removeTab(currentTab);
            navigation.goBack();
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: "column",
  },
  headerBlock: {
    marginBottom: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  titleInput: {
    flex: 1,
    fontSize: 35,
    marginRight: 12,
    paddingVertical: 0,
  },
  currentPassageHint: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
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
