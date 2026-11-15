import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BOOKS, parseReference } from "../constants/books";
import { colors } from "../constants/colors";
import type { RuntimeTab } from "../store/useAppStore";
import type { AccentColorName, ThemeName } from "../types";

interface TabBarProps {
  tabs: RuntimeTab[];
  currentTab: number;
  theme: ThemeName;
  color: AccentColorName;
  onSelectTab: (index: number) => void;
  onOpenActiveTabModal: () => void;
  onAddTab: () => void;
}

type ListEntry =
  | { kind: "tab"; tab: RuntimeTab; index: number }
  | { kind: "newTab" };

export default function TabBar({
  tabs,
  currentTab,
  theme,
  color,
  onSelectTab,
  onOpenActiveTabModal,
  onAddTab,
}: TabBarProps) {
  const entries: ListEntry[] = [
    ...tabs.map((tab, index) => ({ kind: "tab" as const, tab, index })),
    { kind: "newTab" as const },
  ];

  return (
    <View style={styles.wrapper}>
      <FlatList
        style={{ backgroundColor: colors.tab.background[theme] }}
        data={entries}
        keyExtractor={(item) =>
          item.kind === "tab" ? item.tab.id : "__new_tab_button__"
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === "newTab") {
            return (
              <Pressable style={styles.newTabButton} onPress={onAddTab}>
                <Text
                  style={[
                    styles.newTabText,
                    { color: colors.tab.text.inactive[theme] },
                  ]}
                >
                  +
                </Text>
              </Pressable>
            );
          }

          const isActive = item.index === currentTab;
          const ref = parseReference(item.tab.reference);
          const defaultLabel = `${BOOKS[ref.book].book} ${ref.chapter}`;
          const label = item.tab.name ? item.tab.name : defaultLabel;

          return (
            <Pressable
              style={[
                styles.tabButton,
                {
                  backgroundColor: isActive
                    ? colors.tab.tab.active[theme]
                    : colors.tab.tab.inactive[theme],
                  borderTopColor: isActive
                    ? colors.bible.color[theme][color][0]
                    : "transparent",
                },
              ]}
              onPress={() => {
                if (isActive) {
                  onOpenActiveTabModal();
                } else {
                  onSelectTab(item.index);
                }
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive
                      ? colors.tab.text.active[theme]
                      : colors.tab.text.inactive[theme],
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: "auto",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: 4,
    borderTopWidth: 3,
  },
  tabText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
  },
  newTabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "transparent",
  },
  newTabText: {
    fontSize: 20,
    lineHeight: 21,
    fontWeight: "bold",
    letterSpacing: 0.25,
  },
});
