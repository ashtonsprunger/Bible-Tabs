import Constants from "expo-constants";
import React from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import type { AccentColorName, ThemeName } from "../types";
import MyButton from "./MyButton";

interface VersionModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeName;
  color: AccentColorName;
  insets: EdgeInsets;
}

export default function VersionModal({
  visible,
  onClose,
  theme,
  color,
  insets,
}: VersionModalProps) {
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
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
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
        <Text style={[styles.heading, { color: textColor }]}>
          Bible Tabs got updated!
        </Text>

        <View style={styles.body}>
          <Text style={[styles.paragraph, { color: textColor }]}>
            - Under-the-hood modernization for faster startup, instant chapter switching, and smoother scrolling.
          </Text>
          <Text style={[styles.paragraph, { color: textColor }]}>
            - Updated layout compatibility for modern Android displays while keeping your saved tabs intact.
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
          onPress={onClose}
        />
      </View>
    </Modal>
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
    fontSize: 20,
    marginBottom: 20,
  },
  reviewLink: {
    fontSize: 20,
    marginBottom: 20,
    textDecorationLine: "underline",
  },
});
