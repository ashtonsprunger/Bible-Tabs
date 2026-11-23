import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, uiTokens } from "../constants/colors";
import { useResponsiveLayout } from "../constants/layout";
import {
  API_BIBLE_ATTRIBUTION_URL,
  TRANSLATIONS,
  TRANSLATION_IDS,
} from "../constants/translations";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../types";

type VersionScreenProps = NativeStackScreenProps<RootStackParamList, "Version">;

export interface VersionContentProps {
  embedded?: boolean;
  backLabel?: string;
  onBack?: () => void;
  onClose: () => void;
}

export function VersionContent({
  embedded = false,
  backLabel,
  onBack,
  onClose,
}: VersionContentProps) {
  const { isDesktop } = useResponsiveLayout();
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);

  const version = Constants.expoConfig?.version ?? "5.1.0";
  const pkg =
    Constants.expoConfig?.android?.package ?? "ashtonsprunger.bibletabs";

  const openPlayStore = async () => {
    const marketUrl = `market://details?id=${pkg}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
    try {
      const supported = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(supported ? marketUrl : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  const ui = uiTokens[theme];
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
        {embedded && onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={6}
            style={({ pressed }) => [
              styles.backBtn,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Text style={[styles.backBtnText, { color: accentColor }]}>
              ← {backLabel ?? "Settings"}
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
            About Bible Tabs
          </Text>
        )}

        {embedded ? (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close about"
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
        style={styles.bodyScroll}
        contentContainerStyle={[
          styles.body,
          embedded && styles.bodyEmbedded,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.versionLine, { color: ui.muted }]}>
          Bible Tabs v{version} · Free, zero ads, zero tracking, zero AI
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: ui.text }]}>
            Highlights
          </Text>
          <Text style={[styles.paragraph, { color: ui.text }]}>
            • Multi-tab Scripture reading: keep passages open side-by-side in
            browser-style tabs.
          </Text>
          <Text style={[styles.paragraph, { color: ui.text }]}>
            • Highlights &amp; Notes: select any verse range to highlight in 6
            theme-tuned colors or attach personal study notes.
          </Text>
          <Text style={[styles.paragraph, { color: ui.text }]}>
            • Notebook: browse, filter by color, search, and jump straight back
            to saved notes and highlights.
          </Text>
          <Text style={[styles.paragraphLast, { color: ui.text }]}>
            • Seven translations: BSB, KJV, WEB, and ASV bundled offline, plus
            NIV, NLT, and NASB 1995 online via API.Bible — with local JSON
            Backup Export &amp; Import.
          </Text>
        </View>

        <Text style={[styles.sectionKicker, { color: ui.muted }]}>
          SCRIPTURE API ATTRIBUTION
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          <Text style={[styles.creditTitle, { color: ui.text }]}>
            Powered by API.Bible
          </Text>
          <Text style={[styles.creditParagraph, { color: ui.muted }]}>
            Online copyrighted translations (NIV, NLT, NASB 1995) are provided
            for strictly non-commercial reading through American Bible Society’s
            API.Bible platform.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(API_BIBLE_ATTRIBUTION_URL).catch(() => {})
            }
          >
            <Text style={[styles.creditLink, { color: accentColor }]}>
              {API_BIBLE_ATTRIBUTION_URL}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionKicker, { color: ui.muted }]}>
          SCRIPTURE TRANSLATIONS &amp; ATTRIBUTION
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: ui.surface, borderColor: ui.border },
          ]}
        >
          {TRANSLATION_IDS.map((id, idx) => {
            const meta = TRANSLATIONS[id];
            return (
              <View
                key={id}
                style={[
                  styles.creditBlock,
                  idx < TRANSLATION_IDS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: ui.border,
                    paddingBottom: 12,
                    marginBottom: 12,
                  },
                ]}
              >
                <Text style={[styles.creditTitle, { color: ui.text }]}>
                  {meta.fullName} ({meta.shortName})
                </Text>
                <Text style={[styles.creditParagraph, { color: ui.muted }]}>
                  {meta.copyrightNotice}
                </Text>
                {meta.publisherUrl ? (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(meta.publisherUrl!).catch(() => {})
                    }
                  >
                    <Text style={[styles.creditLink, { color: accentColor }]}>
                      {meta.publisherLinkLabel
                        ? `${meta.publisherLinkLabel} (${meta.publisherUrl})`
                        : meta.publisherUrl}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.authorFooter}>
          <Text style={[styles.authorLine, { color: ui.muted }]}>
            Thanks for using Bible Tabs — Ashton Sprunger
          </Text>
          <Pressable
            onPress={openPlayStore}
            style={({ pressed }) => [
              styles.storeBtn,
              {
                backgroundColor: ui.surface,
                borderColor: ui.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text style={[styles.storeBtnText, { color: accentColor }]}>
              {Platform.OS === "web"
                ? "Get Bible Tabs on Google Play ↗"
                : "Review Bible Tabs on Google Play ↗"}
            </Text>
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

export default function VersionModal({ navigation }: VersionScreenProps) {
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
      <VersionContent
        embedded={false}
        onClose={() => navigation.goBack()}
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
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 15,
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
  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  bodyEmbedded: {
    paddingHorizontal: 14,
  },
  versionLine: {
    fontSize: 13,
    marginBottom: 14,
  },
  sectionKicker: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15.5,
    fontWeight: "700",
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 9,
  },
  paragraphLast: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  creditBlock: {},
  creditTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 3,
  },
  creditParagraph: {
    fontSize: 13,
    lineHeight: 19,
  },
  creditLink: {
    fontSize: 12.5,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  authorFooter: {
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  authorLine: {
    fontSize: 13.5,
    textAlign: "center",
  },
  storeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
  },
  storeBtnText: {
    fontSize: 13.5,
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
