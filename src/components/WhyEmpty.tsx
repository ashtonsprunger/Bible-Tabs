import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import type { ThemeName } from "../types";

interface WhyEmptyProps {
  theme: ThemeName;
}

export default function WhyEmpty({ theme }: WhyEmptyProps) {
  const textColor = colors.bible.text[theme];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bible.background[theme] },
      ]}
    >
      <Text style={[styles.arrow, { color: textColor }]}>↖</Text>
      <Text style={[styles.message, { color: textColor }]}>
        {"Why did you close all of your tabs?\nClick the '+' icon to open a new tab!"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    position: "absolute",
    top: -40,
    left: 30,
    fontSize: 120,
  },
  message: {
    fontSize: 20,
  },
});
