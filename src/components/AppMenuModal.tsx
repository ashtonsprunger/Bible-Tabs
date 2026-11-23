import React, { useEffect } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, uiTokens } from "../constants/colors";
import { TRANSLATIONS } from "../constants/translations";
import type {
  AccentColorName,
  FontFamilyOption,
  ThemeName,
  TranslationId,
} from "../types";
import { ChevronIcon, NotebookIcon, SearchIcon, SettingsIcon } from "./Icons";

interface AppMenuModalProps {
  visible: boolean;
  topOffset: number;
  theme: ThemeName;
  color: AccentColorName;
  translation: TranslationId;
  fontFamily: FontFamilyOption;
  notesCount: number;
  highlightsCount: number;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenNotebook: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export default function AppMenuModal({
  visible,
  topOffset,
  theme,
  color,
  translation,
  fontFamily,
  notesCount,
  highlightsCount,
  onClose,
  onOpenSearch,
  onOpenNotebook,
  onOpenSettings,
  onOpenAbout,
}: AppMenuModalProps) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    let keyCleanup: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      keyCleanup = () => window.removeEventListener("keydown", onKey);
    }
    return () => {
      sub.remove();
      keyCleanup?.();
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const ui = uiTokens[theme];
  const accentColor = colors.bible.color[theme][color][1];
  const transShort = TRANSLATIONS[translation].shortName;
  const studySub =
    notesCount === 0 && highlightsCount === 0
      ? "Highlights & study notes"
      : `${highlightsCount} highlight${highlightsCount === 1 ? "" : "s"} · ${notesCount} note${notesCount === 1 ? "" : "s"}`;
  const settingsSub = `${transShort} · ${fontFamily === "serif" ? "Serif" : "Sans"} · ${
    theme.charAt(0).toUpperCase() + theme.slice(1)
  }`;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close menu"
      />
      <View
        style={[
          styles.menuCard,
          {
            top: topOffset + 48,
            backgroundColor: ui.surfaceRaised,
            borderColor: ui.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            onClose();
            onOpenSearch();
          }}
          style={({ pressed }) => [
            styles.menuRow,
            { borderBottomColor: ui.border },
            pressed && { backgroundColor: ui.surface },
          ]}
        >
          <View style={styles.rowIcon}>
            <SearchIcon color={accentColor} size={17} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: ui.text }]}>
              Search Scripture
            </Text>
            <Text style={[styles.rowSub, { color: ui.muted }]}>
              Words, phrases, or references
            </Text>
          </View>
          <ChevronIcon color={ui.muted} direction="right" size={11} />
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            onOpenNotebook();
          }}
          style={({ pressed }) => [
            styles.menuRow,
            { borderBottomColor: ui.border },
            pressed && { backgroundColor: ui.surface },
          ]}
        >
          <View style={styles.rowIcon}>
            <NotebookIcon color={ui.text} size={17} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: ui.text }]}>Notebook</Text>
            <Text style={[styles.rowSub, { color: ui.muted }]}>{studySub}</Text>
          </View>
          <ChevronIcon color={ui.muted} direction="right" size={11} />
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            onOpenSettings();
          }}
          style={({ pressed }) => [
            styles.menuRow,
            { borderBottomColor: ui.border },
            pressed && { backgroundColor: ui.surface },
          ]}
        >
          <View style={styles.rowIcon}>
            <SettingsIcon color={ui.text} size={16} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: ui.text }]}>Settings</Text>
            <Text style={[styles.rowSub, { color: ui.muted }]}>
              {settingsSub}
            </Text>
          </View>
          <ChevronIcon color={ui.muted} direction="right" size={11} />
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            onOpenAbout();
          }}
          style={({ pressed }) => [
            styles.menuRow,
            styles.lastRow,
            pressed && { backgroundColor: ui.surface },
          ]}
        >
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: ui.text }]}>
              About &amp; Attribution
            </Text>
            <Text style={[styles.rowSub, { color: ui.muted }]}>
              Bible Tabs · Public Domain texts
            </Text>
          </View>
          <ChevronIcon color={ui.muted} direction="right" size={11} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menuCard: {
    position: "absolute",
    right: 10,
    width: 268,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15.5,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 12.5,
    marginTop: 1,
  },
});
