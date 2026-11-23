import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ACCENT_COLORS,
  TEXT_SIZES,
  colors,
  uiTokens,
} from "../constants/colors";
import { useResponsiveLayout } from "../constants/layout";
import {
  API_BIBLE_ATTRIBUTION_URL,
  API_TRANSLATION_IDS,
  LOCAL_TRANSLATION_IDS,
  TRANSLATIONS,
  isApiTranslation,
} from "../constants/translations";
import { getScriptureFontFamily } from "../constants/typography";
import { useAppStore } from "../store/useAppStore";
import { useStudyStore } from "../store/useStudyStore";
import type { RootStackParamList } from "../types";
import { ChevronIcon } from "./Icons";

type SettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Settings"
>;

export interface SettingsContentProps {
  embedded?: boolean;
  onClose: () => void;
  onOpenVersion: () => void;
}

function triggerLightHaptic() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function SettingsContent({
  embedded = false,
  onClose,
  onOpenVersion,
}: SettingsContentProps) {
  const { isDesktop } = useResponsiveLayout();

  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const textSize = useAppStore((s) => s.textSize);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const allowRotation = useAppStore((s) => s.allowRotation);
  const translation = useAppStore((s) => s.translation);
  const setTheme = useAppStore((s) => s.setTheme);
  const setColor = useAppStore((s) => s.setColor);
  const setTextSize = useAppStore((s) => s.setTextSize);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const toggleRotation = useAppStore((s) => s.toggleRotation);
  const setTranslation = useAppStore((s) => s.setTranslation);
  const getSerializableTabs = useAppStore((s) => s.getSerializableTabs);

  const highlightsCount = useStudyStore(
    (s) => Object.keys(s.highlightsByKey).length
  );
  const notesCount = useStudyStore((s) => Object.keys(s.notesById).length);
  const exportBackupJson = useStudyStore((s) => s.exportBackupJson);
  const importBackupJson = useStudyStore((s) => s.importBackupJson);

  const [showImportBox, setShowImportBox] = useState(false);
  const [importText, setImportText] = useState("");
  const [backupStatus, setBackupStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const version = Constants.expoConfig?.version ?? "5.1.0";
  const ui = uiTokens[theme];
  const accentBorder = colors.bible.color[theme][color][0];
  const accentColor = colors.bible.color[theme][color][1];
  const activeTranslationMeta = TRANSLATIONS[translation];
  const scriptureFont = getScriptureFontFamily(fontFamily);
  const previewFontSize = Number(textSize);

  const handleExportBackup = async () => {
    triggerLightHaptic();
    const json = exportBackupJson(getSerializableTabs());
    try {
      await Clipboard.setStringAsync(json);
    } catch {
      // Clipboard may be unavailable on some web contexts
    }
    if (Platform.OS === "web" && typeof document !== "undefined") {
      try {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bible-tabs-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setBackupStatus({
          kind: "ok",
          text: `Downloaded bible-tabs-backup-${dateStr}.json (${highlightsCount} highlights, ${notesCount} notes).`,
        });
        return;
      } catch {
        // Fallback below
      }
    }
    try {
      await Share.share({
        title: "Bible Tabs Backup",
        message: json,
      });
      setBackupStatus({
        kind: "ok",
        text: `Backup ready (${highlightsCount} highlights, ${notesCount} notes copied to clipboard).`,
      });
    } catch {
      setBackupStatus({
        kind: "ok",
        text: `Backup JSON copied to clipboard (${highlightsCount} highlights, ${notesCount} notes).`,
      });
    }
  };

  const handleChooseFileWeb = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = typeof reader.result === "string" ? reader.result : "";
        if (!raw.trim()) {
          setBackupStatus({ kind: "error", text: "Selected file is empty." });
          return;
        }
        try {
          const { summary } = importBackupJson(raw);
          setImportText("");
          setShowImportBox(false);
          setBackupStatus({
            kind: "ok",
            text: `Imported ${summary.highlightsImported} highlights and ${summary.notesImported} notes from ${file.name}.`,
          });
        } catch (err) {
          setBackupStatus({
            kind: "error",
            text:
              err instanceof Error
                ? err.message
                : "Could not parse backup file.",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip.trim()) {
        setBackupStatus({
          kind: "error",
          text: "Clipboard is empty. Copy a Bible Tabs backup JSON first.",
        });
        return;
      }
      setImportText(clip);
      setBackupStatus(null);
    } catch {
      setBackupStatus({
        kind: "error",
        text: "Could not read clipboard. Paste the backup JSON directly below.",
      });
    }
  };

  const handleConfirmImport = () => {
    if (!importText.trim()) {
      setBackupStatus({ kind: "error", text: "Paste your backup JSON first." });
      return;
    }
    try {
      const { summary } = importBackupJson(importText);
      triggerLightHaptic();
      setImportText("");
      setShowImportBox(false);
      setBackupStatus({
        kind: "ok",
        text: `Merged ${summary.highlightsImported} highlights and ${summary.notesImported} notes.`,
      });
    } catch (err) {
      setBackupStatus({
        kind: "error",
        text:
          err instanceof Error
            ? err.message
            : "Invalid backup JSON. Check that the full text was pasted.",
      });
    }
  };

  return (
    <View
      style={[
        styles.innerColumn,
        !embedded && isDesktop && styles.desktopColumn,
      ]}
    >
      {/* Clean Top Header */}
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
          Settings
        </Text>
        {embedded ? (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            style={({ pressed }) => [
              styles.closeIconBtn,
              { backgroundColor: ui.surface, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text style={[styles.donePillText, { color: ui.text }]}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.scrollContent,
          embedded && styles.scrollContentEmbedded,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Scripture Reading Preview (shown only on mobile full-screen where Scripture is covered) */}
        {!embedded ? (
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: ui.surfaceRaised,
                borderColor: ui.border,
              },
            ]}
          >
            <Text style={[styles.previewKicker, { color: ui.muted }]}>
              PREVIEW · {activeTranslationMeta.shortName} · {textSize}pt
            </Text>
            <Text
              numberOfLines={3}
              style={{
                color: ui.text,
                fontFamily: scriptureFont,
                fontSize: previewFontSize,
                lineHeight: Math.round(previewFontSize * 1.44),
              }}
            >
              <Text
                style={{
                  color: accentColor,
                  fontSize: Math.round(previewFontSize * 0.66),
                  fontWeight: "600",
                }}
              >
                {"1\u00A0"}
              </Text>
              In the beginning was the Word, and the Word was with God, and the Word was God.
            </Text>
          </View>
        ) : null}

          {/* SECTION: SCRIPTURE */}
          <Text style={[styles.sectionLabel, { color: ui.muted }]}>
            SCRIPTURE
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: ui.text }]}>
              Offline Translations
            </Text>
            <View style={styles.pillRow}>
              {LOCAL_TRANSLATION_IDS.map((id) => {
                const meta = TRANSLATIONS[id];
                const isSelected = translation === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      triggerLightHaptic();
                      setTranslation(id);
                    }}
                    style={({ pressed }) => [
                      styles.choicePill,
                      {
                        backgroundColor: isSelected
                          ? ui.surfaceRaised
                          : "transparent",
                        borderColor: isSelected ? accentBorder : ui.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        {
                          color: isSelected ? accentColor : ui.text,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {meta.shortName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.fieldLabel,
                styles.subFieldLabel,
                { color: ui.text },
              ]}
            >
              Online Translations (API.Bible)
            </Text>
            <View style={styles.pillRow}>
              {API_TRANSLATION_IDS.map((id) => {
                const meta = TRANSLATIONS[id];
                const isSelected = translation === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      triggerLightHaptic();
                      setTranslation(id);
                    }}
                    style={({ pressed }) => [
                      styles.choicePill,
                      {
                        backgroundColor: isSelected
                          ? ui.surfaceRaised
                          : "transparent",
                        borderColor: isSelected ? accentBorder : ui.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        {
                          color: isSelected ? accentColor : ui.text,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {meta.shortName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.helperText, { color: ui.muted }]}>
              {activeTranslationMeta.fullName} —{" "}
              {activeTranslationMeta.licenseNote}
            </Text>
            {isApiTranslation(translation) ? (
              <View style={styles.attributionLinkRow}>
                <Pressable
                  onPress={() =>
                    Linking.openURL(activeTranslationMeta.publisherUrl!).catch(
                      () => {}
                    )
                  }
                >
                  <Text style={[styles.inlineLink, { color: accentColor }]}>
                    {activeTranslationMeta.publisherLinkLabel} ↗
                  </Text>
                </Pressable>
                <Text style={[styles.helperTextNoMargin, { color: ui.muted }]}>
                  ·
                </Text>
                <Pressable
                  onPress={() =>
                    Linking.openURL(API_BIBLE_ATTRIBUTION_URL).catch(() => {})
                  }
                >
                  <Text style={[styles.inlineLink, { color: accentColor }]}>
                    Powered by API.Bible ↗
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* SECTION: APPEARANCE */}
          <Text style={[styles.sectionLabel, { color: ui.muted }]}>
            APPEARANCE
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            {/* Theme */}
            <Text style={[styles.fieldLabel, { color: ui.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(["light", "sepia", "dark"] as const).map((themeOpt) => {
                const isSelected = theme === themeOpt;
                const optTokens = uiTokens[themeOpt];
                return (
                  <Pressable
                    key={themeOpt}
                    onPress={() => {
                      triggerLightHaptic();
                      setTheme(themeOpt);
                    }}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: optTokens.bg,
                        borderColor: isSelected
                          ? accentBorder
                          : optTokens.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.themeCardSample,
                        { color: optTokens.text, fontFamily: scriptureFont },
                      ]}
                    >
                      Aa
                    </Text>
                    <Text
                      style={[
                        styles.themeCardLabel,
                        { color: optTokens.muted },
                      ]}
                    >
                      {themeOpt.charAt(0).toUpperCase() + themeOpt.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: ui.border }]} />

            {/* Font */}
            <Text style={[styles.fieldLabel, { color: ui.text }]}>
              Reading Font
            </Text>
            <View style={styles.pillRow}>
              {(
                [
                  { id: "serif", label: "Serif", sample: "Book" },
                  { id: "sans", label: "Sans", sample: "Clean" },
                ] as const
              ).map((opt) => {
                const isSelected = fontFamily === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      triggerLightHaptic();
                      setFontFamily(opt.id);
                    }}
                    style={[
                      styles.fontChoicePill,
                      {
                        backgroundColor: isSelected
                          ? ui.surfaceRaised
                          : "transparent",
                        borderColor: isSelected ? accentBorder : ui.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fontChoiceTitle,
                        {
                          color: isSelected ? accentColor : ui.text,
                          fontFamily: getScriptureFontFamily(opt.id),
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[styles.fontChoiceSub, { color: ui.muted }]}>
                      {opt.sample}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: ui.border }]} />

            {/* Text Size */}
            <Text style={[styles.fieldLabel, { color: ui.text }]}>
              Text Size
            </Text>
            <View style={styles.pillRow}>
              {TEXT_SIZES.map((size) => {
                const isSelected = textSize === size;
                return (
                  <Pressable
                    key={size}
                    onPress={() => {
                      triggerLightHaptic();
                      setTextSize(size);
                    }}
                    style={[
                      styles.sizePill,
                      {
                        backgroundColor: isSelected
                          ? ui.surfaceRaised
                          : "transparent",
                        borderColor: isSelected ? accentBorder : ui.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: Math.min(22, Math.max(13, Number(size) * 0.65)),
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? accentColor : ui.text,
                      }}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: ui.border }]} />

            {/* Accent Color */}
            <Text style={[styles.fieldLabel, { color: ui.text }]}>
              Accent Color
            </Text>
            <View style={styles.accentRow}>
              {ACCENT_COLORS.map((swatch) => {
                const isSelected = color === swatch;
                const swatchBg = colors.bible.color[theme][swatch][0];
                return (
                  <Pressable
                    key={swatch}
                    onPress={() => {
                      triggerLightHaptic();
                      setColor(swatch);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Accent ${swatch}`}
                    style={[
                      styles.accentDotOuter,
                      {
                        borderColor: isSelected ? ui.text : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.accentDotInner,
                        { backgroundColor: swatchBg },
                      ]}
                    >
                      {isSelected ? (
                        <Text style={styles.accentCheck}>✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* SECTION: DEVICE & BACKUP */}
          <Text style={[styles.sectionLabel, { color: ui.muted }]}>
            DATA &amp; DEVICE
          </Text>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: ui.surface, borderColor: ui.border },
            ]}
          >
            {!isDesktop && Platform.OS !== "web" ? (
              <>
                <View style={styles.inlineRow}>
                  <View style={styles.inlineRowCopy}>
                    <Text style={[styles.fieldLabelNoMargin, { color: ui.text }]}>
                      Screen Orientation
                    </Text>
                    <Text style={[styles.helperTextNoMargin, { color: ui.muted }]}>
                      Lock portrait or allow landscape
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      toggleRotation();
                    }}
                    style={[
                      styles.smallActionBtn,
                      {
                        backgroundColor: ui.surfaceRaised,
                        borderColor: ui.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.smallActionText, { color: accentColor }]}
                    >
                      {allowRotation ? "Any" : "Portrait"}
                    </Text>
                  </Pressable>
                </View>
                <View style={[styles.divider, { backgroundColor: ui.border }]} />
              </>
            ) : null}

            {/* Backup Row */}
            <View style={styles.inlineRow}>
              <View style={styles.inlineRowCopy}>
                <Text style={[styles.fieldLabelNoMargin, { color: ui.text }]}>
                  Backup &amp; Transfer
                </Text>
                <Text style={[styles.helperTextNoMargin, { color: ui.muted }]}>
                  {highlightsCount} highlight{highlightsCount === 1 ? "" : "s"},{" "}
                  {notesCount} note{notesCount === 1 ? "" : "s"} saved locally
                </Text>
              </View>
              <View style={styles.backupBtnGroup}>
                <Pressable
                  onPress={handleExportBackup}
                  style={({ pressed }) => [
                    styles.smallActionBtn,
                    {
                      backgroundColor: ui.surfaceRaised,
                      borderColor: ui.border,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.smallActionText, { color: ui.text }]}>
                    Export
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowImportBox((v) => !v);
                    setBackupStatus(null);
                  }}
                  style={({ pressed }) => [
                    styles.smallActionBtn,
                    {
                      backgroundColor: ui.surfaceRaised,
                      borderColor: showImportBox ? accentBorder : ui.border,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.smallActionText,
                      { color: showImportBox ? accentColor : ui.text },
                    ]}
                  >
                    Import
                  </Text>
                </Pressable>
              </View>
            </View>

            {showImportBox ? (
              <View style={styles.importPanel}>
                <TextInput
                  style={[
                    styles.importInput,
                    {
                      color: ui.text,
                      backgroundColor: ui.surfaceRaised,
                      borderColor: ui.border,
                    },
                  ]}
                  value={importText}
                  onChangeText={setImportText}
                  placeholder="Paste Bible Tabs backup JSON here…"
                  placeholderTextColor={ui.muted}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.importActions}>
                  {Platform.OS === "web" ? (
                    <Pressable
                      onPress={handleChooseFileWeb}
                      style={[
                        styles.importChip,
                        {
                          backgroundColor: ui.surfaceRaised,
                          borderColor: ui.border,
                        },
                      ]}
                    >
                      <Text style={[styles.importChipText, { color: ui.text }]}>
                        Choose .json
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={handlePasteFromClipboard}
                    style={[
                      styles.importChip,
                      {
                        backgroundColor: ui.surfaceRaised,
                        borderColor: ui.border,
                      },
                    ]}
                  >
                    <Text style={[styles.importChipText, { color: ui.text }]}>
                      Paste
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmImport}
                    style={[
                      styles.importChip,
                      {
                        backgroundColor: ui.surfaceRaised,
                        borderColor: accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.importChipText, { color: accentColor }]}
                    >
                      Restore
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {backupStatus ? (
              <Text
                style={[
                  styles.backupStatus,
                  {
                    color:
                      backupStatus.kind === "error" ? ui.danger : accentColor,
                  },
                ]}
              >
                {backupStatus.text}
              </Text>
            ) : null}

            <View style={[styles.divider, { backgroundColor: ui.border }]} />

            {/* About & Attribution Row */}
            <Pressable
              onPress={onOpenVersion}
              style={({ pressed }) => [
                styles.inlineRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.inlineRowCopy}>
                <Text style={[styles.fieldLabelNoMargin, { color: ui.text }]}>
                  About &amp; Scripture Attribution
                </Text>
                <Text style={[styles.helperTextNoMargin, { color: ui.muted }]}>
                  Bible Tabs v{version} · 7 translations &amp; licensing
                </Text>
              </View>
              <ChevronIcon color={ui.muted} direction="right" size={12} />
            </Pressable>
          </View>
        </ScrollView>

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

export default function SettingsModal({ navigation }: SettingsScreenProps) {
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
      <SettingsContent
        embedded={false}
        onClose={() => navigation.goBack()}
        onOpenVersion={() => navigation.navigate("Version")}
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
    maxWidth: 680,
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
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollContentEmbedded: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  previewKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 6,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14.5,
    fontWeight: "600",
    marginBottom: 9,
  },
  subFieldLabel: {
    marginTop: 12,
  },
  attributionLinkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  inlineLink: {
    fontSize: 12.5,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  fieldLabelNoMargin: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12.5,
    marginTop: 8,
  },
  helperTextNoMargin: {
    fontSize: 12.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  choicePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
  },
  choicePillText: {
    fontSize: 14.5,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeCard: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    gap: 2,
  },
  themeCardSample: {
    fontSize: 20,
    fontWeight: "600",
  },
  themeCardLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  fontChoicePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
  },
  fontChoiceTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  fontChoiceSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  sizePill: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  accentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  accentDotOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  accentDotInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  accentCheck: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  inlineRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  backupBtnGroup: {
    flexDirection: "row",
    gap: 6,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  importPanel: {
    marginTop: 12,
    gap: 8,
  },
  importInput: {
    height: 84,
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
    fontSize: 13,
  },
  importActions: {
    flexDirection: "row",
    gap: 8,
  },
  importChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  importChipText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  backupStatus: {
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 8,
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
