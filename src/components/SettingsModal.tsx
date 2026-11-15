import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACCENT_COLORS, TEXT_SIZES, colors } from "../constants/colors";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../types";
import MyButton from "./MyButton";

type SettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Settings"
>;

export default function SettingsModal({ navigation }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();

  const theme = useAppStore((s) => s.theme);
  const color = useAppStore((s) => s.color);
  const textSize = useAppStore((s) => s.textSize);
  const allowRotation = useAppStore((s) => s.allowRotation);
  const setTheme = useAppStore((s) => s.setTheme);
  const setColor = useAppStore((s) => s.setColor);
  const setTextSize = useAppStore((s) => s.setTextSize);
  const toggleRotation = useAppStore((s) => s.toggleRotation);

  const version = Constants.expoConfig?.version ?? "5.1.0";
  const textColor = colors.bible.text[theme];
  const bgColor = colors.bible.background[theme];
  const accentColor = colors.bible.color[theme][color][1];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(12, insets.bottom + 8),
        },
      ]}
    >
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Text style={[styles.heading, { color: textColor }]}>Settings</Text>

      {/* Theme Row */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: textColor }]}>Theme</Text>
        <View style={styles.optionsGroup}>
          {(["light", "sepia", "dark"] as const).map((themeOption) => (
            <TouchableOpacity
              key={themeOption}
              style={[
                styles.themeButton,
                { backgroundColor: colors.bible.background[themeOption] },
              ]}
              onPress={() => setTheme(themeOption)}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  { color: colors.bible.text[themeOption] },
                ]}
              >
                {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Row */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: textColor }]}>Color</Text>
        <View style={styles.swatchesGroup}>
          {ACCENT_COLORS.map((swatch) => (
            <TouchableOpacity
              key={swatch}
              style={[
                styles.swatchButton,
                { backgroundColor: colors.bible.color[theme][swatch][0] },
              ]}
              onPress={() => setColor(swatch)}
            >
              <Text style={[styles.swatchCheck, { color: textColor }]}>
                {color === swatch ? "✓" : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Text Size Row */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: textColor }]}>Text Size</Text>
        <View style={styles.optionsGroup}>
          {TEXT_SIZES.map((size) => {
            const isSelected = textSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[styles.sizeButton, { backgroundColor: bgColor }]}
                onPress={() => setTextSize(size)}
              >
                <Text
                  style={{
                    fontSize: Number(size),
                    textDecorationLine: isSelected ? "underline" : "none",
                    color: isSelected ? accentColor : textColor,
                  }}
                >
                  A
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Orientation Row */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: textColor }]}>Orientation</Text>
        <TouchableOpacity
          style={[styles.sizeButton, { backgroundColor: bgColor }]}
          onPress={toggleRotation}
        >
          <Text style={[styles.orientationText, { color: accentColor }]}>
            {allowRotation ? "Any" : "Portrait"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View>
        <View style={styles.versionWrapper}>
          <Pressable onPress={() => navigation.navigate("Version")}>
            <Text style={[styles.versionText, { color: textColor }]}>
              version: {version}
            </Text>
          </Pressable>
        </View>
        <View style={{ height: 20 }} />
        <MyButton
          title="Done"
          onPress={() => navigation.goBack()}
          color={accentColor}
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
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 40,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 8,
    columnGap: 8,
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 30,
  },
  optionsGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  swatchesGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  themeButton: {
    padding: 3,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "black",
  },
  themeButtonText: {
    fontSize: 20,
  },
  swatchButton: {
    minWidth: 32,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: "black",
  },
  swatchCheck: {
    fontSize: 20,
  },
  sizeButton: {
    padding: 4,
  },
  orientationText: {
    fontSize: 20,
  },
  versionWrapper: {
    alignItems: "center",
  },
  versionText: {
    textDecorationLine: "underline",
  },
});
