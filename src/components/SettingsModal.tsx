import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { ACCENT_COLORS, TEXT_SIZES, colors } from "../constants/colors";
import type {
  AccentColorName,
  TextSizeOption,
  ThemeName,
} from "../types";
import MyButton from "./MyButton";
import VersionModal from "./VersionModal";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: ThemeName;
  color: AccentColorName;
  textSize: TextSizeOption;
  allowRotation: boolean;
  onSetTheme: (theme: ThemeName) => void;
  onSetColor: (color: AccentColorName) => void;
  onSetTextSize: (size: TextSizeOption) => void;
  onToggleRotation: () => void;
  insets: EdgeInsets;
}

export default function SettingsModal({
  visible,
  onClose,
  theme,
  color,
  textSize,
  allowRotation,
  onSetTheme,
  onSetColor,
  onSetTextSize,
  onToggleRotation,
  insets,
}: SettingsModalProps) {
  const [versionOpen, setVersionOpen] = useState(false);

  const version = Constants.expoConfig?.version ?? "5.1.0";
  const textColor = colors.bible.text[theme];
  const bgColor = colors.bible.background[theme];
  const accentColor = colors.bible.color[theme][color][1];

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: bgColor,
              paddingTop: Math.max(12, insets.top + 8),
              paddingBottom: Math.max(12, insets.bottom + 12),
            },
          ]}
        >
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
                  onPress={() => onSetTheme(themeOption)}
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
                  onPress={() => onSetColor(swatch)}
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
            <Text style={[styles.rowLabel, { color: textColor }]}>
              Text Size
            </Text>
            <View style={styles.optionsGroup}>
              {TEXT_SIZES.map((size) => {
                const isSelected = textSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeButton, { backgroundColor: bgColor }]}
                    onPress={() => onSetTextSize(size)}
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
            <Text style={[styles.rowLabel, { color: textColor }]}>
              Orientation
            </Text>
            <TouchableOpacity
              style={[styles.sizeButton, { backgroundColor: bgColor }]}
              onPress={onToggleRotation}
            >
              <Text style={[styles.orientationText, { color: accentColor }]}>
                {allowRotation ? "Any" : "Portrait"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View>
            <View style={styles.versionWrapper}>
              <Pressable onPress={() => setVersionOpen(true)}>
                <Text style={[styles.versionText, { color: textColor }]}>
                  version: {version}
                </Text>
              </Pressable>
            </View>
            <View style={{ height: 20 }} />
            <MyButton
              title="Done"
              onPress={onClose}
              color={accentColor}
              textColor={textColor}
              backgroundColor={colors.tab.tab.inactive[theme]}
            />
          </View>
        </View>
      </Modal>

      <VersionModal
        visible={versionOpen}
        onClose={() => setVersionOpen(false)}
        theme={theme}
        color={color}
        insets={insets}
      />
    </>
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
