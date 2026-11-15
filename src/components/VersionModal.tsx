import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../types";
import MyButton from "./MyButton";

type VersionScreenProps = NativeStackScreenProps<RootStackParamList, "Version">;

export default function VersionModal({ navigation }: VersionScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);

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

  const textColor = colors.bible.text[theme];

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
      <Text style={[styles.heading, { color: textColor }]}>
        Bible Tabs got updated!
      </Text>

      <View style={styles.body}>
        <Text style={[styles.paragraph, { color: textColor }]}>
          - Print-style Bible typesetting: flowing paragraphs, indented poetry, section headings, Psalm titles, Selah, and translator footnotes.
        </Text>
        <Text style={[styles.paragraph, { color: textColor }]}>
          - Continuous smooth scrolling through the entire Bible, instant startup, live search, and long-press verse actions.
        </Text>
        <Text style={[styles.creditParagraph, { color: textColor }]}>
          Scripture text: Berean Standard Bible (BSB) — Public Domain (CC0).
        </Text>
        <Text style={[styles.paragraph, { color: textColor }]}>
          Thanks for using Bible Tabs!
        </Text>
        <Text style={[styles.paragraph, { color: textColor }]}>
          ~~Ashton Sprunger~~
        </Text>

        <Pressable onPress={openPlayStore}>
          <Text style={[styles.reviewLink, { color: textColor }]}>
            Review Bible Tabs ➤
          </Text>
        </Pressable>
      </View>

      <MyButton
        color={colors.bible.color[theme][color][1]}
        textColor={textColor}
        backgroundColor={colors.tab.tab.inactive[theme]}
        title="Done"
        onPress={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 40,
  },
  body: {
    padding: 12,
  },
  paragraph: {
    fontSize: 19,
    marginBottom: 16,
  },
  creditParagraph: {
    fontSize: 15,
    opacity: 0.72,
    marginBottom: 16,
  },
  reviewLink: {
    fontSize: 20,
    marginBottom: 20,
    textDecorationLine: "underline",
  },
});
